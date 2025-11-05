# PDF Page Embedder

Quickly embed all pages of a PDF file as individual page references in your Obsidian notes.

<div align="center">
  <img src="demo.gif" width="800" alt="Demo">
</div>[Demo](demo.gif)

## Features

- 🚀 Insert all PDF pages with a single command
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

## TODO
### Planned Features
- [ ] **Skip first N pages**
- [ ] **Insert page range**
- [ ] **Insert page range (from-to)**
- [ ] **Custom page format templates**
- [ ] **Every Nth page** *(useful for double-sided scans)*
- [ ] **Preview mode**
- [ ] **Custom separators**
- [ ] **Hotkey support for quick access**

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
