(function () {
  'use strict';

  const COLORS = [
    ['紅色', '#ff4d4d'], ['橘色', '#ff9f1c'], ['黃色', '#ffd93d'], ['淺綠', '#9be15d'],
    ['綠色', '#2ec27e'], ['天藍', '#4cc9f0'], ['藍色', '#3a6bff'], ['紫色', '#9b5de5'],
    ['粉紅', '#ff70a6'], ['咖啡', '#a0622d'], ['黑色', '#2b2b2b'], ['白色', '#ffffff'],
  ];
  // Widths in "board units" (board = 1000 x 1000 units, independent of pixels).
  const SIZES = { pen: [5, 9, 15], brush: [16, 30, 52], eraser: [22, 44, 80] };
  const OUTLINE_W = 11;          // outline thickness in board units
  const LINE_STYLES = [
    { key: 'dashed', label: '虛線', color: '#b9b9b9', dash: true },
    { key: 'solid', label: '淡線', color: '#bdbdbd', dash: false },
    { key: 'dark', label: '深線', color: '#3b3b3b', dash: false },
  ];
  const MAX_UNDO = 12;
  const FILL_TOLERANCE = 60;     // max summed RGB difference still treated as "same region"

  const $ = (s) => document.querySelector(s);
  const board = $('#board'), stage = $('#stage');
  const userCv = $('#userLayer'), outCv = $('#outlineLayer');
  const userCtx = userCv.getContext('2d', { willReadFrequently: true });
  const outCtx = outCv.getContext('2d');
  const wallCv = document.createElement('canvas');           // hidden solid mask used as fill walls
  const wallCtx = wallCv.getContext('2d', { willReadFrequently: true });

  const state = {
    tool: 'pen', size: 1, color: COLORS[10][1], lineStyle: 0,
    pic: null, S: 1000, walls: null, undo: [], saved: new Map(),
    drawing: null,
  };

  // ---------- canvas sizing (backing store follows CSS size x devicePixelRatio) ----------
  function pickBackingSize() {
    const dpr = window.devicePixelRatio || 1;
    const css = Math.min(window.innerWidth, window.innerHeight);
    return Math.max(600, Math.min(1400, Math.round(css * dpr)));
  }
  function setupCanvases() {
    const S = pickBackingSize();
    state.S = S;
    for (const c of [userCv, outCv, wallCv]) { c.width = S; c.height = S; }
    layoutBoard();
  }
  function layoutBoard() {
    const r = stage.getBoundingClientRect();
    const side = Math.max(200, Math.floor(Math.min(r.width, r.height)));
    board.style.width = side + 'px';
    board.style.height = side + 'px';
  }
  window.addEventListener('resize', layoutBoard);
  if (window.ResizeObserver) new ResizeObserver(layoutBoard).observe(stage);
  window.addEventListener('orientationchange', () => setTimeout(layoutBoard, 200));

  // ---------- outline ----------
  function picturePath(pic) {
    return new Path2D(pic.paths.join(' '));
  }
  function drawOutline() {
    const S = state.S, k = S / 100, style = LINE_STYLES[state.lineStyle];
    outCtx.setTransform(1, 0, 0, 1, 0, 0);
    outCtx.clearRect(0, 0, S, S);
    wallCtx.setTransform(1, 0, 0, 1, 0, 0);
    wallCtx.clearRect(0, 0, S, S);
    if (!state.pic.paths.length) { state.walls = new Uint8Array(S * S); return; }
    const path = picturePath(state.pic);
    const lw = OUTLINE_W / 10;   // in 100-unit picture space
    for (const [ctx, color, dash] of [[outCtx, style.color, style.dash], [wallCtx, '#000', false]]) {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.setLineDash(dash ? [2.2, 1.8] : []);
      ctx.stroke(path);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // Build wall mask: any pixel the solid outline touches (incl. anti-aliased edge) is a wall.
    const d = wallCtx.getImageData(0, 0, S, S).data;
    const w = new Uint8Array(S * S);
    for (let i = 0, j = 3; i < w.length; i++, j += 4) if (d[j] > 40) w[i] = 1;
    state.walls = w;
  }

  // ---------- picture picker ----------
  function buildPicker() {
    const nav = $('#picker');
    for (const pic of window.PICTURES) {
      const b = document.createElement('button');
      b.className = 'pic'; b.dataset.id = pic.id; b.title = pic.name;
      const svg = pic.paths.length
        ? `<svg viewBox="0 0 100 100"><path d="${pic.paths.join(' ')}" fill="none" stroke="#5a4a3a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : `<svg viewBox="0 0 100 100"><rect x="12" y="12" width="76" height="76" rx="10" fill="none" stroke="#5a4a3a" stroke-width="3" stroke-dasharray="6 5"/><text x="50" y="62" font-size="30" text-anchor="middle">✨</text></svg>`;
      b.innerHTML = svg + `<span>${pic.name}</span>`;
      b.addEventListener('click', () => selectPicture(pic.id));
      nav.appendChild(b);
    }
  }
  function selectPicture(id) {
    if (state.pic && state.pic.id === id) return;
    if (state.pic) state.saved.set(state.pic.id, userCtx.getImageData(0, 0, state.S, state.S));
    state.pic = window.PICTURES.find((p) => p.id === id) || window.PICTURES[0];
    userCtx.clearRect(0, 0, state.S, state.S);
    const prev = state.saved.get(state.pic.id);
    if (prev) userCtx.putImageData(prev, 0, 0);
    state.undo = [];
    updateUndoBtn();
    drawOutline();
    document.querySelectorAll('.pic').forEach((b) => b.classList.toggle('active', b.dataset.id === state.pic.id));
  }

  // ---------- toolbar ----------
  function buildPalette() {
    const pal = $('#palette');
    for (const [name, hex] of COLORS) {
      const b = document.createElement('button');
      b.className = 'swatch'; b.style.background = hex; b.title = name; b.dataset.color = hex;
      b.setAttribute('aria-label', name);
      b.addEventListener('click', () => {
        state.color = hex;
        if (state.tool === 'eraser') setTool('brush');
        refreshUI();
      });
      pal.appendChild(b);
    }
  }
  function setTool(t) { state.tool = t; refreshUI(); }
  function refreshUI() {
    document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === state.tool));
    document.querySelectorAll('.size').forEach((b) => b.classList.toggle('active', +b.dataset.size === state.size));
    document.querySelectorAll('.swatch').forEach((b) => b.classList.toggle('active', b.dataset.color === state.color));
    document.documentElement.style.setProperty('--cur', state.tool === 'eraser' ? '#ccc' : state.color);
    $('#lineLabel').textContent = LINE_STYLES[state.lineStyle].label;
  }
  document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  document.querySelectorAll('.size').forEach((b) => b.addEventListener('click', () => { state.size = +b.dataset.size; refreshUI(); }));
  $('#undoBtn').addEventListener('click', undo);
  $('#clearBtn').addEventListener('click', clearAll);
  $('#saveBtn').addEventListener('click', savePNG);
  $('#lineBtn').addEventListener('click', () => {
    state.lineStyle = (state.lineStyle + 1) % LINE_STYLES.length;
    drawOutline(); refreshUI();
  });

  // ---------- undo ----------
  function pushUndo() {
    state.undo.push(userCtx.getImageData(0, 0, state.S, state.S));
    if (state.undo.length > MAX_UNDO) state.undo.shift();
    updateUndoBtn();
  }
  function undo() {
    const img = state.undo.pop();
    if (img) userCtx.putImageData(img, 0, 0);
    updateUndoBtn();
  }
  function updateUndoBtn() { $('#undoBtn').disabled = state.undo.length === 0; }
  function clearAll() {
    pushUndo();
    userCtx.clearRect(0, 0, state.S, state.S);
    toast('清乾淨了！按「上一步」可以救回來');
  }

  // ---------- drawing ----------
  function toBoard(e) {
    const r = userCv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * state.S / r.width, y: (e.clientY - r.top) * state.S / r.height };
  }
  function strokeWidthPx() { return SIZES[state.tool][state.size] * state.S / 1000; }

  function segment(a, b) {
    userCtx.beginPath();
    userCtx.moveTo(a.x, a.y);
    userCtx.lineTo(b.x, b.y);
    userCtx.stroke();
  }
  function dot(p) {
    userCtx.beginPath();
    userCtx.arc(p.x, p.y, userCtx.lineWidth / 2, 0, Math.PI * 2);
    userCtx.fill();
  }

  userCv.addEventListener('pointerdown', (e) => {
    if (state.drawing || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const p = toBoard(e);
    if (state.tool === 'fill') { pushUndo(); floodFill(Math.floor(p.x), Math.floor(p.y), state.color); return; }
    userCv.setPointerCapture(e.pointerId);
    pushUndo();
    userCtx.save();
    userCtx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
    userCtx.strokeStyle = userCtx.fillStyle = state.tool === 'eraser' ? '#000' : state.color;
    userCtx.lineWidth = strokeWidthPx();
    userCtx.lineCap = 'round'; userCtx.lineJoin = 'round';
    dot(p);
    state.drawing = { id: e.pointerId, last: p };
  });
  userCv.addEventListener('pointermove', (e) => {
    const d = state.drawing;
    if (!d || e.pointerId !== d.id) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      const p = toBoard(ev);
      segment(d.last, p);
      d.last = p;
    }
  });
  function endStroke(e) {
    const d = state.drawing;
    if (!d || e.pointerId !== d.id) return;
    userCtx.restore();
    state.drawing = null;
  }
  userCv.addEventListener('pointerup', endStroke);
  userCv.addEventListener('pointercancel', endStroke);
  userCv.addEventListener('contextmenu', (e) => e.preventDefault());
  // Stop iOS page bounce / pinch zoom while drawing.
  document.addEventListener('touchmove', (e) => { if (e.target.closest('#board')) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // ---------- paint bucket ----------
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

  function floodFill(sx, sy, hex) {
    const S = state.S, walls = state.walls;
    if (sx < 0 || sy < 0 || sx >= S || sy >= S) return;
    let seed = sy * S + sx;
    if (walls[seed]) {                       // tapped on a line: look for nearest open pixel
      seed = -1;
      for (let r = 1; r <= 8 && seed < 0; r++)
        for (let dy = -r; dy <= r && seed < 0; dy++)
          for (let dx = -r; dx <= r; dx++) {
            const x = sx + dx, y = sy + dy;
            if (x >= 0 && y >= 0 && x < S && y < S && !walls[y * S + x]) { seed = y * S + x; break; }
          }
      if (seed < 0) { state.undo.pop(); updateUndoBtn(); return; }
    }
    const img = userCtx.getImageData(0, 0, S, S), d = img.data;
    const N = S * S;
    // Composite user layer over white so transparent == white.
    const comp = new Uint8Array(N * 3);
    for (let i = 0, j = 0, k = 0; i < N; i++, j += 4, k += 3) {
      const a = d[j + 3], ia = 255 - a;
      comp[k] = (d[j] * a + 255 * ia) / 255;
      comp[k + 1] = (d[j + 1] * a + 255 * ia) / 255;
      comp[k + 2] = (d[j + 2] * a + 255 * ia) / 255;
    }
    const [fr, fg, fb] = hexToRgb(hex);
    const tr = comp[seed * 3], tg = comp[seed * 3 + 1], tb = comp[seed * 3 + 2];
    if (Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 6 && d[seed * 4 + 3] === 255) {
      state.undo.pop(); updateUndoBtn(); return;     // already that color
    }
    const match = (i) => {
      if (walls[i]) return false;
      const k = i * 3;
      return Math.abs(comp[k] - tr) + Math.abs(comp[k + 1] - tg) + Math.abs(comp[k + 2] - tb) <= FILL_TOLERANCE;
    };

    // Scanline flood fill.
    const filled = new Uint8Array(N);
    const stack = [seed];
    let minX = S, maxX = 0, minY = S, maxY = 0;
    while (stack.length) {
      const i = stack.pop();
      if (filled[i] || !match(i)) continue;
      const y = (i / S) | 0, row = y * S;
      let l = i - row, r = l;
      while (l > 0 && !filled[row + l - 1] && match(row + l - 1)) l--;
      while (r < S - 1 && !filled[row + r + 1] && match(row + r + 1)) r++;
      let upOpen = false, downOpen = false;
      for (let x = l; x <= r; x++) {
        const p = row + x;
        filled[p] = 1;
        if (y > 0) {
          const q = p - S, ok = !filled[q] && match(q);
          if (ok && !upOpen) stack.push(q);
          upOpen = ok;
        }
        if (y < S - 1) {
          const q = p + S, ok = !filled[q] && match(q);
          if (ok && !downOpen) stack.push(q);
          downOpen = ok;
        }
      }
      if (l < minX) minX = l; if (r > maxX) maxX = r;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }

    // Grow the fill a little so it tucks under the outline (and over the soft
    // anti-aliased edge of the child's strokes) -- no white halo along lines.
    const growWall = Math.ceil(OUTLINE_W * S / 1000 / 2) + 1;
    const growEdge = 2;
    const passes = Math.max(growWall, growEdge);
    minX = Math.max(0, minX - passes); maxX = Math.min(S - 1, maxX + passes);
    minY = Math.max(0, minY - passes); maxY = Math.min(S - 1, maxY + passes);
    let frontier = filled;
    for (let pass = 1; pass <= passes; pass++) {
      const next = new Uint8Array(N);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const i = y * S + x;
          if (filled[i]) continue;
          if (!((x > 0 && frontier[i - 1]) || (x < S - 1 && frontier[i + 1]) ||
                (y > 0 && frontier[i - S]) || (y < S - 1 && frontier[i + S]))) continue;
          const a = d[i * 4 + 3];
          if ((walls[i] && pass <= growWall) || (pass <= growEdge && a < 250 && a > 0 && !walls[i])) next[i] = 1;
        }
      }
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const i = y * S + x; if (next[i]) filled[i] = 1;
      }
      frontier = next;
    }

    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const i = y * S + x;
      if (!filled[i]) continue;
      const j = i * 4;
      d[j] = fr; d[j + 1] = fg; d[j + 2] = fb; d[j + 3] = 255;
    }
    userCtx.putImageData(img, 0, 0);
  }

  // ---------- save ----------
  function savePNG() {
    const S = state.S, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S, S);
    ctx.drawImage(userCv, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(outCv, 0, 0);
    c.toBlob((blob) => {
      const a = document.createElement('a');
      const t = new Date();
      const stamp = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}-${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}`;
      a.download = `我的畫-${state.pic.name}-${stamp}.png`;
      a.href = URL.createObjectURL(blob);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('圖片存好了！🎉');
    }, 'image/png');
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- init ----------
  setupCanvases();
  buildPicker();
  buildPalette();
  refreshUI();
  selectPicture(window.PICTURES[0].id);
  layoutBoard();
  window.__app = { state, floodFill, selectPicture, setTool };   // handy for testing
})();
