# PDF Page Embedder

Quickly embed all pages of a PDF file as individual page references in your Obsidian notes.

![Demo](demo.gif)

## Features

- 🚀 Insert all PDF pages with a single command
- ⚡ Custom PDF renderer - fast, clean, single-page view
- 🎯 Multiple insertion modes (all pages, page ranges, single pages)
- ⚙️ Configurable settings for default behavior

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
## Custom PDF Renderer

The plugin includes a custom PDF renderer that provides:

✅ **Fast rendering** - Loads once, renders specific pages quickly
✅ **Single-page view** - No scrolling, just the page you want
✅ **Automatic sizing** - Fits perfectly within your note width
✅ **Clean appearance** - No extra UI clutter

## TODO
### Planned Features
- [x] **Skip first N pages**
- [x] **Insert page range**
- [x] **Insert page range (from-to)**
- [x] **Custom PDF veiwer**

- [ ] **Custom page format templates**
- [ ] **Every Nth page** *(useful for double-sided scans)*
- [ ] **Preview mode**
- [ ] **Custom separators**

## Installation

### From Obsidian Community Plugins (comming!)
1. Open Settings → Community Plugins
2. Search for "PDF Page Embedder"
3. Click Install, then Enable

### Manual Installation
1. Download the latest release from GitHub
2. Extract the files to your vault's `.obsidian/plugins/pdf-page-embedder/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Use Cases

- 📚 Study notes: Embed textbook or article pages for annotation
- 🎓 Lecture notes: Embed presentation slides page by page

## License

MIT License
