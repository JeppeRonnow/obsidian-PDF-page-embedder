import { TFile, Notice } from "obsidian";
import { PDFDocument } from "pdf-lib";

export async function getPDFPageCount(app: any, file: TFile): Promise<number> {
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
): string {
	let content = "";
	for (let i = startPage; i <= endPage; i++) {
		content += "```pdf-page\n";
		content += `${fileName}#${i}\n`;
		content += "```\n\n";
	}
	return content;
}
