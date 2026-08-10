/* ==========================================================================
   SIZESU - Master Application Controller & Instant Tool Coordinator
   Handles all tools: Resize, Target KB, Passport Photo, AI Background Removal,
   PDF Conversion, QR Generator, Crop/Rotate, Watermark, Format Converter, and Downloader.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Registration notice:', err));
  }

  // Engine & Queue instances
  const batchEngine = new BatchEngine();
  let currentActiveFile = null;
  let activeImageObj = null;
  let activeTab = 'resize';
  let cropEngine = null;
  let isAspectLocked = true;
  let aspectRatioValue = null;
  let renderDebounceTimer = null;
  let lastPreviewObjectUrl = null;

  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const selectFilesBtn = document.getElementById('selectFilesBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const toolNav = document.getElementById('toolNav');
  const workspaceArea = document.getElementById('workspaceArea');

  // Preview elements
  const previewCanvasContainer = document.getElementById('previewCanvasContainer');
  const previewImg = document.getElementById('previewImg');
  const downloadSingleBtn = document.getElementById('downloadSingleBtn');
  const downloadPreviewDirectBtn = document.getElementById('downloadPreviewDirectBtn');
  const processBatchBtn = document.getElementById('processBatchBtn');
  const downloadZipBtn = document.getElementById('downloadZipBtn');

  // Input Controls
  const inputWidth = document.getElementById('inputWidth');
  const inputHeight = document.getElementById('inputHeight');
  const unitSelect = document.getElementById('unitSelect');
  const lockAspectBtn = document.getElementById('lockAspectBtn');
  const dpiSelect = document.getElementById('dpiSelect');
  const targetKbInput = document.getElementById('targetKbInput');
  const formatSelect = document.getElementById('formatSelect');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityVal = document.getElementById('qualityVal');

  // Passport & Presets
  const passportPresetSelect = document.getElementById('passportPresetSelect');
  const passportBgSelect = document.getElementById('passportBgSelect');
  const passportGridSheetBtn = document.getElementById('passportGridSheetBtn');
  const socialPresetSelect = document.getElementById('socialPresetSelect');

  // AI, PDF, QR Controls
  const aiRemoveBgBtn = document.getElementById('aiRemoveBgBtn');
  const aiBgColorSelect = document.getElementById('aiBgColorSelect');
  const generatePdfBtn = document.getElementById('generatePdfBtn');
  const pdfPageSizeSelect = document.getElementById('pdfPageSizeSelect');
  const pdfOrientationSelect = document.getElementById('pdfOrientationSelect');
  const pdfMarginSelect = document.getElementById('pdfMarginSelect');

  const generateQrBtn = document.getElementById('generateQrBtn');
  const qrTextInput = document.getElementById('qrTextInput');
  const qrFgColorInput = document.getElementById('qrFgColorInput');
  const qrBgColorInput = document.getElementById('qrBgColorInput');

  // Adjustments & Watermark
  const rotateCwBtn = document.getElementById('rotateCwBtn');
  const flipHBtn = document.getElementById('flipHBtn');
  const flipVBtn = document.getElementById('flipVBtn');
  const brightnessSlider = document.getElementById('brightnessSlider');
  const brightnessVal = document.getElementById('brightnessVal');
  const contrastSlider = document.getElementById('contrastSlider');
  const contrastVal = document.getElementById('contrastVal');
  const saturationSlider = document.getElementById('saturationSlider');
  const saturationVal = document.getElementById('saturationVal');

  const watermarkTextInput = document.getElementById('watermarkTextInput');
  const watermarkPosSelect = document.getElementById('watermarkPosSelect');
  const watermarkColorInput = document.getElementById('watermarkColorInput');

  // Format Converter Panel
  const convertFormatSelect = document.getElementById('convertFormatSelect');
  const convertQualitySlider = document.getElementById('convertQualitySlider');
  const convertQualityVal = document.getElementById('convertQualityVal');
  const convertBtn = document.getElementById('convertBtn');

  // Stats Badges
  const origDimBadge = document.getElementById('origDimBadge');
  const origSizeBadge = document.getElementById('origSizeBadge');
  const newDimBadge = document.getElementById('newDimBadge');
  const newSizeBadge = document.getElementById('newSizeBadge');

  let currentOptions = {
    width: 0,
    height: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    targetKb: 0,
    format: 'image/jpeg',
    quality: 0.9,
    backgroundColor: null,
    watermark: null
  };

  // --- INITIALIZATION ---
  initTheme();
  populatePresets();
  bindEvents();
  bindSearchModalEvents();

  function initTheme() {
    const savedTheme = localStorage.getItem('sizesu_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sizesu_theme', next);
      showToast(`Switched to ${next} theme mode`, 'info');
    });
  }

  function populatePresets() {
    if (passportPresetSelect && typeof SIZESU_PRESETS !== 'undefined') {
      passportPresetSelect.innerHTML = '<option value="">-- Choose Passport / Visa Spec --</option>';
      SIZESU_PRESETS.passport.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `${item.name} (${item.desc})`;
        passportPresetSelect.appendChild(opt);
      });
    }

    if (socialPresetSelect && typeof SIZESU_PRESETS !== 'undefined') {
      socialPresetSelect.innerHTML = '<option value="">-- Choose Social Media Spec --</option>';
      SIZESU_PRESETS.social.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `[${item.category}] ${item.name} (${item.width}x${item.height} px)`;
        socialPresetSelect.appendChild(opt);
      });
    }
  }

  function bindEvents() {
    // File Dropzone & Select
    if (selectFilesBtn && fileInput) {
      selectFilesBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFilesSelect(e.target.files));
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFilesSelect(e.dataTransfer.files);
      });
    }

    // Paste listener (Ctrl+V)
    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      const pastedFiles = [];
      for (let item of items) {
        if (item.type.indexOf('image') === 0) pastedFiles.push(item.getAsFile());
      }
      if (pastedFiles.length > 0) {
        handleFilesSelect(pastedFiles);
        showToast('Pasted image from clipboard!', 'success');
      }
    });

    // Navigation Tabs
    if (toolNav) {
      toolNav.querySelectorAll('.tool-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          toolNav.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          activeTab = tab.dataset.tool;

          document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
          const activePanel = document.getElementById(`panel_${activeTab}`);
          if (activePanel) activePanel.style.display = 'block';

          const toolHashMap = {
            'resize': 'tool/resize-image-to-50kb',
            'compress': 'tool/resize-image-to-20kb',
            'passport': 'tool/passport-photo-maker',
            'ai': 'tool/remove-background',
            'pdf': 'tool/image-to-pdf',
            'qr': 'tool/qr-code-generator',
            'social': 'tool/resize-image-to-100kb',
            'crop': 'tool/resize-image-to-50kb',
            'convert': 'tool/png-to-jpg'
          };
          if (toolHashMap[activeTab] && !window.location.hash.includes(activeTab)) {
            window.history.replaceState(null, '', `#${toolHashMap[activeTab]}`);
            window.dispatchEvent(new Event('hashchange'));
          }

          handleToolSwitch();
        });
      });
    }

    // Sidebar & Mobile Nav Logic
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar(show) {
      if (!mobileSidebar || !sidebarOverlay) return;
      if(show) {
        mobileSidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
      } else {
        mobileSidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
      }
    }

    if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', () => toggleSidebar(true));
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', () => toggleSidebar(false));
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

    // Nav and Sidebar Tool Links Logic
    document.querySelectorAll('.nav-tool-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTool = link.dataset.tool;
        if(toolNav) {
          const targetBtn = toolNav.querySelector(`.tool-tab[data-tool="${targetTool}"]`);
          if(targetBtn) targetBtn.click(); // Reuse existing logic
        }
        toggleSidebar(false); // Close sidebar if open
        
        // Highlight active sidebar link
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        if(link.classList.contains('sidebar-link')) {
          link.classList.add('active');
        } else {
          // If clicked from navbar, highlight in sidebar too
          const sidebarLink = document.querySelector(`.sidebar-link[data-tool="${targetTool}"]`);
          if(sidebarLink) sidebarLink.classList.add('active');
        }
      });
    });

    // Handle incoming SEO route changes to activate corresponding tab
    window.addEventListener('toolRouteChanged', (e) => {
      const config = e.detail;
      if (!config) return;

      let targetTab = config.tab || 'resize';
      if (!config.tab) {
        const cid = config.id || '';
        if (config.targetKb && !config.presetWidthMm) targetTab = 'compress';
        else if (config.category === 'Passport & Visa' || config.presetWidthMm || cid.includes('passport')) targetTab = 'passport';
        else if (config.category === 'Social Media' || cid.includes('social') || cid.includes('instagram') || cid.includes('youtube')) targetTab = 'social';
        else if (cid.includes('pdf')) targetTab = 'pdf';
        else if (cid.includes('qr')) targetTab = 'qr';
        else if (cid.includes('bg') || cid.includes('remove')) targetTab = 'ai';
        else if (cid.includes('convert') || cid.includes('format')) targetTab = 'convert';
        else if (cid.includes('crop') || cid.includes('rotate')) targetTab = 'crop';
      }

      if (toolNav) {
        const targetBtn = toolNav.querySelector(`.tool-tab[data-tool="${targetTab}"]`);
        if (targetBtn) {
          toolNav.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
          targetBtn.classList.add('active');
          activeTab = targetTab;

          document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
          const activePanel = document.getElementById(`panel_${activeTab}`);
          if (activePanel) activePanel.style.display = 'block';

          handleToolSwitch();
        }
      }

      if (config.targetKb) {
        currentOptions.targetKb = config.targetKb;
        if (targetKbInput) targetKbInput.value = config.targetKb;
        document.querySelectorAll('.preset-pills .pill-btn[data-kb]').forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.kb, 10) === config.targetKb);
        });
      }

      // Activate submode pill for PDF tools if applicable
      const cid = config.id || '';
      if (cid === 'pdf-to-photo' || cid === 'merge-pdf' || cid === 'image-to-pdf' || cid === 'compress-pdf') {
        let pdfSubmode = 'img2pdf';
        if (cid === 'pdf-to-photo') pdfSubmode = 'pdf2img';
        else if (cid === 'merge-pdf') pdfSubmode = 'merge';
        else if (cid === 'compress-pdf') pdfSubmode = 'compress';

        const subBtn = document.querySelector(`#pdfModePills .pill-btn[data-pdfmode="${pdfSubmode}"]`);
        if (subBtn) {
          subBtn.click();
        }
      }
    });

    // Dimension Inputs
    if (inputWidth) inputWidth.addEventListener('input', () => onDimensionChange('width'));
    if (inputHeight) inputHeight.addEventListener('input', () => onDimensionChange('height'));
    if (unitSelect) unitSelect.addEventListener('change', updateDimensionFromUnit);
    if (dpiSelect) dpiSelect.addEventListener('change', updateDimensionFromUnit);

    if (lockAspectBtn) {
      lockAspectBtn.addEventListener('click', () => {
        isAspectLocked = !isAspectLocked;
        lockAspectBtn.classList.toggle('active', isAspectLocked);
        if (isAspectLocked && currentOptions.width && currentOptions.height) {
          aspectRatioValue = currentOptions.width / currentOptions.height;
        }
      });
    }

    // Target KB Quick Pills & Input
    document.querySelectorAll('.preset-pills .pill-btn').forEach(btn => {
      if (btn.dataset.kb) {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.preset-pills .pill-btn[data-kb]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const targetKb = parseInt(btn.dataset.kb, 10);
          if (targetKbInput) targetKbInput.value = targetKb;
          currentOptions.targetKb = targetKb;
          debouncedRender();
        });
      }
    });

    if (targetKbInput) {
      targetKbInput.addEventListener('input', () => {
        currentOptions.targetKb = parseInt(targetKbInput.value, 10) || 0;
        debouncedRender();
      });
    }

    if (qualitySlider) {
      qualitySlider.addEventListener('input', () => {
        if (qualityVal) qualityVal.textContent = `${qualitySlider.value}%`;
        currentOptions.quality = qualitySlider.value / 100;
        debouncedRender();
      });
    }

    if (formatSelect) {
      formatSelect.addEventListener('change', () => {
        currentOptions.format = formatSelect.value;
        debouncedRender();
      });
    }

    // Passport Preset Change
    if (passportPresetSelect) {
      passportPresetSelect.addEventListener('change', () => {
        const selected = SIZESU_PRESETS.passport.find(p => p.id === passportPresetSelect.value);
        if (selected) {
          const dpi = parseInt(dpiSelect.value, 10) || 300;
          currentOptions.width = mmToPx(selected.widthMm, dpi);
          currentOptions.height = mmToPx(selected.heightMm, dpi);
          currentOptions.targetKb = selected.maxKb;
          if (targetKbInput) targetKbInput.value = selected.maxKb;
          if (inputWidth) inputWidth.value = currentOptions.width;
          if (inputHeight) inputHeight.value = currentOptions.height;

          if (selected.bg === 'white') currentOptions.backgroundColor = '#ffffff';
          else if (selected.bg === 'lightgrey') currentOptions.backgroundColor = '#e2e8f0';

          debouncedRender();
          showToast(`Applied ${selected.name} preset`, 'info');
        }
      });
    }

    if (passportBgSelect) {
      passportBgSelect.addEventListener('change', () => {
        currentOptions.backgroundColor = passportBgSelect.value === 'transparent' ? null : passportBgSelect.value;
        debouncedRender();
      });
    }

    if (passportGridSheetBtn) {
      passportGridSheetBtn.addEventListener('click', generatePassportGridSheet);
    }

    // Social Media Preset Change
    if (socialPresetSelect) {
      socialPresetSelect.addEventListener('change', () => {
        const selected = SIZESU_PRESETS.social.find(s => s.id === socialPresetSelect.value);
        if (selected) {
          currentOptions.width = selected.width;
          currentOptions.height = selected.height;
          if (inputWidth) inputWidth.value = selected.width;
          if (inputHeight) inputHeight.value = selected.height;
          debouncedRender();
          showToast(`Applied ${selected.name} preset`, 'info');
        }
      });
    }

    // Adjustments (Rotate, Flip, Brightness, Contrast, Saturation)
    if (rotateCwBtn) {
      rotateCwBtn.addEventListener('click', () => {
        currentOptions.rotation = (currentOptions.rotation + 90) % 360;
        debouncedRender();
      });
    }

    if (flipHBtn) {
      flipHBtn.addEventListener('click', () => {
        currentOptions.flipH = !currentOptions.flipH;
        debouncedRender();
      });
    }

    if (flipVBtn) {
      flipVBtn.addEventListener('click', () => {
        currentOptions.flipV = !currentOptions.flipV;
        debouncedRender();
      });
    }

    if (brightnessSlider) {
      brightnessSlider.addEventListener('input', () => {
        if (brightnessVal) brightnessVal.textContent = `${brightnessSlider.value}%`;
        currentOptions.brightness = brightnessSlider.value;
        debouncedRender();
      });
    }

    if (contrastSlider) {
      contrastSlider.addEventListener('input', () => {
        if (contrastVal) contrastVal.textContent = `${contrastSlider.value}%`;
        currentOptions.contrast = contrastSlider.value;
        debouncedRender();
      });
    }

    if (saturationSlider) {
      saturationSlider.addEventListener('input', () => {
        if (saturationVal) saturationVal.textContent = `${saturationSlider.value}%`;
        currentOptions.saturation = saturationSlider.value;
        debouncedRender();
      });
    }

    // Crop Aspect Ratio Pills
    document.querySelectorAll('#cropRatioPills .pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#cropRatioPills .pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const ratioAttr = btn.dataset.ratio;
        const ratio = ratioAttr === 'free' ? null : parseFloat(ratioAttr);
        if (cropEngine) {
          cropEngine.setAspectRatio(ratio);
        }
      });
    });

    // Watermark Text
    const updateWatermark = () => {
      const text = watermarkTextInput ? watermarkTextInput.value.trim() : '';
      if (text) {
        currentOptions.watermark = {
          text: text,
          position: watermarkPosSelect ? watermarkPosSelect.value : 'bottom-right',
          color: watermarkColorInput ? watermarkColorInput.value : '#ffffff',
          fontSize: 28,
          opacity: 0.7
        };
      } else {
        currentOptions.watermark = null;
      }
      debouncedRender();
    };

    if (watermarkTextInput) watermarkTextInput.addEventListener('input', updateWatermark);
    if (watermarkPosSelect) watermarkPosSelect.addEventListener('change', updateWatermark);
    if (watermarkColorInput) watermarkColorInput.addEventListener('input', updateWatermark);

    // Format Converter Panel Controls
    if (convertQualitySlider) {
      convertQualitySlider.addEventListener('input', () => {
        if (convertQualityVal) convertQualityVal.textContent = `${convertQualitySlider.value}%`;
      });
    }

    if (convertBtn) {
      convertBtn.addEventListener('click', () => {
        if (!activeImageObj) {
          showToast('Please upload an image first!', 'error');
          return;
        }
        const format = convertFormatSelect.value || 'image/jpeg';
        const quality = convertQualitySlider ? convertQualitySlider.value / 100 : 0.9;
        const canvas = ImageProcessor.processImage(activeImageObj, { ...currentOptions, format, quality });
        
        ImageProcessor.canvasToBlob(canvas, format, quality).then(blob => {
          const ext = format.split('/')[1] || 'jpg';
          BatchEngine.triggerBlobDownload(blob, `sizesu_converted.${ext}`);
          showToast(`Converted & downloaded image as ${ext.toUpperCase()}`, 'success');
        });
      });
    }

    // AI Background Removal Trigger
    if (aiRemoveBgBtn) {
      aiRemoveBgBtn.addEventListener('click', () => {
        if (!activeImageObj) {
          showToast('Please upload an image first!', 'error');
          return;
        }
        showToast('Processing AI Background Removal...', 'info');
        const replaceColor = aiBgColorSelect && aiBgColorSelect.value === 'transparent' ? null : (aiBgColorSelect ? aiBgColorSelect.value : null);
        const cleanedCanvas = AIEngine.removeBackground(activeImageObj, { replaceColor });

        cleanedCanvas.toBlob(blob => {
          const blobUrl = URL.createObjectURL(blob);
          if (previewImg) previewImg.src = blobUrl;

          // Update active working image object to the background-removed canvas image
          ImageProcessor.loadImage(blobUrl).then(newImg => {
            activeImageObj = newImg;
          });

          if (currentActiveFile) {
            currentActiveFile.processedBlob = blob;
            currentActiveFile.processedSize = blob.size;
          }
          if (newSizeBadge) newSizeBadge.textContent = formatBytes(blob.size);
          showToast('Background removed successfully! Click Download to save.', 'success');
        }, replaceColor ? 'image/jpeg' : 'image/png', 0.95);
      });
    }

    // PDF Submode Pills Switcher
    document.querySelectorAll('#pdfModePills .pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#pdfModePills .pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.pdfmode;
        document.querySelectorAll('.pdf-submode').forEach(s => s.style.display = 'none');
        const activeSub = document.getElementById(`pdfSubmode_${mode}`);
        if (activeSub) activeSub.style.display = 'block';

        const modeHashMap = {
          'img2pdf': 'tool/image-to-pdf',
          'pdf2img': 'tool/pdf-to-photo',
          'merge': 'tool/merge-pdf',
          'compress': 'tool/compress-pdf'
        };
        if (modeHashMap[mode]) {
          window.history.replaceState(null, '', `#${modeHashMap[mode]}`);
        }
      });
    });

    // 1. Photo to PDF Generator Trigger
    if (generatePdfBtn) {
      generatePdfBtn.addEventListener('click', async () => {
        if (!activeImageObj && batchEngine.files.length === 0) {
          showToast('Please upload an image first!', 'error');
          return;
        }
        showToast('Generating PDF document...', 'info');

        const pageSize = pdfPageSizeSelect ? pdfPageSizeSelect.value : 'a4';
        const orientation = pdfOrientationSelect ? pdfOrientationSelect.value : 'portrait';
        const margin = pdfMarginSelect ? parseInt(pdfMarginSelect.value, 10) : 20;

        try {
          const imgs = activeImageObj ? [activeImageObj] : [];
          const pdfBlob = await PDFEngine.imagesToPdfBlob(imgs, { pageSize, orientation, margin });
          BatchEngine.triggerBlobDownload(pdfBlob, 'sizesu_converted_document.pdf');
          showToast('PDF Document downloaded successfully!', 'success');
        } catch (err) {
          console.error('PDF Generation Error:', err);
          showToast('Failed to generate PDF document.', 'error');
        }
      });
    }

    // 2. PDF to Photo (Extract Images) Trigger
    const pdfToPhotoInput = document.getElementById('pdfToPhotoInput');
    const pdfToPhotoFormatSelect = document.getElementById('pdfToPhotoFormatSelect');
    const pdfToPhotoDpiSelect = document.getElementById('pdfToPhotoDpiSelect');
    const pdfToPhotoBtn = document.getElementById('pdfToPhotoBtn');

    if (pdfToPhotoBtn && pdfToPhotoInput) {
      pdfToPhotoBtn.addEventListener('click', async () => {
        const file = pdfToPhotoInput.files[0];
        if (!file) {
          showToast('Please select a PDF file first!', 'error');
          return;
        }
        showToast('Converting PDF pages to photos...', 'info');

        try {
          const buffer = await file.arrayBuffer();
          const format = pdfToPhotoFormatSelect ? pdfToPhotoFormatSelect.value : 'image/jpeg';
          const dpi = pdfToPhotoDpiSelect ? parseInt(pdfToPhotoDpiSelect.value, 10) : 150;

          const images = await PDFEngine.pdfToImages(buffer, { format, dpi });
          if (images.length === 1) {
            BatchEngine.triggerBlobDownload(images[0].blob, images[0].filename);
            showToast('PDF page converted and downloaded!', 'success');
          } else if (images.length > 1) {
            const zip = new JSZip();
            images.forEach(img => zip.file(img.filename, img.blob));
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            BatchEngine.triggerBlobDownload(zipBlob, `${file.name.replace('.pdf', '')}_photos.zip`);
            showToast(`Converted all ${images.length} PDF pages into ZIP photos!`, 'success');
          }
        } catch (err) {
          console.error('PDF to Photo Error:', err);
          showToast(err.message || 'Failed to convert PDF to photos.', 'error');
        }
      });
    }

    // 3. Merge PDFs Trigger
    const mergePdfFilesInput = document.getElementById('mergePdfFilesInput');
    const mergePdfFileList = document.getElementById('mergePdfFileList');
    const mergePdfBtn = document.getElementById('mergePdfBtn');

    if (mergePdfFilesInput && mergePdfFileList) {
      mergePdfFilesInput.addEventListener('change', () => {
        const files = Array.from(mergePdfFilesInput.files);
        if (files.length === 0) {
          mergePdfFileList.textContent = '';
        } else {
          mergePdfFileList.textContent = `Selected ${files.length} PDF file(s): ` + files.map(f => f.name).join(', ');
        }
      });
    }

    if (mergePdfBtn && mergePdfFilesInput) {
      mergePdfBtn.addEventListener('click', async () => {
        const files = Array.from(mergePdfFilesInput.files);
        if (files.length < 2) {
          showToast('Please select at least 2 PDF files to merge!', 'error');
          return;
        }
        showToast('Merging PDF documents...', 'info');

        try {
          const buffers = [];
          for (const f of files) {
            buffers.push(await f.arrayBuffer());
          }
          const mergedBlob = await PDFEngine.mergePdfs(buffers);
          BatchEngine.triggerBlobDownload(mergedBlob, 'sizesu_merged_document.pdf');
          showToast('PDF files merged and downloaded successfully!', 'success');
        } catch (err) {
          console.error('Merge PDF Error:', err);
          showToast(err.message || 'Failed to merge PDF files.', 'error');
        }
      });
    }

    // 4. PDF Target KB/MB Compressor Trigger
    const pdfCompressInput = document.getElementById('pdfCompressInput');
    const pdfTargetSizeValue = document.getElementById('pdfTargetSizeValue');
    const pdfTargetSizeUnit = document.getElementById('pdfTargetSizeUnit');
    const compressPdfBtn = document.getElementById('compressPdfBtn');

    document.querySelectorAll('#pdfTargetPills .pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#pdfTargetPills .pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const kb = parseInt(btn.dataset.pdfkb, 10);
        if (pdfTargetSizeValue) {
          if (kb >= 1024 && kb % 1024 === 0) {
            pdfTargetSizeValue.value = kb / 1024;
            if (pdfTargetSizeUnit) pdfTargetSizeUnit.value = 'MB';
          } else {
            pdfTargetSizeValue.value = kb;
            if (pdfTargetSizeUnit) pdfTargetSizeUnit.value = 'KB';
          }
        }
      });
    });

    if (compressPdfBtn && pdfCompressInput) {
      compressPdfBtn.addEventListener('click', async () => {
        const file = pdfCompressInput.files[0];
        if (!file) {
          showToast('Please select a PDF file first!', 'error');
          return;
        }

        const rawVal = parseFloat(pdfTargetSizeValue ? pdfTargetSizeValue.value : 200) || 200;
        const unit = pdfTargetSizeUnit ? pdfTargetSizeUnit.value : 'KB';
        const targetKb = unit === 'MB' ? Math.round(rawVal * 1024) : Math.round(rawVal);

        showToast(`Compressing PDF to target size (${rawVal} ${unit})...`, 'info');

        try {
          const buffer = await file.arrayBuffer();
          const compressedBlob = await PDFEngine.compressPdfToTargetSize(buffer, targetKb, (step, total) => {
            compressPdfBtn.textContent = `Optimizing Size (${step}/${total})...`;
          });
          compressPdfBtn.textContent = 'Compress PDF to Target Size';

          BatchEngine.triggerBlobDownload(compressedBlob, `sizesu_${file.name.replace('.pdf', '')}_compressed.pdf`);
          const newSizeFormatted = formatBytes(compressedBlob.size);
          showToast(`PDF compressed to ${newSizeFormatted}!`, 'success');
        } catch (err) {
          console.error('Compress PDF Error:', err);
          compressPdfBtn.textContent = 'Compress PDF to Target Size';
          showToast(err.message || 'Failed to compress PDF document.', 'error');
        }
      });
    }

    // QR Code Generator Trigger
    if (generateQrBtn) {
      generateQrBtn.addEventListener('click', () => {
        const text = qrTextInput ? qrTextInput.value.trim() || 'https://sizesu.app' : 'https://sizesu.app';
        const fgColor = qrFgColorInput ? qrFgColorInput.value : '#000000';
        const bgColor = qrBgColorInput ? qrBgColorInput.value : '#ffffff';
        const qrCanvas = document.createElement('canvas');
        new QRious({
          element: qrCanvas,
          value: text,
          background: bgColor,
          foreground: fgColor,
          size: 512,
          level: 'H',
          padding: 10
        });

        qrCanvas.toBlob(blob => {
          if (previewImg) previewImg.src = URL.createObjectURL(blob);
          if (currentActiveFile) {
            currentActiveFile.processedBlob = blob;
          }
          BatchEngine.triggerBlobDownload(blob, 'sizesu_qr_code.png');
          showToast('Camera-scannable QR Code downloaded!', 'success');
        }, 'image/png');
      });
    }

    // Universal Download Single Button
    const performDownloadCurrent = async () => {
      // If user clicks the main download button while in the QR tab, just generate and download the QR.
      if (activeTab === 'qr') {
        if (generateQrBtn) generateQrBtn.click();
        return;
      }
      
      if (activeTab === 'pdf') {
        showToast('Please use the PDF action buttons in the panel to download PDF files.', 'info');
        return;
      }

      if (!activeImageObj) {
        showToast('Please upload an image first!', 'error');
        return;
      }

      const ext = currentOptions.format.split('/')[1].replace('jpeg','jpg') || 'jpg';
      const filename = currentActiveFile ? currentActiveFile.name.replace(/\.[^.]+$/, '') : 'sizesu_image';

      // === COMPRESS TO EXACT TARGET KB MODE ===
      if (activeTab === 'compress' && currentOptions.targetKb > 0) {
        if (downloadSingleBtn) downloadSingleBtn.textContent = '⏳ Compressing...';
        if (downloadPreviewDirectBtn) downloadPreviewDirectBtn.textContent = '⏳ Compressing...';

        try {
          const blob = await ImageProcessor.compressToTargetKb(
            activeImageObj,
            currentOptions.targetKb,
            currentOptions.format,
            currentOptions
          );

          const actualKb = (blob.size / 1024).toFixed(1);
          const targetKb = currentOptions.targetKb;
          const isWithinTarget = blob.size <= targetKb * 1024;

          BatchEngine.triggerBlobDownload(blob, `${filename}_${targetKb}kb.${ext}`);

          if (isWithinTarget) {
            showToast(`✅ Downloaded! Size: ${actualKb} KB (Target: ${targetKb} KB)`, 'success');
          } else {
            showToast(`⚠️ Downloaded at ${actualKb} KB — image too complex for ${targetKb} KB target`, 'info');
          }
        } catch (err) {
          showToast('Compression failed. Try a larger target KB.', 'error');
        } finally {
          if (downloadSingleBtn) downloadSingleBtn.textContent = 'Download Image';
          if (downloadPreviewDirectBtn) downloadPreviewDirectBtn.textContent = 'Download Result Image Now';
        }
        return;
      }

      // === NORMAL DOWNLOAD (resize / convert / passport / crop / social) ===
      if (currentActiveFile && currentActiveFile.processedBlob) {
        const actualKb = (currentActiveFile.processedBlob.size / 1024).toFixed(1);
        batchEngine.downloadSingle(currentActiveFile.id, ext, currentActiveFile.processedBlob);
        showToast(`✅ Downloaded! Size: ${actualKb} KB`, 'success');
      } else if (activeImageObj) {
        const canvas = ImageProcessor.processImage(activeImageObj, currentOptions);
        const blob = await ImageProcessor.canvasToBlob(canvas, currentOptions.format, currentOptions.quality);
        const actualKb = (blob.size / 1024).toFixed(1);
        BatchEngine.triggerBlobDownload(blob, `${filename}_sizesu.${ext}`);
        showToast(`✅ Downloaded! Size: ${actualKb} KB`, 'success');
      } else {
        showToast('Please upload an image first!', 'error');
      }
    };

    if (downloadSingleBtn) downloadSingleBtn.addEventListener('click', performDownloadCurrent);
    if (downloadPreviewDirectBtn) downloadPreviewDirectBtn.addEventListener('click', performDownloadCurrent);

    if (processBatchBtn) {
      processBatchBtn.addEventListener('click', async () => {
        showToast('Processing batch images...', 'info');
        await batchEngine.processBatch(currentOptions, (current, total) => {
          processBatchBtn.textContent = `Processing (${current}/${total})...`;
        });
        processBatchBtn.textContent = 'Process All Batch';
        renderBatchGrid();
        showToast('Batch processing complete!', 'success');
      });
    }

    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', () => {
        batchEngine.downloadAllZip();
      });
    }
  }

  function bindSearchModalEvents() {
    const searchModal = document.getElementById('searchModal');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const quickSearchBtn = document.getElementById('quickSearchBtn');

    if (quickSearchBtn) {
      quickSearchBtn.addEventListener('click', () => {
        if (searchModal) searchModal.style.display = 'flex';
        if (searchInput) searchInput.focus();
      });
    }

    if (searchCloseBtn) {
      searchCloseBtn.addEventListener('click', () => {
        if (searchModal) searchModal.style.display = 'none';
      });
    }

    if (searchInput && searchResults && typeof SIZESU_SEO_CATALOG !== 'undefined') {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        searchResults.innerHTML = '';
        if (!query) return;

        Object.values(SIZESU_SEO_CATALOG)
          .filter(t => t.title.toLowerCase().includes(query) || t.h1.toLowerCase().includes(query) || t.metaDesc.toLowerCase().includes(query))
          .forEach(tool => {
            const item = document.createElement('a');
            item.href = `#tool/${tool.id}`;
            item.className = 'search-result-item';
            item.innerHTML = `
              <div class="search-result-title">${tool.h1}</div>
              <div class="search-result-desc">${tool.metaDesc}</div>
            `;
            item.addEventListener('click', () => {
              if (searchModal) searchModal.style.display = 'none';
            });
            searchResults.appendChild(item);
          });
      });
    }
  }

  async function handleFilesSelect(fileList) {
    if (!fileList || fileList.length === 0) return;
    const added = batchEngine.addFiles(fileList);
    if (added.length === 0) return;

    if (workspaceArea) workspaceArea.style.display = 'grid';
    renderBatchGrid();
    setActiveImage(added[0]);
    showToast(`Loaded ${added.length} image(s)`, 'success');
  }

  async function setActiveImage(item) {
    currentActiveFile = item;
    try {
      activeImageObj = await ImageProcessor.loadImage(item.previewUrl);
      currentOptions.width = activeImageObj.naturalWidth;
      currentOptions.height = activeImageObj.naturalHeight;
      aspectRatioValue = currentOptions.width / currentOptions.height;

      if (inputWidth) inputWidth.value = currentOptions.width;
      if (inputHeight) inputHeight.value = currentOptions.height;

      if (origDimBadge) origDimBadge.textContent = `${activeImageObj.naturalWidth} x ${activeImageObj.naturalHeight} px`;
      if (origSizeBadge) origSizeBadge.textContent = formatBytes(item.originalSize);

      debouncedRender();
    } catch (err) {
      showToast('Failed to load selected image', 'error');
    }
  }

  function handleToolSwitch() {
    if ((activeTab === 'qr' || activeTab === 'pdf') && workspaceArea) {
      workspaceArea.style.display = 'grid';
    }

    if (cropEngine) {
      cropEngine.destroy();
      cropEngine = null;
    }

    if (activeTab === 'crop' && previewCanvasContainer && previewImg && activeImageObj) {
      cropEngine = new CropEngine(previewCanvasContainer, previewImg, { aspectRatio: aspectRatioValue });
    } else {
      triggerRealtimeRender();
    }
  }

  function onDimensionChange(changedAxis) {
    let w = parseInt(inputWidth.value, 10);
    let h = parseInt(inputHeight.value, 10);

    if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) return;

    if (isAspectLocked && aspectRatioValue) {
      if (changedAxis === 'width' && w > 0) {
        h = Math.round(w / aspectRatioValue);
        if (inputHeight) inputHeight.value = h;
      } else if (changedAxis === 'height' && h > 0) {
        w = Math.round(h * aspectRatioValue);
        if (inputWidth) inputWidth.value = w;
      }
    }

    currentOptions.width = w;
    currentOptions.height = h;
    debouncedRender();
  }

  function updateDimensionFromUnit() {
    if (!activeImageObj || !unitSelect) return;
    const unit = unitSelect.value;
    const dpi = parseInt(dpiSelect ? dpiSelect.value : 300, 10) || 300;

    if (unit === 'cm') {
      if (inputWidth) inputWidth.value = pxToCm(currentOptions.width, dpi);
      if (inputHeight) inputHeight.value = pxToCm(currentOptions.height, dpi);
    } else if (unit === 'mm') {
      if (inputWidth) inputWidth.value = pxToMm(currentOptions.width, dpi);
      if (inputHeight) inputHeight.value = pxToMm(currentOptions.height, dpi);
    } else if (unit === 'inch') {
      if (inputWidth) inputWidth.value = pxToInch(currentOptions.width, dpi);
      if (inputHeight) inputHeight.value = pxToInch(currentOptions.height, dpi);
    } else {
      if (inputWidth) inputWidth.value = currentOptions.width;
      if (inputHeight) inputHeight.value = currentOptions.height;
    }
  }

  function debouncedRender() {
    if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => {
      triggerRealtimeRender();
    }, 50);
  }

  async function triggerRealtimeRender() {
    if (!activeImageObj || !currentActiveFile) return;

    let finalCanvas;
    if (activeTab === 'crop' && cropEngine) {
      finalCanvas = cropEngine.getCroppedCanvas(activeImageObj.naturalWidth, activeImageObj.naturalHeight);
    } else {
      finalCanvas = ImageProcessor.processImage(activeImageObj, currentOptions);
    }

    let resultBlob;
    if (currentOptions.targetKb > 0) {
      resultBlob = await ImageProcessor.compressToTargetKb(activeImageObj, currentOptions.targetKb, currentOptions.format, currentOptions);
    } else {
      resultBlob = await ImageProcessor.canvasToBlob(finalCanvas, currentOptions.format, currentOptions.quality);
    }

    currentActiveFile.processedBlob = resultBlob;
    currentActiveFile.processedSize = resultBlob.size;

    // Revoke previous object URL to prevent memory leaks
    if (lastPreviewObjectUrl) {
      URL.revokeObjectURL(lastPreviewObjectUrl);
    }
    lastPreviewObjectUrl = URL.createObjectURL(resultBlob);

    if (previewImg) previewImg.src = lastPreviewObjectUrl;
    if (newDimBadge) {
      if (currentOptions.targetKb > 0 && resultBlob.finalWidth && resultBlob.finalHeight) {
        newDimBadge.textContent = `${resultBlob.finalWidth} x ${resultBlob.finalHeight} px`;
      } else {
        newDimBadge.textContent = `${finalCanvas.width} x ${finalCanvas.height} px`;
      }
    }
    if (newSizeBadge) newSizeBadge.textContent = formatBytes(resultBlob.size);
  }

  function generatePassportGridSheet() {
    if (!activeImageObj) return;
    const passportCanvas = ImageProcessor.processImage(activeImageObj, currentOptions);
    const sheetCanvas = ImageProcessor.createPassportPrintSheet(passportCanvas, { dpi: 300, rows: 2, cols: 4 });

    sheetCanvas.toBlob(blob => {
      BatchEngine.triggerBlobDownload(blob, `sizesu_passport_print_sheet_4x6.jpg`);
    }, 'image/jpeg', 0.95);
  }

  function renderBatchGrid() {
    const batchGrid = document.getElementById('batchGrid');
    if (!batchGrid) return;

    batchGrid.innerHTML = '';
    batchEngine.files.forEach(item => {
      const card = document.createElement('div');
      card.className = `batch-item-card ${item.id === (currentActiveFile && currentActiveFile.id) ? 'active' : ''}`;
      const sizeDiff = item.processedSize ? formatBytes(item.processedSize) : formatBytes(item.originalSize);

      card.innerHTML = `
        <button class="batch-item-remove" data-id="${item.id}">✕</button>
        <img class="batch-item-thumb" src="${item.previewUrl}" alt="${item.name}">
        <div class="batch-item-name">${item.name}</div>
        <div class="batch-item-meta">
          <span>Orig: ${formatBytes(item.originalSize)}</span>
          <span style="color:var(--accent-emerald); font-weight:700;">${sizeDiff}</span>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('batch-item-remove')) {
          setActiveImage(item);
          renderBatchGrid();
        }
      });

      card.querySelector('.batch-item-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        batchEngine.removeFile(item.id);
        renderBatchGrid();
        if (batchEngine.files.length === 0 && workspaceArea) workspaceArea.style.display = 'none';
        else if (currentActiveFile && currentActiveFile.id === item.id && batchEngine.files.length > 0) setActiveImage(batchEngine.files[0]);
      });

      batchGrid.appendChild(card);
    });
  }

  window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${msg}</span>`;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  // Initialize SEO Router after all event listeners are attached
  let seoRouter;
  try {
    seoRouter = new SEORouter();
    seoRouter.init();
  } catch (e) {
    console.warn('SEORouter init notice:', e);
  }

  // --- Pi7 Style UI Logic ---
  const pi7Overlay = document.getElementById('pi7Overlay');
  const pi7Filename = document.getElementById('pi7Filename');
  const pi7Size = document.getElementById('pi7Size');
  const pi7Width = document.getElementById('pi7Width');
  const pi7Height = document.getElementById('pi7Height');
  const pi7ResizeBtn = document.getElementById('pi7ResizeBtn');
  const pi7CropBtn = document.getElementById('pi7CropBtn');
  
  if (pi7ResizeBtn) {
    pi7ResizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const resizeTab = document.querySelector('.tool-tab[data-tool="resize"]');
      if (resizeTab) resizeTab.click();
    });
  }
      debouncedRender();
    } catch (err) {
      showToast('Failed to load selected image', 'error');
    }
  }

  function handleToolSwitch() {
    if ((activeTab === 'qr' || activeTab === 'pdf') && workspaceArea) {
      workspaceArea.style.display = 'grid';
    }

    if (cropEngine) {
      cropEngine.destroy();
      cropEngine = null;
    }

    if (activeTab === 'crop' && previewCanvasContainer && previewImg && activeImageObj) {
      cropEngine = new CropEngine(previewCanvasContainer, previewImg, { aspectRatio: aspectRatioValue });
    } else {
      triggerRealtimeRender();
    }
  }

  function onDimensionChange(changedAxis) {
    let w = parseInt(inputWidth.value, 10);
    let h = parseInt(inputHeight.value, 10);

    if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) return;

    if (isAspectLocked && aspectRatioValue) {
      if (changedAxis === 'width' && w > 0) {
        h = Math.round(w / aspectRatioValue);
        if (inputHeight) inputHeight.value = h;
      } else if (changedAxis === 'height' && h > 0) {
        w = Math.round(h * aspectRatioValue);
        if (inputWidth) inputWidth.value = w;
      }
    }

    currentOptions.width = w;
    currentOptions.height = h;
    debouncedRender();
  }

  function updateDimensionFromUnit() {
    if (!activeImageObj || !unitSelect) return;
    const unit = unitSelect.value;
    const dpi = parseInt(dpiSelect ? dpiSelect.value : 300, 10) || 300;

    if (unit === 'cm') {
      if (inputWidth) inputWidth.value = pxToCm(currentOptions.width, dpi);
      if (inputHeight) inputHeight.value = pxToCm(currentOptions.height, dpi);
    } else if (unit === 'mm') {
      if (inputWidth) inputWidth.value = pxToMm(currentOptions.width, dpi);
      if (inputHeight) inputHeight.value = pxToMm(currentOptions.height, dpi);
    } else if (unit === 'inch') {
      if (inputWidth) inputWidth.value = pxToInch(currentOptions.width, dpi);
      if (inputHeight) inputHeight.value = pxToInch(currentOptions.height, dpi);
    } else {
      if (inputWidth) inputWidth.value = currentOptions.width;
      if (inputHeight) inputHeight.value = currentOptions.height;
    }
  }

  function debouncedRender() {
    if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => {
      triggerRealtimeRender();
    }, 50);
  }

  async function triggerRealtimeRender() {
    if (!activeImageObj || !currentActiveFile) return;

    let finalCanvas;
    if (activeTab === 'crop' && cropEngine) {
      finalCanvas = cropEngine.getCroppedCanvas(activeImageObj.naturalWidth, activeImageObj.naturalHeight);
    } else {
      finalCanvas = ImageProcessor.processImage(activeImageObj, currentOptions);
    }

    let resultBlob;
    if (currentOptions.targetKb > 0) {
      resultBlob = await ImageProcessor.compressToTargetKb(activeImageObj, currentOptions.targetKb, currentOptions.format, currentOptions);
    } else {
      resultBlob = await ImageProcessor.canvasToBlob(finalCanvas, currentOptions.format, currentOptions.quality);
    }

    currentActiveFile.processedBlob = resultBlob;
    currentActiveFile.processedSize = resultBlob.size;

    // Revoke previous object URL to prevent memory leaks
    if (lastPreviewObjectUrl) {
      URL.revokeObjectURL(lastPreviewObjectUrl);
    }
    lastPreviewObjectUrl = URL.createObjectURL(resultBlob);

    if (previewImg) previewImg.src = lastPreviewObjectUrl;
    if (newDimBadge) {
      if (currentOptions.targetKb > 0 && resultBlob.finalWidth && resultBlob.finalHeight) {
        newDimBadge.textContent = `${resultBlob.finalWidth} x ${resultBlob.finalHeight} px`;
      } else {
        newDimBadge.textContent = `${finalCanvas.width} x ${finalCanvas.height} px`;
      }
    }
    if (newSizeBadge) newSizeBadge.textContent = formatBytes(resultBlob.size);
  }

  function generatePassportGridSheet() {
    if (!activeImageObj) return;
    const passportCanvas = ImageProcessor.processImage(activeImageObj, currentOptions);
    const sheetCanvas = ImageProcessor.createPassportPrintSheet(passportCanvas, { dpi: 300, rows: 2, cols: 4 });

    sheetCanvas.toBlob(blob => {
      BatchEngine.triggerBlobDownload(blob, `sizesu_passport_print_sheet_4x6.jpg`);
    }, 'image/jpeg', 0.95);
  }

  function renderBatchGrid() {
    const batchGrid = document.getElementById('batchGrid');
    if (!batchGrid) return;

    batchGrid.innerHTML = '';
    batchEngine.files.forEach(item => {
      const card = document.createElement('div');
      card.className = `batch-item-card ${item.id === (currentActiveFile && currentActiveFile.id) ? 'active' : ''}`;
      const sizeDiff = item.processedSize ? formatBytes(item.processedSize) : formatBytes(item.originalSize);

      card.innerHTML = `
        <button class="batch-item-remove" data-id="${item.id}">✕</button>
        <img class="batch-item-thumb" src="${item.previewUrl}" alt="${item.name}">
        <div class="batch-item-name">${item.name}</div>
        <div class="batch-item-meta">
          <span>Orig: ${formatBytes(item.originalSize)}</span>
          <span style="color:var(--accent-emerald); font-weight:700;">${sizeDiff}</span>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('batch-item-remove')) {
          setActiveImage(item);
          renderBatchGrid();
        }
      });

      card.querySelector('.batch-item-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        batchEngine.removeFile(item.id);
        renderBatchGrid();
        if (batchEngine.files.length === 0 && workspaceArea) workspaceArea.style.display = 'none';
        else if (currentActiveFile && currentActiveFile.id === item.id && batchEngine.files.length > 0) setActiveImage(batchEngine.files[0]);
      });

      batchGrid.appendChild(card);
    });
  }

  window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${msg}</span>`;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  // Initialize SEO Router after all event listeners are attached
  let seoRouter;
  try {
    seoRouter = new SEORouter();
    seoRouter.init();
  } catch (e) {
    console.warn('SEORouter init notice:', e);
  }

  // --- Pi7 Style UI Logic ---
  const pi7Overlay = document.getElementById('pi7Overlay');
  const pi7Filename = document.getElementById('pi7Filename');
  const pi7Size = document.getElementById('pi7Size');
  const pi7Width = document.getElementById('pi7Width');
  const pi7Height = document.getElementById('pi7Height');
  const pi7ResizeBtn = document.getElementById('pi7ResizeBtn');
  const pi7CropBtn = document.getElementById('pi7CropBtn');
  
  if (pi7ResizeBtn) {
    pi7ResizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const resizeTab = document.querySelector('.tool-tab[data-tool="resize"]');
      if (resizeTab) resizeTab.click();
    });
  }

  if (pi7CropBtn) {
    pi7CropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cropTab = document.querySelector('.tool-tab[data-tool="crop"]');
      if (cropTab) cropTab.click();
    });
  }

  if (previewImg && pi7Overlay) {
    const updatePi7 = () => {
      // Don't show Pi7 image tools on QR or PDF generator tabs
      if (typeof activeTab !== 'undefined' && (activeTab === 'qr' || activeTab === 'pdf')) {
        pi7Overlay.style.display = 'none';
        return;
      }
      
      if (previewImg.src && previewImg.src.startsWith('blob:') && activeImageObj) {
        pi7Overlay.style.display = 'block';
        if (currentActiveFile && currentActiveFile.file) {
          pi7Filename.textContent = currentActiveFile.file.name;
          pi7Size.textContent = typeof formatBytes === 'function' ? formatBytes(currentActiveFile.file.size) : (currentActiveFile.file.size/1024).toFixed(2) + ' KB';
        } else {
          pi7Filename.textContent = 'image.jpg';
          pi7Size.textContent = '-';
        }
        
        pi7Width.textContent = activeImageObj.naturalWidth + ' PX';
        pi7Height.textContent = activeImageObj.naturalHeight + ' PX';
      } else {
        pi7Overlay.style.display = 'none';
      }
    };
    
    const observer = new MutationObserver(() => {
      setTimeout(updatePi7, 200); 
    });
    observer.observe(previewImg, { attributes: true, attributeFilter: ['src'] });
    
    // Also re-evaluate when tabs change
    if (toolNav) {
      toolNav.addEventListener('click', () => setTimeout(updatePi7, 50));
    }
  }
});
