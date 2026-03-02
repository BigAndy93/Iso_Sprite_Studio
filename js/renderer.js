/* ═══════════════════════════════════════════════════════
   renderer.js  –  All canvas drawing.  Never touches DOM
   controls; only reads S (state) and draws.
   ═══════════════════════════════════════════════════════ */

const Renderer = (() => {

  let checkerCtx, spriteCtx, overlayCtx, wrapper, areaEl;
  let selDashOffset = 0;

  /* ──────────────────────────────────────────
     Init: cache DOM references
     ────────────────────────────────────────── */
  function init() {
    checkerCtx = document.getElementById('checker-canvas').getContext('2d');
    spriteCtx  = document.getElementById('sprite-canvas').getContext('2d');
    overlayCtx = document.getElementById('overlay-canvas').getContext('2d');
    wrapper    = document.getElementById('canvas-wrapper');
    areaEl     = document.getElementById('canvas-area');
  }

  /* ──────────────────────────────────────────
     Viewport transform  (zoom + pan via CSS)
     ────────────────────────────────────────── */
  function applyTransform() {
    wrapper.style.transform =
      `translate(${S.panX}px,${S.panY}px) scale(${S.zoom})`;
  }

  /* ──────────────────────────────────────────
     Resize all three canvases
     ────────────────────────────────────────── */
  function resizeCanvases(w, h) {
    for (const ctx of [checkerCtx, spriteCtx, overlayCtx]) {
      ctx.canvas.width  = w;
      ctx.canvas.height = h;
    }
    wrapper.style.width  = w + 'px';
    wrapper.style.height = h + 'px';
  }

  /* ──────────────────────────────────────────
     Checkerboard  (drawn once; redraw on resize)
     ────────────────────────────────────────── */
  function drawChecker() {
    const ctx  = checkerCtx;
    const w    = ctx.canvas.width;
    const h    = ctx.canvas.height;
    const size = 8;

    ctx.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        const even = ((x / size + y / size) & 1) === 0;
        ctx.fillStyle = even ? '#444460' : '#333350';
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  /* ──────────────────────────────────────────
     Sprite data → sprite canvas
     When FX is enabled, show the processed preview.
     ────────────────────────────────────────── */
  function drawSprite() {
    const data = (S.fx.enabled && typeof Effects !== 'undefined')
      ? Effects.computeFxPreview()
      : S.pixels;
    spriteCtx.putImageData(data, 0, 0);
  }

  /* ──────────────────────────────────────────
     Overlay: grid + ISO diamonds + pivots + selection
     ────────────────────────────────────────── */
  function drawOverlay() {
    const ctx = overlayCtx;
    const w   = ctx.canvas.width;
    const h   = ctx.canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (S.showGrid)   _drawGrid(ctx);
    if (S.showIso)    _drawIso(ctx);
    if (S.showPivots) _drawPivots(ctx);
    if (S.selection)  _drawSelection(ctx);
  }

  /* ── Tile grid ── */
  function _drawGrid(ctx) {
    const lw = Math.max(0.5, 1 / S.zoom);

    // Minor lines (every tile)
    ctx.strokeStyle = 'rgba(200,200,255,0.12)';
    ctx.lineWidth   = lw;
    ctx.beginPath();
    for (let x = 0; x <= S.sheetW; x += S.tileW) {
      ctx.moveTo(x, 0); ctx.lineTo(x, S.sheetH);
    }
    for (let y = 0; y <= S.sheetH; y += S.tileH) {
      ctx.moveTo(0, y); ctx.lineTo(S.sheetW, y);
    }
    ctx.stroke();

    // Active tile highlight
    ctx.strokeStyle = 'rgba(124,106,247,0.8)';
    ctx.lineWidth   = lw * 1.5;
    ctx.strokeRect(
      S.activeTileX * S.tileW,
      S.activeTileY * S.tileH,
      S.tileW, S.tileH
    );
  }

  /* ── ISO floor diamond ── */
  function _drawIso(ctx) {
    const hw = S.diamondW / 2;
    const hh = S.diamondH / 2;
    const lw = Math.max(0.5, 1 / S.zoom);

    ctx.lineWidth   = lw;

    for (let ty = 0; ty < S.tilesY; ty++) {
      for (let tx = 0; tx < S.tilesX; tx++) {
        const cx = tx * S.tileW + S.tileW / 2;
        const cy = ty * S.tileH + S.tileH / 2;

        // Gradient from magenta to cyan per tile for visual variety
        ctx.strokeStyle = 'rgba(233,69,96,0.55)';
        ctx.fillStyle   = 'rgba(233,69,96,0.04)';

        ctx.beginPath();
        ctx.moveTo(cx,      cy - hh);  // top
        ctx.lineTo(cx + hw, cy);       // right
        ctx.lineTo(cx,      cy + hh);  // bottom
        ctx.lineTo(cx - hw, cy);       // left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  /* ── Pivot crosshairs ── */
  function _drawPivots(ctx) {
    const r  = Math.max(4, 5 / S.zoom);
    const lw = Math.max(0.5, 1 / S.zoom);

    for (const key in S.pivots) {
      const [txStr, tyStr] = key.split(',');
      const tx = parseInt(txStr, 10);
      const ty = parseInt(tyStr, 10);
      const p  = S.pivots[key];
      const px = tx * S.tileW + p.x;
      const py = ty * S.tileH + p.y;

      // Shadow for legibility
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth   = lw * 2.5;
      ctx.beginPath();
      ctx.moveTo(px - r, py); ctx.lineTo(px + r, py);
      ctx.moveTo(px, py - r); ctx.lineTo(px, py + r);
      ctx.stroke();

      // Cross
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth   = lw * 1.2;
      ctx.beginPath();
      ctx.moveTo(px - r, py); ctx.lineTo(px + r, py);
      ctx.moveTo(px, py - r); ctx.lineTo(px, py + r);
      ctx.stroke();

      // Centre circle
      ctx.beginPath();
      ctx.arc(px, py, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#e94560';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = lw * 0.7;
      ctx.stroke();
    }
  }

  /* ── Marching ants selection ── */
  function _drawSelection(ctx) {
    if (!S.selection) return;
    let { x1, y1, x2, y2 } = S.selection;
    if (x1 > x2) [x1, x2] = [x2, x1];
    if (y1 > y2) [y1, y2] = [y2, y1];
    const lw   = Math.max(0.5, 1 / S.zoom);
    const dash = Math.max(2, 4 / S.zoom);

    ctx.save();
    ctx.setLineDash([dash, dash * 0.5]);
    ctx.lineDashOffset = -selDashOffset / S.zoom;
    ctx.strokeStyle    = '#7c6af7';
    ctx.lineWidth      = lw;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    // White outline underneath for contrast
    ctx.setLineDash([dash, dash * 0.5]);
    ctx.lineDashOffset = (-selDashOffset / S.zoom) + dash;
    ctx.strokeStyle    = 'rgba(255,255,255,0.5)';
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.restore();
  }

  /* ──────────────────────────────────────────
     Cursor / hover preview dot on overlay
     (drawn WITHOUT flushing full overlay)
     ────────────────────────────────────────── */
  function drawCursorPreview(sheetX, sheetY, color, alpha) {
    const ctx = overlayCtx;
    // Redraw the full overlay first (clears previous preview)
    drawOverlay();

    const [r, g, b] = S.hexToRgb(color);
    const half = Math.floor(S.brushSize / 2);
    const a    = Math.round(alpha * 200); // semi-transparent preview

    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const x = sheetX + dx;
        const y = sheetY + dy;
        if (x < 0 || y < 0 || x >= S.sheetW || y >= S.sheetH) continue;
        ctx.fillStyle = `rgba(${r},${g},${b},${a/255})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Also draw a 1px outline around the brush area for clarity
    if (S.brushSize > 1) {
      const lw = Math.max(0.5, 0.5 / S.zoom);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth   = lw;
      ctx.strokeRect(
        sheetX - half - 0.5,
        sheetY - half - 0.5,
        S.brushSize + 1,
        S.brushSize + 1
      );
    }
  }

  /* ──────────────────────────────────────────
     Selection animation tick
     ────────────────────────────────────────── */
  function setSelectionDashOffset(offset) {
    selDashOffset = offset;
  }

  /* ──────────────────────────────────────────
     Coordinate conversion helpers
     (used by tools.js)
     ────────────────────────────────────────── */

  /** Screen (client) coords → sheet pixel coords (floor). */
  function screenToSheet(screenX, screenY) {
    const rect = areaEl.getBoundingClientRect();
    return {
      x: Math.floor((screenX - rect.left - S.panX) / S.zoom),
      y: Math.floor((screenY - rect.top  - S.panY) / S.zoom),
    };
  }

  /** Sheet pixel → tile indices {tx, ty}. */
  function sheetToTile(sx, sy) {
    return {
      tx: Math.max(0, Math.min(S.tilesX - 1, Math.floor(sx / S.tileW))),
      ty: Math.max(0, Math.min(S.tilesY - 1, Math.floor(sy / S.tileH))),
    };
  }

  /* ──────────────────────────────────────────
     Full redraw convenience
     ────────────────────────────────────────── */
  function redrawAll() {
    drawSprite();
    drawOverlay();
  }

  return {
    init,
    applyTransform,
    resizeCanvases,
    drawChecker,
    drawSprite,
    drawOverlay,
    drawCursorPreview,
    setSelectionDashOffset,
    screenToSheet,
    sheetToTile,
    redrawAll,
  };

})();
