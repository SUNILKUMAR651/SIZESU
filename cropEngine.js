/* ==========================================================================
   SIZESU - Interactive Canvas Cropping Engine
   Interactive crop overlay with 4 corner anchors, touch screen support,
   rule of thirds grid, and aspect ratio lock.
   ========================================================================== */

class CropEngine {
  constructor(container, imgElement, options = {}) {
    this.container = container;
    this.imgElement = imgElement;
    this.options = options;

    this.cropRect = { x: 0, y: 0, w: 0, h: 0 };
    this.targetAspectRatio = options.aspectRatio || null;
    this.isDragging = false;
    this.dragHandle = null;
    this.startX = 0;
    this.startY = 0;

    this.initOverlay();
  }

  initOverlay() {
    // Remove existing crop overlay if present
    const existing = this.container.querySelector('.crop-overlay');
    if (existing) existing.remove();

    this.overlay = document.createElement('div');
    this.overlay.className = 'crop-overlay';
    this.overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 10;
    `;

    this.cropBox = document.createElement('div');
    this.cropBox.className = 'crop-box';
    this.cropBox.style.cssText = `
      position: absolute;
      border: 2px dashed #6366f1;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
      cursor: move;
      pointer-events: auto;
      touch-action: none;
    `;

    // Rule of thirds grid lines
    const grid = document.createElement('div');
    grid.style.cssText = `
      width: 100%; height: 100%;
      background:
        linear-gradient(to right, transparent 33.33%, rgba(255,255,255,0.3) 33.33%, rgba(255,255,255,0.3) 34.33%, transparent 34.33%, transparent 66.66%, rgba(255,255,255,0.3) 66.66%, rgba(255,255,255,0.3) 67.66%, transparent 67.66%),
        linear-gradient(to bottom, transparent 33.33%, rgba(255,255,255,0.3) 33.33%, rgba(255,255,255,0.3) 34.33%, transparent 34.33%, transparent 66.66%, rgba(255,255,255,0.3) 66.66%, rgba(255,255,255,0.3) 67.66%, transparent 67.66%);
      pointer-events: none;
    `;
    this.cropBox.appendChild(grid);

    // Create 4 corner handles
    ['nw', 'ne', 'se', 'sw'].forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `crop-handle handle-${pos}`;
      handle.dataset.handle = pos;
      handle.style.cssText = `
        position: absolute;
        width: 16px; height: 16px;
        background: #ffffff;
        border: 2px solid #6366f1;
        border-radius: 50%;
        cursor: ${pos}-resize;
        z-index: 12;
        touch-action: none;
      `;
      if (pos.includes('n')) handle.style.top = '-8px';
      if (pos.includes('s')) handle.style.bottom = '-8px';
      if (pos.includes('w')) handle.style.left = '-8px';
      if (pos.includes('e')) handle.style.right = '-8px';

      this.cropBox.appendChild(handle);
    });

    this.overlay.appendChild(this.cropBox);
    this.container.appendChild(this.overlay);

    this.resetCropToImage();
    this.bindEvents();
  }

  resetCropToImage() {
    if (!this.imgElement || !this.container) return;
    const rect = this.imgElement.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    const imgX = rect.left - containerRect.left;
    const imgY = rect.top - containerRect.top;
    const imgW = rect.width;
    const imgH = rect.height;

    let w = imgW * 0.8;
    let h = imgH * 0.8;

    if (this.targetAspectRatio) {
      if (w / h > this.targetAspectRatio) {
        w = h * this.targetAspectRatio;
      } else {
        h = w / this.targetAspectRatio;
      }
    }

    const x = imgX + (imgW - w) / 2;
    const y = imgY + (imgH - h) / 2;

    this.cropRect = { x, y, w, h };
    this.updateBoxDOM();
  }

  setAspectRatio(ratio) {
    this.targetAspectRatio = ratio;
    this.resetCropToImage();
  }

  updateBoxDOM() {
    this.cropBox.style.left = `${this.cropRect.x}px`;
    this.cropBox.style.top = `${this.cropRect.y}px`;
    this.cropBox.style.width = `${this.cropRect.w}px`;
    this.cropBox.style.height = `${this.cropRect.h}px`;
  }

  bindEvents() {
    const getClientXY = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      return { clientX: e.clientX, clientY: e.clientY };
    };

    const onStart = (e) => {
      const handle = e.target.dataset.handle;
      if (e.target === this.cropBox || handle) {
        if (e.cancelable) e.preventDefault();
        const pos = getClientXY(e);
        this.isDragging = true;
        this.dragHandle = handle || 'move';
        this.startX = pos.clientX;
        this.startY = pos.clientY;
        this.startRect = { ...this.cropRect };
      }
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      if (e.cancelable) e.preventDefault();
      const pos = getClientXY(e);
      const dx = pos.clientX - this.startX;
      const dy = pos.clientY - this.startY;

      if (this.dragHandle === 'move') {
        this.cropRect.x = this.startRect.x + dx;
        this.cropRect.y = this.startRect.y + dy;
      } else if (this.dragHandle === 'se') {
        this.cropRect.w = Math.max(30, this.startRect.w + dx);
        this.cropRect.h = this.targetAspectRatio ? this.cropRect.w / this.targetAspectRatio : Math.max(30, this.startRect.h + dy);
      } else if (this.dragHandle === 'sw') {
        const nw = Math.max(30, this.startRect.w - dx);
        this.cropRect.x = this.startRect.x + (this.startRect.w - nw);
        this.cropRect.w = nw;
        this.cropRect.h = this.targetAspectRatio ? this.cropRect.w / this.targetAspectRatio : Math.max(30, this.startRect.h + dy);
      } else if (this.dragHandle === 'ne') {
        this.cropRect.w = Math.max(30, this.startRect.w + dx);
        const nh = this.targetAspectRatio ? this.cropRect.w / this.targetAspectRatio : Math.max(30, this.startRect.h - dy);
        this.cropRect.y = this.startRect.y + (this.startRect.h - nh);
        this.cropRect.h = nh;
      } else if (this.dragHandle === 'nw') {
        const nw = Math.max(30, this.startRect.w - dx);
        this.cropRect.x = this.startRect.x + (this.startRect.w - nw);
        this.cropRect.w = nw;
        const nh = this.targetAspectRatio ? this.cropRect.w / this.targetAspectRatio : Math.max(30, this.startRect.h - dy);
        this.cropRect.y = this.startRect.y + (this.startRect.h - nh);
        this.cropRect.h = nh;
      }

      this.updateBoxDOM();
    };

    const onEnd = () => {
      this.isDragging = false;
      this.dragHandle = null;
    };

    this.onStartRef = onStart;
    this.onMoveRef = onMove;
    this.onEndRef = onEnd;

    // Mouse Events
    this.overlay.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    // Touch Events
    this.overlay.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  /**
   * Get cropped canvas coordinates relative to actual natural image resolution
   */
  getCroppedCanvas(naturalWidth, naturalHeight) {
    const imgRect = this.imgElement.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    const imgX = imgRect.left - containerRect.left;
    const imgY = imgRect.top - containerRect.top;

    const scaleX = naturalWidth / imgRect.width;
    const scaleY = naturalHeight / imgRect.height;

    const cropX = Math.max(0, (this.cropRect.x - imgX) * scaleX);
    const cropY = Math.max(0, (this.cropRect.y - imgY) * scaleY);
    const cropW = Math.min(naturalWidth - cropX, this.cropRect.w * scaleX);
    const cropH = Math.min(naturalHeight - cropY, this.cropRect.h * scaleY);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropW));
    canvas.height = Math.max(1, Math.round(cropH));

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.imgElement, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  destroy() {
    if (this.onStartRef) {
      window.removeEventListener('mousemove', this.onMoveRef);
      window.removeEventListener('mouseup', this.onEndRef);
      window.removeEventListener('touchmove', this.onMoveRef);
      window.removeEventListener('touchend', this.onEndRef);
    }
    if (this.overlay) this.overlay.remove();
  }
}
