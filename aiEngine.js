/* ==========================================================================
   SIZESU - AI Background Removal & Edge Segmentation Engine
   Features border sampling, multi-cluster distance matching, smooth alpha edge feathering,
   and solid background color replacement (Passport White/Blue or Transparent PNG).
   ========================================================================== */

class AIEngine {
  /**
   * Remove or replace image background with edge feathering anti-aliasing
   */
  static removeBackground(img, options = {}) {
    const {
      tolerance = 45,       // Color matching threshold
      feather = 20,         // Edge feathering softness range
      replaceColor = null   // null for transparent PNG, or hex string '#ffffff', '#2563eb'
    } = options;

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // 1. Sample border pixels (corners & edge perimeters) for dominant background colors
    const samples = [];
    const stepX = Math.max(1, Math.floor(width / 30));
    const stepY = Math.max(1, Math.floor(height / 30));

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

    // Cluster samples into unique bg tones
    const bgColors = AIEngine.clusterColors(samples, 35);

    // Squared distance thresholds
    const innerTolSq = tolerance * tolerance;
    const outerTolSq = (tolerance + feather) * (tolerance + feather);

    // Replacement color parsing
    let replaceR = 0, replaceG = 0, replaceB = 0;
    const isSolidReplace = !!replaceColor;
    if (isSolidReplace) {
      const hex = replaceColor.replace('#', '');
      replaceR = parseInt(hex.substring(0, 2), 16) || 0;
      replaceG = parseInt(hex.substring(2, 4), 16) || 0;
      replaceB = parseInt(hex.substring(4, 6), 16) || 0;
    }

    // 2. Process image data with distance matching & alpha feathering
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const origA = data[i + 3];

      if (origA === 0) continue; // Skip already transparent pixels

      let minDistSq = Infinity;
      for (let c = 0; c < bgColors.length; c++) {
        const bg = bgColors[c];
        const dr = r - bg.r;
        const dg = g - bg.g;
        const db = b - bg.b;
        const distSq = dr * dr + dg * dg + db * db;
        if (distSq < minDistSq) minDistSq = distSq;
      }

      if (minDistSq <= innerTolSq) {
        // Pure background
        if (isSolidReplace) {
          data[i] = replaceR;
          data[i + 1] = replaceG;
          data[i + 2] = replaceB;
          data[i + 3] = 255;
        } else {
          data[i + 3] = 0; // Transparent
        }
      } else if (minDistSq < outerTolSq && !isSolidReplace) {
        // Feathered edge transition for transparent PNG output
        const factor = (Math.sqrt(minDistSq) - tolerance) / feather;
        data[i + 3] = Math.round(origA * Math.min(1, Math.max(0, factor)));
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // If solid background color is requested, draw onto clean colored background canvas
    if (isSolidReplace) {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = width;
      finalCanvas.height = height;
      const finalCtx = finalCanvas.getContext('2d');

      finalCtx.fillStyle = replaceColor;
      finalCtx.fillRect(0, 0, width, height);
      finalCtx.drawImage(canvas, 0, 0);
      return finalCanvas;
    }

    return canvas;
  }

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
