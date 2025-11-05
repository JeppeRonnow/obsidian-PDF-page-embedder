import { TFile, Notice } from "obsidian";

export async function getPDFPageCount(app: any, file: TFile): Promise<number> {
	try {
		const arrayBuffer = await app.vault.readBinary(file);
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

export function generatePageEmbeds(
	fileName: string,
	startPage: number,
	endPage: number,
): string {
	let content = "";
	for (let i = startPage; i <= endPage; i++) {
		content += `![[${fileName}#page=${i}]]\n`;
	}
	return content;
}
