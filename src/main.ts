import { Plugin } from "obsidian";
import {
	PDFPageEmbedderSettings,
	DEFAULT_SETTINGS,
	PDFPageEmbedderSettingTab,
} from "./settings";
import { registerCommands } from "./commands";

export default class PDFPageEmbedderPlugin extends Plugin {
	settings: PDFPageEmbedderSettings;

	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new PDFPageEmbedderSettingTab(this.app, this));

		// Register all commands
		registerCommands(this);
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
