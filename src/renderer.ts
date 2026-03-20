import {
	App,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	TFile,
	Menu,
	MenuItem,
	Notice,
	Events,
} from "obsidian";
import { PDFCache } from "./pdf-cache";
import { PDFPageEmbedderSettings } from "./settings";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import PDFPageEmbedderPlugin from "./main";

export class PDFPageRenderer extends MarkdownRenderChild {
	file: TFile;
	pageNumber: number;
	app: App;
	width: string | null;
	rotation: number;
	alignment: string;
	pdfCache: PDFCache;
	settings: PDFPageEmbedderSettings;
	events: Events;
	manifestDir: string;
	plugin: PDFPageEmbedderPlugin;
	ctx: MarkdownPostProcessorContext;
	renderTask: RenderTask | null = null;
	canvas: HTMLCanvasElement | null = null;
	settingsChangeHandler: (() => void) | null = null;

	constructor(
		containerEl: HTMLElement,
		file: TFile,
		pageNumber: number,
		app: App,
		pdfCache: PDFCache,
		settings: PDFPageEmbedderSettings,
		events: Events,
		manifestDir: string,
		plugin: PDFPageEmbedderPlugin,
		ctx: MarkdownPostProcessorContext,
		width: string | null = null,
		rotation = 0,
		alignment = "left",
	) {
		super(containerEl);
		this.file = file;
		this.pageNumber = pageNumber;
		this.app = app;
		this.pdfCache = pdfCache;
		this.settings = settings;
		this.events = events;
		this.manifestDir = manifestDir;
		this.plugin = plugin;
		this.ctx = ctx;
		this.width = width;
		this.rotation = rotation;
		this.alignment = alignment;
	}

