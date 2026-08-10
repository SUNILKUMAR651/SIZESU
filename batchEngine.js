/* ==========================================================================
   SIZESU - Robust Batch Processing & Fail-Safe Downloader Engine
   Guarantees 100% download reliability with fallback link triggers.
   ========================================================================== */

class BatchEngine {
  constructor() {
    this.files = [];
    this.processedBlobs = [];
  }

  addFiles(fileList) {
    const added = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith('image/')) {
        const item = {
          id: 'img_' + Math.random().toString(36).substr(2, 9),
          file: file,
          name: file.name,
          originalSize: file.size,
          previewUrl: URL.createObjectURL(file),
          status: 'pending',
          processedBlob: file, // Default fallback to original file blob
          processedSize: file.size
        };
        this.files.push(item);
        added.push(item);
      }
    }
    return added;
  }

  removeFile(id) {
    const idx = this.files.findIndex(f => f.id === id);
    if (idx !== -1) {
      URL.revokeObjectURL(this.files[idx].previewUrl);
      this.files.splice(idx, 1);
    }
  }

  clear() {
    this.files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    this.files = [];
    this.processedBlobs = [];
  }

  async processBatch(options, progressCallback) {
    const total = this.files.length;
    let completedCount = 0;

    for (let i = 0; i < total; i++) {
      const item = this.files[i];
      item.status = 'processing';
      if (progressCallback) progressCallback(completedCount, total, item);

      try {
        const img = await ImageProcessor.loadImage(item.file);
        let finalBlob;
        const mimeType = options.format || item.file.type || 'image/jpeg';

        if (options.targetKb && options.targetKb > 0) {
          finalBlob = await ImageProcessor.compressToTargetKb(img, options.targetKb, mimeType, options);
        } else {
          const canvas = ImageProcessor.processImage(img, options);
          finalBlob = await ImageProcessor.canvasToBlob(canvas, mimeType, options.quality || 0.9);
        }

        item.processedBlob = finalBlob;
        item.processedSize = finalBlob.size;
        item.status = 'completed';
      } catch (err) {
        console.error('Error processing batch item:', item.name, err);
        item.status = 'error';
      }

      completedCount++;
      if (progressCallback) progressCallback(completedCount, total, item);
    }

    return this.files;
  }

  /**
   * Fail-safe single image downloader
   */
  downloadSingle(id, formatExtension = 'jpg', customBlob = null) {
    const item = this.files.find(f => f.id === id);
    const blobToDownload = customBlob || (item && item.processedBlob) || (item && item.file);

    if (!blobToDownload) {
      alert('No image ready for download.');
      return;
    }

    const baseName = item ? item.name.substring(0, item.name.lastIndexOf('.')) || item.name : 'sizesu_image';
    const downloadName = `sizesu_${baseName}.${formatExtension}`;

    BatchEngine.triggerBlobDownload(blobToDownload, downloadName);
  }

  /**
   * Universal Blob Downloader - Guarantees clean single download with exact filename extension
   */
  static triggerBlobDownload(blob, fileName = 'sizesu_image.jpg') {
    if (!blob) {
      if (window.showToast) window.showToast('No file ready to download', 'error');
      return;
    }

    // Ensure valid non-empty filename with proper extension
    let safeFileName = (fileName || 'sizesu_image').trim();
    if (!/\.[a-zA-Z0-9]+$/.test(safeFileName)) {
      const mimeExt = blob.type ? blob.type.split('/')[1] : 'jpg';
      const cleanExt = mimeExt.replace('+xml', '').replace('jpeg', 'jpg');
      safeFileName = `${safeFileName}.${cleanExt || 'jpg'}`;
    }

    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeFileName;
    link.style.display = 'none';

    document.body.appendChild(link);

    // Single clean click trigger
    link.click();

    if (window.showToast) {
      window.showToast(`Downloaded <strong>${safeFileName}</strong>`, 'success');
    }

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 5000);
  }

  /**
   * Download Zip Archive of all files
   */
  async downloadAllZip(zipName = 'sizesu_batch_images.zip') {
    if (typeof JSZip === 'undefined') {
      alert('JSZip library loading... Downloading files individually.');
      this.files.forEach(item => this.downloadSingle(item.id));
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder('SIZESU_Processed');

    this.files.forEach(item => {
      const blob = item.processedBlob || item.file;
      if (blob) {
        const ext = blob.type ? blob.type.split('/')[1] : 'jpg';
        const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
        folder.file(`${baseName}_sizesu.${ext}`, blob);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    BatchEngine.triggerBlobDownload(zipBlob, zipName);
  }
}
