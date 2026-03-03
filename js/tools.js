/* ═══════════════════════════════════════════════════════
   tools.js  –  All pointer input handling.
   Supports: mouse, touch (with pinch-zoom + two-finger pan),
             Samsung S Pen (pressure → opacity/size, barrel btn → eraser,
             hover preview before pen touches screen).
   ═══════════════════════════════════════════════════════ */

const Tools = (() => {

  /* ──────────────────────────────────────────
     Active pointer tracking for gestures
     Key: pointerId → {x, y, type}
     ────────────────────────────────────────── */
  const activePointers = new Map();
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let pinchStartPanX = 0;
  let pinchStartPanY = 0;
  let pinchMidX = 0;
  let pinchMidY = 0;
  let prevMidX = 0;   // for two-finger pan delta
  let prevMidY = 0;

  /* ──────────────────────────────────────────
     init: attach all pointer events to overlay
     ────────────────────────────────────────── */
  function init() {
    const el = document.getElementById('overlay-canvas');

    // touch-action MUST be none so the browser doesn't intercept pan/zoom
    el.style.touchAction = 'none';

    el.addEventListener('pointerdown',   onPointerDown,  { passive: false });
    el.addEventListener('pointermove',   onPointerMove,  { passive: false });
    el.addEventListener('pointerup',     onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('pointerleave',  onPointerLeave);

    // Prevent right-click context menu on canvas
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* ──────────────────────────────────────────
     S Pen helpers
     ────────────────────────────────────────── */

  function isPenBarrelButton(e) {
    // Bit 5 (value 32) = barrel button on Samsung S Pen / Wacom stylus
    return e.pointerType === 'pen' && (e.buttons & 32) !== 0;
  }

  function getEffectiveTool(e) {
    if (isPenBarrelButton(e))                          return 'eraser';
    if (e.pointerType === 'mouse' && e.button === 1)   return '__pan__';
    if (e.pointerType === 'mouse' && e.button === 2)   return 'eyedropper';
    return S.tool;
  }

  /** Returns the effective draw opacity accounting for S Pen pressure. */
  function getEffectiveOpacity(e) {
    if (e.pointerType === 'pen' && e.pressure > 0) {
      if (S.pressureMode === 'opacity') {
        // Map pressure 0.0–1.0 → opacity 0.08–1.0 (never fully invisible)
        return Math.max(0.08, e.pressure);
      }
    }
    return S.opacity;
  }

  /** Returns effective brush size accounting for S Pen pressure. */
  function getEffectiveBrushSize(e) {
    if (e.pointerType === 'pen' && e.pressure > 0 && S.pressureMode === 'size') {
      // pressure 0..1 → 1..brushSize*2, minimum 1
      return Math.max(1, Math.round(S.brushSize * e.pressure * 2));
    }
    return S.brushSize;
  }

  /** Update the pen indicator bar in the toolbar. */
  function updatePenUI(e) {
    if (e.pointerType !== 'pen') return;

    S.pen.active    = true;
    S.pen.pressure  = e.pressure;
    S.pen.tiltX     = e.tiltX || 0;
    S.pen.tiltY     = e.tiltY || 0;
    S.pen.barrelBtn = isPenBarrelButton(e);

    // Show pen indicator
    const indicator = document.getElementById('pen-indicator');
    if (indicator) indicator.classList.remove('hidden');

    const bar = document.getElementById('pen-bar');
    if (bar) bar.style.width = (e.pressure * 100) + '%';

    // Show pen settings in tools panel
    const penSettings = document.getElementById('pen-settings');
    if (penSettings) penSettings.classList.remove('hidden');
    const dPenRow = document.getElementById('d-pen-row');
    if (dPenRow) dPenRow.classList.remove('hidden');

    // Update status bar pen info
    const stPen = document.getElementById('st-pen');
    if (stPen) {
      stPen.textContent = `✒ ${Math.round(e.pressure * 100)}%` +
        (S.pen.barrelBtn ? ' [Eraser]' : '') +
        (S.pen.tiltX !== 0 ? ` tilt(${S.pen.tiltX}°,${S.pen.tiltY}°)` : '');
    }
  }

  /* ──────────────────────────────────────────
     Pointer event handlers
     ────────────────────────────────────────── */

  function onPointerDown(e) {
    e.preventDefault();

    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });

    // Two or more pointers → gesture mode, cancel drawing
    if (activePointers.size >= 2) {
      S.mouse.down = false;
      _startGesture();
      return;
    }

    // Space-bar pan mode
    if (window.isSpacePanning && window.isSpacePanning()) {
      S.panning = true;
      S.panStart = { screenX: e.clientX, screenY: e.clientY,
                     panX: S.panX, panY: S.panY };
      return;
    }

    updatePenUI(e);

    const { x, y } = Renderer.screenToSheet(e.clientX, e.clientY);
    const tool     = getEffectiveTool(e);

    // Middle mouse → pan
    if (tool === '__pan__') {
      S.panning  = true;
      S.panStart = { screenX: e.clientX, screenY: e.clientY,
                     panX: S.panX, panY: S.panY };
      return;
    }

    S.mouse.down   = true;
    S.mouse.button = e.button;
    S.mouse.canvasX = x;
    S.mouse.canvasY = y;
    S.mouse.lastX   = x;
    S.mouse.lastY   = y;

    // Update active tile on any click (except fill/eyedropper – handled per-op)
    const { tx, ty } = Renderer.sheetToTile(x, y);
    if (tx !== S.activeTileX || ty !== S.activeTileY) {
      S.activeTileX = tx;
      S.activeTileY = ty;
      if (typeof UI !== 'undefined') {
        UI.updatePivotPanel();
        UI.updateActiveTileLabel();
      }
    }

    switch (tool) {
      case 'pencil':
        S.saveHistory();
        _paintPixelBlock(x, y, false,
          getEffectiveOpacity(e), getEffectiveBrushSize(e));
        Renderer.drawSprite();
        Renderer.drawOverlay();
        break;

      case 'eraser':
        S.saveHistory();
        _paintPixelBlock(x, y, true,
          getEffectiveOpacity(e), getEffectiveBrushSize(e));
        Renderer.drawSprite();
        Renderer.drawOverlay();
        break;

      case 'fill':
        S.saveHistory();
        _floodFill(x, y);
        Renderer.drawSprite();
        Renderer.drawOverlay();
        break;

      case 'eyedropper':
        _pickColor(x, y);
        break;

      case 'pivot':
        _placePivot(x, y);
        break;

      case 'select':
        S.selection  = { x1: x, y1: y, x2: x, y2: y };
        S.isSelecting = true;
        break;
    }

    // If we are in BG-pick mode
    if (S.pickingBg) {
      const px = S.getPixel(x, y);
      if (px) {
        const hex = S.rgbToHex(px[0], px[1], px[2]);
        S.bgColor = hex;
        document.getElementById('bg-color').value = hex;
        const dBg = document.getElementById('d-bg-color');
        if (dBg) dBg.value = hex;
      }
      S.pickingBg = false;
      document.getElementById('overlay-canvas').style.cursor = 'crosshair';
    }
  }

  function onPointerMove(e) {
    e.preventDefault();

    // Update pointer position for gesture tracking
    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    }

    // Gesture (pinch/two-finger pan)
    if (activePointers.size >= 2) {
      _updateGesture();
      return;
    }

    updatePenUI(e);

    const { x, y } = Renderer.screenToSheet(e.clientX, e.clientY);

    // Update status bar
    if (typeof UI !== 'undefined') UI.updateStatusBar(x, y);

    // Pan mode
    if (S.panning) {
      S.panX = S.panStart.panX + (e.clientX - S.panStart.screenX);
      S.panY = S.panStart.panY + (e.clientY - S.panStart.screenY);
      Renderer.applyTransform();
      return;
    }

    // Hover preview (pen hovering, not touching – also shows for mouse)
    if (!S.mouse.down) {
      Renderer.drawCursorPreview(x, y, S.color, S.opacity);
      return;
    }

    // ── Drawing ──
    // Use coalesced events for maximum fidelity on fast S Pen strokes
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];

    switch (S.tool) {
      case 'pencil':
      case 'eraser': {
        const isEraser = S.tool === 'eraser' || isPenBarrelButton(e);
        for (const ce of events) {
          const cp   = Renderer.screenToSheet(ce.clientX, ce.clientY);
          const op   = getEffectiveOpacity(ce);
          const sz   = getEffectiveBrushSize(ce);
          _paintLine(S.mouse.lastX, S.mouse.lastY, cp.x, cp.y, isEraser, op, sz);
          S.mouse.lastX = cp.x;
          S.mouse.lastY = cp.y;
        }
        Renderer.drawSprite();
        Renderer.drawOverlay();
        break;
      }

      case 'select':
        if (S.isSelecting) {
          S.selection.x2 = x;
          S.selection.y2 = y;
          Renderer.drawOverlay();
        }
        break;
    }

    S.mouse.canvasX = x;
    S.mouse.canvasY = y;
  }

  function onPointerUp(e) {
    activePointers.delete(e.pointerId);

    // Reset pinch state when fewer than 2 pointers remain
    if (activePointers.size < 2) {
      pinchStartDist = 0;
    }

    S.mouse.down  = false;
    S.panning     = false;
    S.isSelecting = false;

    if (e.pointerType === 'pen') {
      S.pen.active   = false;
      S.pen.pressure = 0;
    }

    if (typeof UI !== 'undefined') UI.updateTileNav();
    Renderer.drawOverlay();
  }

  function onPointerLeave(e) {
    // Only hide pen indicator if no other pointers remain
    if (activePointers.size <= 1) {
      activePointers.delete(e.pointerId);
      S.mouse.down = false;
    }
    // Clear hover preview
    Renderer.drawOverlay();
  }

  /* ──────────────────────────────────────────
     Gesture: pinch-zoom + two-finger pan
     ────────────────────────────────────────── */

  function _startGesture() {
    pinchStartDist = 0; // will be set on first _updateGesture
    pinchStartZoom = S.zoom;
    pinchStartPanX = S.panX;
    pinchStartPanY = S.panY;
    prevMidX = 0;
    prevMidY = 0;
  }

  function _updateGesture() {
    const pts = Array.from(activePointers.values());
    if (pts.length < 2) return;

    const p1 = pts[0], p2 = pts[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const mid  = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    if (pinchStartDist === 0) {
      // First update: establish baseline
      pinchStartDist = dist;
      pinchStartZoom = S.zoom;
      pinchMidX = mid.x;
      pinchMidY = mid.y;
      prevMidX  = mid.x;
      prevMidY  = mid.y;
      return;
    }

    const area = document.getElementById('canvas-area').getBoundingClientRect();
    const mx   = mid.x - area.left;
    const my   = mid.y - area.top;

    const newZoom = Math.min(32, Math.max(0.1,
      pinchStartZoom * (dist / pinchStartDist)
    ));

    // Zoom towards the finger midpoint
    S.panX = mx - (mx - S.panX) * (newZoom / S.zoom);
    S.panY = my - (my - S.panY) * (newZoom / S.zoom);
    S.zoom = newZoom;

    // Two-finger pan: follow midpoint movement
    S.panX += mid.x - prevMidX;
    S.panY += mid.y - prevMidY;
    prevMidX = mid.x;
    prevMidY = mid.y;

    Renderer.applyTransform();
    if (typeof UI !== 'undefined') UI.updateZoomLabel();
  }

  /* ──────────────────────────────────────────
     Drawing primitives
     ────────────────────────────────────────── */

  /** Bresenham line between two sheet pixels. */
  function _paintLine(x0, y0, x1, y1, isEraser, opacity, brushSize) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      _paintPixelBlock(x0, y0, isEraser, opacity, brushSize);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx)  { err += dx; y0 += sy; }
    }
  }

  /** Paint a square brush block centred on (cx, cy). */
  function _paintPixelBlock(cx, cy, isEraser, opacity, brushSize) {
    brushSize = brushSize || S.brushSize;
    const half = Math.floor(brushSize / 2);
    const [r, g, b] = S.hexToRgb(S.color);
    const fgAlpha   = Math.round(opacity * 255);

    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = cx + dx, py = cy + dy;
        if (isEraser) {
          S.setPixel(px, py, 0, 0, 0, 0);
        } else {
          // Alpha-composite over existing pixel
          const existing = S.getPixel(px, py);
          if (!existing) continue;
          const [er, eg, eb, ea] = existing;
          const fa = fgAlpha / 255;
          const ba = ea / 255;
          const oa = fa + ba * (1 - fa);
          if (oa < 0.001) { S.setPixel(px, py, 0, 0, 0, 0); continue; }
          S.setPixel(px, py,
            Math.round((r  * fa + er * ba * (1 - fa)) / oa),
            Math.round((g  * fa + eg * ba * (1 - fa)) / oa),
            Math.round((b  * fa + eb * ba * (1 - fa)) / oa),
            Math.round(oa * 255)
          );
        }
      }
    }
  }

  /* ──────────────────────────────────────────
     Flood fill  (4-connected, stack-based)
     ────────────────────────────────────────── */
  function _floodFill(startX, startY) {
    const target = S.getPixel(startX, startY);
    if (!target) return;
    const [tr, tg, tb, ta] = target;
    const [fr, fg, fb]     = S.hexToRgb(S.color);
    const fa               = Math.round(S.opacity * 255);

    // Avoid re-filling the same color
    if (tr === fr && tg === fg && tb === fb && ta === fa) return;

    const W = S.pixels.width, H = S.pixels.height;
    const visited = new Uint8Array(W * H);
    const stack   = [[startX, startY]];

    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (visited[y * W + x]) continue;
      const px = S.getPixel(x, y);
      if (!px) continue;
      if (S.colorDist(px[0], px[1], px[2], tr, tg, tb) > S.bgTolerance) continue;
      if (Math.abs(px[3] - ta) > S.bgTolerance) continue;
      visited[y * W + x] = 1;
      S.setPixel(x, y, fr, fg, fb, fa);
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
  }

  /* ──────────────────────────────────────────
     Eyedropper
     ────────────────────────────────────────── */
  function _pickColor(x, y) {
    const px = S.getPixel(x, y);
    if (!px || px[3] === 0) return;
    const hex = S.rgbToHex(px[0], px[1], px[2]);
    S.color = hex;
    // Sync all color controls
    ['color-picker', 'd-color-picker'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = hex;
    });
    ['color-preview', 'd-color-preview', 'mob-color'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.background = hex;
    });
    const hexLbl = document.getElementById('d-color-hex');
    if (hexLbl) hexLbl.textContent = hex;
    // Mark active swatch
    document.querySelectorAll('.swatch, .d-palette .swatch').forEach(sw => {
      sw.classList.toggle('active-swatch',
        sw.style.background.replace(/\s/g,'') === hex ||
        sw.dataset.color === hex
      );
    });
  }

  /* ──────────────────────────────────────────
     Pivot placement
     ────────────────────────────────────────── */
  function _placePivot(x, y) {
    const { tx, ty } = Renderer.sheetToTile(x, y);
    const localX = x - tx * S.tileW;
    const localY = y - ty * S.tileH;
    S.setPivot(tx, ty, localX, localY);
    S.activeTileX = tx;
    S.activeTileY = ty;
    if (typeof UI !== 'undefined') {
      UI.updatePivotPanel();
      UI.updateTileNav();
    }
    Renderer.drawOverlay();
  }

  return { init };

})();
