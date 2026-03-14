# PDF Page Embedder

Quickly embed all pages of a PDF file as individual page references in your Obsidian notes.

![Demo](demo.gif)

## Features

- Insert all PDF pages with a single command
- Multiple insertion modes (all pages, page ranges, single pages)
- Fast, clean single-page rendering — no scrolling, no UI clutter
- Page rotation support (90°, 180°, 270°)
- Alignment options (left, center, right)
- Text selection and copying from embedded pages
- Optional page number display
- Double-click to open PDF at specific page

## Usage

1. Open a markdown note where you want to embed PDF pages
2. Run a command from the command palette (Ctrl/Cmd + P)
3. Select a PDF from the list (sorted by most recent)
4. Pages will be inserted at your cursor position

### Syntax

By default, uses a custom code block with fast rendering:
````markdown
```pdf-page
your-pdf.pdf#1
```
```pdf-page
your-pdf.pdf#2
```
````

Customize width, rotation, and alignment per page:
````markdown
```pdf-page
your-pdf.pdf#5|width:100%|center
```
```pdf-page
your-pdf.pdf#10|width:600px|rotate:90|right
```
````

**Parameters:** `width` (e.g. `100%`, `600px`), `rotate` (`90`, `180`, `270`), `center`, `right` (default is left-aligned).

Multi-line format is also supported:
````markdown
```pdf-page
file: your-pdf.pdf
page: 5
width: 100%
rotate: 90
align: center
```
````

## Installation

1. Download the latest release from GitHub
2. Extract the files to your vault's `.obsidian/plugins/pdf-page-embedder/` folder
3. Reload Obsidian
4. Enable the plugin in **Settings → Community Plugins**

## License

MIT License
