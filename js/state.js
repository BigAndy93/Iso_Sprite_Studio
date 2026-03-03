/* ═══════════════════════════════════════════════════════
   state.js – single source of truth for Iso Sprite Studio
   ═══════════════════════════════════════════════════════ */

const S = {
  /* ── Sheet dimensions ── */
  sheetW: 512,
  sheetH: 512,

  /* ── Tile layout ── */
  tileW:  64,
  tileH:  64,
  tilesX:  4,
  tilesY:  4,

  /* ── ISO diamond guide ── */
  showIso:  false,
  diamondW: 64,
  diamondH: 32,
  isoOffsetX: 0,
  isoOffsetY: 0,

  /* ── Viewport overlays ── */
  showGrid:   true,
  showPivots: true,
  snapToPixel:true,

  /* ── Active tool ── */
  tool: 'pencil',  // pencil | eraser | fill | eyedropper | pivot | select

  /* ── Color & brush ── */
  color:    '#000000',
  opacity:  1.0,      // 0..1
  brushSize: 1,

  /* ── Pressure mode: what S Pen pressure controls ── */
  pressureMode: 'opacity',  // 'opacity' | 'size' | 'none'

  /* ── S Pen state ── */
  pen: {
    active:    false,
    pressure:  0,
    tiltX:     0,
    tiltY:     0,
    barrelBtn: false,
  },

  /* ── Viewport ── */
  zoom: 1.0,
  panX: 40,
  panY: 40,

  /* ── Active tile ── */
  activeTileX: 0,
  activeTileY: 0,

  /* ── Pivot points: key = "tx,ty" → {x, y} (local to tile) ── */
  pivots:      {},
  copiedPivot: null,

  /* ── Marquee selection: sheet-pixel coords ── */
  selection:   null,   // {x1,y1,x2,y2} or null
  isSelecting: false,

  /* ── Background removal ── */
  bgColor:     '#ffffff',
  bgTolerance: 15,
  bgScopeAll:  false,
  pickingBg:   false,

  /* ── Post-processing ── */
  fx: {
    enabled:      false,
    brightness:   0,
    contrast:     0,
    saturation:   0,
    hue:          0,
    outline:      false,
    outlineColor: '#000000',
    outlineSize:  1,
  },

  /* ── History ── */
  history:      [],
  historyIndex: -1,
  MAX_HISTORY:  60,

  /* ── Mouse / pointer state ── */
  mouse: {
    down:   false,
    button: 0,
    canvasX: 0,
    canvasY: 0,
    lastX:   0,
    lastY:   0,
  },

  /* ── Space-bar panning ── */
  panning:  false,
  panStart: { screenX: 0, screenY: 0, panX: 0, panY: 0 },

  /* ── ImageData at full sheet resolution ── */
  pixels: null,
};

/* ── Default 32-color palette ── */
S.palette = [
  '#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00',
  '#ff00ff','#00ffff','#ff8800','#8800ff','#0088ff','#ff0088',
  '#884400','#448800','#004488','#888888','#cccccc','#ffccaa',
  '#aaffcc','#ccaaff','#ffaacc','#aaccff','#ffff88','#88ffff',
  '#ff8888','#88ff88','#8888ff','#444444','#222222','#111111',
  '#e94560','#7c6af7',
];

/* ═══════════════════════════════════
   History helpers
   ═══════════════════════════════════ */

S.saveHistory = function () {
  // Remove redo tail
  S.history.splice(S.historyIndex + 1);
  const copy = new ImageData(
    new Uint8ClampedArray(S.pixels.data),
    S.pixels.width,
    S.pixels.height
  );
  S.history.push(copy);
  if (S.history.length > S.MAX_HISTORY) S.history.shift();
  S.historyIndex = S.history.length - 1;
};

S.undo = function () {
  if (S.historyIndex <= 0) return false;
  S.historyIndex--;
  S.pixels.data.set(S.history[S.historyIndex].data);
  return true;
};

S.redo = function () {
  if (S.historyIndex >= S.history.length - 1) return false;
  S.historyIndex++;
  S.pixels.data.set(S.history[S.historyIndex].data);
  return true;
};

/* ═══════════════════════════════════
   Pixel helpers
   ═══════════════════════════════════ */

S.idx = function (x, y) {
  return (y * S.pixels.width + x) * 4;
};

S.getPixel = function (x, y) {
  if (x < 0 || y < 0 || x >= S.pixels.width || y >= S.pixels.height) return null;
  const i = S.idx(x, y);
  const d = S.pixels.data;
  return [d[i], d[i+1], d[i+2], d[i+3]];
};

S.setPixel = function (x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= S.pixels.width || y >= S.pixels.height) return;
  const i = S.idx(x, y);
  const d = S.pixels.data;
  d[i]=r; d[i+1]=g; d[i+2]=b; d[i+3]=a;
};

/* ═══════════════════════════════════
   Pivot helpers
   ═══════════════════════════════════ */

S.pivotKey = (tx, ty) => `${tx},${ty}`;
S.getPivot  = (tx, ty) => S.pivots[S.pivotKey(tx, ty)] || null;
S.setPivot  = (tx, ty, x, y) => { S.pivots[S.pivotKey(tx, ty)] = { x, y }; };
S.clearPivot= (tx, ty) => { delete S.pivots[S.pivotKey(tx, ty)]; };

/* ═══════════════════════════════════
   Color conversion helpers
   ═══════════════════════════════════ */

S.hexToRgb = function (hex) {
  const n = parseInt(hex.replace('#',''), 16);
  return [(n>>16)&0xff, (n>>8)&0xff, n&0xff];
};

S.rgbToHex = function (r, g, b) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');
};

S.colorDist = function (r1,g1,b1, r2,g2,b2) {
  const dr=r1-r2, dg=g1-g2, db=b1-b2;
  return Math.sqrt(dr*dr + dg*dg + db*db);
};

/* ═══════════════════════════════════
   Sheet resize helper
   ═══════════════════════════════════ */

S.initPixels = function (w, h, keepData) {
  const newPx = new ImageData(w, h);
  if (keepData && S.pixels) {
    const minW = Math.min(S.pixels.width,  w);
    const minH = Math.min(S.pixels.height, h);
    for (let row = 0; row < minH; row++) {
      const src = row * S.pixels.width * 4;
      const dst = row * w * 4;
      newPx.data.set(S.pixels.data.subarray(src, src + minW * 4), dst);
    }
  }
  S.pixels = newPx;
  S.sheetW  = w;
  S.sheetH  = h;
};
