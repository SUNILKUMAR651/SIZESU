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
    const {
      width = img.naturalWidth || img.width,
      height = img.naturalHeight || img.height,
      rotation = 0,
      flipH = false,
      flipV = false,
      brightness = 100,
      contrast = 100,
      saturation = 100,
      watermark = null,
      backgroundColor = null
    } = options;

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
   * Compress image to an EXACT target file size in KB using binary search canvas fitting
   */
  static async compressToTargetKb(img, targetKb, format = 'image/jpeg', options = {}) {
    const targetBytes = targetKb * 1024;
    let minQuality = 0.05;
    let maxQuality = 1.0;
    let bestBlob = null;

    let currentWidth = options.width || img.naturalWidth || img.width;
    let currentHeight = options.height || img.naturalHeight || img.height;

    // Outer loop: reduce scale if 5% quality is still larger than target KB
    for (let scaleAttempt = 0; scaleAttempt < 5; scaleAttempt++) {
      const scaledCanvas = ImageProcessor.processImage(img, {
        ...options,
        width: Math.round(currentWidth),
        height: Math.round(currentHeight)
      });

      // Binary search for optimal JPEG/WEBP quality
      minQuality = 0.05;
      maxQuality = 1.0;

      for (let i = 0; i < 7; i++) {
        const midQuality = (minQuality + maxQuality) / 2;
        const blob = await ImageProcessor.canvasToBlob(scaledCanvas, format, midQuality);

        if (blob.size <= targetBytes) {
          bestBlob = blob;
          minQuality = midQuality; // Try to get higher quality within KB limit
        } else {
          maxQuality = midQuality; // Size too big, reduce quality
        }
      }

      if (bestBlob && bestBlob.size <= targetBytes) {
        break; // Successfully achieved target KB!
      }

      // If even lowest quality is larger than target bytes, scale down dimensions by 15%
      currentWidth *= 0.85;
      currentHeight *= 0.85;
    }

    // Fallback if target KB is extremely aggressive
    if (!bestBlob) {
      const finalCanvas = ImageProcessor.processImage(img, { ...options, width: currentWidth, height: currentHeight });
      bestBlob = await ImageProcessor.canvasToBlob(finalCanvas, format, 0.05);
    }

    return bestBlob;
  }

  /**
   * Helper to convert HTMLCanvasElement to Blob
   */
  static canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.92) {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
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
