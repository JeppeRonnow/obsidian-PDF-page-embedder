import { MarkdownRenderChild, TFile } from "obsidian";

export class PDFPageRenderer extends MarkdownRenderChild {
	file: TFile;
	pageNumber: number;
	app: any;
	width: string | null;

	constructor(
		containerEl: HTMLElement,
		file: TFile,
		pageNumber: number,
		app: any,
		width: string | null = null,
	) {
		super(containerEl);
		this.file = file;
		this.pageNumber = pageNumber;
		this.app = app;
		this.width = width;
	}

	async onload() {
		try {
			const arrayBuffer = await this.app.vault.readBinary(this.file);

			// Validate page number using PDF.js
			const pdfjsLib = await this.loadPDFJS();
			const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
			const pdf = await loadingTask.promise;
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
			console.error("Error rendering PDF:", error);
			this.renderError("Failed to load PDF page.");
		}
	}

	async renderPDFPage(pdf: any, pageNumber: number) {
		const container = this.containerEl;
		container.empty();
		container.addClass("pdf-page-embed-container");

		// Get the specific page
		const page = await pdf.getPage(pageNumber);

		// Create wrapper for the canvas
		const canvasWrapper = container.createEl("div", {
			cls: "pdf-page-canvas-wrapper",
		});

		// Apply width if specified
		if (this.width) {
			canvasWrapper.style.width = this.width;
		}

		// Create canvas for rendering
		const canvas = canvasWrapper.createEl("canvas");
		canvas.addClass("pdf-page-canvas");

		// Get viewport and calculate scale to fit container width
		const baseViewport = page.getViewport({ scale: 1 });

		// Determine target width
		let targetWidth: number;
		if (this.width) {
			// Parse width (could be px, %, etc.)
			const tempDiv = document.createElement("div");
			tempDiv.style.width = this.width;
			tempDiv.style.position = "absolute";
			tempDiv.style.visibility = "hidden";
			document.body.appendChild(tempDiv);
			targetWidth = tempDiv.offsetWidth;
			document.body.removeChild(tempDiv);
		} else {
			// Default: use full content width
			targetWidth = container.parentElement?.clientWidth || 800;
		}

		// Calculate scale to fit target width
		const scale = targetWidth / baseViewport.width;
		const viewport = page.getViewport({ scale: scale });

		const context = canvas.getContext("2d");
		canvas.height = viewport.height;
		canvas.width = viewport.width;

		// Render the page
		const renderContext = {
			canvasContext: context,
			viewport: viewport,
		};

		await page.render(renderContext).promise;

		// Removed page info section - just the PDF now!
	}

	async loadPDFJS(): Promise<any> {
		// Check if PDF.js is already loaded
		if ((window as any).pdfjsLib) {
			return (window as any).pdfjsLib;
		}

		// Load PDF.js from CDN
		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src =
				"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
			script.onload = () => {
				const pdfjsLib = (window as any).pdfjsLib;
				pdfjsLib.GlobalWorkerOptions.workerSrc =
					"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
				resolve(pdfjsLib);
			};
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	renderError(message: string) {
		this.containerEl.empty();
		this.containerEl.addClass("pdf-page-embed-error");
		this.containerEl.createEl("div", {
			cls: "pdf-error-message",
			text: message,
		});
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
