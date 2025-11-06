import { Plugin, MarkdownPostProcessorContext } from "obsidian";
import {
	PDFPageEmbedderSettings,
	DEFAULT_SETTINGS,
	PDFPageEmbedderSettingTab,
} from "./settings";
import { registerCommands } from "./commands";
import { PDFPageRenderer } from "./renderer";
import { createLivePreviewExtension } from "./live-preview";

export default class PDFPageEmbedderPlugin extends Plugin {
	settings: PDFPageEmbedderSettings;

	async onload() {
		await this.loadSettings();

		console.log("PDF Page Embedder: Plugin loaded");

		// Add settings tab
		this.addSettingTab(new PDFPageEmbedderSettingTab(this.app, this));

		// Register all commands
		registerCommands(this);

		// Register for Reading View
		this.registerMarkdownPostProcessor((element, context) => {
			console.log(
				"PDF Page Embedder: Post processor called (Reading View)",
			);
			this.processInlinePDFEmbeds(element, context);
		});

		// Register for Live Preview (Edit mode)
		this.registerEditorExtension(createLivePreviewExtension(this));
		console.log("PDF Page Embedder: Live Preview extension registered");
	}

	processInlinePDFEmbeds(
		element: HTMLElement,
		context: MarkdownPostProcessorContext,
	) {
		console.log("PDF Page Embedder: Processing element", element);

		const paragraphs = element.findAll("p");
		console.log("PDF Page Embedder: Found paragraphs:", paragraphs.length);

		for (const p of paragraphs) {
			const text = p.innerHTML;
			console.log("PDF Page Embedder: Checking paragraph text:", text);

			const regex = /!{{(.+?\.pdf)#page=(\d+)}}/g;

			if (!regex.test(text)) {
				console.log("PDF Page Embedder: No match in this paragraph");
				continue;
			}

			console.log("PDF Page Embedder: Found PDF syntax!");

			regex.lastIndex = 0;

			let match;
			const fragments: Array<{
				type: "text" | "pdf";
				content: string;
				pdfPath?: string;
				page?: number;
			}> = [];
			let lastIndex = 0;

			while ((match = regex.exec(text)) !== null) {
				console.log("PDF Page Embedder: Match found:", match);

				if (match.index > lastIndex) {
					fragments.push({
						type: "text",
						content: text.substring(lastIndex, match.index),
					});
				}

				fragments.push({
					type: "pdf",
					content: match[0],
					pdfPath: match[1],
					page: parseInt(match[2]),
				});

				lastIndex = regex.lastIndex;
			}

			if (lastIndex < text.length) {
				fragments.push({
					type: "text",
					content: text.substring(lastIndex),
				});
			}

			console.log("PDF Page Embedder: Fragments:", fragments);

			if (fragments.length > 0) {
				p.empty();

				for (const fragment of fragments) {
					if (fragment.type === "text") {
						const span = p.createSpan();
						span.innerHTML = fragment.content;
					} else if (
						fragment.type === "pdf" &&
						fragment.pdfPath &&
						fragment.page
					) {
						console.log(
							"PDF Page Embedder: Looking for file:",
							fragment.pdfPath,
						);

						const file =
							this.app.metadataCache.getFirstLinkpathDest(
								fragment.pdfPath,
								context.sourcePath,
							);

						console.log("PDF Page Embedder: File found:", file);

						if (file && file.extension === "pdf") {
							const container = p.createDiv();
							const renderer = new PDFPageRenderer(
								container,
								file,
								fragment.page,
								this.app,
							);
							context.addChild(renderer);
							console.log("PDF Page Embedder: Renderer created");
						} else {
							p.createSpan({
								cls: "pdf-error-message",
								text: `PDF not found: ${fragment.pdfPath}`,
							});
							console.log(
								"PDF Page Embedder: PDF file not found",
							);
						}
					}
				}
			}
		}
	}

	onunload() {
		console.log("PDF Page Embedder: Plugin unloaded");
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