	async onload() {
		// Register settings change listener
		this.settingsChangeHandler = () => {
			this.reloadPage();
		};
		this.events.on("settings-changed", this.settingsChangeHandler);

		try {
			// Set up PDF.js worker (load from plugin directory)
			if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
				try {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const adapter = (this.app.vault as any).adapter;
					const workerPath = `${this.manifestDir}/pdf.worker.min.js`;
					console.log(
						"[PDF.js] Attempting to load worker from:",
						workerPath,
					);

					const workerContent = await adapter.read(workerPath);
					const blob = new Blob([workerContent], {
						type: "application/javascript",
					});
					const blobUrl = URL.createObjectURL(blob);
					this.plugin.workerBlobUrl = blobUrl;
					pdfjsLib.GlobalWorkerOptions.workerSrc = blobUrl;
					console.log("[PDF.js] Worker loaded from local file");
				} catch (error) {
					console.error(
						"[PDF.js] Failed to load local worker:",
						error,
					);
					// Fallback: use CDN as last resort
					pdfjsLib.GlobalWorkerOptions.workerSrc =
						"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
					console.log("[PDF.js] Using CDN worker as fallback");
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
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.renderError(`Failed to load PDF page: ${errorMessage}`);
		}
	}

	async renderPDFPage(pdf: PDFDocumentProxy, pageNumber: number) {
		try {
			// Cancel any in-progress render task before starting a new one
			if (this.renderTask) {
				try {
					this.renderTask.cancel();
				} catch (e) {
					// Ignore errors on cancel
				}
				this.renderTask = null;
			}

			// Zero out old canvas to free GPU/memory before removing from DOM
			if (this.canvas) {
				this.canvas.width = 1;
				this.canvas.height = 1;
				this.canvas = null;
			}

			const container = this.containerEl;
			container.empty();
			container.addClass("pdf-page-embed-container");

			// Apply alignment to container
			if (this.alignment === "center") {
				container.style.textAlign = "center";
			} else if (this.alignment === "right") {
				container.style.textAlign = "right";
			} else {
				container.style.textAlign = "left";
			}

			// Get the specific page
			const page = await pdf.getPage(pageNumber);

			// Create wrapper for the canvas
			const canvasWrapper = container.createEl("div", {
				cls: "pdf-page-canvas-wrapper",
			});

			// Apply custom width to wrapper if specified
			if (this.width) {
				canvasWrapper.style.width = this.width;
			} else {
				// Default: fill container width
				canvasWrapper.style.width = "100%";
			}
			canvasWrapper.style.display = "inline-block";

			// Add click handler to open PDF in native viewer (if enabled)
			if (this.settings.openAtPage) {
				canvasWrapper.style.cursor = "pointer";

				// Only add transition and hover effects if animations are enabled
				if (this.settings.enableHoverAnimation) {
					canvasWrapper.style.transition =
						"opacity 0.2s, transform 0.2s";

					// Add hover effect
					canvasWrapper.addEventListener("mouseenter", () => {
						canvasWrapper.style.opacity = "0.85";
						canvasWrapper.style.transform = "scale(0.99)";
					});
					canvasWrapper.addEventListener("mouseleave", () => {
						canvasWrapper.style.opacity = "1";
						canvasWrapper.style.transform = "scale(1)";
					});
				}

				canvasWrapper.addEventListener("dblclick", async () => {
					await this.app.workspace.openLinkText(
						`${this.file.path}#page=${this.pageNumber}`,
						"",
						false,
					);
				});
			}

			// Add context menu for copying page as image
			canvasWrapper.addEventListener("contextmenu", (event) => {
				event.preventDefault();
				this.showContextMenu(event);
			});

			// Create canvas for rendering
			this.canvas = canvasWrapper.createEl("canvas");
			this.canvas.addClass("pdf-page-canvas");

			// Make canvas responsive with CSS - always fill wrapper
			this.canvas.style.width = "100%";
			this.canvas.style.height = "auto";
			this.canvas.style.display = "block";

			// Get viewport - render at a consistent high resolution
			// CSS will scale it down to fit the container
			// Use a scale based on quality setting: Low (1.0x), Medium (2.0x), High (3.0x)
			const renderScale = this.getRenderScale();
			const viewport = page.getViewport({
				scale: renderScale,
				rotation: this.rotation,
			});

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
			} catch (error) {
				// Ignore cancellation errors
				if (
					error instanceof Error &&
					error.name !== "RenderingCancelledException"
				) {
					throw error;
				}
			}

			// Clean up the page object immediately after rendering
			page.cleanup();

			// Add page number display if enabled
			if (this.settings.showPageNumber) {
				const pageNumberEl = container.createEl("div", {
					cls: "pdf-page-number",
					text: `Page ${pageNumber}`,
				});
				pageNumberEl.style.textAlign = "center";
				pageNumberEl.style.marginTop = "1px";
				pageNumberEl.style.marginBottom = "3px";
				pageNumberEl.style.fontSize = "0.9em";
				pageNumberEl.style.color = "var(--text-muted)";
			}
		} catch (error) {
			console.error(
				"Error rendering PDF page:",
				this.file.path,
				pageNumber,
				error,
			);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.renderError(
				`Failed to render page ${pageNumber}: ${errorMessage}`,
			);
		}
	}

