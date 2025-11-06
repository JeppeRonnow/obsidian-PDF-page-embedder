import { MarkdownRenderChild, TFile } from "obsidian";

export class PDFPageRenderer extends MarkdownRenderChild {
	file: TFile;
	pageNumber: number;
	app: any;

	constructor(
		containerEl: HTMLElement,
		file: TFile,
		pageNumber: number,
		app: any,
	) {
		super(containerEl);
		this.file = file;
		this.pageNumber = pageNumber;
		this.app = app;
	}

	async onload() {
		try {
			const arrayBuffer = await this.app.vault.readBinary(this.file);

			// Validate page number using pdf-lib
			const { PDFDocument } = await import("pdf-lib");
			const pdfDoc = await PDFDocument.load(arrayBuffer);
			const totalPages = pdfDoc.getPageCount();

			if (this.pageNumber < 1 || this.pageNumber > totalPages) {
				this.renderError(
					`Page ${this.pageNumber} does not exist. PDF has ${totalPages} pages.`,
				);
				return;
			}

			// Render the PDF page
			await this.renderPDFPage(arrayBuffer, this.pageNumber);
		} catch (error) {
			console.error("Error rendering PDF:", error);
			this.renderError("Failed to load PDF page.");
		}
	}

	async renderPDFPage(arrayBuffer: ArrayBuffer, pageNumber: number) {
		const container = this.containerEl;
		container.empty();
		container.addClass("pdf-page-embed-container");

		// Create canvas for rendering
		const canvas = container.createEl("canvas");
		canvas.addClass("pdf-page-canvas");

		// Load PDF.js
		const pdfjsLib = await this.loadPDFJS();

		// Load the PDF document
		const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
		const pdf = await loadingTask.promise;

		// Get the specific page
		const page = await pdf.getPage(pageNumber);

		// Set up canvas with proper scaling
		const viewport = page.getViewport({ scale: 0.83 });
		const context = canvas.getContext("2d");

		canvas.height = viewport.height;
		canvas.width = viewport.width;

		// Render the page
		const renderContext = {
			canvasContext: context,
			viewport: viewport,
		};

		await page.render(renderContext).promise;

		// Add page info
		const pageInfo = container.createEl("div", {
			cls: "pdf-page-info",
			text: `${this.file.name} - Page ${pageNumber}`,
		});
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
