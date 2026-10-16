# 描一描、塗一塗 — kids tracing & coloring (static site)

Run:  cd /workspace/coloring-site && python3 -m http.server 8765   → open http://localhost:8765/

Files: index.html, style.css, pictures.js (outline SVG paths, 100x100 box), app.js (drawing / fill / undo / save).
Tests (outside the site): /workspace/coloring-site-test/test.js  (node test.js, needs the server running).

## GitHub Pages 部署

此網站可透過 GitHub Pages 發布:

1. 進入 repository Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: **main**
4. Folder: **/ (root)**
5. 儲存後等待建置完成

網站 URL: https://sheldoncheng1001.github.io/kids-coloring/