	onunload() {
		// Unregister settings change listener
		if (this.settingsChangeHandler) {
			this.events.off("settings-changed", this.settingsChangeHandler);
			this.settingsChangeHandler = null;
		}

		try {
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
					context.clearRect(
						0,
						0,
						this.canvas.width,
						this.canvas.height,
					);
				}
				// Set canvas to minimal size to free memory
				this.canvas.width = 1;
				this.canvas.height = 1;
				this.canvas = null;
			}
		} catch (e) {
			console.error("Error during canvas cleanup:", e);
		} finally {
			// Always release PDF from cache and clear container
			this.pdfCache.release(this.file.path);
			this.containerEl.empty();
		}
	}

	async reloadPage() {
		try {
			// Use cache to get PDF document (should be cached already)
			const pdf = await this.pdfCache.get(this.file.path, async () => {
				const arrayBuffer = await this.app.vault.readBinary(this.file);
				const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
				return await loadingTask.promise;
			});

			try {
				// Re-render the page with updated settings
				await this.renderPDFPage(pdf, this.pageNumber);
			} finally {
				// Always release the extra refCount from get() above.
				// The renderer's own refCount (from onload) is released in onunload.
				this.pdfCache.release(this.file.path);
			}
		} catch (error) {
			console.error("Error reloading PDF page:", error);
		}
	}

	renderError(message: string) {
		this.containerEl.empty();
		this.containerEl.addClass("pdf-page-embed-error");
		this.containerEl.createEl("div", {
			cls: "pdf-error-message",
			text: message,
		});
	}

	async showContextMenu(event: MouseEvent) {
		const menu = new Menu();
		const totalPages = await this.getTotalPages();

		if (this.pageNumber > 1) {
			menu.addItem((item: MenuItem) => {
				item.setTitle("Previous page")
					.setIcon("arrow-left")
					.onClick(async () => {
						await this.changePageInSource(this.pageNumber - 1);
					});
			});
		}

		if (totalPages > 0 && this.pageNumber < totalPages) {
			menu.addItem((item: MenuItem) => {
				item.setTitle("Next page")
					.setIcon("arrow-right")
					.onClick(async () => {
						await this.changePageInSource(this.pageNumber + 1);
					});
			});
		}

		menu.addSeparator();

		menu.addItem((item: MenuItem) => {
			item.setTitle("Copy page as image")
				.setIcon("image")
				.onClick(async () => {
					await this.copyPageAsImage();
				});
		});

		menu.addItem((item: MenuItem) => {
			item.setTitle("Open in new tab")
				.setIcon("external-link")
				.onClick(async () => {
					await this.app.workspace.openLinkText(
						`${this.file.path}#page=${this.pageNumber}`,
						"",
						true,
					);
				});
		});

		menu.addSeparator();

		menu.addItem((item: MenuItem) => {
			item.setTitle("Delete embed")
				.setIcon("trash")
				.onClick(async () => {
					await this.deleteEmbed();
				});
		});

		menu.showAtMouseEvent(event);
	}

	async copyPageAsImage() {
		if (!this.canvas) {
			console.error("Canvas not available for copying");
			return;
		}

		try {
			// Convert canvas to blob
			const blob = await new Promise<Blob | null>((resolve) => {
				if (!this.canvas) {
					resolve(null);
					return;
				}
				this.canvas.toBlob((blob) => {
					resolve(blob);
				}, "image/png");
			});

			if (!blob) {
				throw new Error("Failed to create image blob");
			}

			// Copy to clipboard using the Clipboard API
			const clipboardItem = new ClipboardItem({ "image/png": blob });
			await navigator.clipboard.write([clipboardItem]);

			// Show success notice
			new Notice(`Page ${this.pageNumber} copied as image to clipboard`);
		} catch (error) {
			console.error("Error copying page as image:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			new Notice(`Failed to copy image: ${errorMessage}`);
		}
	}

	async deleteEmbed() {
		// Get the section info for this code block from the post-processor context
		const sectionInfo = this.ctx.getSectionInfo(this.containerEl);
		if (!sectionInfo) {
			new Notice("Could not locate embed in source to delete");
			return;
		}

		// Get the active editor - we need it to modify the source
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const activeEditor = (this.app.workspace as any).activeEditor;
		const editor = activeEditor?.editor;
		if (!editor) {
			new Notice("No active editor found to delete embed");
			return;
		}

		const { lineStart, lineEnd } = sectionInfo;

		// We want to delete the whole block including the start and end lines
		// and possibly the newline after it to avoid leaving a blank line.
		const from = { line: lineStart, ch: 0 };
		const to = { line: lineEnd + 1, ch: 0 }; // Go to the start of the next line to delete the newline

		editor.replaceRange("", from, to);
		new Notice("PDF embed deleted");
	}

	async getTotalPages(): Promise<number> {
		try {
			const pdf = await this.pdfCache.get(this.file.path, async () => {
				const arrayBuffer = await this.app.vault.readBinary(this.file);
				const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
				return await loadingTask.promise;
			});
			const total = pdf.numPages;
			// Release the extra refCount from get() — we only needed to read numPages
			this.pdfCache.release(this.file.path);
			return total;
		} catch {
			return 0;
		}
	}

	async changePageInSource(newPage: number) {
		// Get the section info for this code block from the post-processor context
		const sectionInfo = this.ctx.getSectionInfo(this.containerEl);
		if (!sectionInfo) {
			new Notice("Could not locate embed in source to change page");
			return;
		}

		// Get the active editor - we need it to modify the source
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const activeEditor = (this.app.workspace as any).activeEditor;
		const editor = activeEditor?.editor;
		if (!editor) {
			new Notice("No active editor found to update page");
			return;
		}

		const { lineStart, lineEnd } = sectionInfo;

		// Read all lines of the code block from the editor
		const lines: string[] = [];
		for (let i = lineStart; i <= lineEnd; i++) {
			lines.push(editor.getLine(i));
		}
		const blockContent = lines.join("\n");

		// Replace the page number in the block content
		// Handle simple format: filename.pdf#5 or filename.pdf#5|width:100%
		let updatedContent = blockContent.replace(
			/^(.+\.pdf)#\d+(.*)$/im,
			`$1#${newPage}$2`,
		);

		// Handle multi-line format: page: 5
		updatedContent = updatedContent.replace(
			/^(page:\s*)\d+$/im,
			`$1${newPage}`,
		);

		// Replace the lines in the editor
		if (updatedContent !== blockContent) {
			const from = { line: lineStart, ch: 0 };
			const lastLineLength = editor.getLine(lineEnd).length;
			const to = { line: lineEnd, ch: lastLineLength };
			editor.replaceRange(updatedContent, from, to);
		} else {
			new Notice("Could not find page number to update in embed");
		}
	}

	private getRenderScale(): number {
		switch (this.settings.renderQuality) {
			case "low":
				return 1.0;
			case "high":
				return 3.0;
			case "medium":
			default:
				return 2.0;
		}
	}
}

