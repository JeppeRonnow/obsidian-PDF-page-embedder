# PDF Page Embedder

Quickly embed all pages of a PDF file as individual page references in your Obsidian notes.

## Features

- 🚀 Insert all PDF pages with a single command
- 📄 Automatically detects the number of pages in your PDF
- 🔍 Search and select from your most recently added PDFs
- ⚡ Simple and fast workflow

## Usage

1. Open a markdown note where you want to embed PDF pages
2. Run the command `Embed PDF as individual pages` (Ctrl/Cmd + P)
3. Select a PDF from the list (sorted by most recent)
4. All pages will be inserted at your cursor position

### Output Format
```markdown
![[your-pdf.pdf#page=1]]

![[your-pdf.pdf#page=2]]

![[your-pdf.pdf#page=3]]

![[your-pdf.pdf#page=4]]
```

Each page can be viewed, annotated, and referenced individually in Obsidian.

## Installation

### From Obsidian Community Plugins (Recommended)
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
- 📋 Documentation: Reference specific pages from PDF manuals
- 📝 Research: Quick access to journal article pages
- 🎓 Lecture notes: Embed presentation slides page by page

## License

MIT License
