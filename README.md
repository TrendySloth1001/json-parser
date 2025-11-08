# JSON Pretiffier

A small, pleasant JSON formatting web app built with TypeScript, HTML and CSS.

Features:
- Format JSON with selectable indentation (2, 4, tab)
- Minify JSON
- Copy formatted JSON to clipboard
- Download JSON as a file
- Lightweight error highlighting and helpful messages

How to run

1. Install dependencies:

```bash
cd json-parser
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Open http://localhost:5173 (Vite should print the address)

Build for production:

```bash
npm run build
npm run preview
```

Notes & assumptions

- This scaffold uses Vite + TypeScript. Install via npm or your preferred package manager.
- I kept the JS small and dependency-free so the app is fast and easy to maintain.

Next steps (optional)

- Add a dark/light theme toggle and persist preference
- Add example list, file drop support or paste detection
- Add unit tests for formatter functions (e.g., using Vitest)
- Add syntax-highlighting for output using Prism or highlight.js

Enjoy!
