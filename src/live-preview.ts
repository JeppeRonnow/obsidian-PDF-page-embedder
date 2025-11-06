import { editorLivePreviewField } from "obsidian";
import {
	EditorView,
	Decoration,
	DecorationSet,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { PDFPageRenderer } from "./renderer";
import PDFPageEmbedderPlugin from "./main";

class PDFPageWidget extends WidgetType {
	pdfPath: string;
	page: number;
	plugin: PDFPageEmbedderPlugin;
	sourcePath: string;

	constructor(
		pdfPath: string,
		page: number,
		plugin: PDFPageEmbedderPlugin,
		sourcePath: string,
	) {
		super();
		this.pdfPath = pdfPath;
		this.page = page;
		this.plugin = plugin;
		this.sourcePath = sourcePath;
	}

	toDOM(): HTMLElement {
		// Create a wrapper that breaks to its own line
		const wrapper = createDiv({ cls: "pdf-page-live-preview-wrapper" });
		wrapper.style.display = "block";
		wrapper.style.margin = "1em 0";

		const container = wrapper.createDiv({
			cls: "pdf-page-live-preview-container",
		});

		const file = this.plugin.app.metadataCache.getFirstLinkpathDest(
			this.pdfPath,
			this.sourcePath,
		);

		if (!file || file.extension !== "pdf") {
			container.createDiv({
				cls: "pdf-error-message",
				text: `PDF not found: ${this.pdfPath}`,
			});
			return wrapper;
		}

		// Render the actual PDF page
		const renderer = new PDFPageRenderer(
			container,
			file,
			this.page,
			this.plugin.app,
		);
		renderer.load();

		return wrapper;
	}

	eq(other: PDFPageWidget): boolean {
		return other.pdfPath === this.pdfPath && other.page === this.page;
	}

	// This tells CodeMirror to ignore the content inside
	ignoreEvent(): boolean {
		return true;
	}
}

export function createLivePreviewExtension(plugin: PDFPageEmbedderPlugin) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const widgets: any[] = [];
				const regex = /!{{(.+?\.pdf)#page=(\d+)}}/g;

				const livePreviewField = view.state.field(
					editorLivePreviewField,
				);
				const file = livePreviewField?.file;
				const sourcePath = file?.path || "";

				for (let { from, to } of view.visibleRanges) {
					const text = view.state.doc.sliceString(from, to);
					let match;
					regex.lastIndex = 0;

					while ((match = regex.exec(text)) !== null) {
						const start = from + match.index;
						const end = start + match[0].length;
						const pdfPath = match[1];
						const page = parseInt(match[2]);

						// Use widget decoration instead of replace
						widgets.push(
							Decoration.widget({
								widget: new PDFPageWidget(
									pdfPath,
									page,
									plugin,
									sourcePath,
								),
								side: 1, // Place after the text
							}).range(end),
						);

						// Hide the original text
						widgets.push(
							Decoration.mark({
								class: "pdf-embed-hidden",
							}).range(start, end),
						);
					}
				}

				return Decoration.set(widgets, true);
			}

			destroy() {}
		},
		{
			decorations: (v) => v.decorations,
		},
	);
}
