# PDF Page Embedder

Quickly embed all pages of a PDF file as individual page references in your Obsidian notes.

![Demo](demo.gif)

## Features

- Insert all PDF pages with a single command
- Custom PDF renderer with fast, clean, single-page view
- Multiple insertion modes (all pages, page ranges, single pages)
- Page rotation support (90°, 180°, 270°)
- Alignment options (left, center, right)
- Text selection and copying from embedded pages
- Optional page number display
- Double-click to open PDF at specific page
- Configurable settings for default behavior

## Usage

### Basic Workflow

1. Open a markdown note where you want to embed PDF pages
2. Run a command from the command palette (Ctrl/Cmd + P)
3. Select a PDF from the list (sorted by most recent)
4. Pages will be inserted at your cursor position

### Available Commands

- **Embed PDF as individual pages** - Insert all pages (respects skip settings)
- **Embed PDF from page to end** - Insert from a specific page to the end
- **Embed PDF page range** - Insert a specific range of pages
- **Embed single PDF page** - Insert just one page
- **Replace PDF filename in current file** - Rename all references to a PDF file in the current note

### Output Format

By default, uses custom code block syntax with fast rendering:
````markdown
```pdf-page
your-pdf.pdf#1
```
```pdf-page
your-pdf.pdf#2
```
````

### Advanced Syntax

Customize width, rotation, and alignment for individual pages:
````markdown
```pdf-page
your-pdf.pdf#5|width:100%|center
```
```pdf-page
your-pdf.pdf#10|width:600px|rotate:90|right
```
````

**Supported parameters:**
- `width`: Custom width (e.g., `100%`, `600px`, `80%`)
- `rotate`: Page rotation in degrees (`90`, `180`, or `270`)
- `center`: Center-align the embed
- `right`: Right-align the embed
- (default is left-aligned)

**Multi-line format:**
````markdown
```pdf-page
file: your-pdf.pdf
page: 5
width: 100%
rotate: 90
align: center
```
````

## Custom PDF Renderer

The plugin includes a custom PDF renderer that provides:

- **Fast rendering** - Loads once, renders specific pages quickly
- **Single-page view** - No scrolling, just the page you want
- **Automatic sizing** - Fits perfectly within your note width
- **Clean appearance** - No extra UI clutter

## Roadmap

### Planned Features
- Custom page format templates
- Every Nth page (useful for double-sided scans)
- Preview mode
- Custom separators

## Installation

### From Obsidian Community Plugins (coming soon)
1. Open **Settings → Community Plugins**
2. Search for "PDF Page Embedder"
3. Select **Install**, then **Enable**

### Manual Installation
1. Download the latest release from GitHub
2. Extract the files to your vault's `.obsidian/plugins/pdf-page-embedder/` folder
3. Reload Obsidian
4. Enable the plugin in **Settings → Community Plugins**

## Use Cases

- **Study notes** - Embed textbook or article pages for annotation
- **Lecture notes** - Embed presentation slides page by page
- **Research** - Reference specific pages from papers and documents
- **Documentation** - Include relevant manual or guide pages

## License

MIT License