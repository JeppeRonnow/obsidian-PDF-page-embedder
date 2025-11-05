import { Editor, Notice } from "obsidian";
import {
	PDFSelectorModal,
	PageRangeModal,
	StartPageModal,
	SinglePageModal,
} from "./modals";
import { getPDFPageCount, generatePageEmbeds } from "./utils";
import PDFPageEmbedderPlugin from "./main";

export function registerCommands(plugin: PDFPageEmbedderPlugin) {
	// Command 1: Embed all pages (with skip setting)
	plugin.addCommand({
		id: "convert-pdf-to-pages",
		name: "Embed PDF as individual pages",
		editorCallback: (editor: Editor) => {
			new PDFSelectorModal(plugin.app, async (file) => {
				const pageCount = await getPDFPageCount(plugin.app, file);
				const startPage = plugin.settings.skipFirstPages + 1;

				if (startPage > pageCount) {
					new Notice(
						`PDF only has ${pageCount} pages. Cannot skip ${plugin.settings.skipFirstPages} pages.`,
					);
					return;
				}

				const content = generatePageEmbeds(
					file.name,
					startPage,
					pageCount,
				);
				const pagesInserted =
					pageCount - plugin.settings.skipFirstPages;

				editor.replaceSelection(content);

				if (plugin.settings.skipFirstPages > 0) {
					new Notice(
						`Inserted ${pagesInserted} pages from ${file.name} (skipped first ${plugin.settings.skipFirstPages})`,
					);
				} else {
					new Notice(
						`Inserted ${pagesInserted} pages from ${file.name}`,
					);
				}
			}).open();
		},
	});

	// Command 2: Embed from specific page to end
	plugin.addCommand({
		id: "embed-pdf-from-page",
		name: "Embed PDF from page to end",
		editorCallback: (editor: Editor) => {
			new PDFSelectorModal(plugin.app, async (file) => {
				const pageCount = await getPDFPageCount(plugin.app, file);

				new StartPageModal(plugin.app, file, pageCount, (startPage) => {
					const content = generatePageEmbeds(
						file.name,
						startPage,
						pageCount,
					);
					const pagesInserted = pageCount - startPage + 1;

					editor.replaceSelection(content);
					new Notice(
						`Inserted ${pagesInserted} pages from ${file.name} (page ${startPage} to ${pageCount})`,
					);
				}).open();
			}).open();
		},
	});

	// Command 3: Embed specific page range
	plugin.addCommand({
		id: "embed-pdf-page-range",
		name: "Embed PDF page range",
		editorCallback: (editor: Editor) => {
			new PDFSelectorModal(plugin.app, async (file) => {
				const pageCount = await getPDFPageCount(plugin.app, file);

				new PageRangeModal(
					plugin.app,
					file,
					pageCount,
					(startPage, endPage) => {
						const content = generatePageEmbeds(
							file.name,
							startPage,
							endPage,
						);
						const pagesInserted = endPage - startPage + 1;

						editor.replaceSelection(content);
						new Notice(
							`Inserted ${pagesInserted} pages from ${file.name} (page ${startPage} to ${endPage})`,
						);
					},
				).open();
			}).open();
		},
	});
	// Command 4: Embed single page
	plugin.addCommand({
		id: "embed-pdf-single-page",
		name: "Embed single PDF page",
		editorCallback: (editor: Editor) => {
			new PDFSelectorModal(plugin.app, async (file) => {
				const pageCount = await getPDFPageCount(plugin.app, file);

				new SinglePageModal(plugin.app, file, pageCount, (page) => {
					const content = `![[${file.name}#page=${page}]]\n`;

					editor.replaceSelection(content);
					new Notice(`Inserted page ${page} from ${file.name}`);
				}).open();
			}).open();
		},
	});
}
