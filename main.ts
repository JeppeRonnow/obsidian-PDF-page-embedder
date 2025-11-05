import {
	Plugin,
	TFile,
	Notice,
	SuggestModal,
	PluginSettingTab,
	Setting,
	App,
} from "obsidian";

interface PDFPageEmbedderSettings {
	skipFirstPages: number;
}

const DEFAULT_SETTINGS: PDFPageEmbedderSettings = {
	skipFirstPages: 0,
};

export default class PDFtoPageMdPlugin extends Plugin {
	settings: PDFPageEmbedderSettings;

	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new PDFPageEmbedderSettingTab(this.app, this));

		// Add command to convert PDF to pages
		this.addCommand({
			id: "convert-pdf-to-pages",
			name: "Embed PDF as individual pages",
			editorCallback: (editor) => {
				new PDFSelectorModal(this.app, async (file: TFile) => {
					// Get number of pages in PDF
					const pageCount = await this.getPDFPageCount(file);

					// Calculate starting page based on settings
					const startPage = this.settings.skipFirstPages + 1;

					if (startPage > pageCount) {
						new Notice(
							`PDF only has ${pageCount} pages. Cannot skip ${this.settings.skipFirstPages} pages.`,
						);
						return;
					}

					// Generate the page embeds
					let content = "";
					for (let i = startPage; i <= pageCount; i++) {
						content += `![[${file.name}#page=${i}]]\n`;
					}

					const pagesInserted =
						pageCount - this.settings.skipFirstPages;

					// Insert at cursor position
					editor.replaceSelection(content);

					if (this.settings.skipFirstPages > 0) {
						new Notice(
							`Inserted ${pagesInserted} pages from ${file.name} (skipped first ${this.settings.skipFirstPages})`,
						);
					} else {
						new Notice(
							`Inserted ${pagesInserted} pages from ${file.name}`,
						);
					}
				}).open();
			},
		});
	}

	onunload() {
		// Cleanup when plugin is disabled
	}

	async getPDFPageCount(file: TFile): Promise<number> {
		try {
			const arrayBuffer = await this.app.vault.readBinary(file);
			const uint8Array = new Uint8Array(arrayBuffer);
			const text = new TextDecoder("latin1").decode(uint8Array);

			// Count /Type /Page occurrences (simple method)
			const matches = text.match(/\/Type\s*\/Page[^s]/g);
			return matches ? matches.length : 1;
		} catch (error) {
			new Notice("Could not read PDF page count. Defaulting to 1 page.");
			return 1;
		}
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

class PDFSelectorModal extends SuggestModal<TFile> {
	onSelectCallback: (file: TFile) => void;

	constructor(app: any, onSelectCallback: (file: TFile) => void) {
		super(app);
		this.onSelectCallback = onSelectCallback;
	}

	getSuggestions(query: string): TFile[] {
		// Get all PDF files
		const pdfFiles = this.app.vault
			.getFiles()
			.filter((file: TFile) => file.extension === "pdf");

		// Sort by modification time (most recent first)
		pdfFiles.sort((a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime);

		// Filter by query if provided
		if (query) {
			return pdfFiles.filter((file: TFile) =>
				file.name.toLowerCase().includes(query.toLowerCase()),
			);
		}

		return pdfFiles;
	}

	renderSuggestion(file: TFile, el: HTMLElement) {
		el.createEl("div", { text: file.name });
		el.createEl("small", {
			text: file.path,
			cls: "pdf-selector-path",
		});
	}

	onChooseSuggestion(file: TFile) {
		this.onSelectCallback(file);
	}
}

class PDFPageEmbedderSettingTab extends PluginSettingTab {
	plugin: PDFtoPageMdPlugin;

	constructor(app: App, plugin: PDFtoPageMdPlugin) {
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
	}
}
