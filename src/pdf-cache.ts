import { PDFDocumentProxy } from "pdfjs-dist";

export class PDFCache {
	private cache: Map<
		string,
		{
			pdf: PDFDocumentProxy;
			refCount: number;
			lastUsed: number;
			cachedWidth?: number;
		}
	> = new Map();
	private pending: Map<string, Promise<PDFDocumentProxy>> = new Map();
	private maxCacheSize = 3; // Only keep 3 PDFs in memory max
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		// Run cleanup every 30 seconds
		this.cleanupInterval = setInterval(
			() => this.cleanupOldEntries(),
			30000,
		);
	}

	async get(
		filePath: string,
		loadFn: () => Promise<PDFDocumentProxy>,
	): Promise<PDFDocumentProxy> {
		// Return existing cached entry
		const existingEntry = this.cache.get(filePath);
		if (existingEntry) {
			existingEntry.refCount++;
			existingEntry.lastUsed = Date.now();
			return existingEntry.pdf;
		}

		// Deduplicate concurrent loads for the same file path.
		// If another caller is already loading this PDF, wait for that
		// same promise instead of spawning a duplicate load.
		let pendingPromise = this.pending.get(filePath);
		if (!pendingPromise) {
			pendingPromise = loadFn();
			this.pending.set(filePath, pendingPromise);
		}

		try {
			const pdf = await pendingPromise;

			// After await, check if another concurrent caller already cached it
			const existingNow = this.cache.get(filePath);
			if (existingNow) {
				existingNow.refCount++;
				existingNow.lastUsed = Date.now();
				return existingNow.pdf;
			}

			// Check if we need to evict old PDFs
			if (this.cache.size >= this.maxCacheSize) {
				this.evictOldest();
			}

			this.cache.set(filePath, {
				pdf,
				refCount: 1,
				lastUsed: Date.now(),
			});
			return pdf;
		} finally {
			this.pending.delete(filePath);
		}
	}

	release(filePath: string) {
		const entry = this.cache.get(filePath);
		if (!entry) return;

		// Guard against going below zero
		entry.refCount = Math.max(0, entry.refCount - 1);
		entry.lastUsed = Date.now();

		// Don't immediately destroy - let cleanup handle it
		// This prevents destroying PDFs that are still visible
	}

	private evictOldest() {
		let oldestPath: string | null = null;
		let oldestTime = Infinity;

		for (const [path, entry] of this.cache.entries()) {
			// Only evict if not currently in use
			if (entry.refCount <= 0 && entry.lastUsed < oldestTime) {
				oldestTime = entry.lastUsed;
				oldestPath = path;
			}
		}

		if (oldestPath) {
			const entry = this.cache.get(oldestPath);
			if (entry) {
				entry.pdf.destroy();
				this.cache.delete(oldestPath);
				console.log(`Evicted PDF from cache: ${oldestPath}`);
			}
		}
	}

	private cleanupOldEntries() {
		const now = Date.now();
		const maxAge = 60000; // 1 minute

		for (const [path, entry] of this.cache.entries()) {
			// Remove entries that haven't been used in a while and aren't in use
			if (entry.refCount <= 0 && now - entry.lastUsed > maxAge) {
				entry.pdf.destroy();
				this.cache.delete(path);
				console.log(`Cleaned up unused PDF: ${path}`);
			}
		}
	}

	clear() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}

		// Cancel any pending loads (they'll resolve but won't be cached
		// since we clear the cache)
		this.pending.clear();

		for (const entry of this.cache.values()) {
			entry.pdf.destroy();
		}
		this.cache.clear();
	}

	getCachedWidth(filePath: string): number | null {
		const entry = this.cache.get(filePath);
		return entry?.cachedWidth ?? null;
	}

	setCachedWidth(filePath: string, width: number) {
		const entry = this.cache.get(filePath);
		if (entry) {
			entry.cachedWidth = width;
		}
	}
}
