import { App, PluginSettingTab, Setting } from "obsidian";
import PDFPageEmbedderPlugin from "./main";

export interface PDFPageEmbedderSettings {
	skipFirstPages: number;
	useNativeViewer: boolean;
}

export const DEFAULT_SETTINGS: PDFPageEmbedderSettings = {
	skipFirstPages: 0,
	useNativeViewer: false,
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
	}
}
