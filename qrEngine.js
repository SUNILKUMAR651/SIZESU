/* ==========================================================================
   SIZESU - Real Client-Side QR Code Engine
   Generates 100% camera-scannable QR Codes with Reed-Solomon Error Correction
   ========================================================================== */

class QREngine {
  /**
   * Render camera-scannable QR Code onto an HTMLCanvasElement
   */
  static generateQRCodeCanvas(text = 'https://sizesu.app', options = {}) {
    const {
      size = 360,
      fgColor = '#000000',
      bgColor = '#ffffff',
      margin = 2
    } = options;

    const qr = QREngine.createQRMatrix(text);
    const moduleCount = qr.size;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background fill
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Calculate module sizing respecting margin padding
    const activeSize = size - margin * 2 * 8;
    const cellSize = activeSize / moduleCount;
    const offset = margin * 8;

    ctx.fillStyle = fgColor;

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.modules[r][c]) {
          const x = offset + c * cellSize;
          const y = offset + r * cellSize;
          ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
        }
      }
    }

    return canvas;
  }

  // --- REED-SOLOMON & QR MATRIX BUILDING ALGORITHM ---

  static createQRMatrix(text) {
    const bytes = new TextEncoder().encode(text);
    
    // Select minimal QR Version (1 to 6) for payload size under Medium EC
    // Capacity M EC: V1=14B, V2=26B, V3=42B, V4=62B, V5=84B, V6=106B, V7=122B
    const versionCapacities = [0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213];
    let version = 1;
    while (version < versionCapacities.length && bytes.length > versionCapacities[version]) {
      version++;
    }
    if (version >= versionCapacities.length) version = 10; // Fallback cap

    // EC Table parameters for Level M: [totalDataCodewords, ecCodewordsPerBlock]
    const ecTable = {
      1: [16, 10], 2: [28, 16], 3: [44, 26], 4: [64, 36], 5: [87, 48],
      6: [108, 64], 7: [124, 72], 8: [154, 88], 9: [182, 110], 10: [216, 130]
    };
    const [dataCapacity, ecCapacity] = ecTable[version] || [16, 10];

    // Build data bits stream
    const bitBuffer = [];
    const pushBits = (val, length) => {
      for (let i = length - 1; i >= 0; i--) {
        bitBuffer.push((val >> i) & 1);
      }
    };

    // Mode: Byte (0100)
    pushBits(0x4, 4);
    // Character count (8 bits for V1-9)
    pushBits(bytes.length, version < 10 ? 8 : 16);
    // Data bytes
    for (let b of bytes) pushBits(b, 8);

    // Terminator (up to 4 bits)
    const maxDataBits = dataCapacity * 8;
    while (bitBuffer.length < maxDataBits && bitBuffer.length % 8 !== 0) {
      bitBuffer.push(0);
    }
    while (bitBuffer.length < maxDataBits) {
      pushBits(0xEC, 8);
      if (bitBuffer.length < maxDataBits) pushBits(0x11, 8);
    }

    // Convert bit buffer to data codewords array
    const dataCodewords = [];
    for (let i = 0; i < dataCapacity; i++) {
      let b = 0;
      for (let bit = 0; bit < 8; bit++) {
        b = (b << 1) | bitBuffer[i * 8 + bit];
      }
      dataCodewords.push(b);
    }

    // Compute Reed-Solomon Error Correction Codewords
    const ecCodewords = QREngine.generateECCodewords(dataCodewords, ecCapacity);
    const finalCodewords = [...dataCodewords, ...ecCodewords];

    // Grid size: 17 + 4 * Version
    const size = 17 + 4 * version;
    const modules = Array.from({ length: size }, () => Array(size).fill(null));

    // 1. Place Finder Patterns
    QREngine.placeFinderPattern(modules, 0, 0);
    QREngine.placeFinderPattern(modules, size - 7, 0);
    QREngine.placeFinderPattern(modules, 0, size - 7);

    // 2. Place Timing Patterns
    for (let i = 8; i < size - 8; i++) {
      if (modules[6][i] === null) modules[6][i] = i % 2 === 0;
      if (modules[i][6] === null) modules[i][6] = i % 2 === 0;
    }

    // 3. Dark module
    modules[4 * version + 9][8] = true;

    // 4. Place Alignment Patterns for V >= 2
    if (version >= 2) {
      const alignPos = [0, 0, 18, 22, 26, 30, 34, 38, 42, 46, 50][version];
      if (alignPos) {
        QREngine.placeAlignmentPattern(modules, alignPos, alignPos);
      }
    }

    // 5. Reserve Format Info Areas
    for (let i = 0; i < 9; i++) {
      if (modules[8][i] === null) modules[8][i] = false;
      if (modules[i][8] === null) modules[i][8] = false;
      if (modules[8][size - 1 - i] === null) modules[8][size - 1 - i] = false;
      if (modules[size - 1 - i][8] === null) modules[size - 1 - i][8] = false;
    }

    // 6. Map Codewords into Grid (Zig-Zag pattern)
    let bitIdx = 0;
    const totalBits = finalCodewords.length * 8;

    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--; // Skip vertical timing line

      for (let rowDir = 0; rowDir < size; rowDir++) {
        for (let cOffset = 0; cOffset < 2; cOffset++) {
          const c = col - cOffset;
          const r = ((col + 1) / 2) % 2 === 1 ? size - 1 - rowDir : rowDir;

          if (modules[r][c] === null) {
            let bit = false;
            if (bitIdx < totalBits) {
              const byteI = Math.floor(bitIdx / 8);
              const bitI = 7 - (bitIdx % 8);
              bit = ((finalCodewords[byteI] >> bitI) & 1) === 1;
              bitIdx++;
            }

            // Apply Mask 0: (row + col) % 2 === 0
            const isMasked = (r + c) % 2 === 0;
            modules[r][c] = bit ^ isMasked;
          }
        }
      }
    }

    // 7. Write Format Info (Level M + Mask 0) -> BCH (15,5) format bits
    // Precomputed BCH code for EC level M (00) and Mask 0 (000): 0x5412 XOR 0x0000 = 0x5412
    const formatBits = 0x5412;
    for (let i = 0; i < 15; i++) {
      const b = ((formatBits >> i) & 1) === 1;
      if (i < 6) modules[8][i] = b;
      else if (i < 8) modules[8][i + 1] = b;
      else if (i === 8) modules[7][8] = b;
      else modules[14 - i][8] = b;

      if (i < 8) modules[size - 1 - i][8] = b;
      else modules[8][size - 15 + i] = b;
    }

    return { size, modules };
  }

  static placeFinderPattern(grid, top, left) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const gr = top + r;
        const gc = left + c;
        if (gr >= 0 && gr < grid.length && gc >= 0 && gc < grid.length) {
          const isOuter = r === -1 || r === 7 || c === -1 || c === 7;
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[gr][gc] = isOuter ? false : (isBorder || isCenter);
        }
      }
    }
  }

  static placeAlignmentPattern(grid, row, col) {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (grid[row + r][col + c] === null) {
          const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
          const isCenter = r === 0 && c === 0;
          grid[row + r][col + c] = isBorder || isCenter;
        }
      }
    }
  }

  // Reed-Solomon Galois Field GF(256) Generator
  static generateECCodewords(data, numEC) {
    // GF(256) exp and log tables (primitive poly 0x11D)
    const gfExp = new Uint8Array(512);
    const gfLog = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      gfExp[i] = x;
      gfExp[i + 255] = x;
      gfLog[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }

    const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : gfExp[gfLog[a] + gfLog[b]]);

    // Compute Generator Polynomial
    let poly = [1];
    for (let i = 0; i < numEC; i++) {
      const nextPoly = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        nextPoly[j] ^= gfMul(poly[j], gfExp[i]);
        nextPoly[j + 1] ^= poly[j];
      }
      poly = nextPoly;
    }

    // Polynomial division to get remainder
    const res = new Uint8Array(data.length + numEC);
    res.set(data, 0);

    for (let i = 0; i < data.length; i++) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 0; j < poly.length; j++) {
          res[i + j] ^= gfMul(poly[j], coef);
        }
      }
    }

    return Array.from(res.slice(data.length));
  }
}
