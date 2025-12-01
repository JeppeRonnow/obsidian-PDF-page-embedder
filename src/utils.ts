import { App, TFile, Notice } from "obsidian";
import { PDFDocument } from "pdf-lib";

export async function getPDFPageCount(app: App, file: TFile): Promise<number> {
	try {
		const arrayBuffer = await app.vault.readBinary(file);
		const pdfDoc = await PDFDocument.load(arrayBuffer);
		const pageCount = pdfDoc.getPageCount();
		return pageCount;
	} catch (error) {
		console.error("Error reading PDF:", error);
		new Notice("Could not read PDF page count. Defaulting to 1 page.");
		return 1;
	}
}

export function generatePageEmbeds(
	fileName: string,
	startPage: number,
	endPage: number,
	useNativeViewer: boolean,
): string {
	let content = "";

	if (useNativeViewer) {
		// Use native Obsidian syntax
		for (let i = startPage; i <= endPage; i++) {
			content += `![[${fileName}#page=${i}]]\n\n`;
		}
	} else {
		// Use custom code block syntax
		for (let i = startPage; i <= endPage; i++) {
			content += "```pdf-page\n";
			content += `${fileName}#${i}\n`;
			content += "```\n\n";
		}
	}

	return content;
}
