/* ═══════════════════════════════════════════════════════
   ui.js  –  All DOM event wiring and UI helpers.
   Syncs desktop controls ↔ mobile drawer controls ↔ S (state).
   ═══════════════════════════════════════════════════════ */

const UI = (() => {

  /* ──────────────────────────────────────────
     init: wire every control
     ────────────────────────────────────────── */
  function init() {
    _wirePalette();
    _wireToolButtons();
    _wireColorPicker();
    _wireBrush();
    _wireToolbar();
    _wirePivotPanel();
    _wireBgPanel();
    _wireFxPanel();
    _wireViewToggles();
    _wirePropSectionCollapse();
    _wireMobileDrawer();
    _wireMobileBar();
    _syncDesktopMobile();
    _wireTemplateModal();
  }

  /* ──────────────────────────────────────────
     Palette
     ────────────────────────────────────────── */
  function _wirePalette() {
    _buildPaletteIn('palette');
    _buildPaletteIn('d-palette');
  }

  function _buildPaletteIn(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    S.palette.forEach(hex => {
      const sw = document.createElement('div');
      sw.className       = 'swatch';
      sw.style.background = hex;
      sw.dataset.color   = hex;
      sw.title           = hex;
      sw.addEventListener('pointerdown', e => {
        e.preventDefault();
        setColor(hex);
      });
      container.appendChild(sw);
    });
  }

  /* ──────────────────────────────────────────
     Tool buttons (desktop + drawer)
     ────────────────────────────────────────── */
  function _wireToolButtons() {
    // Desktop tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        const tool = btn.dataset.tool;
        if (tool) setTool(tool);
      });
    });
    // Mobile bottom bar quick tools
    document.querySelectorAll('.mob-tool-btn').forEach(btn => {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        const tool = btn.dataset.tool;
        if (tool) setTool(tool);
      });
    });
    // Drawer tool grid
    document.querySelectorAll('.drawer-tool').forEach(btn => {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        const tool = btn.dataset.tool;
        if (tool) setTool(tool);
      });
    });
  }

  /** Set active tool and sync all tool button UIs. */
  function setTool(tool) {
    S.tool = tool;
    // Desktop sidebar
    document.querySelectorAll('.tool-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tool === tool));
    // Mobile bar
    document.querySelectorAll('.mob-tool-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tool === tool));
    // Drawer grid
    document.querySelectorAll('.drawer-tool').forEach(b =>
      b.classList.toggle('active', b.dataset.tool === tool));
    // Canvas cursor hint
    const cursors = {
      pencil:     'crosshair',
      eraser:     'cell',
      fill:       'crosshair',
      eyedropper: 'copy',
      pivot:      'default',
      select:     'default',
    };
    document.getElementById('canvas-area').style.cursor = cursors[tool] || 'crosshair';
  }

  /* ──────────────────────────────────────────
     Color picker (desktop + drawer)
     ────────────────────────────────────────── */
  function _wireColorPicker() {
    const picker  = document.getElementById('color-picker');
    const preview = document.getElementById('color-preview');
    const dPicker = document.getElementById('d-color-picker');
    const dPreview= document.getElementById('d-color-preview');
    const mobColor= document.getElementById('mob-color');
    const dHex    = document.getElementById('d-color-hex');

    picker.addEventListener('input', e => {
      setColor(e.target.value);
    });
    preview.addEventListener('click', () => picker.click());

    if (dPicker) {
      dPicker.addEventListener('input', e => setColor(e.target.value));
    }
    if (dPreview) {
      dPreview.addEventListener('click', () => dPicker && dPicker.click());
    }
  }

  function setColor(hex) {
    S.color = hex;
    const preview  = document.getElementById('color-preview');
    const dPreview = document.getElementById('d-color-preview');
    const mobColor = document.getElementById('mob-color');
    const dHex     = document.getElementById('d-color-hex');
    if (preview)  preview.style.background  = hex;
    if (dPreview) dPreview.style.background = hex;
    if (mobColor) mobColor.style.background = hex;
    if (dHex)     dHex.textContent          = hex;
    // Sync picker values
    const picker  = document.getElementById('color-picker');
    const dPicker = document.getElementById('d-color-picker');
    if (picker  && picker.value  !== hex) picker.value  = hex;
    if (dPicker && dPicker.value !== hex) dPicker.value = hex;
    // Active swatch highlight
    document.querySelectorAll('.swatch').forEach(sw =>
      sw.classList.toggle('active-swatch', sw.dataset.color === hex));
  }

  /* ──────────────────────────────────────────
     Brush size + opacity  (desktop + drawer)
     ────────────────────────────────────────── */
  function _wireBrush() {
    const rangeSize    = document.getElementById('brush-size');
    const rangeOpacity = document.getElementById('brush-opacity');
    const dRangeSize   = document.getElementById('d-brush-size');
    const dRangeOpacity= document.getElementById('d-brush-opacity');

    function _syncSize(v) {
      S.brushSize = parseInt(v, 10);
      document.getElementById('brush-size-val').textContent = v;
      const lbl = document.getElementById('d-brush-val');
      if (lbl) lbl.textContent = v;
      if (rangeSize   && rangeSize.value  !== v) rangeSize.value  = v;
      if (dRangeSize  && dRangeSize.value !== v) dRangeSize.value = v;
    }
    function _syncOpacity(v) {
      S.opacity = parseInt(v, 10) / 100;
      const pct = v + '%';
      document.getElementById('brush-opacity-val').textContent = pct;
      const lbl = document.getElementById('d-opacity-val');
      if (lbl) lbl.textContent = pct;
      if (rangeOpacity  && rangeOpacity.value  !== v) rangeOpacity.value  = v;
      if (dRangeOpacity && dRangeOpacity.value !== v) dRangeOpacity.value = v;
    }

    rangeSize   .addEventListener('input', e => _syncSize(e.target.value));
    rangeOpacity.addEventListener('input', e => _syncOpacity(e.target.value));
    if (dRangeSize)    dRangeSize.addEventListener('input',    e => _syncSize(e.target.value));
    if (dRangeOpacity) dRangeOpacity.addEventListener('input', e => _syncOpacity(e.target.value));

    // Pressure mode
    ['pressure-mode','d-pressure-mode'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', e => {
        S.pressureMode = e.target.value;
        // Sync both
        ['pressure-mode','d-pressure-mode'].forEach(sid => {
          const sel = document.getElementById(sid);
          if (sel && sel !== el) sel.value = e.target.value;
        });
      });
    });
  }

  /* ──────────────────────────────────────────
     Top toolbar controls
     ────────────────────────────────────────── */
  function _wireToolbar() {
    // File ops
    document.getElementById('btn-new').addEventListener('click', _handleNew);
    document.getElementById('btn-import').addEventListener('click', () =>
      document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', e => {
      if (e.target.files[0]) Effects.importPng(e.target.files[0]);
      e.target.value = '';
    });
    document.getElementById('btn-export').addEventListener('click', Effects.exportPng);

    // Canvas size
    document.getElementById('btn-apply-canvas').addEventListener('click', _applyCanvas);

    // Tile layout
    document.getElementById('btn-apply-tiles').addEventListener('click', _applyTiles);

    // ISO diamond
    document.getElementById('toggle-iso').addEventListener('change', e => {
      S.showIso = e.target.checked;
      _syncIsoToggle(e.target.checked);
      Renderer.drawOverlay();
    });
    ['diamond-w','diamond-h'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => _readDiamond());
    });

    // Undo/Redo
    document.getElementById('btn-undo').addEventListener('click', _undo);
    document.getElementById('btn-redo').addEventListener('click', _redo);

    // Zoom
    document.getElementById('btn-zoom-in' ).addEventListener('click', () => setZoom(S.zoom * 1.25));
    document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(S.zoom / 1.25));
    document.getElementById('btn-zoom-fit').addEventListener('click', fitToWindow);

    // Sidebar zoom buttons
    const zi2 = document.getElementById('btn-zoom-in2');
    const zo2 = document.getElementById('btn-zoom-out2');
    if (zi2) zi2.addEventListener('click', () => setZoom(S.zoom * 1.25));
    if (zo2) zo2.addEventListener('click', () => setZoom(S.zoom / 1.25));

    // Mobile drawer zoom buttons
    const mobZI = document.getElementById('mob-zoom-in');
    const mobZO = document.getElementById('mob-zoom-out');
    const mobZF = document.getElementById('mob-zoom-fit');
    if (mobZI) mobZI.addEventListener('click', () => setZoom(S.zoom * 1.25));
    if (mobZO) mobZO.addEventListener('click', () => setZoom(S.zoom / 1.25));
    if (mobZF) mobZF.addEventListener('click', fitToWindow);

    // Click-to-edit zoom labels
    _wireZoomLabelEdit();

    // Mobile undo/redo
    const mobUndo = document.getElementById('mob-undo');
    const mobRedo = document.getElementById('mob-redo');
    if (mobUndo) mobUndo.addEventListener('click', _undo);
    if (mobRedo) mobRedo.addEventListener('click', _redo);
  }

  /* ── Templates ── */
  const TEMPLATES = {
    blank: {
      canvasW: 128, canvasH: 128,
      tileW: 128,   tileH: 128,
      tilesX: 1,    tilesY: 1,
    },
    '4-direction-flip': {
      canvasW: 256, canvasH: 256,
      tileW: 128,   tileH: 128,
      tilesX: 2,    tilesY: 2,
    },
    animation: {
      canvasW: 768, canvasH: 128,
      tileW: 128,   tileH: 128,
      tilesX: 6,    tilesY: 1,
    },
  };

  function _handleNew() {
    document.getElementById('template-modal').classList.remove('hidden');
  }

  function _applyTemplate(tplKey) {
    const tpl = TEMPLATES[tplKey];
    document.getElementById('template-modal').classList.add('hidden');

    // Apply tile layout to state
    S.tileW  = tpl.tileW;
    S.tileH  = tpl.tileH;
    S.tilesX = tpl.tilesX;
    S.tilesY = tpl.tilesY;

    // Sync all tile inputs (toolbar + drawer)
    const fieldMap = {
      'tile-w': tpl.tileW, 'tile-h': tpl.tileH,
      'tiles-x': tpl.tilesX, 'tiles-y': tpl.tilesY,
      'd-tile-w': tpl.tileW, 'd-tile-h': tpl.tileH,
      'd-tiles-x': tpl.tilesX, 'd-tiles-y': tpl.tilesY,
      'canvas-w': tpl.canvasW, 'canvas-h': tpl.canvasH,
      'd-canvas-w': tpl.canvasW, 'd-canvas-h': tpl.canvasH,
    };
    Object.entries(fieldMap).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });

    // Create new sheet
    S.initPixels(tpl.canvasW, tpl.canvasH, false);
    S.pivots = {};
    S.history = []; S.historyIndex = -1;
    Renderer.resizeCanvases(tpl.canvasW, tpl.canvasH);
    Renderer.drawChecker();
    Renderer.drawSprite();
    Renderer.drawOverlay();
    S.saveHistory();
    updateTileNav();
    updateSheetLabel();
    fitToWindow();
  }

  function _wireTemplateModal() {
    document.querySelectorAll('.tpl-card').forEach(btn => {
      btn.addEventListener('click', () => _applyTemplate(btn.dataset.tpl));
    });
    document.getElementById('tpl-cancel').addEventListener('click', () => {
      document.getElementById('template-modal').classList.add('hidden');
    });
    // Close on backdrop click
    document.getElementById('template-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        document.getElementById('template-modal').classList.add('hidden');
      }
    });
  }

  function _applyCanvas() {
    const w = Math.max(64, parseInt(document.getElementById('canvas-w').value, 10) || 512);
    const h = Math.max(64, parseInt(document.getElementById('canvas-h').value, 10) || 512);
    S.saveHistory();
    S.initPixels(w, h, true);
    Renderer.resizeCanvases(w, h);
    Renderer.drawChecker();
    Renderer.redrawAll();
    updateSheetLabel();
    fitToWindow();
    // Sync drawer
    const dw = document.getElementById('d-canvas-w');
    const dh = document.getElementById('d-canvas-h');
    if (dw) dw.value = w;
    if (dh) dh.value = h;
  }

  function _applyTiles() {
    S.tileW  = Math.max(8,  parseInt(document.getElementById('tile-w').value,  10) || 64);
    S.tileH  = Math.max(8,  parseInt(document.getElementById('tile-h').value,  10) || 64);
    S.tilesX = Math.max(1,  parseInt(document.getElementById('tiles-x').value, 10) || 4);
    S.tilesY = Math.max(1,  parseInt(document.getElementById('tiles-y').value, 10) || 4);
    // Sync drawer fields
    ['d-tile-w','d-tile-h','d-tiles-x','d-tiles-y'].forEach((id,i) => {
      const el = document.getElementById(id);
      if (el) el.value = [S.tileW, S.tileH, S.tilesX, S.tilesY][i];
    });
    Renderer.drawOverlay();
    updateTileNav();
  }

  function _applyTilesFromDrawer() {
    S.tileW  = Math.max(8,  parseInt(document.getElementById('d-tile-w').value,  10) || 64);
    S.tileH  = Math.max(8,  parseInt(document.getElementById('d-tile-h').value,  10) || 64);
    S.tilesX = Math.max(1,  parseInt(document.getElementById('d-tiles-x').value, 10) || 4);
    S.tilesY = Math.max(1,  parseInt(document.getElementById('d-tiles-y').value, 10) || 4);
    // Sync desktop fields
    ['tile-w','tile-h','tiles-x','tiles-y'].forEach((id,i) => {
      const el = document.getElementById(id);
      if (el) el.value = [S.tileW, S.tileH, S.tilesX, S.tilesY][i];
    });
    Renderer.drawOverlay();
    updateTileNav();
  }

  function _readDiamond() {
    S.diamondW = Math.max(8, parseInt(document.getElementById('diamond-w').value, 10) || 64);
    S.diamondH = Math.max(4, parseInt(document.getElementById('diamond-h').value, 10) || 32);
    // Sync drawer
    const dw = document.getElementById('d-diamond-w');
    const dh = document.getElementById('d-diamond-h');
    if (dw) dw.value = S.diamondW;
    if (dh) dh.value = S.diamondH;
    if (S.showIso) Renderer.drawOverlay();
  }

  function _syncIsoToggle(checked) {
    ['toggle-iso','d-toggle-iso'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.checked !== checked) el.checked = checked;
    });
  }

  function _undo() {
    if (S.undo()) Renderer.redrawAll();
  }

  function _redo() {
    if (S.redo()) Renderer.redrawAll();
  }

  /* ──────────────────────────────────────────
     Pivot panel
     ────────────────────────────────────────── */
  function _wirePivotPanel() {
    // Desktop pivot inputs
    ['pivot-x','pivot-y','d-pivot-x','d-pivot-y'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        const x = parseInt(document.getElementById('pivot-x')?.value   || document.getElementById('d-pivot-x')?.value, 10);
        const y = parseInt(document.getElementById('pivot-y')?.value   || document.getElementById('d-pivot-y')?.value, 10);
        if (!isNaN(x) && !isNaN(y)) {
          S.setPivot(S.activeTileX, S.activeTileY, x, y);
          Renderer.drawOverlay();
          updateTileNav();
        }
      });
    });

    // Copy pivot
    ['btn-copy-pivot','d-btn-copy-pivot'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        S.copiedPivot = S.getPivot(S.activeTileX, S.activeTileY);
        if (S.copiedPivot) {
          el.textContent = '✓ Copied';
          setTimeout(() => { el.textContent = id.startsWith('d-') ? 'Copy' : 'Copy'; }, 1200);
        }
      });
    });

    // Paste to all tiles
    ['btn-paste-all','d-btn-paste-all'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        if (!S.copiedPivot) return;
        for (let ty = 0; ty < S.tilesY; ty++) {
          for (let tx = 0; tx < S.tilesX; tx++) {
            S.setPivot(tx, ty, S.copiedPivot.x, S.copiedPivot.y);
          }
        }
        Renderer.drawOverlay();
        updateTileNav();
      });
    });

    // Paste to selection
    const btnPasteSel = document.getElementById('btn-paste-sel');
    if (btnPasteSel) {
      btnPasteSel.addEventListener('click', () => {
        if (!S.copiedPivot || !S.selection) return;
        let { x1,y1,x2,y2 } = S.selection;
        if (x1>x2) [x1,x2]=[x2,x1]; if (y1>y2) [y1,y2]=[y2,y1];
        for (let ty = 0; ty < S.tilesY; ty++) {
          for (let tx = 0; tx < S.tilesX; tx++) {
            const rx1 = tx*S.tileW, ry1 = ty*S.tileH;
            const rx2 = rx1+S.tileW, ry2 = ry1+S.tileH;
            // Any overlap?
            if (rx2 > x1 && rx1 < x2 && ry2 > y1 && ry1 < y2) {
              S.setPivot(tx, ty, S.copiedPivot.x, S.copiedPivot.y);
            }
          }
        }
        Renderer.drawOverlay();
        updateTileNav();
      });
    }

    // Clear pivot
    ['btn-clear-pivot','d-btn-clear-pivot'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        S.clearPivot(S.activeTileX, S.activeTileY);
        updatePivotPanel();
        Renderer.drawOverlay();
        updateTileNav();
      });
    });
  }

  function updatePivotPanel() {
    const p  = S.getPivot(S.activeTileX, S.activeTileY);
    const lbl= document.getElementById('pivot-tile-lbl');
    const px = document.getElementById('pivot-x');
    const py = document.getElementById('pivot-y');
    const dpx= document.getElementById('d-pivot-x');
    const dpy= document.getElementById('d-pivot-y');
    if (lbl) lbl.textContent = `${S.activeTileX}, ${S.activeTileY}`;
    const xv = p ? p.x : '';
    const yv = p ? p.y : '';
    if (px)  px.value  = xv;
    if (py)  py.value  = yv;
    if (dpx) dpx.value = xv;
    if (dpy) dpy.value = yv;
  }

  function updateActiveTileLabel() {
    const lbl = document.getElementById('active-tile-lbl');
    if (lbl) lbl.textContent = `${S.activeTileX}, ${S.activeTileY}`;
  }

  /* ──────────────────────────────────────────
     Background removal panel
     ────────────────────────────────────────── */
  function _wireBgPanel() {
    // Tolerance slider
    const tolSlider = document.getElementById('bg-tolerance');
    const tolLbl    = document.getElementById('bg-tol-lbl');
    tolSlider.addEventListener('input', e => {
      S.bgTolerance = parseInt(e.target.value, 10);
      if (tolLbl) tolLbl.textContent = e.target.value;
    });

    // BG color
    const bgColorEl  = document.getElementById('bg-color');
    const dBgColorEl = document.getElementById('d-bg-color');
    bgColorEl.addEventListener('input', e => {
      S.bgColor = e.target.value;
      if (dBgColorEl && dBgColorEl.value !== e.target.value) dBgColorEl.value = e.target.value;
    });
    if (dBgColorEl) {
      dBgColorEl.addEventListener('input', e => {
        S.bgColor = e.target.value;
        if (bgColorEl.value !== e.target.value) bgColorEl.value = e.target.value;
      });
    }

    // Drawer tolerance
    const dTol = document.getElementById('d-bg-tol');
    if (dTol) {
      dTol.addEventListener('input', e => {
        S.bgTolerance = parseInt(e.target.value, 10);
        if (tolSlider) tolSlider.value = e.target.value;
        if (tolLbl)    tolLbl.textContent = e.target.value;
      });
    }

    // Scope toggle
    const scopeAll = document.getElementById('bg-scope-all');
    if (scopeAll) scopeAll.addEventListener('change', e => { S.bgScopeAll = e.target.checked; });

    // Pick BG color from canvas
    const btnPickBg = document.getElementById('btn-pick-bg');
    if (btnPickBg) {
      btnPickBg.addEventListener('click', () => {
        S.pickingBg = true;
        document.getElementById('overlay-canvas').style.cursor = 'crosshair';
      });
    }

    // Remove BG buttons
    ['btn-remove-bg','d-btn-remove-bg'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        S.saveHistory();
        Effects.removeBg(S.bgScopeAll ? 'all' : 'tile');
        Renderer.redrawAll();
        updateTileNav();
      });
    });

    ['btn-remove-bg-corners','d-btn-remove-bg-corners'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        S.saveHistory();
        Effects.removeBgFromCorners(S.bgScopeAll ? 'all' : 'tile');
        Renderer.redrawAll();
        updateTileNav();
      });
    });
  }

  /* ──────────────────────────────────────────
     Post-processing panel
     ────────────────────────────────────────── */
  function _wireFxPanel() {
    const fxControls = [
      ['fx-brightness','fx-brightness-lbl','brightness','d-fx-brightness','d-fx-b-lbl', v => v],
      ['fx-contrast',  'fx-contrast-lbl',  'contrast',  'd-fx-contrast',  'd-fx-c-lbl', v => v],
      ['fx-saturation','fx-saturation-lbl','saturation','d-fx-saturation','d-fx-s-lbl', v => v],
      ['fx-hue',       'fx-hue-lbl',       'hue',       'd-fx-hue',       'd-fx-h-lbl', v => v+'°'],
    ];

    fxControls.forEach(([id, lblId, key, dId, dLblId, fmt]) => {
      const el   = document.getElementById(id);
      const lbl  = document.getElementById(lblId);
      const dEl  = document.getElementById(dId);
      const dLbl = document.getElementById(dLblId);
      if (!el) return;

      const sync = v => {
        S.fx[key] = parseInt(v, 10);
        if (lbl)  lbl.textContent  = fmt(v);
        if (dLbl) dLbl.textContent = fmt(v);
        if (el  && el.value  !== v) el.value  = v;
        if (dEl && dEl.value !== v) dEl.value = v;
        if (S.fx.enabled) Renderer.drawSprite();
      };

      el.addEventListener('input',   e => sync(e.target.value));
      if (dEl) dEl.addEventListener('input', e => sync(e.target.value));
    });

    // Outline toggle + color + size
    const outlineToggle = document.getElementById('fx-outline');
    if (outlineToggle) {
      outlineToggle.addEventListener('change', e => {
        S.fx.outline = e.target.checked;
        if (S.fx.enabled) Renderer.drawSprite();
      });
    }
    const outlineColor = document.getElementById('fx-outline-color');
    if (outlineColor) {
      outlineColor.addEventListener('input', e => {
        S.fx.outlineColor = e.target.value;
        if (S.fx.enabled && S.fx.outline) Renderer.drawSprite();
      });
    }
    const outlineSize = document.getElementById('fx-outline-size');
    if (outlineSize) {
      outlineSize.addEventListener('change', e => {
        S.fx.outlineSize = parseInt(e.target.value, 10);
        if (S.fx.enabled && S.fx.outline) Renderer.drawSprite();
      });
    }

    // Enable toggle (desktop + drawer)
    ['toggle-fx','d-toggle-fx'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', e => {
        S.fx.enabled = e.target.checked;
        // Sync both
        ['toggle-fx','d-toggle-fx'].forEach(sid => {
          const sel = document.getElementById(sid);
          if (sel && sel !== el) sel.checked = e.target.checked;
        });
        Renderer.drawSprite();
      });
    });

    // Apply bake
    ['btn-fx-apply','d-btn-fx-apply'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        S.saveHistory();
        Effects.applyFxToSheet();
        _resetFxSliders();
        Renderer.redrawAll();
        updateTileNav();
      });
    });

    // Reset
    ['btn-fx-reset','d-btn-fx-reset'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        S.fx.brightness = S.fx.contrast = S.fx.saturation = S.fx.hue = 0;
        S.fx.outline = false;
        _resetFxSliders();
        Renderer.drawSprite();
      });
    });
  }

  function _resetFxSliders() {
    ['fx-brightness','fx-contrast','fx-saturation','fx-hue',
     'd-fx-brightness','d-fx-contrast','d-fx-saturation','d-fx-hue'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '0';
    });
    ['fx-brightness-lbl','fx-contrast-lbl','fx-saturation-lbl',
     'd-fx-b-lbl','d-fx-c-lbl','d-fx-s-lbl'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
    ['fx-hue-lbl','d-fx-h-lbl'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0°';
    });
    const outEl = document.getElementById('fx-outline');
    if (outEl) outEl.checked = false;
  }

  /* ──────────────────────────────────────────
     View toggles (grid, snap, pivots, ISO)
     ────────────────────────────────────────── */
  function _wireViewToggles() {
    const toggles = [
      ['toggle-grid',        'd-toggle-grid',   v => { S.showGrid    = v; Renderer.drawOverlay(); }],
      ['toggle-snap',        'd-toggle-snap',   v => { S.snapToPixel = v; }],
      ['toggle-show-pivots', null,              v => { S.showPivots  = v; Renderer.drawOverlay(); }],
      ['d-toggle-iso',       'toggle-iso',      v => { S.showIso = v; Renderer.drawOverlay(); }],
    ];

    toggles.forEach(([id, syncId, fn]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', e => {
        fn(e.target.checked);
        if (syncId) {
          const sync = document.getElementById(syncId);
          if (sync) sync.checked = e.target.checked;
        }
      });
    });
  }

  /* ──────────────────────────────────────────
     Prop-section collapse/expand
     ────────────────────────────────────────── */
  function _wirePropSectionCollapse() {
    document.querySelectorAll('.prop-header').forEach(header => {
      const secId = header.dataset.section;
      if (!secId) return;
      header.addEventListener('click', e => {
        // Don't collapse if clicking a toggle inside the header
        if (e.target.closest('.toggle-wrap')) return;
        const body = document.getElementById('sec-' + secId);
        if (!body) return;
        const now = header.classList.toggle('collapsed');
        body.classList.toggle('hidden', now);
      });
    });
  }

  /* ──────────────────────────────────────────
     Mobile bottom drawer
     ────────────────────────────────────────── */
  function _wireMobileDrawer() {
    const drawer  = document.getElementById('mobile-drawer');
    const handle  = document.getElementById('drawer-handle');
    const btnOpen = document.getElementById('btn-drawer-open');
    if (!drawer) return;

    let drawerOpen = false;
    const backdrop = document.getElementById('drawer-backdrop');

    const openDrawer = () => {
      drawerOpen = true;
      drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('visible');
      if (btnOpen)  { btnOpen.textContent = '✕'; btnOpen.classList.add('active'); }
    };
    const closeDrawer = () => {
      drawerOpen = false;
      drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('visible');
      if (btnOpen)  { btnOpen.textContent = '☰'; btnOpen.classList.remove('active'); }
    };
    const toggleDrawer = () => drawerOpen ? closeDrawer() : openDrawer();

    // Tap/touch backdrop → close
    if (backdrop) {
      backdrop.addEventListener('click', closeDrawer);
      backdrop.addEventListener('touchend', e => { e.preventDefault(); closeDrawer(); });
    }

    if (btnOpen) btnOpen.addEventListener('click', toggleDrawer);

    // Tap color swatch on mobile bar → open colors tab
    const mobColor = document.getElementById('mob-color');
    if (mobColor) {
      mobColor.addEventListener('click', () => {
        openDrawer();
        _setDrawerTab('colors');
      });
    }

    // Tab switching — also opens drawer if it's in peek state.
    // Use touchend (+preventDefault) for instant mobile response; click as fallback.
    document.querySelectorAll('.drawer-tab').forEach(tab => {
      let tabTouchY = null;
      tab.addEventListener('touchstart', e => { tabTouchY = e.touches[0].clientY; }, { passive: true });
      tab.addEventListener('touchend', e => {
        const dy = tabTouchY !== null ? Math.abs(e.changedTouches[0].clientY - tabTouchY) : 99;
        tabTouchY = null;
        if (dy > 10) return;             // ignore if user was scrolling
        e.preventDefault();              // suppress the delayed synthetic click
        _setDrawerTab(tab.dataset.tab);
        if (!drawerOpen) openDrawer();
      });
      tab.addEventListener('click', () => { // desktop / non-touch fallback
        _setDrawerTab(tab.dataset.tab);
        if (!drawerOpen) openDrawer();
      });
    });

    // Handle: swipe down → close, swipe up → open, tap → toggle.
    // Native touch events are more reliable than pointer events on Android.
    let touchY0 = null, touchMoved = false;
    handle.addEventListener('touchstart', e => {
      touchY0    = e.touches[0].clientY;
      touchMoved = false;
    }, { passive: true });
    handle.addEventListener('touchmove', e => {
      if (touchY0 === null) return;
      const dy = e.touches[0].clientY - touchY0;
      if (dy > 40)       { touchMoved = true; closeDrawer(); touchY0 = null; }
      else if (dy < -40) { touchMoved = true; openDrawer();  touchY0 = null; }
    }, { passive: true });
    handle.addEventListener('touchend', e => {
      if (!touchMoved) { e.preventDefault(); toggleDrawer(); }
      touchY0 = null; touchMoved = false;
    });
    // Mouse fallback for desktop testing
    let mouseY0 = null, mouseMoved = false;
    handle.addEventListener('mousedown', e => { mouseY0 = e.clientY; mouseMoved = false; });
    handle.addEventListener('mousemove', e => {
      if (mouseY0 === null) return;
      const dy = e.clientY - mouseY0;
      if (dy > 40)       { mouseMoved = true; closeDrawer(); mouseY0 = null; }
      else if (dy < -40) { mouseMoved = true; openDrawer();  mouseY0 = null; }
    });
    handle.addEventListener('mouseup', () => {
      if (!mouseMoved) toggleDrawer();
      mouseY0 = null; mouseMoved = false;
    });

    // Drawer tile apply buttons
    const dApplyTiles = document.getElementById('d-btn-apply-tiles');
    if (dApplyTiles) dApplyTiles.addEventListener('click', _applyTilesFromDrawer);

    const dApplyCanvas = document.getElementById('d-btn-apply-canvas');
    if (dApplyCanvas) {
      dApplyCanvas.addEventListener('click', () => {
        const w = parseInt(document.getElementById('d-canvas-w').value, 10) || 512;
        const h = parseInt(document.getElementById('d-canvas-h').value, 10) || 512;
        document.getElementById('canvas-w').value = w;
        document.getElementById('canvas-h').value = h;
        _applyCanvas();
      });
    }

    // Drawer diamond inputs
    ['d-diamond-w','d-diamond-h'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        S.diamondW = parseInt(document.getElementById('d-diamond-w').value, 10) || 64;
        S.diamondH = parseInt(document.getElementById('d-diamond-h').value, 10) || 32;
        document.getElementById('diamond-w').value = S.diamondW;
        document.getElementById('diamond-h').value = S.diamondH;
        if (S.showIso) Renderer.drawOverlay();
      });
    });
  }

  function _setDrawerTab(tabId) {
    document.querySelectorAll('.drawer-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tabId));
    document.querySelectorAll('.drawer-panel').forEach(p =>
      p.classList.toggle('active', p.id === 'dtab-' + tabId));
  }

  /* ──────────────────────────────────────────
     Mobile bar
     ────────────────────────────────────────── */
  function _wireMobileBar() {
    // Mobile tools handled in _wireToolButtons
  }

  /* ──────────────────────────────────────────
     Sync initial state values into all duplicate controls
     ────────────────────────────────────────── */
  function _syncDesktopMobile() {
    // Diamond inputs sync
    ['d-diamond-w','d-diamond-h'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.value = [S.diamondW, S.diamondH][i];
    });
  }

  /* ──────────────────────────────────────────
     Tile navigator
     ────────────────────────────────────────── */
  function updateTileNav() {
    const grid = document.getElementById('tile-nav-grid');
    if (!grid) return;

    grid.style.gridTemplateColumns = `repeat(${S.tilesX}, 24px)`;
    grid.innerHTML = '';

    for (let ty = 0; ty < S.tilesY; ty++) {
      for (let tx = 0; tx < S.tilesX; tx++) {
        const cell = document.createElement('div');
        cell.className = 'tile-nav-cell';
        if (tx === S.activeTileX && ty === S.activeTileY) cell.classList.add('active');
        cell.title = `Tile ${tx},${ty}`;

        // Thumbnail: tiny canvas
        const thumb = document.createElement('canvas');
        thumb.className = 'tile-nav-thumb';
        thumb.width  = 24;
        thumb.height = 24;
        const tCtx = thumb.getContext('2d');
        tCtx.imageSmoothingEnabled = false;

        // Draw the tile pixels scaled into 24x24
        const x0 = tx * S.tileW;
        const y0 = ty * S.tileH;
        const tw = Math.min(S.tileW,  S.sheetW - x0);
        const th = Math.min(S.tileH,  S.sheetH - y0);
        if (tw > 0 && th > 0) {
          try {
            const slice = S.pixels.data.slice
              ? new ImageData(S.pixels.width, S.pixels.height) : null;
            // Use a temporary canvas to get the slice
            const tmpC = document.createElement('canvas');
            tmpC.width = S.sheetW; tmpC.height = S.sheetH;
            tmpC.getContext('2d').putImageData(S.pixels, 0, 0);
            tCtx.drawImage(tmpC, x0, y0, tw, th, 0, 0, 24, 24);
          } catch(e) { /* ignore cross-origin issues */ }
        }

        // Pivot dot
        const p = S.getPivot(tx, ty);
        if (p) {
          const dot = document.createElement('div');
          dot.className = 'pivot-dot';
          dot.style.left = (p.x / S.tileW * 100) + '%';
          dot.style.top  = (p.y / S.tileH * 100) + '%';
          cell.appendChild(dot);
        }

        cell.appendChild(thumb);
        cell.addEventListener('click', () => {
          S.activeTileX = tx;
          S.activeTileY = ty;
          updatePivotPanel();
          updateActiveTileLabel();
          updateTileNav();
          Renderer.drawOverlay();
        });
        grid.appendChild(cell);
      }
    }
  }

  /* ──────────────────────────────────────────
     Zoom helpers
     ────────────────────────────────────────── */
  function setZoom(newZoom) {
    const area = document.getElementById('canvas-area');
    const rect = area.getBoundingClientRect();
    const cx   = rect.width  / 2;
    const cy   = rect.height / 2;
    const clamped = Math.min(32, Math.max(0.05, newZoom));
    S.panX = cx - (cx - S.panX) * (clamped / S.zoom);
    S.panY = cy - (cy - S.panY) * (clamped / S.zoom);
    S.zoom = clamped;
    Renderer.applyTransform();
    updateZoomLabel();
  }

  function fitToWindow() {
    const area = document.getElementById('canvas-area');
    const rect = area.getBoundingClientRect();
    const scale = Math.min(
      (rect.width  - 60) / S.sheetW,
      (rect.height - 60) / S.sheetH
    );
    S.zoom = Math.max(0.05, scale);
    S.panX = (rect.width  - S.sheetW * S.zoom) / 2;
    S.panY = (rect.height - S.sheetH * S.zoom) / 2;
    Renderer.applyTransform();
    updateZoomLabel();
  }

  function updateZoomLabel() {
    const pct = Math.round(S.zoom * 100) + '%';
    ['zoom-label','zoom-label2','mob-zoom-label','st-zoom'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.tagName === 'SPAN') el.textContent = pct;
    });
  }

  function _wireZoomLabelEdit() {
    ['zoom-label','zoom-label2','mob-zoom-label'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        const current = Math.round(S.zoom * 100);
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.value = current;
        inp.min = 5;
        inp.max = 3200;
        inp.style.cssText = 'width:52px;font-size:10px;text-align:center;background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:3px;padding:1px 2px;';
        el.replaceWith(inp);
        inp.select();
        const commit = () => {
          const v = parseFloat(inp.value);
          const span = document.createElement('span');
          span.id = id;
          span.className = el.className;
          span.title = el.title;
          inp.replaceWith(span);
          _wireZoomLabelEdit();   // re-bind on the new element
          if (!isNaN(v) && v > 0) setZoom(v / 100);
          else updateZoomLabel();
        };
        inp.addEventListener('blur', commit);
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
          if (e.key === 'Escape') { inp.value = current; inp.blur(); }
        });
      });
    });
  }

  /* ──────────────────────────────────────────
     Status bar
     ────────────────────────────────────────── */
  function updateStatusBar(x, y) {
    if (x < 0 || y < 0 || x >= S.sheetW || y >= S.sheetH) return;
    const { tx, ty } = Renderer.sheetToTile(x, y);
    const stTile  = document.getElementById('st-tile');
    const stPos   = document.getElementById('st-pos');
    const stColor = document.getElementById('st-color');
    if (stTile)  stTile.textContent  = `Tile ${tx},${ty}`;
    if (stPos)   stPos.textContent   = `${x},${y}`;
    const px = S.getPixel(x, y);
    if (stColor && px) {
      if (px[3] === 0) {
        stColor.textContent = 'transparent';
      } else {
        stColor.textContent = `${S.rgbToHex(px[0],px[1],px[2])} a:${px[3]}`;
      }
    }
    // Update active tile if it changed
    if (S.mouse.down && (tx !== S.activeTileX || ty !== S.activeTileY)) {
      // Only for tools that change active tile on mouse down
      if (['pencil','eraser','fill'].includes(S.tool)) {
        S.activeTileX = tx; S.activeTileY = ty;
        updateActiveTileLabel();
      }
    }
  }

  function updateSheetLabel() {
    const el = document.getElementById('st-sheet');
    if (el) el.textContent = `${S.sheetW}×${S.sheetH}`;
  }

  /* ──────────────────────────────────────────
     Scroll-wheel zoom on desktop
     ────────────────────────────────────────── */
  function _wireWheelZoom() {
    document.getElementById('canvas-area').addEventListener('wheel', e => {
      e.preventDefault();
      const area = document.getElementById('canvas-area');
      const rect = area.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1/1.1;
      const newZoom = Math.min(32, Math.max(0.05, S.zoom * factor));
      S.panX = mx - (mx - S.panX) * (newZoom / S.zoom);
      S.panY = my - (my - S.panY) * (newZoom / S.zoom);
      S.zoom = newZoom;
      Renderer.applyTransform();
      updateZoomLabel();
    }, { passive: false });
  }

  // Wire wheel zoom immediately (not inside init to avoid duplication)
  document.addEventListener('DOMContentLoaded', () => {
    _wireWheelZoom();
  });

  return {
    init,
    setTool,
    setColor,
    setZoom,
    fitToWindow,
    updateZoomLabel,
    updateTileNav,
    updatePivotPanel,
    updateActiveTileLabel,
    updateStatusBar,
    updateSheetLabel,
  };

})();
