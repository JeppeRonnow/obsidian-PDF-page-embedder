import { Plugin, MarkdownPostProcessorContext } from "obsidian";
import {
	PDFPageEmbedderSettings,
	DEFAULT_SETTINGS,
	PDFPageEmbedderSettingTab,
} from "./settings";
import { registerCommands } from "./commands";
import { PDFPageRenderer, parsePDFPageBlock } from "./renderer";

export default class PDFPageEmbedderPlugin extends Plugin {
	settings: PDFPageEmbedderSettings;

	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new PDFPageEmbedderSettingTab(this.app, this));

		// Register all commands
		registerCommands(this);

		// Register code block processor for pdf-page blocks
		this.registerMarkdownCodeBlockProcessor(
			"pdf-page",
			(source, el, ctx) => {
				this.processPDFPageBlock(source, el, ctx);
			},
		);
	}

	processPDFPageBlock(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext,
	) {
		const parsed = parsePDFPageBlock(source);

		if (!parsed) {
			el.createEl("div", {
				cls: "pdf-page-embed-error",
				text: "Invalid pdf-page block format. Use: filename.pdf#page or file: / page: format",
			});
			return;
		}

		const { filename, page, width } = parsed;

		// Get the PDF file
		const file = this.app.metadataCache.getFirstLinkpathDest(
			filename,
			ctx.sourcePath,
		);

		if (!file) {
			el.createEl("div", {
				cls: "pdf-page-embed-error",
				text: `PDF file not found: ${filename}`,
			});
			return;
		}

		if (file.extension !== "pdf") {
			el.createEl("div", {
				cls: "pdf-page-embed-error",
				text: `File is not a PDF: ${filename}`,
			});
			return;
		}

		// Always use custom renderer for code blocks
		const renderer = new PDFPageRenderer(el, file, page, this.app, width);
		ctx.addChild(renderer);
	}

	onunload() {
		// Cleanup when plugin is disabled
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
