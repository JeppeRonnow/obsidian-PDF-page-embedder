import { App, PluginSettingTab, Setting } from "obsidian";
import PDFPageEmbedderPlugin from "./main";

export interface PDFPageEmbedderSettings {
	skipFirstPages: number;
	useNativeViewer: boolean;
	showPageNumber: boolean;
	openAtPage: boolean;
}

export const DEFAULT_SETTINGS: PDFPageEmbedderSettings = {
	skipFirstPages: 0,
	useNativeViewer: false,
	showPageNumber: false,
	openAtPage: true,
};

export class PDFPageEmbedderSettingTab extends PluginSettingTab {
	plugin: PDFPageEmbedderPlugin;

	constructor(app: App, plugin: PDFPageEmbedderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "PDF Page Embedder Settings" });

		new Setting(containerEl)
			.setName("Skip first pages")
			.setDesc(
				"Number of pages to skip from the beginning (useful for cover pages, title pages, etc.)",
			)
			.addText((text) =>
				text
					.setPlaceholder("0")
					.setValue(String(this.plugin.settings.skipFirstPages))
					.onChange(async (value) => {
						const numValue = parseInt(value);
						if (!isNaN(numValue) && numValue >= 0) {
							this.plugin.settings.skipFirstPages = numValue;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName("Use Obsidian native PDF viewer")
			.setDesc(
				"Generate ![[pdf#page=X]] syntax instead of custom code blocks. Not recommended (slower, less control).",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useNativeViewer)
					.onChange(async (value) => {
						this.plugin.settings.useNativeViewer = value;
						await this.plugin.saveSettings();
					}),
			);

		// Show page number under page embeds setting
		new Setting(containerEl)
			.setName("Show page number under page embeds")
			.setDesc(
				"Display the page number below each embedded PDF page for easier reference.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showPageNumber)
					.onChange(async (value) => {
						this.plugin.settings.showPageNumber = value;
						await this.plugin.saveSettings();
					}),
			);

		// open pdf on that page when clicking the embed
		new Setting(containerEl)
			.setName("Open PDF at page when double clicking embed")
			.setDesc(
				"When double clicking on the embedded PDF page, open the PDF viewer at that specific page.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openAtPage)
					.onChange(async (value) => {
						this.plugin.settings.openAtPage = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
