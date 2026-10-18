/* ==========================================================================
   SIZESU - Professional AI Background Removal & Edge Segmentation Engine
   Features:
   1. Deep Neural AI (briaai/RMBG-1.4) via WebGPU/WASM for complex photo segmentation.
   2. Smart Boundary-Connected Flood Fill (Magic Wand) for instant (<100ms) graphics,
      logos, stickers, & illustration cutouts (100% preserves eyes, teeth, clothes & inner details!).
   3. Passport Photo Background Replacer (White, Blue, Gray, Custom Color).
   4. Smooth Alpha Feathering & Anti-aliasing.
   ========================================================================== */

class AIEngine {
  static _aiPipeline = null;
  static _isAILoading = false;

  /**
   * Main unified entry point for background removal
   * @param {HTMLImageElement|HTMLCanvasElement} img - Source image or canvas
   * @param {Object} options - Configuration options
   * @returns {Promise<HTMLCanvasElement>} Resulting canvas
   */
  static async removeBackground(img, options = {}) {
    const {
      mode = 'smart',          // 'smart' (Instant Connected Flood-Fill) or 'ai' (Deep Neural Net)
      tolerance = 35,          // Color threshold for boundary matching
      feather = 2,             // Edge feathering softness (px)
      replaceColor = null,     // null for transparent, or hex string '#ffffff', '#2563eb'
      onProgress = null        // Callback: (stage, percent, message) => {}
    } = options;

    if (mode === 'ai') {
      try {
        if (onProgress) onProgress('init', 5, 'Initializing AI neural engine...');
        return await AIEngine.removeBackgroundAI(img, { replaceColor, onProgress });
      } catch (err) {
        console.warn('Deep AI segmentation failed or not supported, falling back to Smart Edge Engine:', err);
        if (onProgress) onProgress('fallback', 50, 'Switching to Smart Edge Engine...');
        return AIEngine.removeConnectedBackground(img, { tolerance, feather, replaceColor, onProgress });
      }
    } else {
      // Default & Instant Mode: Smart Boundary-Connected Flood Fill
      return AIEngine.removeConnectedBackground(img, { tolerance, feather, replaceColor, onProgress });
    }
  }

