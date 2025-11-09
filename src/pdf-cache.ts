export class PDFCache {
	private cache: Map<
		string,
		{ pdf: any; refCount: number; lastUsed: number; cachedWidth?: number }
	> = new Map();
	private maxCacheSize: number = 3; // Only keep 3 PDFs in memory max
	private cleanupInterval: any = null;

	constructor() {
		// Run cleanup every 30 seconds
		this.cleanupInterval = setInterval(
			() => this.cleanupOldEntries(),
			30000,
		);
	}

	async get(filePath: string, loadFn: () => Promise<any>): Promise<any> {
		if (this.cache.has(filePath)) {
			const entry = this.cache.get(filePath)!;
			entry.refCount++;
			entry.lastUsed = Date.now();
			return entry.pdf;
		}

		// Check if we need to evict old PDFs
		if (this.cache.size >= this.maxCacheSize) {
			this.evictOldest();
		}

		const pdf = await loadFn();
		this.cache.set(filePath, { pdf, refCount: 1, lastUsed: Date.now() });
		return pdf;
	}

	release(filePath: string) {
		const entry = this.cache.get(filePath);
		if (!entry) return;

		entry.refCount--;
		entry.lastUsed = Date.now();

		// Don't immediately destroy - let cleanup handle it
		// This prevents destroying PDFs that are still visible
	}

	private evictOldest() {
		let oldestPath: string | null = null;
		let oldestTime = Infinity;

		for (const [path, entry] of this.cache.entries()) {
			// Only evict if not currently in use
			if (entry.refCount === 0 && entry.lastUsed < oldestTime) {
				oldestTime = entry.lastUsed;
				oldestPath = path;
			}
		}

		if (oldestPath) {
			const entry = this.cache.get(oldestPath)!;
			entry.pdf.destroy();
			this.cache.delete(oldestPath);
			console.log(`Evicted PDF from cache: ${oldestPath}`);
		}
	}

	private cleanupOldEntries() {
		const now = Date.now();
		const maxAge = 60000; // 1 minute

		for (const [path, entry] of this.cache.entries()) {
			// Remove entries that haven't been used in a while and aren't in use
			if (entry.refCount === 0 && now - entry.lastUsed > maxAge) {
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
