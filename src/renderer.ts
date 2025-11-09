import { MarkdownRenderChild, TFile } from "obsidian";
import { PDFCache } from "./pdf-cache";
import * as pdfjsLib from "pdfjs-dist";

export class PDFPageRenderer extends MarkdownRenderChild {
	file: TFile;
	pageNumber: number;
	app: any;
	width: string | null;
	pdfCache: PDFCache;
	renderTask: any = null;
	canvas: HTMLCanvasElement | null = null;

	constructor(
		containerEl: HTMLElement,
		file: TFile,
		pageNumber: number,
		app: any,
		pdfCache: PDFCache,
		width: string | null = null,
	) {
		super(containerEl);
		this.file = file;
		this.pageNumber = pageNumber;
		this.app = app;
		this.pdfCache = pdfCache;
		this.width = width;
	}

	async onload() {
		try {
			// Set up PDF.js worker (load from plugin directory)
			if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
				try {
					const adapter = (this.app.vault as any).adapter;
					const plugin = (this.app as any).plugins.plugins['pdf-page-embedder'];

					if (plugin && plugin.manifest && plugin.manifest.dir) {
						// Use the manifest directory path
						const workerPath = `${plugin.manifest.dir}/pdf.worker.min.js`;
						console.log('[PDF.js] Attempting to load worker from:', workerPath);

						const workerContent = await adapter.read(workerPath);
						const blob = new Blob([workerContent], { type: 'application/javascript' });
						pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
						console.log('[PDF.js] Worker loaded from local file');
					} else {
						throw new Error('Could not determine plugin directory');
					}
				} catch (error) {
					console.error('[PDF.js] Failed to load local worker:', error);
					// Fallback: use CDN as last resort
					pdfjsLib.GlobalWorkerOptions.workerSrc =
						"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
					console.log('[PDF.js] Using CDN worker as fallback');
				}
			}

			// Use cache to get PDF document
			const pdf = await this.pdfCache.get(this.file.path, async () => {
				const arrayBuffer = await this.app.vault.readBinary(this.file);
				const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
				return await loadingTask.promise;
			});

			const totalPages = pdf.numPages;

			if (this.pageNumber < 1 || this.pageNumber > totalPages) {
				this.renderError(
					`Page ${this.pageNumber} does not exist. PDF has ${totalPages} pages.`,
				);
				return;
			}

			// Render the PDF page
			await this.renderPDFPage(pdf, this.pageNumber);
		} catch (error) {
			console.error("Error rendering PDF:", this.file.path, error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			this.renderError(`Failed to load PDF page: ${errorMessage}`);
		}
	}