export function parsePDFPageBlock(source: string): {
	filename: string;
	page: number;
	width: string | null;
	rotation: number;
	alignment: string;
} | null {
	source = source.trim();

	// Format 1: Simple format - "filename.pdf#5" or "filename.pdf#5|width:100%|rotate:90"
	const simpleMatch = source.match(/^(.+\.pdf)#(\d+)(.*)$/i);
	if (simpleMatch) {
		const filename = simpleMatch[1].trim();
		const page = parseInt(simpleMatch[2]);
		const params = simpleMatch[3];

		let width: string | null = null;
		let rotation = 0;
		let alignment = "left";

		if (params) {
			const widthMatch = params.match(/\|width:([^|]+)/i);
			if (widthMatch) {
				width = widthMatch[1].trim();
			}

			const rotateMatch = params.match(/\|rotate:(\d+)/i);
			if (rotateMatch) {
				const rot = parseInt(rotateMatch[1]);
				// Normalize to 0, 90, 180, 270
				rotation = ((rot % 360) + 360) % 360;
				if (![0, 90, 180, 270].includes(rotation)) {
					rotation = 0;
				}
			}

			// Check for alignment parameters
			if (params.match(/\|center/i)) {
				alignment = "center";
			} else if (params.match(/\|right/i)) {
				alignment = "right";
			}
		}

		return { filename, page, width, rotation, alignment };
	}

	// Format 2: Multi-line format with "file:", "page:", and optional "width:", "rotate:"
	const lines = source.split("\n");
	let filename: string | null = null;
	let page: number | null = null;
	let width: string | null = null;
	let rotation = 0;
	let alignment = "left";

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

		const rotateMatch = trimmed.match(/^rotate:\s*(\d+)$/i);
		if (rotateMatch) {
			const rot = parseInt(rotateMatch[1]);
			// Normalize to 0, 90, 180, 270
			rotation = ((rot % 360) + 360) % 360;
			if (![0, 90, 180, 270].includes(rotation)) {
				rotation = 0;
			}
		}

		const alignMatch = trimmed.match(/^align:\s*(left|center|right)$/i);
		if (alignMatch) {
			alignment = alignMatch[1].toLowerCase();
		}
	}

	if (filename && page) {
		return { filename, page, width, rotation, alignment };
	}

	return null;
}
