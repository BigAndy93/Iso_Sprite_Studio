/* ═══════════════════════════════════════════════════════
   main.js  –  App entry point.
   Initialises everything in dependency order.
   ═══════════════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', () => {

  /* 1. Pixel store */
  S.initPixels(S.sheetW, S.sheetH, false);

  /* 2. Renderer: cache DOM refs and size canvases */
  Renderer.init();
  Renderer.resizeCanvases(S.sheetW, S.sheetH);
  Renderer.drawChecker();
  Renderer.drawSprite();
  Renderer.applyTransform();

  /* 3. Fit canvas to window */
  UI.fitToWindow();

  /* 4. Wire all UI event listeners */
  UI.init();

  /* 5. Wire pointer events on the overlay canvas */
  Tools.init();

  /* 6. Build tile navigator */
  UI.updateTileNav();
  UI.updatePivotPanel();
  UI.updateActiveTileLabel();
  UI.updateSheetLabel();

  /* 7. Initial history snapshot */
  S.saveHistory();

  /* 8. Keyboard shortcuts */
  document.addEventListener('keydown', e => {
    // Don't steal focus from text inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT') return;

    const key  = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;

    /* ── History ── */
    if (ctrl && e.shiftKey && key === 'z') { e.preventDefault(); if (S.redo()) Renderer.redrawAll(); return; }
    if (ctrl && key === 'z')               { e.preventDefault(); if (S.undo()) Renderer.redrawAll(); return; }
    if (ctrl && key === 'y')               { e.preventDefault(); if (S.redo()) Renderer.redrawAll(); return; }

    /* ── File ── */
    if (ctrl && key === 's') { e.preventDefault(); Effects.exportPng(); return; }
    if (ctrl && key === 'o') { e.preventDefault(); document.getElementById('file-input').click(); return; }

    /* ── Tools ── */
    const toolMap = { p:'pencil', e:'eraser', f:'fill', i:'eyedropper', v:'pivot', s:'select' };
    if (!ctrl && toolMap[key]) {
      UI.setTool(toolMap[key]);
      return;
    }

    /* ── Zoom ── */
    if (!ctrl && (key === '-' || key === '_')) { UI.setZoom(S.zoom / 1.25); return; }
    if (!ctrl && (key === '+' || key === '=')) { UI.setZoom(S.zoom * 1.25); return; }
    if (!ctrl &&  key === '0')                 { UI.fitToWindow(); return; }

    /* ── Bracket resize brush ── */
    if (key === '[') {
      const v = Math.max(1, S.brushSize - 1);
      document.getElementById('brush-size').value = v;
      document.getElementById('brush-size').dispatchEvent(new Event('input'));
      return;
    }
    if (key === ']') {
      const v = Math.min(32, S.brushSize + 1);
      document.getElementById('brush-size').value = v;
      document.getElementById('brush-size').dispatchEvent(new Event('input'));
      return;
    }

    /* ── Toggle ISO diamond ── */
    if (!ctrl && key === 'd') {
      const toggle = document.getElementById('toggle-iso');
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event('change'));
      return;
    }

    /* ── Toggle grid ── */
    if (!ctrl && key === 'g') {
      const toggle = document.getElementById('toggle-grid');
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event('change'));
      return;
    }
  });

  /* 9. Space-bar → temporary pan mode */
  let spaceDown = false;
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.target.matches('input,textarea,select')) {
      e.preventDefault();
      if (!spaceDown) {
        spaceDown = true;
        document.getElementById('canvas-area').style.cursor = 'grab';
      }
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space') {
      spaceDown = false;
      document.getElementById('canvas-area').style.cursor = 'crosshair';
      S.panning = false;
    }
  });
  window.isSpacePanning = () => spaceDown;

  /* 10. Marching ants selection animation */
  let dashOffset = 0;
  (function animateSelection() {
    if (S.selection) {
      dashOffset = (dashOffset + 0.4) % 24;
      Renderer.setSelectionDashOffset(dashOffset);
      Renderer.drawOverlay();
    }
    requestAnimationFrame(animateSelection);
  })();

  /* 11. Lazy tile navigator refresh after drawing stops */
  let navRefreshTimer = null;
  const overlayCanvas = document.getElementById('overlay-canvas');
  overlayCanvas.addEventListener('pointerup', () => {
    clearTimeout(navRefreshTimer);
    navRefreshTimer = setTimeout(UI.updateTileNav, 300);
  });

  /* 12. Prevent pinch-zoom on the whole page on mobile */
  document.addEventListener('gesturestart',  e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });

  console.log('%c🎨 Iso Sprite Studio loaded', 'color:#7c6af7;font-size:14px;font-weight:bold');
  console.log('Keyboard: P pencil · E eraser · F fill · I pick · V pivot · S select');
  console.log('          [ ] brush size · D iso diamond · G grid · 0 fit · - + zoom');
  console.log('S Pen: pressure → opacity/size · barrel button → eraser · hover → preview');

});
