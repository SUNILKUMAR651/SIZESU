/* ==========================================================================
   SIZESU - High-Performance Canvas Image Engine
   Handles client-side resizing, binary search target KB compression,
   format conversion, watermarking, and passport grid sheet creation.
   ========================================================================== */

class ImageProcessor {
  /**
   * Load an image file into an HTMLImageElement
   */
  static loadImage(fileOrSrc) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error('Failed to load image file.'));
      
      if (typeof fileOrSrc === 'string') {
        img.src = fileOrSrc;
      } else if (fileOrSrc instanceof Blob || fileOrSrc instanceof File) {
        img.src = URL.createObjectURL(fileOrSrc);
      } else {
        reject(new Error('Invalid image source type'));
      }
    });
  }

  /**
   * Resize and adjust image on canvas
   */
  static processImage(img, options = {}) {
    let {
      width,
      height,
      rotation = 0,
      flipH = false,
      flipV = false,
      brightness = 100,
      contrast = 100,
      saturation = 100,
      watermark = null,
      backgroundColor = null
    } = options;

    width = width || img.naturalWidth || img.width;
    height = height || img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Handle Rotation aspect ratio swap
    const isRotated90 = Math.abs(rotation % 180) === 90;
    canvas.width = isRotated90 ? height : width;
    canvas.height = isRotated90 ? width : height;

    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();

    // Background fill if specified (useful for PNG -> JPG or Passport background replace)
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Move origin to center for rotation/flip transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Apply CSS Filter adjustments
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // Draw main image centered
    const drawW = isRotated90 ? canvas.height : canvas.width;
    const drawH = isRotated90 ? canvas.width : canvas.height;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

    // Render Watermark if provided
    if (watermark && watermark.text) {
      ImageProcessor.applyTextWatermark(canvas, watermark);
    }

    return canvas;
  }

  /**
   * Compress image to an EXACT target file size in KB (targeting 97% - 99.5% of target KB)
   */
  static async compressToTargetKb(img, targetKb, format = 'image/jpeg', options = {}) {
    const targetBytes = targetKb * 1024;
    const minDesiredBytes = Math.floor(targetBytes * 0.96); // 96% lower threshold
    const maxDesiredBytes = Math.floor(targetBytes * 0.995); // 99.5% upper threshold

    let currentWidth = options.width || img.naturalWidth || img.width || 512;
    let currentHeight = options.height || img.naturalHeight || img.height || 512;

    const compressFormat = (format === 'image/png') ? 'image/jpeg' : format;
    let bestBlob = null;

    // Phase 1: Try finding matching quality & dimensions
    for (let scaleAttempt = 0; scaleAttempt < 10; scaleAttempt++) {
      const scaledCanvas = ImageProcessor.processImage(img, {
        ...options,
        width: Math.round(currentWidth),
        height: Math.round(currentHeight)
      });

      let minQuality = 0.02;
      let maxQuality = 1.0;

      for (let i = 0; i < 15; i++) {
        const midQuality = (minQuality + maxQuality) / 2;
        const blob = await ImageProcessor.canvasToBlob(scaledCanvas, compressFormat, midQuality);

        if (blob.size <= targetBytes) {
          if (!bestBlob || blob.size > bestBlob.size) {
            bestBlob = blob;
          }
          minQuality = midQuality; // Try higher quality
        } else {
          maxQuality = midQuality; // Too large — reduce quality
        }

        if (bestBlob && bestBlob.size >= minDesiredBytes && bestBlob.size <= targetBytes) {
          break;
        }
      }

      if (bestBlob && bestBlob.size >= minDesiredBytes && bestBlob.size <= targetBytes) {
        break;
      }

      // If at quality 1.0 it's still smaller than target, try upscale resolution
      if (bestBlob && bestBlob.size < minDesiredBytes && scaleAttempt < 3) {
        currentWidth *= 1.35;
        currentHeight *= 1.35;
        continue;
      }

      // If too large, scale down
      if (!bestBlob || bestBlob.size > targetBytes) {
        currentWidth *= 0.85;
        currentHeight *= 0.85;
      } else {
        break;
      }
    }

    if (!bestBlob) {
      const finalCanvas = ImageProcessor.processImage(img, {
        ...options,
        width: Math.max(Math.round(currentWidth), 50),
        height: Math.max(Math.round(currentHeight), 50)
      });
      bestBlob = await ImageProcessor.canvasToBlob(finalCanvas, compressFormat, 0.05);
    }

    // Phase 2: If the best rendered blob is still under 97% of target KB (e.g. 40KB when 100KB requested),
    // inject standard safe JPEG comment padding to reach 98.5% of target KB!
    if (compressFormat === 'image/jpeg' && bestBlob && bestBlob.size < maxDesiredBytes) {
      try {
        bestBlob = await ImageProcessor.padJpegBlob(bestBlob, maxDesiredBytes);
      } catch (err) {
        console.warn('JPEG padding skipped:', err);
      }
    }

    if (bestBlob) {
      bestBlob.finalWidth = Math.round(currentWidth);
      bestBlob.finalHeight = Math.round(currentHeight);
    }

    return bestBlob;
  }

  /**
   * Inject standard safe JPEG COM markers to reach exact byte targets (ISO/IEC 10918-1 JPEG compliant)
   */
  static async padJpegBlob(blob, targetBytes) {
    if (blob.size >= targetBytes) return blob;
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Look for EOI marker (0xFF 0xD9) at the end
    let eoiPos = bytes.length - 2;
    if (bytes[eoiPos] !== 0xFF || bytes[eoiPos + 1] !== 0xD9) {
      for (let i = bytes.length - 2; i >= 0; i--) {
        if (bytes[i] === 0xFF && bytes[i + 1] === 0xD9) {
          eoiPos = i;
          break;
        }
      }
    }

    const needed = targetBytes - bytes.length;
    if (needed < 4 || eoiPos <= 0) return blob;

    // Create COM chunks (0xFF 0xFE length payload)
    const chunks = [];
    let remaining = needed;
    while (remaining >= 4) {
      const payloadSize = Math.min(remaining - 4, 65530);
      const chunkLen = payloadSize + 2;
      const marker = new Uint8Array([0xFF, 0xFE, (chunkLen >> 8) & 0xFF, chunkLen & 0xFF]);
      const payload = new Uint8Array(payloadSize);
      payload.fill(0x20); // space fill
      chunks.push(marker, payload);
      remaining -= (4 + payloadSize);
    }

    const totalChunkBytes = chunks.reduce((acc, c) => acc + c.length, 0);
    const finalBytes = new Uint8Array(bytes.length + totalChunkBytes);
    finalBytes.set(bytes.subarray(0, eoiPos), 0);

    let offset = eoiPos;
    for (const chunk of chunks) {
      finalBytes.set(chunk, offset);
      offset += chunk.length;
    }
    finalBytes.set(bytes.subarray(eoiPos), offset);

    return new Blob([finalBytes], { type: blob.type || 'image/jpeg' });
  }

  /**
   * Helper to convert HTMLCanvasElement to Blob
   */
  static canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.92) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to Blob failed. Size might be 0.'));
        },
        mimeType,
        mimeType === 'image/png' ? undefined : quality
      );
    });
  }

  /**
   * Apply custom watermarking onto canvas
   */
  static applyTextWatermark(canvas, wmOptions) {
    const ctx = canvas.getContext('2d');
    const { text, fontSize = 24, color = '#ffffff', opacity = 0.5, position = 'bottom-right' } = wmOptions;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Plus Jakarta Sans, sans-serif`;
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const padding = 25;

    let x = padding;
    let y = padding;

    switch (position) {
      case 'top-left':
        x = padding;
        y = padding + fontSize / 2;
        break;
      case 'top-right':
        x = canvas.width - textWidth - padding;
        y = padding + fontSize / 2;
        break;
      case 'center':
        x = (canvas.width - textWidth) / 2;
        y = canvas.height / 2;
        break;
      case 'bottom-left':
        x = padding;
        y = canvas.height - padding - fontSize / 2;
        break;
      case 'bottom-right':
      default:
        x = canvas.width - textWidth - padding;
        y = canvas.height - padding - fontSize / 2;
        break;
    }

    // Text shadow for legibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /**
   * Create a printable Grid Sheet of Passport Photos (4x6 inch standard print photo paper)
   */
  static createPassportPrintSheet(passportCanvas, options = {}) {
    const { dpi = 300, rows = 2, cols = 4 } = options;
    
    // 4" x 6" Photo Paper dimensions in Pixels at 300 DPI
    const sheetW = 6 * dpi; // 1800 px
    const sheetH = 4 * dpi; // 1200 px

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = sheetW;
    sheetCanvas.height = sheetH;

    const ctx = sheetCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetW, sheetH);

    const totalPhotos = rows * cols;
    const paddingX = (sheetW - cols * passportCanvas.width) / (cols + 1);
    const paddingY = (sheetH - rows * passportCanvas.height) / (rows + 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = paddingX + c * (passportCanvas.width + paddingX);
        const y = paddingY + r * (passportCanvas.height + paddingY);

        // Draw light crop border line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, passportCanvas.width + 2, passportCanvas.height + 2);

        ctx.drawImage(passportCanvas, x, y);
      }
    }

    return sheetCanvas;
  }
}
