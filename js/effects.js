/* ═══════════════════════════════════════════════════════
   effects.js  –  Post-processing, background removal,
                  import/export.  Operates on S.pixels.
   ═══════════════════════════════════════════════════════ */

const Effects = (() => {

  /* ═══════════════════════════════════
     Background removal
     ═══════════════════════════════════ */

  /**
   * Remove all pixels whose color is within tolerance of S.bgColor.
   * scope: 'tile' | 'all'
   */
  function removeBg(scope) {
    const [tr, tg, tb] = S.hexToRgb(S.bgColor);
    const tol = S.bgTolerance;
    _iterScope(scope, (x, y) => {
      const px = S.getPixel(x, y);
      if (!px || px[3] === 0) return;
      if (S.colorDist(px[0], px[1], px[2], tr, tg, tb) <= tol) {
        S.setPixel(x, y, 0, 0, 0, 0);
      }
    });
  }

  /**
   * Flood-fill erase from all four corners of the scope region.
   * Useful for solid backgrounds that vary slightly toward the edges.
   */
  function removeBgFromCorners(scope) {
    let x0=0, y0=0, x1=S.sheetW-1, y1=S.sheetH-1;
    if (scope === 'tile') {
      x0 = S.activeTileX * S.tileW;
      y0 = S.activeTileY * S.tileH;
      x1 = x0 + S.tileW  - 1;
      y1 = y0 + S.tileH  - 1;
    }
    const [tr, tg, tb] = S.hexToRgb(S.bgColor);
    for (const [cx, cy] of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]]) {
      _floodErase(cx, cy, tr, tg, tb, S.bgTolerance);
    }
  }

  /** Internal: flood-fill erase (4-connected). */
  function _floodErase(sx, sy, tr, tg, tb, tol) {
    const start = S.getPixel(sx, sy);
    if (!start || start[3] === 0) return;
    const W = S.pixels.width, H = S.pixels.height;
    const visited = new Uint8Array(W * H);
    const stack   = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x<0||y<0||x>=W||y>=H) continue;
      if (visited[y*W+x]) continue;
      const px = S.getPixel(x, y);
      if (!px || px[3] === 0) continue;
      if (S.colorDist(px[0], px[1], px[2], tr, tg, tb) > tol) continue;
      visited[y*W+x] = 1;
      S.setPixel(x, y, 0, 0, 0, 0);
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
  }

  /** Helper: iterate over a tile or the whole sheet. */
  function _iterScope(scope, fn) {
    let x0=0, y0=0, x1=S.sheetW, y1=S.sheetH;
    if (scope === 'tile') {
      x0 = S.activeTileX * S.tileW;
      y0 = S.activeTileY * S.tileH;
      x1 = Math.min(x0 + S.tileW,  S.sheetW);
      y1 = Math.min(y0 + S.tileH,  S.sheetH);
    }
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        fn(x, y);
      }
    }
  }

  /* ═══════════════════════════════════
     Post-processing  (non-destructive)
     ═══════════════════════════════════ */

  /**
   * Compute an ImageData copy of S.pixels with all FX applied.
   * Does NOT modify S.pixels.  Returns a new ImageData.
   */
  function computeFxPreview() {
    if (!S.fx.enabled) return S.pixels;

    const src = S.pixels.data;
    const out = new ImageData(S.pixels.width, S.pixels.height);
    const dst = out.data;
    const len = src.length;

    const brig = S.fx.brightness / 200;   // –0.5 .. 0.5
    const cont = 1 + S.fx.contrast / 100; // 0 .. 2
    const satF = S.fx.saturation / 100;   // –1 .. 1
    const hueF = S.fx.hue / 360;          // 0 .. 1

    for (let i = 0; i < len; i += 4) {
      if (src[i+3] === 0) { dst[i+3] = 0; continue; }

      let [h, s, l] = _rgbToHsl(src[i], src[i+1], src[i+2]);

      // Hue shift
      h = (h + hueF + 1) % 1;

      // Saturation
      s = _c01(s + satF * s);

      // Brightness → lightness
      l = _c01(l + brig);

      let [r, g, b] = _hslToRgb(h, s, l);

      // Contrast (pivot at 0.5 in 0-255 space)
      r = _c255(cont * (r - 128) + 128);
      g = _c255(cont * (g - 128) + 128);
      b = _c255(cont * (b - 128) + 128);

      dst[i]=r; dst[i+1]=g; dst[i+2]=b; dst[i+3]=src[i+3];
    }

    // Outline (second pass)
    if (S.fx.outline) {
      _applyOutline(dst, out.width, out.height);
    }

    return out;
  }

  /** Bake current FX preview into S.pixels and reset sliders. */
  function applyFxToSheet() {
    const processed = computeFxPreview();
    S.pixels.data.set(processed.data);
    // Reset all FX values
    S.fx.brightness = 0; S.fx.contrast = 0;
    S.fx.saturation = 0; S.fx.hue      = 0;
    S.fx.outline    = false;
  }

  /** Add an outline around all opaque pixels. Modifies dst in-place. */
  function _applyOutline(dst, w, h) {
    const [or_, og, ob] = S.hexToRgb(S.fx.outlineColor);
    const sz = S.fx.outlineSize;
    const tmp = new Uint8ClampedArray(dst); // read from copy
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (tmp[i+3] > 0) continue;  // already opaque – don't overwrite
        // Is any neighbour within sz opaque?
        let found = false;
        outer: for (let dy = -sz; dy <= sz; dy++) {
          for (let dx = -sz; dx <= sz; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            if (tmp[(ny * w + nx) * 4 + 3] > 0) { found = true; break outer; }
          }
        }
        if (found) {
          dst[i]=or_; dst[i+1]=og; dst[i+2]=ob; dst[i+3]=255;
        }
      }
    }
  }

  /* ═══════════════════════════════════
     Color space conversion
     ═══════════════════════════════════ */

  function _rgbToHsl(r, g, b) {
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h, s, l=(max+min)/2;
    if (max===min) { h=s=0; }
    else {
      const d=max-min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch (max) {
        case r: h=((g-b)/d+(g<b?6:0))/6; break;
        case g: h=((b-r)/d+2)/6; break;
        default:h=((r-g)/d+4)/6;
      }
    }
    return [h,s,l];
  }

  function _hslToRgb(h, s, l) {
    if (s===0) { const v=Math.round(l*255); return [v,v,v]; }
    const q = l < 0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    const hue2rgb = (p,q,t) => {
      if(t<0)t+=1; if(t>1)t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    return [
      Math.round(hue2rgb(p,q,h+1/3)*255),
      Math.round(hue2rgb(p,q,h    )*255),
      Math.round(hue2rgb(p,q,h-1/3)*255),
    ];
  }

  function _c01  (v) { return Math.max(0, Math.min(1,   v)); }
  function _c255 (v) { return Math.max(0, Math.min(255, Math.round(v))); }

  /* ═══════════════════════════════════
     Import PNG
     ═══════════════════════════════════ */

  function importPng(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Size the sheet to match the imported image
      const w = img.width, h = img.height;
      S.initPixels(w, h, false);

      // Sync toolbar inputs
      ['canvas-w','d-canvas-w'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = w;
      });
      ['canvas-h','d-canvas-h'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = h;
      });

      // Render the image to an offscreen canvas to extract pixel data
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tCtx = tmp.getContext('2d');
      tCtx.drawImage(img, 0, 0);
      const imgData = tCtx.getImageData(0, 0, w, h);
      S.pixels.data.set(imgData.data);

      Renderer.resizeCanvases(w, h);
      Renderer.drawChecker();
      Renderer.drawSprite();
      Renderer.drawOverlay();
      if (typeof UI !== 'undefined') {
        UI.fitToWindow();
        UI.updateTileNav();
        UI.updateSheetLabel();
      }
      S.saveHistory();
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      alert('Could not load image. Please try a PNG or JPEG file.');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  /* ═══════════════════════════════════
     Export PNG
     ═══════════════════════════════════ */

  function exportPng() {
    const flat = document.createElement('canvas');
    flat.width  = S.sheetW;
    flat.height = S.sheetH;
    const ctx   = flat.getContext('2d');
    // Export the FX-processed version if effects are on
    const data  = S.fx.enabled ? computeFxPreview() : S.pixels;
    ctx.putImageData(data, 0, 0);
    const url = flat.toDataURL('image/png');
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'spritesheet.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return {
    removeBg,
    removeBgFromCorners,
    computeFxPreview,
    applyFxToSheet,
    importPng,
    exportPng,
  };

})();