	async renderPDFPage(pdf: any, pageNumber: number) {
		try {
			const container = this.containerEl;
			container.empty();
			container.addClass("pdf-page-embed-container");

			// Get the specific page
			const page = await pdf.getPage(pageNumber);

			// Create wrapper for the canvas
			const canvasWrapper = container.createEl("div", {
				cls: "pdf-page-canvas-wrapper",
			});

			// Apply custom width to wrapper if specified
			if (this.width) {
				canvasWrapper.style.width = this.width;
				console.log(`[PDF Width Debug] Page ${this.pageNumber} - Applied custom width to wrapper: ${this.width}`);
			} else {
				// Default: fill container width
				canvasWrapper.style.width = "100%";
			}
			canvasWrapper.style.display = "block";

			// Create canvas for rendering
			this.canvas = canvasWrapper.createEl("canvas");
			this.canvas.addClass("pdf-page-canvas");

			// Make canvas responsive with CSS - always fill wrapper
			this.canvas.style.width = "100%";
			this.canvas.style.height = "auto";
			this.canvas.style.display = "block";

			// Get viewport - render at a consistent high resolution
			// CSS will scale it down to fit the container
			const baseViewport = page.getViewport({ scale: 1 });

			// Use a scale that gives good quality at typical screen sizes
			// Render at ~2x the typical reading width for crisp display
			const renderScale = 2.0;
			const viewport = page.getViewport({ scale: renderScale });

			console.log(`[PDF Width Debug] Page ${this.pageNumber} - Rendering at scale ${renderScale}, native PDF width: ${baseViewport.width}px, render width: ${viewport.width}px`);

			const context = this.canvas.getContext("2d");
			if (!context) {
				throw new Error("Could not get canvas context");
			}

			// Set canvas internal dimensions (for rendering resolution)
			this.canvas.height = viewport.height;
			this.canvas.width = viewport.width;

			// Render the page
			const renderContext = {
				canvasContext: context,
				viewport: viewport,
			};

			this.renderTask = page.render(renderContext);

			try {
				await this.renderTask.promise;
			} catch (error: any) {
				// Ignore cancellation errors
				if (error.name !== "RenderingCancelledException") {
					throw error;
				}
			}

			// Clean up the page object immediately after rendering
			page.cleanup();
		} catch (error) {
			console.error("Error rendering PDF page:", this.file.path, pageNumber, error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			this.renderError(`Failed to render page ${pageNumber}: ${errorMessage}`);
		}
	}

	onunload() {
		// Cancel any pending render tasks
		if (this.renderTask) {
			try {
				this.renderTask.cancel();
			} catch (e) {
				// Ignore errors on cancel
			}
			this.renderTask = null;
		}

		// Clear canvas to free memory
		if (this.canvas) {
			const context = this.canvas.getContext("2d");
			if (context) {
				context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			}
			// Set canvas to minimal size to free memory
			this.canvas.width = 1;
			this.canvas.height = 1;
			this.canvas = null;
		}

		// Release PDF from cache
		this.pdfCache.release(this.file.path);

		// Clear the container
		this.containerEl.empty();
	}


	renderError(message: string) {
		this.containerEl.empty();
		this.containerEl.addClass("pdf-page-embed-error");
		this.containerEl.createEl("div", {
			cls: "pdf-error-message",
			text: message,
		});
	}

	private parseWidth(width: string, container: HTMLElement): number {
		// Handle percentage widths
		if (width.endsWith('%')) {
			const percentage = parseFloat(width);
			const containerWidth = container.parentElement?.clientWidth || 600;
			return (containerWidth * percentage) / 100;
		}
		
		// Handle pixel values
		if (width.endsWith('px')) {
			return parseFloat(width);
		}
		
		// For any other value, try to parse as number (assume pixels)
		const parsed = parseFloat(width);
		return isNaN(parsed) ? 600 : parsed;
	}

	private getContainerWidth(container: HTMLElement): number {
		// Traverse up the DOM to find the markdown content container
		let current: HTMLElement | null = container;
		let candidateWidth = 0;

		console.log(`[PDF Width Debug] Starting DOM traversal from:`, container.className);

		// Look up the tree for content containers
		while (current) {
			const width = current.clientWidth;
			console.log(`[PDF Width Debug] Checking element:`, {
				className: current.className,
				clientWidth: width,
				tagName: current.tagName,
			});

			// Look for Obsidian's markdown preview containers
			if (
				current.classList.contains('markdown-preview-view') ||
				current.classList.contains('markdown-preview-section') ||
				current.classList.contains('cm-content') ||
				current.classList.contains('cm-contentContainer')
			) {
				console.log(`[PDF Width Debug] Found markdown container with width: ${width}px`);
				if (width > candidateWidth) {
					candidateWidth = width;
				}
			}

			// Keep track of the largest reasonable width we find
			if (width > candidateWidth && width < 2000) {
				candidateWidth = width;
			}

			current = current.parentElement;
		}

		// If we found a reasonable width, use it
		if (candidateWidth > 200) {
			console.log(`[PDF Width Debug] Using candidate width: ${candidateWidth}px`);
			return candidateWidth;
		}

		// Fallback
		console.log(`[PDF Width Debug] Using fallback width: 600px`);
		return 600;
	}
}

export function parsePDFPageBlock(
	source: string,
): { filename: string; page: number; width: string | null } | null {
	source = source.trim();

	// Format 1: Simple format - "filename.pdf#5" or "filename.pdf#5|width:100%"
	const simpleMatch = source.match(/^(.+\.pdf)#(\d+)(?:\|width:(.+))?$/i);
	if (simpleMatch) {
		return {
			filename: simpleMatch[1].trim(),
			page: parseInt(simpleMatch[2]),
			width: simpleMatch[3] ? simpleMatch[3].trim() : null,
		};
	}

	// Format 2: Multi-line format with "file:", "page:", and optional "width:"
	const lines = source.split("\n");
	let filename: string | null = null;
	let page: number | null = null;
	let width: string | null = null;

	for (const line of lines) {
		const trimmed = line.trim();

		const fileMatch = trimmed.match(/^file:\s*(.+\.pdf)$/i);
		if (fileMatch) {
			filename = fileMatch[1].trim();
		}

		const pageMatch = trimmed.match(/^page:\s*(\d+)$/i);
		if (pageMatch) {
			page = parseInt(pageMatch[1]);
		}

		const widthMatch = trimmed.match(/^width:\s*(.+)$/i);
		if (widthMatch) {
			width = widthMatch[1].trim();
		}
	}

	if (filename && page) {
		return { filename, page, width };
	}

	return null;
}
