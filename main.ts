import { Plugin, TFile, Notice, SuggestModal } from "obsidian";

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class PDFPageEmbedderPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// Add command to convert PDF to pages
		this.addCommand({
			id: "embed-PDF-as-individual-pages",
			name: "Embed PDF as individual pages",
			editorCallback: (editor) => {
				new PDFSelectorModal(this.app, async (file: TFile) => {
					// Get number of pages in PDF
					const pageCount = await this.getPDFPageCount(file);

					// Generate the page embeds
					let content = "";
					for (let i = 1; i <= pageCount; i++) {
						content += `![[${file.name}#page=${i}]]\n\n`;
					}

					// Insert at cursor position
					editor.replaceSelection(content);
					new Notice(`Inserted ${pageCount} pages from ${file.name}`);
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
