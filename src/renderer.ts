async renderPDFPage(pdf: any, pageNumber: number) {
	const container = this.containerEl;
	container.empty();
	container.addClass("pdf-page-embed-container");

	// Get the specific page
	const page = await pdf.getPage(pageNumber);

	// Create wrapper for the canvas
	const canvasWrapper = container.createEl("div", {
		cls: "pdf-page-canvas-wrapper",
	});

	// Create canvas for rendering
	const canvas = canvasWrapper.createEl("canvas");
	canvas.addClass("pdf-page-canvas");

	// Get viewport and calculate scale to fit container width
	const baseViewport = page.getViewport({ scale: 1 });

	// Determine target width
	let targetWidth: number;

	if (this.width) {
		// User specified a custom width
		const tempDiv = document.createElement("div");
		tempDiv.style.width = this.width;
		tempDiv.style.position = "absolute";
		tempDiv.style.visibility = "hidden";
		document.body.appendChild(tempDiv);
		targetWidth = tempDiv.offsetWidth;
		document.body.removeChild(tempDiv);
	} else {
		// Default: use available content width, accounting for padding
		// Get the actual available width in the container
		const containerWidth = container.clientWidth || container.offsetWidth;
		const parentWidth = container.parentElement?.clientWidth || 800;

		// Use the smaller of container or parent width, minus padding
		const availableWidth = Math.min(containerWidth, parentWidth) - 32; // 32px for padding (16px * 2)
		targetWidth = availableWidth > 0 ? availableWidth : parentWidth - 32;
	}

	// Make sure we don't exceed the PDF's natural width (avoid upscaling)
	if (targetWidth > baseViewport.width) {
		targetWidth = baseViewport.width;
	}

	// Calculate scale to fit target width
	const scale = targetWidth / baseViewport.width;
	const viewport = page.getViewport({ scale: scale });

	const context = canvas.getContext("2d");
	canvas.height = viewport.height;
	canvas.width = viewport.width;

	// Render the page
	const renderContext = {
		canvasContext: context,
		viewport: viewport,
	};

	await page.render(renderContext).promise;
}
