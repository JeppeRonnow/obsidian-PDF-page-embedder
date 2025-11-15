import { Editor, Notice } from "obsidian";
import {
	PDFSelectorModal,
	PageRangeModal,
	StartPageModal,
	SinglePageModal,
	OldFilenameModal,
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
					plugin.settings.useNativeViewer,
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
						plugin.settings.useNativeViewer,
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
							plugin.settings.useNativeViewer,
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
					let content: string;

					if (plugin.settings.useNativeViewer) {
						content = `![[${file.name}#page=${page}]]\n`;
					} else {
						content = "```pdf-page\n";
						content += `${file.name}#${page}\n`;
						content += "```\n";
					}

					editor.replaceSelection(content);
					new Notice(`Inserted page ${page} from ${file.name}`);
				}).open();
			}).open();
		},
	});

	// Command 5: Replace PDF filename in current file
	plugin.addCommand({
		id: "replace-pdf-filename",
		name: "Replace PDF filename in current file",
		editorCallback: (editor: Editor) => {
			new OldFilenameModal(plugin.app, (oldFilename) => {
				// After getting old filename, show PDF selector for new file
				new PDFSelectorModal(plugin.app, async (newFile) => {
					const content = editor.getValue();
					const newFilename = newFile.name;

					// Count occurrences before replacing
					let occurrenceCount = 0;

					// Replace in pdf-page blocks (both formats)
					// Format 1: filename.pdf#5 or filename.pdf#5|width:100%
					const simpleRegex = new RegExp(
						`(${escapeRegExp(oldFilename)})(#\\d+)`,
						"g",
					);
					occurrenceCount += (content.match(simpleRegex) || [])
						.length;

					// Format 2: file: filename.pdf
					const multilineRegex = new RegExp(
						`(file:\\s*)${escapeRegExp(oldFilename)}`,
						"gi",
					);
					occurrenceCount += (content.match(multilineRegex) || [])
						.length;

					// Replace in native Obsidian links: ![[filename.pdf]] or ![[filename.pdf#page=5]]
					const nativeLinkRegex = new RegExp(
						`(!\\[\\[)${escapeRegExp(oldFilename)}((?:#page=\\d+)?\\]\\])`,
						"g",
					);
					occurrenceCount += (content.match(nativeLinkRegex) || [])
						.length;

					if (occurrenceCount === 0) {
						new Notice(
							`No references to "${oldFilename}" found in current file`,
						);
						return;
					}

					// Perform replacements
					let updatedContent = content;

					// Replace in pdf-page blocks - simple format
					updatedContent = updatedContent.replace(
						simpleRegex,
						`${newFilename}$2`,
					);

					// Replace in pdf-page blocks - multiline format
					updatedContent = updatedContent.replace(
						multilineRegex,
						`$1${newFilename}`,
					);

					// Replace in native links
					updatedContent = updatedContent.replace(
						nativeLinkRegex,
						`$1${newFilename}$2`,
					);

					// Update the editor content
					editor.setValue(updatedContent);

					new Notice(
						`Replaced ${occurrenceCount} reference(s) from "${oldFilename}" to "${newFilename}"`,
					);
				}).open();
			}).open();
		},
	});
}

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
