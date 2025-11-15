import { App, SuggestModal, TFile, Modal, Setting, Notice } from "obsidian";

export class PDFSelectorModal extends SuggestModal<TFile> {
	onSelectCallback: (file: TFile) => void;

	constructor(app: App, onSelectCallback: (file: TFile) => void) {
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

export class PageRangeModal extends Modal {
	file: TFile;
	pageCount: number;
	onSubmit: (startPage: number, endPage: number) => void;
	startPageInput = "";
	endPageInput = "";

	constructor(
		app: App,
		file: TFile,
		pageCount: number,
		onSubmit: (startPage: number, endPage: number) => void,
	) {
		super(app);
		this.file = file;
		this.pageCount = pageCount;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.createEl("h2", { text: "Select page range" });
		contentEl.createEl("p", {
			text: `PDF: ${this.file.name} (${this.pageCount} pages)`,
			cls: "pdf-info",
		});

		new Setting(contentEl)
			.setName("Start page")
			.setDesc(`First page to embed (1-${this.pageCount})`)
			.addText((text) =>
				text
					.setPlaceholder("1")
					.setValue(this.startPageInput)
					.onChange((value) => {
						this.startPageInput = value;
					}),
			);

		new Setting(contentEl)
			.setName("End page")
			.setDesc(`Last page to embed (1-${this.pageCount})`)
			.addText((text) =>
				text
					.setPlaceholder(String(this.pageCount))
					.setValue(this.endPageInput)
					.onChange((value) => {
						this.endPageInput = value;
					}),
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Insert")
					.setCta()
					.onClick(() => {
						const start = parseInt(this.startPageInput) || 1;
						const end =
							parseInt(this.endPageInput) || this.pageCount;

						if (start < 1 || start > this.pageCount) {
							new Notice(
								`Start page must be between 1 and ${this.pageCount}`,
							);
							return;
						}

						if (end < 1 || end > this.pageCount) {
							new Notice(
								`End page must be between 1 and ${this.pageCount}`,
							);
							return;
						}

						if (start > end) {
							new Notice(
								"Start page must be less than or equal to end page",
							);
							return;
						}

						this.close();
						this.onSubmit(start, end);
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.close();
				}),
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class StartPageModal extends Modal {
	file: TFile;
	pageCount: number;
	onSubmit: (startPage: number) => void;
	startPageInput = "";

	constructor(
		app: App,
		file: TFile,
		pageCount: number,
		onSubmit: (startPage: number) => void,
	) {
		super(app);
		this.file = file;
		this.pageCount = pageCount;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.createEl("h2", { text: "Select starting page" });
		contentEl.createEl("p", {
			text: `PDF: ${this.file.name} (${this.pageCount} pages)`,
			cls: "pdf-info",
		});

		new Setting(contentEl)
			.setName("Start from page")
			.setDesc(
				`First page to embed (1-${this.pageCount}). Will embed from this page to the end.`,
			)
			.addText((text) =>
				text
					.setPlaceholder("1")
					.setValue(this.startPageInput)
					.onChange((value) => {
						this.startPageInput = value;
					}),
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Insert")
					.setCta()
					.onClick(() => {
						const start = parseInt(this.startPageInput) || 1;

						if (start < 1 || start > this.pageCount) {
							new Notice(
								`Start page must be between 1 and ${this.pageCount}`,
							);
							return;
						}

						this.close();
						this.onSubmit(start);
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.close();
				}),
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class SinglePageModal extends Modal {
	file: TFile;
	pageCount: number;
	onSubmit: (page: number) => void;
	pageInput = "";

	constructor(
		app: App,
		file: TFile,
		pageCount: number,
		onSubmit: (page: number) => void,
	) {
		super(app);
		this.file = file;
		this.pageCount = pageCount;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.createEl("h2", { text: "Select page to embed" });
		contentEl.createEl("p", {
			text: `PDF: ${this.file.name} (${this.pageCount} pages)`,
			cls: "pdf-info",
		});

		new Setting(contentEl)
			.setName("Page number")
			.setDesc(`Page to embed (1-${this.pageCount})`)
			.addText((text) =>
				text
					.setPlaceholder("1")
					.setValue(this.pageInput)
					.onChange((value) => {
						this.pageInput = value;
					}),
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Insert")
					.setCta()
					.onClick(() => {
						const page = parseInt(this.pageInput) || 1;

						if (page < 1 || page > this.pageCount) {
							new Notice(
								`Page must be between 1 and ${this.pageCount}`,
							);
							return;
						}

						this.close();
						this.onSubmit(page);
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.close();
				}),
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class OldFilenameModal extends Modal {
	onSubmit: (oldFilename: string) => void;
	filenameInput = "";

	constructor(app: App, onSubmit: (oldFilename: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.createEl("h2", { text: "Replace PDF filename" });
		contentEl.createEl("p", {
			text: "Enter the old/broken PDF filename to replace (e.g., 'oldfile.pdf')",
		});

		new Setting(contentEl)
			.setName("Old filename")
			.setDesc("The filename that needs to be replaced")
			.addText((text) =>
				text
					.setPlaceholder("oldfile.pdf")
					.setValue(this.filenameInput)
					.onChange((value) => {
						this.filenameInput = value;
					}),
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Next")
					.setCta()
					.onClick(() => {
						const filename = this.filenameInput.trim();

						if (!filename) {
							new Notice("Please enter a filename");
							return;
						}

						this.close();
						this.onSubmit(filename);
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.close();
				}),
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
