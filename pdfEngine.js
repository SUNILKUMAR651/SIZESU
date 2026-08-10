/* ==========================================================================
   SIZESU - Universal Client-Side PDF Engine
   Supports:
   1. Image(s) to PDF Generation (Native 100% JS PDF 1.4 Writer)
   2. PDF to Photo (JPG/PNG Extraction & Canvas Rendering)
   3. PDF Merging (Combine multiple PDF files into one)
   4. PDF Target KB/MB Compressor (Exact Target KB/MB Solver)
   ========================================================================== */

class PDFEngine {
  /**
   * 1. Convert an array of Image elements or Canvas objects into a PDF Blob
   */
  static async imagesToPdfBlob(imagesArray, options = {}) {
    if (!imagesArray || imagesArray.length === 0) {
      throw new Error('No images provided for PDF generation.');
    }

    const {
      orientation = 'portrait', // 'portrait' | 'landscape'
      pageSize = 'a4',         // 'a4' | 'letter'
      margin = 20,             // Margin in mm
      quality = 0.92
    } = options;

    // Define standard page dimensions in PDF Points (72 points per inch)
    let pageW = 595.28; // Default A4 Portrait Width
    let pageH = 841.89; // Default A4 Portrait Height

    if (pageSize.toLowerCase() === 'letter') {
      pageW = 612.00;
      pageH = 792.00;
    }

    if (orientation.toLowerCase() === 'landscape') {
      const temp = pageW;
      pageW = pageH;
      pageH = temp;
    }

    const marginPts = (margin / 25.4) * 72; // Convert mm to PDF points
    const maxDrawW = pageW - marginPts * 2;
    const maxDrawH = pageH - marginPts * 2;

    // Prepare JPEG blobs for each image
    const preparedImages = [];
    for (let i = 0; i < imagesArray.length; i++) {
      const input = imagesArray[i];
      let canvas;

      if (input instanceof HTMLCanvasElement) {
        canvas = input;
      } else {
        canvas = document.createElement('canvas');
        canvas.width = input.naturalWidth || input.width || 800;
        canvas.height = input.naturalHeight || input.height || 600;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(input, 0, 0);
      }

      const jpegBlob = await ImageProcessor.canvasToBlob(canvas, 'image/jpeg', quality);
      const arrayBuffer = await jpegBlob.arrayBuffer();
      const jpegBytes = new Uint8Array(arrayBuffer);

      preparedImages.push({
        width: canvas.width,
        height: canvas.height,
        bytes: jpegBytes
      });
    }

    // --- BUILD PDF 1.4 BINARY STRUCTURE ---
    const totalPages = preparedImages.length;
    const catalogObjId = 1;
    const pagesObjId = 2;

    const pageObjIds = [];
    for (let i = 0; i < totalPages; i++) {
      pageObjIds.push(3 + i * 3);
    }

    const parts = [];
    const encoder = new TextEncoder();
    let currentByteOffset = 0;
    const objectOffsets = [];

    const appendString = (str) => {
      const bytes = encoder.encode(str);
      parts.push(bytes);
      currentByteOffset += bytes.length;
    };

    const appendBytes = (bytes) => {
      parts.push(bytes);
      currentByteOffset += bytes.length;
    };

    // PDF Binary Header
    appendString(`%PDF-1.4\n%\xFF\xFF\xFF\xFF\n`);

    // Obj 1: Catalog
    objectOffsets[catalogObjId] = currentByteOffset;
    appendString(`${catalogObjId} 0 obj\n<< /Type /Catalog /Pages ${pagesObjId} 0 R >>\nendobj\n`);

    // Obj 2: Pages Tree
    const kidsStr = pageObjIds.map(id => `${id} 0 R`).join(' ');
    objectOffsets[pagesObjId] = currentByteOffset;
    appendString(`${pagesObjId} 0 obj\n<< /Type /Pages /Count ${totalPages} /Kids [ ${kidsStr} ] >>\nendobj\n`);

    // Generate Objects for each page
    for (let i = 0; i < totalPages; i++) {
      const img = preparedImages[i];
      const pageId = 3 + i * 3;
      const contentId = 4 + i * 3;
      const imageXObjId = 5 + i * 3;

      let drawW = maxDrawW;
      let drawH = (img.height / img.width) * maxDrawW;

      if (drawH > maxDrawH) {
        drawH = maxDrawH;
        drawW = (img.width / img.height) * maxDrawH;
      }

      const posX = marginPts + (maxDrawW - drawW) / 2;
      const posY = marginPts + (maxDrawH - drawH) / 2;

      const streamText = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${posX.toFixed(2)} ${posY.toFixed(2)} cm\n/Im1 Do\nQ\n`;
      const streamBytes = encoder.encode(streamText);

      // Obj Page
      objectOffsets[pageId] = currentByteOffset;
      appendString(`${pageId} 0 obj\n<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Contents ${contentId} 0 R /Resources << /XObject << /Im1 ${imageXObjId} 0 R >> >> >>\nendobj\n`);

      // Obj Content Stream
      objectOffsets[contentId] = currentByteOffset;
      appendString(`${contentId} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`);
      appendBytes(streamBytes);
      appendString(`endstream\nendobj\n`);

      // Obj Image XObject
      objectOffsets[imageXObjId] = currentByteOffset;
      appendString(`${imageXObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`);
      appendBytes(img.bytes);
      appendString(`\nendstream\nendobj\n`);
    }

    // Write XREF Table
    const startXRefOffset = currentByteOffset;
    const totalObjects = 2 + totalPages * 3;

    appendString(`xref\n0 ${totalObjects + 1}\n`);
    appendString(`0000000000 65535 f \n`);

    for (let id = 1; id <= totalObjects; id++) {
      const offset = objectOffsets[id] || 0;
      const paddedOffset = String(offset).padStart(10, '0');
      appendString(`${paddedOffset} 00000 n \n`);
    }

    // Write Trailer
    appendString(`trailer\n<< /Size ${totalObjects + 1} /Root ${catalogObjId} 0 R >>\nstartxref\n${startXRefOffset}\n%%EOF\n`);

    return new Blob(parts, { type: 'application/pdf' });
  }

  /**
   * 2. Convert PDF File ArrayBuffer into array of Image Blobs (PDF to Photo)
   */
  static async pdfToImages(pdfArrayBuffer, options = {}) {
    const { format = 'image/jpeg', dpi = 150 } = options;
    const scale = dpi / 72; // Convert PDF points (72pt/inch) to target DPI scale

    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF rendering library is loading. Please check your internet connection.');
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const imageBlobs = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      const blob = await new Promise(resolve => canvas.toBlob(resolve, format, 0.92));
      imageBlobs.push({
        pageNum,
        blob,
        filename: `pdf_page_${pageNum}.${format === 'image/png' ? 'png' : 'jpg'}`
      });
    }

    return imageBlobs;
  }

  /**
   * 3. Merge multiple PDF ArrayBuffers into one single PDF Blob
   */
  static async mergePdfs(pdfBuffersArray) {
    if (!pdfBuffersArray || pdfBuffersArray.length < 2) {
      throw new Error('Please select at least 2 PDF files to merge.');
    }

    if (typeof PDFLib !== 'undefined') {
      const mergedPdf = await PDFLib.PDFDocument.create();
      for (const buffer of pdfBuffersArray) {
        const pdf = await PDFLib.PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    // Fallback: Convert pages from all PDFs to images and compile into single PDF
    const allImages = [];
    for (const buffer of pdfBuffersArray) {
      const pageImages = await PDFEngine.pdfToImages(buffer, { format: 'image/jpeg', dpi: 150 });
      for (const item of pageImages) {
        const imgObj = await ImageProcessor.loadImage(URL.createObjectURL(item.blob));
        allImages.push(imgObj);
      }
    }
    return await PDFEngine.imagesToPdfBlob(allImages, { pageSize: 'a4', orientation: 'portrait', margin: 10 });
  }

  /**
   * 4. Compress/Resize PDF to exact Target KB / MB size
   */
  static async compressPdfToTargetSize(pdfArrayBuffer, targetKb, progressCallback = null) {
    if (!targetKb || targetKb <= 0) {
      throw new Error('Please specify a valid target size (KB or MB).');
    }

    const targetBytes = targetKb * 1024;
    
    // First, convert PDF pages to canvas images
    const pageImages = await PDFEngine.pdfToImages(pdfArrayBuffer, { format: 'image/jpeg', dpi: 150 });
    const imgObjects = [];
    for (const item of pageImages) {
      const imgObj = await ImageProcessor.loadImage(URL.createObjectURL(item.blob));
      imgObjects.push(imgObj);
    }

    // Binary search on compression quality / scale to hit target size
    let minQuality = 0.05;
    let maxQuality = 0.95;
    let bestBlob = null;
    let iterations = 6;

    for (let i = 0; i < iterations; i++) {
      const currentQuality = (minQuality + maxQuality) / 2;
      if (progressCallback) progressCallback(i + 1, iterations);

      const canvases = [];
      for (const img of imgObjects) {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        canvases.push(c);
      }

      const candidateBlob = await PDFEngine.imagesToPdfBlob(canvases, {
        pageSize: 'a4',
        orientation: 'portrait',
        margin: 10,
        quality: currentQuality
      });

      if (!bestBlob || candidateBlob.size <= targetBytes) {
        bestBlob = candidateBlob;
        minQuality = currentQuality;
      } else {
        maxQuality = currentQuality;
      }
    }

    return bestBlob;
  }
}
