import { Plugin, MarkdownPostProcessorContext, Events } from "obsidian";
import {
	PDFPageEmbedderSettings,
	DEFAULT_SETTINGS,
	PDFPageEmbedderSettingTab,
} from "./settings";
import { registerCommands } from "./commands";
import { PDFPageRenderer, parsePDFPageBlock } from "./renderer";
import { PDFCache } from "./pdf-cache";
import * as pdfjsLib from "pdfjs-dist";

export default class PDFPageEmbedderPlugin extends Plugin {
	settings: PDFPageEmbedderSettings;
	pdfCache: PDFCache;
	events: Events;
	workerBlobUrl: string | null = null;

	async onload() {
		await this.loadSettings();

		// Initialize PDF cache
		this.pdfCache = new PDFCache();

		// Initialize event emitter for settings changes
		this.events = new Events();

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
		// Clear any default rendering
		el.empty();

		const parsed = parsePDFPageBlock(source);

		if (!parsed) {
			el.createEl("div", {
				cls: "pdf-page-embed-error",
				text: "Invalid pdf-page block format. Use: filename.pdf#page or file: / page: format",
			});
			return;
		}

		const { filename, page, width, rotation, alignment } = parsed;

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

		// Use custom renderer with cache
		const renderer = new PDFPageRenderer(
			el,
			file,
			page,
			this.app,
			this.pdfCache,
			this.settings,
			this.events,
			this.manifest.dir || "",
			this,
			ctx,
			width,
			rotation,
			alignment,
		);
		ctx.addChild(renderer);
	}

	onunload() {
		// Clear PDF cache on plugin unload
		if (this.pdfCache) {
			this.pdfCache.clear();
		}

		// Revoke worker blob URL and reset global workerSrc so it gets
		// re-initialized properly if the plugin is reloaded without an app restart.
		if (this.workerBlobUrl) {
			URL.revokeObjectURL(this.workerBlobUrl);
			this.workerBlobUrl = null;
		}
		pdfjsLib.GlobalWorkerOptions.workerSrc = "";
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
		// Refresh all open views to apply new settings
		this.refreshOpenViews();
	}

	refreshOpenViews() {
		// Trigger a custom event that all renderers can listen to
		this.events.trigger("settings-changed");
	}
}