  /**
   * Smart Boundary-Connected Flood Fill Engine (Magic Wand)
   * Strictly removes background connected to the outer perimeter.
   * Completely preserves inner white/light areas (e.g. eyes, teeth, white shirts, text).
   */
  static removeConnectedBackground(img, options = {}) {
    const {
      tolerance = 35,
      feather = 2,
      replaceColor = null,
      onProgress = null
    } = options;

    if (onProgress) onProgress('analyzing', 20, 'Scanning perimeter background tones...');

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // 1. Sample perimeter border pixels (top, bottom, left, right)
    const samples = [];
    const stepX = Math.max(1, Math.floor(width / 40));
    const stepY = Math.max(1, Math.floor(height / 40));

    // Top & Bottom edges
    for (let x = 0; x < width; x += stepX) {
      samples.push(AIEngine.getPixelRGB(data, width, x, 0));
      samples.push(AIEngine.getPixelRGB(data, width, x, height - 1));
    }
    // Left & Right edges
    for (let y = 0; y < height; y += stepY) {
      samples.push(AIEngine.getPixelRGB(data, width, 0, y));
      samples.push(AIEngine.getPixelRGB(data, width, width - 1, y));
    }

    // Cluster samples into distinct background color tones
    const bgColors = AIEngine.clusterColors(samples, 30);
    const tolSq = tolerance * tolerance;

    const isMatchBg = (r, g, b) => {
      for (let i = 0; i < bgColors.length; i++) {
        const bg = bgColors[i];
        const dr = r - bg.r;
        const dg = g - bg.g;
        const db = b - bg.b;
        if (dr * dr + dg * dg + db * db <= tolSq) return true;
      }
      return false;
    };

    if (onProgress) onProgress('segmenting', 50, 'Executing connected edge flood fill...');

    // 2. Visited mask & queue for Breadth-First Search (BFS)
    // 0 = foreground (untouched), 1 = connected background
    const totalPixels = width * height;
    const mask = new Uint8Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;

    // Seed top and bottom boundary pixels that match background
    for (let x = 0; x < width; x++) {
      const topIdx = x * 4;
      if (isMatchBg(data[topIdx], data[topIdx + 1], data[topIdx + 2])) {
        mask[x] = 1;
        queue[tail++] = x;
      }
      const btmPos = (height - 1) * width + x;
      const btmIdx = btmPos * 4;
      if (isMatchBg(data[btmIdx], data[btmIdx + 1], data[btmIdx + 2])) {
        mask[btmPos] = 1;
        queue[tail++] = btmPos;
      }
    }

    // Seed left and right boundary pixels that match background
    for (let y = 0; y < height; y++) {
      const leftPos = y * width;
      const leftIdx = leftPos * 4;
      if (!mask[leftPos] && isMatchBg(data[leftIdx], data[leftIdx + 1], data[leftIdx + 2])) {
        mask[leftPos] = 1;
        queue[tail++] = leftPos;
      }
      const rightPos = y * width + (width - 1);
      const rightIdx = rightPos * 4;
      if (!mask[rightPos] && isMatchBg(data[rightIdx], data[rightIdx + 1], data[rightIdx + 2])) {
        mask[rightPos] = 1;
        queue[tail++] = rightPos;
      }
    }

    // BFS Flood Fill: ONLY traverse pixels connected to the boundary
    while (head < tail) {
      const curr = queue[head++];
      const cx = curr % width;
      const cy = (curr / width) | 0;

      // 4-connected neighbors
      if (cx > 0) {
        const left = curr - 1;
        if (mask[left] === 0) {
          const idx = left * 4;
          if (isMatchBg(data[idx], data[idx + 1], data[idx + 2])) {
            mask[left] = 1;
            queue[tail++] = left;
          }
        }
      }
      if (cx < width - 1) {
        const right = curr + 1;
        if (mask[right] === 0) {
          const idx = right * 4;
          if (isMatchBg(data[idx], data[idx + 1], data[idx + 2])) {
            mask[right] = 1;
            queue[tail++] = right;
          }
        }
      }
      if (cy > 0) {
        const top = curr - width;
        if (mask[top] === 0) {
          const idx = top * 4;
          if (isMatchBg(data[idx], data[idx + 1], data[idx + 2])) {
            mask[top] = 1;
            queue[tail++] = top;
          }
        }
      }
      if (cy < height - 1) {
        const btm = curr + width;
        if (mask[btm] === 0) {
          const idx = btm * 4;
          if (isMatchBg(data[idx], data[idx + 1], data[idx + 2])) {
            mask[btm] = 1;
            queue[tail++] = btm;
          }
        }
      }
    }

    if (onProgress) onProgress('feathering', 80, 'Applying edge anti-aliasing...');

    // 3. Parse replacement color if solid background requested
    let isSolid = !!replaceColor;
    let rR = 0, rG = 0, rB = 0;
    if (isSolid) {
      const hex = replaceColor.replace('#', '');
      rR = parseInt(hex.substring(0, 2), 16) || 0;
      rG = parseInt(hex.substring(2, 4), 16) || 0;
      rB = parseInt(hex.substring(4, 6), 16) || 0;
    }

    // 4. Apply background transparency / replacement
    for (let p = 0; p < totalPixels; p++) {
      if (mask[p] === 1) {
        const idx = p * 4;
        if (isSolid) {
          data[idx] = rR;
          data[idx + 1] = rG;
          data[idx + 2] = rB;
          data[idx + 3] = 255;
        } else {
          data[idx + 3] = 0; // Pure transparent
        }
      }
    }

    // 5. Feather boundary transitions (anti-aliasing)
    if (feather > 0 && !isSolid) {
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const p = y * width + x;
          if (mask[p] === 0) {
            // Check if adjacent to background
            const bgNeighbors = 
              (mask[p - 1] === 1 ? 1 : 0) +
              (mask[p + 1] === 1 ? 1 : 0) +
              (mask[p - width] === 1 ? 1 : 0) +
              (mask[p + width] === 1 ? 1 : 0);

            if (bgNeighbors > 0) {
              const idx = p * 4;
              // Soften alpha edge proportionally
              const edgeAlpha = Math.round(data[idx + 3] * (1 - (bgNeighbors * 0.18)));
              data[idx + 3] = Math.max(0, edgeAlpha);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    if (onProgress) onProgress('done', 100, 'Background removed cleanly!');
    return canvas;
  }

  /**
   * Deep Neural AI Segmentation Engine (briaai/RMBG-1.4)
   * Uses in-browser WebGPU/WASM to segment humans, pets, objects & complex scenes.
   */
  static async removeBackgroundAI(img, options = {}) {
    const { replaceColor = null, onProgress = null } = options;

    if (!AIEngine._aiPipeline) {
      if (onProgress) onProgress('loading_model', 15, 'Loading AI RMBG-1.4 model (cached after 1st load)...');
      
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3');
      
      // Configure environment flags
      env.allowLocalModels = false;

      let device = 'wasm';
      try {
        if (typeof navigator !== 'undefined' && navigator.gpu) {
          device = 'webgpu';
        }
      } catch (e) {
        device = 'wasm';
      }

      AIEngine._aiPipeline = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
        device: device,
        progress_callback: (info) => {
          if (info && info.status === 'progress' && onProgress) {
            const pct = Math.round(info.progress || 0);
            const mb = Math.round((info.loaded || 0) / 1024 / 1024);
            const totalMb = Math.round((info.total || 0) / 1024 / 1024);
            onProgress('download', Math.min(85, Math.max(15, pct)), `Downloading AI Weights: ${pct}% (${mb}MB / ${totalMb}MB)...`);
          }
        }
      });
    }

    if (onProgress) onProgress('segmenting', 88, 'Analyzing salient subject & generating mask...');

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    // Create source canvas
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(img, 0, 0, width, height);

    const { RawImage } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3');
    const dataUrl = srcCanvas.toDataURL('image/png');
    const rawImg = await RawImage.fromURL(dataUrl);

    const output = await AIEngine._aiPipeline(rawImg);

    let maskCanvas;
    if (Array.isArray(output) && output.length > 0 && output[0].mask) {
      maskCanvas = output[0].mask.toCanvas();
    } else if (output && output.mask) {
      maskCanvas = output.mask.toCanvas();
    } else {
      throw new Error('Unexpected AI output format from segmenter');
    }

    if (onProgress) onProgress('compositing', 95, 'Compositing foreground cutout...');

    // Composite mask with original image
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = width;
    finalCanvas.height = height;
    const fCtx = finalCanvas.getContext('2d');

    if (replaceColor) {
      fCtx.fillStyle = replaceColor;
      fCtx.fillRect(0, 0, width, height);
    }

    // Temporary canvas for masked cutout
    const cutoutCanvas = document.createElement('canvas');
    cutoutCanvas.width = width;
    cutoutCanvas.height = height;
    const cCtx = cutoutCanvas.getContext('2d');

    // Draw original image
    cCtx.drawImage(srcCanvas, 0, 0, width, height);
    // Mask out background using destination-in
    cCtx.globalCompositeOperation = 'destination-in';
    cCtx.drawImage(maskCanvas, 0, 0, width, height);

    // Draw cut out subject onto final canvas
    fCtx.drawImage(cutoutCanvas, 0, 0);

    if (onProgress) onProgress('done', 100, 'AI background removal complete!');
    return finalCanvas;
  }

  // --- Helper Methods ---
  static getPixelRGB(data, width, x, y) {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  }

  static clusterColors(samples, threshold = 30) {
    const clusters = [];
    const threshSq = threshold * threshold;

    for (let s of samples) {
      let found = false;
      for (let c of clusters) {
        const dr = s.r - c.r;
        const dg = s.g - c.g;
        const db = s.b - c.b;
        if (dr * dr + dg * dg + db * db < threshSq) {
          found = true;
          break;
        }
      }
      if (!found) clusters.push(s);
    }
    return clusters;
  }
}
