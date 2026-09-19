/**
 * Media & Sprite Studio - Core Engine
 * Final Production Script (Updated with Clean Rename & White Area)
 */

// ==========================================
// 1. نظام الحالة المركزي (Central State Store)
// ==========================================
const Store = {
  theme: localStorage.getItem('theme') || 'light',

  // 1. التجميع
  collageImages: [],
  collagePositions: [],
  isCollageSelectMode: false,
  selectedCollageIndices: new Set(),
  collageRatio: '1:1',
  collageRatioW: 1,
  collageRatioH: 1,
  collageRatioLabel: '1:1',
  collageBgColor: '#FFFFFF',

  // 2. السبرايت
  spriteImage: null,
  slicedFrames: [],
  framePivots: [],
  backupFrames: [],
  backupPivots: [],
  isPlaying: false,
  currentFrameIndex: 0,
  animInterval: null,
  isSpriteEditMode: false,
  selectedFrameIndex: null,
  isSpriteDeleteMode: false,
  selectedSpriteDeleteFrames: new Set(),
  spriteBgColor: '#FFFFFF',

  // محرر البيفوت
  activePivotFrameIdx: 0,
  onionSkinActive: true,
  isDraggingPivot: false,

  // 3. الفيديو
  currentVideoFile: null,

  // 4. استوديو إعادة التسمية (Rename Studio)
  renameImages: [], // { id, file, originalName, newName, img, ext }
  isRenameSelectMode: false,
  selectedRenameIndices: new Set(),
  renameBaseName: '', // افتراضياً فارغ ليظهر فقط الرقم وخانات الترقيم
  renameDigits: 2,
  renameStart: 1,
  renameEnd: 1
};

// تحويل الأرقام لأرقام إنجليزية نقية
function toEnDigits(val) {
  return String(val).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

// ==========================================
// 2. إدارة المظهر والتبويبات والتقدم
// ==========================================
const DOM = {
  tabCollageBtn: document.getElementById('tabCollageBtn'),
  tabSpriteBtn: document.getElementById('tabSpriteBtn'),
  tabVideoBtn: document.getElementById('tabVideoBtn'),
  tabRenameBtn: document.getElementById('tabRenameBtn'),

  collageView: document.getElementById('collageView'),
  spriteView: document.getElementById('spriteView'),
  videoView: document.getElementById('videoView'),
  renameView: document.getElementById('renameView'),

  headerExportGroup: document.getElementById('headerExportGroup'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  fullScreenBtn: document.getElementById('fullScreenBtn'),
  fullScreenIcon: document.getElementById('fullScreenIcon'),

  progressContainer: document.getElementById('progressContainer'),
  progressTitle: document.getElementById('progressTitle'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText')
};

function showProgress(title) {
  if (!DOM.progressContainer) return;
  DOM.progressTitle.textContent = title;
  DOM.progressBar.style.width = '0%';
  DOM.progressText.textContent = '0%';
  DOM.progressContainer.style.display = 'flex';
}

function updateProgress(percent) {
  if (!DOM.progressBar) return;
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  DOM.progressBar.style.width = `${p}%`;
  DOM.progressText.textContent = `${toEnDigits(p)}%`;
}

function hideProgress() {
  if (!DOM.progressContainer) return;
  setTimeout(() => {
    DOM.progressContainer.style.display = 'none';
  }, 350);
}

function switchTab(btn, view) {
  [DOM.tabCollageBtn, DOM.tabSpriteBtn, DOM.tabVideoBtn, DOM.tabRenameBtn].forEach(b => b?.classList.remove('active'));
  [DOM.collageView, DOM.spriteView, DOM.videoView, DOM.renameView].forEach(v => v?.classList.remove('active-view'));

  btn.classList.add('active');
  view.classList.add('active-view');

  if (DOM.headerExportGroup) {
    DOM.headerExportGroup.style.visibility = (view === DOM.collageView) ? 'visible' : 'hidden';
  }
}

DOM.tabCollageBtn?.addEventListener('click', () => switchTab(DOM.tabCollageBtn, DOM.collageView));
DOM.tabSpriteBtn?.addEventListener('click', () => switchTab(DOM.tabSpriteBtn, DOM.spriteView));
DOM.tabVideoBtn?.addEventListener('click', () => switchTab(DOM.tabVideoBtn, DOM.videoView));
DOM.tabRenameBtn?.addEventListener('click', () => switchTab(DOM.tabRenameBtn, DOM.renameView));

function applyTheme(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  if (DOM.themeIcon) {
    DOM.themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
  }
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

applyTheme(Store.theme === 'dark');
DOM.themeToggleBtn?.addEventListener('click', () => {
  const isDark = !document.body.classList.contains('dark-mode');
  applyTheme(isDark);
});

DOM.fullScreenBtn?.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

document.addEventListener('fullscreenchange', () => {
  if (DOM.fullScreenIcon) {
    DOM.fullScreenIcon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
  }
});

// ==========================================
// 3. نظام استوديو التجميع (Collage Studio)
// ==========================================
const Collage = {
  fileInput: document.getElementById('imgUpload'),
  dropZone: document.getElementById('dropZone'),
  importBtn: document.getElementById('collageImportActionBtn'),
  clearBtn: document.getElementById('clearBtn'),
  exportPNGBtn: document.getElementById('exportPNGBtn'),
  exportPDFBtn: document.getElementById('exportPDFBtn'),
  canvas: document.getElementById('previewCanvas'),
  ctx: document.getElementById('previewCanvas')?.getContext('2d'),
  emptyNotice: document.getElementById('emptyNotice'),
  counterNum: document.getElementById('imageCounterNum'),

  sizeNum: document.getElementById('imgSizeNum'),
  sizeIncBtn: document.getElementById('sizeIncBtn'),
  sizeDecBtn: document.getElementById('sizeDecBtn'),

  colsNum: document.getElementById('columnsNum'),
  colsIncBtn: document.getElementById('colsIncBtn'),
  colsDecBtn: document.getElementById('colsDecBtn'),

  ratioBtn: document.getElementById('collageRatioBtn'),
  ratioPopup: document.getElementById('collageRatioPopup'),
  ratioLabel: document.getElementById('collageRatioLabel'),
  ratioBtnPreview: document.getElementById('ratioBtnPreview'),

  gapInput: document.getElementById('imgGap'),
  gapVal: document.getElementById('imgGapVal'),
  strokeInput: document.getElementById('strokeWidth'),
  strokeVal: document.getElementById('strokeWidthVal'),
  strokeColor: document.getElementById('strokeColor'),

  bgColorInput: document.getElementById('collageBgColor'),

  selectModeBtn: document.getElementById('collageSelectModeBtn'),
  selectActions: document.getElementById('collageSelectActions'),
  deleteSelectedBtn: document.getElementById('collageDeleteSelectedBtn'),
  cancelSelectBtn: document.getElementById('collageCancelSelectBtn'),
  selectCountBadge: document.getElementById('collageSelectCountBadge'),

  init() {
    this.bindEvents();
    this.initDefaultRatioUI();
  },

  initDefaultRatioUI() {
    const activeBtn = document.querySelector(`.ratio-option-btn[data-ratio="${Store.collageRatio}"]`);
    if (activeBtn && this.ratioLabel) {
      document.querySelectorAll('.ratio-option-btn').forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
      this.ratioLabel.textContent = toEnDigits(Store.collageRatioLabel);
      const icon = activeBtn.querySelector('.ratio-box-icon');
      if (icon && this.ratioBtnPreview) {
        this.ratioBtnPreview.innerHTML = icon.outerHTML;
      }
    }
    if (this.counterNum) this.counterNum.textContent = toEnDigits(0);
    if (this.gapVal) this.gapVal.textContent = `${toEnDigits(this.gapInput?.value || 12)}px`;
    if (this.strokeVal) this.strokeVal.textContent = `${toEnDigits(this.strokeInput?.value || 0)}px`;
  },

  bindEvents() {
    this.importBtn?.addEventListener('click', () => this.fileInput?.click());
    this.dropZone?.addEventListener('click', (e) => {
      if (Store.isCollageSelectMode || e.target === this.canvas) return;
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', (e) => this.loadFiles(e.target.files));

    ['dragenter', 'dragover'].forEach(n => {
      this.dropZone?.addEventListener(n, (e) => {
        e.preventDefault();
        this.dropZone.style.borderColor = 'var(--accent-red)';
      });
    });
    ['dragleave', 'drop'].forEach(n => {
      this.dropZone?.addEventListener(n, (e) => {
        e.preventDefault();
        this.dropZone.style.borderColor = 'transparent';
      });
    });
    this.dropZone?.addEventListener('drop', (e) => {
      if (e.dataTransfer.files) this.loadFiles(e.dataTransfer.files);
    });

    this.sizeIncBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.sizeNum.value)) || 128;
      this.sizeNum.value = toEnDigits(Math.min(4096, current * 2));
      this.render();
    });

    this.sizeDecBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.sizeNum.value)) || 128;
      this.sizeNum.value = toEnDigits(Math.max(16, Math.floor(current / 2)));
      this.render();
    });

    this.sizeNum?.addEventListener('input', () => {
      this.sizeNum.value = toEnDigits(this.sizeNum.value);
      this.render();
    });

    this.colsIncBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.colsNum.value)) || 1;
      this.colsNum.value = toEnDigits(Math.min(24, current + 1));
      this.render();
    });

    this.colsDecBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.colsNum.value)) || 1;
      this.colsNum.value = toEnDigits(Math.max(1, current - 1));
      this.render();
    });

    this.colsNum?.addEventListener('input', () => {
      this.colsNum.value = toEnDigits(this.colsNum.value);
      this.render();
    });

    this.ratioBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = this.ratioPopup.style.display === 'none';
      this.ratioPopup.style.display = isHidden ? 'flex' : 'none';
    });

    document.addEventListener('click', (e) => {
      if (this.ratioPopup && !this.ratioPopup.contains(e.target) && e.target !== this.ratioBtn && !this.ratioBtn.contains(e.target)) {
        this.ratioPopup.style.display = 'none';
      }
    });

    document.querySelectorAll('.ratio-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ratio-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const ratio = btn.dataset.ratio;
        Store.collageRatio = ratio;

        if (ratio === 'auto') {
          Store.collageRatioW = null;
          Store.collageRatioH = null;
          Store.collageRatioLabel = 'حجم تلقائي';
          if (this.ratioLabel) this.ratioLabel.textContent = 'حجم تلقائي';
          if (this.ratioBtnPreview) {
            this.ratioBtnPreview.innerHTML = '<span class="material-symbols-rounded red-icon" style="font-size:18px;">crop_free</span>';
          }
        } else {
          Store.collageRatioW = parseFloat(btn.dataset.w);
          Store.collageRatioH = parseFloat(btn.dataset.h);
          Store.collageRatioLabel = ratio;
          if (this.ratioLabel) this.ratioLabel.textContent = toEnDigits(ratio);
          const iconSpan = btn.querySelector('.ratio-box-icon');
          if (iconSpan && this.ratioBtnPreview) {
            this.ratioBtnPreview.innerHTML = iconSpan.outerHTML;
          }
        }

        this.ratioPopup.style.display = 'none';
        this.render();
      });
    });

    this.gapInput?.addEventListener('input', (e) => {
      if (this.gapVal) this.gapVal.textContent = `${toEnDigits(e.target.value)}px`;
      this.render();
    });

    this.strokeInput?.addEventListener('input', (e) => {
      if (this.strokeVal) this.strokeVal.textContent = `${toEnDigits(e.target.value)}px`;
      this.render();
    });

    this.strokeColor?.addEventListener('input', () => this.render());

    this.bgColorInput?.addEventListener('input', (e) => {
      Store.collageBgColor = e.target.value;
      this.render();
    });

    this.canvas?.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.selectModeBtn?.addEventListener('click', () => this.toggleSelectMode(true));
    this.cancelSelectBtn?.addEventListener('click', () => this.toggleSelectMode(false));
    this.deleteSelectedBtn?.addEventListener('click', () => this.deleteSelected());
    this.clearBtn?.addEventListener('click', () => this.clearAll());

    this.exportPNGBtn?.addEventListener('click', () => this.exportPNG());
    this.exportPDFBtn?.addEventListener('click', () => this.exportPDF());
  },

  async loadFiles(files) {
    if (!files || !files.length) return;
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!valid.length) return;

    showProgress('جاري استيراد الصور...');
    const promises = valid.map((file, i) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          updateProgress(((i + 1) / valid.length) * 100);
          resolve({ img });
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }));

    const loaded = (await Promise.all(promises)).filter(Boolean);
    Store.collageImages.push(...loaded);
    if (this.fileInput) this.fileInput.value = '';
    this.updateUI();
    this.render();
    hideProgress();
  },

  updateUI() {
    const hasImages = Store.collageImages.length > 0;
    if (this.emptyNotice) this.emptyNotice.style.display = hasImages ? 'none' : 'flex';
    if (this.canvas) this.canvas.style.display = hasImages ? 'block' : 'none';
    if (this.counterNum) this.counterNum.textContent = toEnDigits(Store.collageImages.length);
  },

  render() {
    if (!Store.collageImages.length) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    const imgSize = parseInt(toEnDigits(this.sizeNum?.value)) || 128;
    const columns = Math.max(1, parseInt(toEnDigits(this.colsNum?.value)) || 1);
    const gap = parseInt(toEnDigits(this.gapInput?.value)) || 0;
    const strokeWidth = parseInt(toEnDigits(this.strokeInput?.value)) || 0;
    const strokeColor = this.strokeColor?.value || '#FF3B5C';
    const bgColor = this.bgColorInput?.value || Store.collageBgColor || '#FFFFFF';

    const isFixedRatio = Store.collageRatio !== 'auto' && Store.collageRatioW && Store.collageRatioH;
    let positions = [];
    let totalWidth = 0;
    let totalHeight = 0;

    if (isFixedRatio) {
      const targetRatio = Store.collageRatioW / Store.collageRatioH;
      const cellW = imgSize;
      const cellH = Math.round(cellW / targetRatio);
      const totalCols = columns;
      const totalRows = Math.ceil(Store.collageImages.length / totalCols);

      totalWidth = totalCols * (cellW + gap) - gap + strokeWidth;
      totalHeight = totalRows * (cellH + gap) - gap + strokeWidth;

      positions = Store.collageImages.map((item, i) => {
        const col = i % totalCols;
        const row = Math.floor(i / totalCols);
        const cellX = col * (cellW + gap) + strokeWidth / 2;
        const cellY = row * (cellH + gap) + strokeWidth / 2;

        const imgW = item.img.naturalWidth || item.img.width || cellW;
        const imgH = item.img.naturalHeight || item.img.height || cellH;
        const imgRatio = imgW / imgH;

        let drawW, drawH;
        if (imgRatio > targetRatio) {
          drawW = cellW;
          drawH = cellW / imgRatio;
        } else {
          drawH = cellH;
          drawW = cellH * imgRatio;
        }

        const drawX = cellX + (cellW - drawW) / 2;
        const drawY = cellY + (cellH - drawH) / 2;

        return { x: cellX, y: cellY, w: cellW, h: cellH, drawX, drawY, drawW, drawH };
      });
    } else {
      const cellWidth = imgSize;
      const cellHeights = Store.collageImages.map(o => (cellWidth / (o.img.naturalWidth || o.img.width)) * (o.img.naturalHeight || o.img.height));
      const groups = Array(columns).fill(0);
      positions = Array(Store.collageImages.length);

      for (let i = 0; i < Store.collageImages.length; i++) {
        const col = i % columns;
        const x = col * (cellWidth + gap) + strokeWidth / 2;
        const y = groups[col] + strokeWidth / 2;
        const h = cellHeights[i];
        positions[i] = { x, y, w: cellWidth, h, drawX: x, drawY: y, drawW: cellWidth, drawH: h };
        groups[col] += h + gap;
      }

      totalHeight = Math.max(...groups) - gap + strokeWidth;
      totalWidth = columns * (cellWidth + gap) - gap + strokeWidth;
    }

    Store.collagePositions = positions;

    this.canvas.width = Math.max(10, Math.round(totalWidth));
    this.canvas.height = Math.max(10, Math.round(totalHeight));

    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    Store.collageImages.forEach((item, index) => {
      const pos = positions[index];
      this.ctx.drawImage(item.img, pos.drawX, pos.drawY, pos.drawW, pos.drawH);

      if (strokeWidth > 0) {
        this.ctx.lineWidth = strokeWidth;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
      }

      if (Store.isCollageSelectMode && Store.selectedCollageIndices.has(index)) {
        this.ctx.fillStyle = 'rgba(255, 59, 92, 0.4)';
        this.ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
        this.ctx.lineWidth = Math.max(3, pos.w * 0.03);
        this.ctx.strokeStyle = '#FF3B5C';
        this.ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);

        this.ctx.fillStyle = '#FF3B5C';
        this.ctx.beginPath();
        this.ctx.arc(pos.x + pos.w - 18, pos.y + 18, 12, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x + pos.w - 22, pos.y + 14);
        this.ctx.lineTo(pos.x + pos.w - 14, pos.y + 22);
        this.ctx.moveTo(pos.x + pos.w - 14, pos.y + 14);
        this.ctx.lineTo(pos.x + pos.w - 22, pos.y + 22);
        this.ctx.stroke();
      }
    });
  },

  handleCanvasClick(e) {
    if (!Store.isCollageSelectMode || !Store.collageImages.length) return;
    const rect = this.canvas.getBoundingClientRect();

    const canvasRatio = this.canvas.width / this.canvas.height;
    const elemRatio = rect.width / rect.height;
    let drawW, drawH, offsetX, offsetY;

    if (elemRatio > canvasRatio) {
      drawH = rect.height;
      drawW = rect.height * canvasRatio;
      offsetX = (rect.width - drawW) / 2;
      offsetY = 0;
    } else {
      drawW = rect.width;
      drawH = rect.width / canvasRatio;
      offsetX = 0;
      offsetY = (rect.height - drawH) / 2;
    }

    const clickX = ((e.clientX - rect.left) - offsetX) * (this.canvas.width / drawW);
    const clickY = ((e.clientY - rect.top) - offsetY) * (this.canvas.height / drawH);

    for (let i = 0; i < Store.collagePositions.length; i++) {
      const p = Store.collagePositions[i];
      if (clickX >= p.x && clickX <= p.x + p.w && clickY >= p.y && clickY <= p.y + p.h) {
        if (Store.selectedCollageIndices.has(i)) Store.selectedCollageIndices.delete(i);
        else Store.selectedCollageIndices.add(i);
        break;
      }
    }

    this.selectCountBadge.textContent = `تم تحديد ${toEnDigits(Store.selectedCollageIndices.size)} صور`;
    this.render();
  },

  toggleSelectMode(enable) {
    Store.isCollageSelectMode = enable;
    Store.selectedCollageIndices.clear();
    this.selectModeBtn.style.display = enable ? 'none' : 'flex';
    this.selectActions.style.display = enable ? 'flex' : 'none';
    this.canvas.classList.toggle('selecting', enable);
    this.selectCountBadge.textContent = `تم تحديد ${toEnDigits(0)} صور`;
    this.render();
  },

  deleteSelected() {
    if (!Store.selectedCollageIndices.size) {
      this.toggleSelectMode(false);
      return;
    }
    Store.collageImages = Store.collageImages.filter((_, idx) => !Store.selectedCollageIndices.has(idx));
    this.toggleSelectMode(false);
    this.updateUI();
    this.render();
  },

  clearAll() {
    Store.collageImages = [];
    if (this.fileInput) this.fileInput.value = '';
    this.toggleSelectMode(false);
    this.updateUI();
    this.render();
  },

  exportPNG() {
    if (!Store.collageImages.length) return;
    this.render();
    const link = document.createElement('a');
    link.download = 'collage.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  },

  exportPDF() {
    if (!Store.collageImages.length || !window.jspdf) return;
    this.render();
    const { jsPDF } = window.jspdf;
    const orient = this.canvas.width > this.canvas.height ? 'l' : 'p';
    const pdf = new jsPDF(orient, 'px', [this.canvas.width, this.canvas.height]);
    pdf.addImage(this.canvas.toDataURL('image/png'), 'PNG', 0, 0, this.canvas.width, this.canvas.height);
    pdf.save('collage.pdf');
  }
};

// ==========================================
// 4. نظام السبرايت (Sprite Studio)
// ==========================================
const Sprite = {
  uploadInput: document.getElementById('spriteUpload'),
  dropZone: document.getElementById('spriteDropZone'),
  importBtn: document.getElementById('spriteImportActionBtn'),
  emptyNotice: document.getElementById('spriteEmptyNotice'),
  wrapper: document.getElementById('spriteCanvasWrapper'),
  canvas: document.getElementById('spriteCanvas'),
  ctx: document.getElementById('spriteCanvas')?.getContext('2d'),

  colsNum: document.getElementById('spriteColsNum'),
  colsIncBtn: document.getElementById('spriteColsIncBtn'),
  colsDecBtn: document.getElementById('spriteColsDecBtn'),

  rowsNum: document.getElementById('spriteRowsNum'),
  rowsIncBtn: document.getElementById('spriteRowsIncBtn'),
  rowsDecBtn: document.getElementById('spriteRowsDecBtn'),

  totalFramesBadge: document.getElementById('totalFramesBadge'),
  bgColorInput: document.getElementById('spriteBgColor'),

  animCanvas: document.getElementById('animCanvas'),
  animCtx: document.getElementById('animCanvas')?.getContext('2d'),
  playPauseBtn: document.getElementById('playPauseBtn'),
  playIcon: document.getElementById('playIcon'),
  playText: document.getElementById('playText'),
  fpsInput: document.getElementById('fpsInput'),
  fpsVal: document.getElementById('fpsVal'),

  openPivotBtn: document.getElementById('openPivotEditorBtn'),
  exportMp4Btn: document.getElementById('exportSpriteMp4Btn'),
  exportGifBtn: document.getElementById('exportSpriteGifBtn'),
  exportZipBtn: document.getElementById('exportZipBtn'),
  transferBtn: document.getElementById('transferToCollageBtn'),

  editOrderBtn: document.getElementById('editSpriteOrderBtn'),
  editActions: document.getElementById('editModeActions'),
  confirmOrderBtn: document.getElementById('confirmSpriteOrderBtn'),
  cancelOrderBtn: document.getElementById('cancelSpriteOrderBtn'),

  selectDeleteBtn: document.getElementById('spriteSelectDeleteBtn'),
  deleteActions: document.getElementById('spriteDeleteActions'),
  confirmDeleteBtn: document.getElementById('confirmSpriteDeleteBtn'),
  cancelDeleteBtn: document.getElementById('cancelSpriteDeleteBtn'),
  deleteBadge: document.getElementById('spriteDeleteCountBadge'),

  init() {
    this.bindEvents();
    if (this.fpsVal && this.fpsInput) this.fpsVal.textContent = toEnDigits(this.fpsInput.value);
  },

  bindEvents() {
    this.importBtn?.addEventListener('click', () => this.uploadInput?.click());
    this.dropZone?.addEventListener('click', (e) => {
      if (Store.isSpriteEditMode || Store.isSpriteDeleteMode || e.target === this.canvas) return;
      this.uploadInput?.click();
    });

    this.uploadInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) this.loadImage(e.target.files[0]);
    });

    this.colsIncBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.colsNum.value)) || 1;
      this.colsNum.value = toEnDigits(Math.min(40, current + 1));
      this.exitEditMode(false);
      this.exitDeleteMode();
      this.updateGrid();
    });

    this.colsDecBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.colsNum.value)) || 1;
      this.colsNum.value = toEnDigits(Math.max(1, current - 1));
      this.exitEditMode(false);
      this.exitDeleteMode();
      this.updateGrid();
    });

    this.colsNum?.addEventListener('input', () => {
      this.colsNum.value = toEnDigits(this.colsNum.value);
      this.exitEditMode(false);
      this.exitDeleteMode();
      this.updateGrid();
    });

    this.rowsIncBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.rowsNum.value)) || 1;
      this.rowsNum.value = toEnDigits(Math.min(40, current + 1));
      this.exitEditMode(false);
      this.exitDeleteMode();
      this.updateGrid();
    });

    this.rowsDecBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.rowsNum.value)) || 1;
      this.rowsNum.value = toEnDigits(Math.max(1, current - 1));
      this.exitEditMode(false);
      this.exitDeleteMode();
      this.updateGrid();
    });

    this.rowsNum?.addEventListener('input', () => {
      this.rowsNum.value = toEnDigits(this.rowsNum.value);
      this.exitEditMode(false);
      this.exitDeleteMode();
      this.updateGrid();
    });

    this.bgColorInput?.addEventListener('input', (e) => {
      Store.spriteBgColor = e.target.value;
      this.render();
      this.drawAnimFrame();
    });

    this.fpsInput?.addEventListener('input', (e) => {
      if (this.fpsVal) this.fpsVal.textContent = toEnDigits(e.target.value);
      if (Store.isPlaying) {
        this.stopAnimation();
        this.startAnimation();
      }
    });

    this.playPauseBtn?.addEventListener('click', () => {
      if (Store.isPlaying) this.stopAnimation();
      else this.startAnimation();
    });

    this.canvas?.addEventListener('click', (e) => this.handleCanvasClick(e));

    this.editOrderBtn?.addEventListener('click', () => {
      if (!Store.slicedFrames.length) return;
      this.stopAnimation();
      this.exitDeleteMode();
      Store.isSpriteEditMode = true;
      Store.backupFrames = [...Store.slicedFrames];
      Store.selectedFrameIndex = null;
      this.editOrderBtn.style.display = 'none';
      this.editActions.style.display = 'flex';
      this.wrapper.classList.add('editing');
      this.render();
    });

    this.confirmOrderBtn?.addEventListener('click', () => this.exitEditMode(true));
    this.cancelOrderBtn?.addEventListener('click', () => {
      if (Store.backupFrames.length) Store.slicedFrames = [...Store.backupFrames];
      this.exitEditMode(false);
    });

    this.selectDeleteBtn?.addEventListener('click', () => {
      if (!Store.slicedFrames.length) return;
      this.stopAnimation();
      this.exitEditMode(false);
      Store.isSpriteDeleteMode = true;
      Store.selectedSpriteDeleteFrames.clear();
      this.selectDeleteBtn.style.display = 'none';
      this.deleteActions.style.display = 'flex';
      this.wrapper.classList.add('deleting');
      this.deleteBadge.textContent = `تم تحديد ${toEnDigits(0)} فريم`;
      this.render();
    });

    this.cancelDeleteBtn?.addEventListener('click', () => this.exitDeleteMode());
    this.confirmDeleteBtn?.addEventListener('click', () => {
      if (!Store.selectedSpriteDeleteFrames.size) {
        this.exitDeleteMode();
        return;
      }
      Store.slicedFrames = Store.slicedFrames.filter((_, i) => !Store.selectedSpriteDeleteFrames.has(i));
      Store.framePivots = Store.framePivots.filter((_, i) => !Store.selectedSpriteDeleteFrames.has(i));
      if (this.totalFramesBadge) {
        this.totalFramesBadge.textContent = `إجمالي الإطارات: ${toEnDigits(Store.slicedFrames.length)}`;
      }
      Store.currentFrameIndex = 0;
      this.exitDeleteMode();
      this.render();
      this.drawAnimFrame();
    });

    this.exportMp4Btn?.addEventListener('click', () => this.exportMP4());
    this.exportGifBtn?.addEventListener('click', () => this.exportGIF());
    this.exportZipBtn?.addEventListener('click', () => this.exportZIP());
    this.transferBtn?.addEventListener('click', () => this.transferFrames());
  },

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        Store.spriteImage = img;
        this.emptyNotice.style.display = 'none';
        this.wrapper.style.display = 'flex';

        [
          this.playPauseBtn, this.openPivotBtn, this.exportMp4Btn,
          this.exportGifBtn, this.exportZipBtn, this.transferBtn,
          this.editOrderBtn, this.selectDeleteBtn
        ].forEach(b => { if (b) b.disabled = false; });

        this.exitEditMode(false);
        this.exitDeleteMode();
        this.updateGrid();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  updateGrid() {
    if (!Store.spriteImage) return;
    const cols = parseInt(toEnDigits(this.colsNum.value)) || 1;
    const rows = parseInt(toEnDigits(this.rowsNum.value)) || 1;
    if (this.totalFramesBadge) {
      this.totalFramesBadge.textContent = `إجمالي الإطارات: ${toEnDigits(cols * rows)}`;
    }

    this.canvas.width = Store.spriteImage.width;
    this.canvas.height = Store.spriteImage.height;

    const cellW = Store.spriteImage.width / cols;
    const cellH = Store.spriteImage.height / rows;

    Store.slicedFrames = [];
    Store.framePivots = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = cellW;
        offCanvas.height = cellH;
        offCanvas.getContext('2d').drawImage(
          Store.spriteImage,
          c * cellW, r * cellH, cellW, cellH,
          0, 0, cellW, cellH
        );
        Store.slicedFrames.push(offCanvas);
        Store.framePivots.push({ x: 0.5, y: 0.5 });
      }
    }

    Store.currentFrameIndex = 0;
    this.render();
    this.drawAnimFrame();
  },

  render() {
    if (!Store.spriteImage || !Store.slicedFrames.length) return;
    const cols = parseInt(toEnDigits(this.colsNum.value)) || 1;
    const rows = parseInt(toEnDigits(this.rowsNum.value)) || 1;
    const cellW = this.canvas.width / cols;
    const cellH = this.canvas.height / rows;

    const bgColor = this.bgColorInput?.value || Store.spriteBgColor || '#FFFFFF';

    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < Store.slicedFrames.length; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const frame = Store.slicedFrames[i];
      if (frame) this.ctx.drawImage(frame, c * cellW, r * cellH, cellW, cellH);

      if (Store.isSpriteEditMode) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(c * cellW + 6, r * cellH + 6, 26, 20);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(toEnDigits(i + 1), c * cellW + 19, r * cellH + 16);
      }

      if (Store.isSpriteDeleteMode && Store.selectedSpriteDeleteFrames.has(i)) {
        this.ctx.fillStyle = 'rgba(255, 59, 92, 0.45)';
        this.ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        this.ctx.strokeStyle = '#FF3B5C';
        this.ctx.lineWidth = Math.max(3, Math.min(cellW, cellH) * 0.04);
        this.ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);

        const cx = c * cellW + cellW / 2;
        const cy = r * cellH + cellH / 2;
        const sz = Math.min(cellW, cellH) * 0.2;
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 3.5;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - sz, cy - sz);
        this.ctx.lineTo(cx + sz, cy + sz);
        this.ctx.moveTo(cx + sz, cy - sz);
        this.ctx.lineTo(cx - sz, cy + sz);
        this.ctx.stroke();
      }
    }

    this.ctx.strokeStyle = Store.isSpriteEditMode ? 'rgba(255, 59, 92, 0.7)' : (Store.isSpriteDeleteMode ? 'rgba(255, 59, 92, 0.5)' : '#FF3B5C');
    this.ctx.lineWidth = Math.max(1, Math.min(cellW, cellH) * 0.02);

    for (let c = 1; c < cols; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(c * cellW, 0);
      this.ctx.lineTo(c * cellW, this.canvas.height);
      this.ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, r * cellH);
      this.ctx.lineTo(this.canvas.width, r * cellH);
      this.ctx.stroke();
    }

    if (Store.isSpriteEditMode && Store.selectedFrameIndex !== null) {
      const r = Math.floor(Store.selectedFrameIndex / cols);
      const c = Store.selectedFrameIndex % cols;
      this.ctx.fillStyle = 'rgba(0, 200, 83, 0.35)';
      this.ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      this.ctx.strokeStyle = '#00E676';
      this.ctx.lineWidth = Math.max(3, Math.min(cellW, cellH) * 0.04);
      this.ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
    }
  },

  handleCanvasClick(e) {
    if ((!Store.isSpriteEditMode && !Store.isSpriteDeleteMode) || !Store.slicedFrames.length) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const cols = parseInt(toEnDigits(this.colsNum.value)) || 1;
    const rows = parseInt(toEnDigits(this.rowsNum.value)) || 1;
    const cellW = this.canvas.width / cols;
    const cellH = this.canvas.height / rows;

    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;

    const idx = row * cols + col;
    if (idx >= Store.slicedFrames.length) return;

    if (Store.isSpriteDeleteMode) {
      if (Store.selectedSpriteDeleteFrames.has(idx)) Store.selectedSpriteDeleteFrames.delete(idx);
      else Store.selectedSpriteDeleteFrames.add(idx);
      this.deleteBadge.textContent = `تم تحديد ${toEnDigits(Store.selectedSpriteDeleteFrames.size)} فريم`;
    } else if (Store.isSpriteEditMode) {
      if (Store.selectedFrameIndex === null) {
        Store.selectedFrameIndex = idx;
      } else if (Store.selectedFrameIndex === idx) {
        Store.selectedFrameIndex = null;
      } else {
        const tFrame = Store.slicedFrames[Store.selectedFrameIndex];
        Store.slicedFrames[Store.selectedFrameIndex] = Store.slicedFrames[idx];
        Store.slicedFrames[idx] = tFrame;

        const tPivot = Store.framePivots[Store.selectedFrameIndex];
        Store.framePivots[Store.selectedFrameIndex] = Store.framePivots[idx];
        Store.framePivots[idx] = tPivot;

        Store.selectedFrameIndex = null;
      }
    }

    this.render();
    this.drawAnimFrame();
  },

  exitEditMode(save) {
    Store.isSpriteEditMode = false;
    Store.selectedFrameIndex = null;
    Store.backupFrames = [];
    if (this.editOrderBtn) this.editOrderBtn.style.display = 'flex';
    if (this.editActions) this.editActions.style.display = 'none';
    this.wrapper?.classList.remove('editing');
    this.render();
    this.drawAnimFrame();
  },

  exitDeleteMode() {
    Store.isSpriteDeleteMode = false;
    Store.selectedSpriteDeleteFrames.clear();
    if (this.selectDeleteBtn) this.selectDeleteBtn.style.display = 'flex';
    if (this.deleteActions) this.deleteActions.style.display = 'none';
    this.wrapper?.classList.remove('deleting');
    this.render();
  },

  drawAnimFrame() {
    if (!Store.slicedFrames.length || !this.animCanvas) return;
    const frame = Store.slicedFrames[Store.currentFrameIndex % Store.slicedFrames.length];
    this.animCanvas.width = frame.width;
    this.animCanvas.height = frame.height;
    
    const bgColor = this.bgColorInput?.value || Store.spriteBgColor || '#FFFFFF';
    this.animCtx.fillStyle = bgColor;
    this.animCtx.fillRect(0, 0, this.animCanvas.width, this.animCanvas.height);

    this.animCtx.imageSmoothingEnabled = false;
    this.animCtx.drawImage(frame, 0, 0);
  },

  startAnimation() {
    if (!Store.slicedFrames.length) return;
    Store.isPlaying = true;
    if (this.playIcon) this.playIcon.textContent = 'pause';
    if (this.playText) this.playText.textContent = 'إيقاف';
    const fps = parseInt(toEnDigits(this.fpsInput.value)) || 12;
    Store.animInterval = setInterval(() => {
      Store.currentFrameIndex = (Store.currentFrameIndex + 1) % Store.slicedFrames.length;
      this.drawAnimFrame();
    }, 1000 / fps);
  },

  stopAnimation() {
    Store.isPlaying = false;
    if (this.playIcon) this.playIcon.textContent = 'play_arrow';
    if (this.playText) this.playText.textContent = 'تشغيل';
    if (Store.animInterval) clearInterval(Store.animInterval);
  },

  async exportMP4() {
    if (!Store.slicedFrames.length) return;
    showProgress('جاري تصدير فيديو الحركة MP4...');

    const fps = parseInt(toEnDigits(this.fpsInput.value)) || 12;
    const duration = 1000 / fps;
    const total = Store.slicedFrames.length;

    const rCanvas = document.createElement('canvas');
    rCanvas.width = Store.slicedFrames[0].width;
    rCanvas.height = Store.slicedFrames[0].height;
    const rCtx = rCanvas.getContext('2d');
    const bgColor = this.bgColorInput?.value || Store.spriteBgColor || '#FFFFFF';

    const stream = rCanvas.captureStream(fps);
    let mime = 'video/mp4';
    if (!MediaRecorder.isTypeSupported(mime)) {
      mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    }

    let rec;
    try { rec = new MediaRecorder(stream, { mimeType: mime }); }
    catch { rec = new MediaRecorder(stream); }

    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const donePromise = new Promise(res => {
      rec.onstop = () => {
        const isMp4 = mime.includes('mp4');
        const blob = new Blob(chunks, { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = isMp4 ? 'sprite_animation.mp4' : 'sprite_animation.webm';
        a.click();
        URL.revokeObjectURL(url);
        res();
      };
    });

    rec.start();
    for (let i = 0; i < total; i++) {
      rCtx.fillStyle = bgColor;
      rCtx.fillRect(0, 0, rCanvas.width, rCanvas.height);
      rCtx.drawImage(Store.slicedFrames[i], 0, 0);
      updateProgress(((i + 1) / total) * 100);
      await new Promise(r => setTimeout(r, duration));
    }
    await new Promise(r => setTimeout(r, duration));
    rec.stop();
    await donePromise;
    hideProgress();
  },

  exportGIF() {
    if (!Store.slicedFrames.length || !window.gifshot) return;
    showProgress('جاري تركيب ملف GIF...');
    const bgColor = this.bgColorInput?.value || Store.spriteBgColor || '#FFFFFF';
    
    const images = Store.slicedFrames.map(f => {
      const c = document.createElement('canvas');
      c.width = f.width;
      c.height = f.height;
      const ctx = c.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(f, 0, 0);
      return c.toDataURL('image/png');
    });

    const fps = parseInt(toEnDigits(this.fpsInput.value)) || 12;

    window.gifshot.createGIF({
      images,
      gifWidth: Math.min(Store.slicedFrames[0].width, 600),
      gifHeight: Math.min(Store.slicedFrames[0].height, (Store.slicedFrames[0].height * (600 / Store.slicedFrames[0].width))),
      interval: 1 / fps,
      numWorkers: 4
    }, (obj) => {
      if (!obj.error) {
        const a = document.createElement('a');
        a.href = obj.image;
        a.download = 'sprite_animation.gif';
        a.click();
      }
      hideProgress();
    });
  },

  async exportZIP() {
    if (!Store.slicedFrames.length || !window.JSZip) return;
    showProgress('جاري ضغط الملفات...');
    const zip = new JSZip();
    const folder = zip.folder('sprite_frames');

    Store.slicedFrames.forEach((f, idx) => {
      const data = f.toDataURL('image/png').split(',')[1];
      folder.file(`frame_${String(idx + 1).padStart(3, '0')}.png`, data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' }, (meta) => updateProgress(meta.percent));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'sprite_frames.zip';
    a.click();
    hideProgress();
  },

  async transferFrames() {
    if (!Store.slicedFrames.length) return;
    const promises = Store.slicedFrames.map(f => new Promise(res => {
      const img = new Image();
      img.onload = () => res({ img });
      img.src = f.toDataURL('image/png');
    }));

    const imported = await Promise.all(promises);
    Store.collageImages.push(...imported);
    DOM.tabCollageBtn?.click();
    Collage.updateUI();
    Collage.render();
  }
};

// ==========================================
// 5. محرك محرر نقطة الارتكاز (Pivot Editor)
// ==========================================
const Pivot = {
  modal: document.getElementById('pivotEditorModal'),
  canvas: document.getElementById('pivotCanvas'),
  ctx: document.getElementById('pivotCanvas')?.getContext('2d'),
  grid: document.getElementById('pivotFramesGrid'),
  xInput: document.getElementById('pivotXInput'),
  yInput: document.getElementById('pivotYInput'),
  onionBtn: document.getElementById('toggleOnionSkinBtn'),
  presetsBtn: document.getElementById('openPivotPresetsBtn'),
  presetsPopup: document.getElementById('pivotPresetsPopup'),
  saveBtn: document.getElementById('savePivotBtn'),
  cancelBtn: document.getElementById('cancelPivotBtn'),

  init() {
    this.bindEvents();
  },

  bindEvents() {
    Sprite.openPivotBtn?.addEventListener('click', () => this.open());
    this.canvas?.addEventListener('pointerdown', (e) => {
      Store.isDraggingPivot = true;
      this.handlePointer(e);
    });
    window.addEventListener('pointermove', (e) => {
      if (Store.isDraggingPivot) this.handlePointer(e);
    });
    window.addEventListener('pointerup', () => {
      Store.isDraggingPivot = false;
    });

    this.xInput?.addEventListener('input', (e) => {
      const v = Math.max(0, Math.min(1, parseFloat(toEnDigits(e.target.value)) || 0));
      Store.framePivots[Store.activePivotFrameIdx].x = v;
      this.render();
    });

    this.yInput?.addEventListener('input', (e) => {
      const v = Math.max(0, Math.min(1, parseFloat(toEnDigits(e.target.value)) || 0));
      Store.framePivots[Store.activePivotFrameIdx].y = v;
      this.render();
    });

    this.onionBtn?.addEventListener('click', () => {
      Store.onionSkinActive = !Store.onionSkinActive;
      this.onionBtn.classList.toggle('active-onion', Store.onionSkinActive);
      this.render();
    });

    this.presetsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = this.presetsPopup.style.display === 'none';
      this.presetsPopup.style.display = isHidden ? 'flex' : 'none';
    });

    document.addEventListener('click', (e) => {
      if (this.presetsPopup && !this.presetsPopup.contains(e.target) && e.target !== this.presetsBtn) {
        this.presetsPopup.style.display = 'none';
      }
    });

    document.querySelectorAll('.preset-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const dx = parseFloat(dot.dataset.x);
        const dy = parseFloat(dot.dataset.y);
        Store.framePivots[Store.activePivotFrameIdx] = { x: dx, y: dy };
        this.updateInputsUI();
        this.render();
        this.presetsPopup.style.display = 'none';
      });
    });

    this.saveBtn?.addEventListener('click', () => {
      this.modal.classList.remove('active');
      Store.backupPivots = [];
    });

    this.cancelBtn?.addEventListener('click', () => {
      if (Store.backupPivots.length) {
        Store.framePivots = Store.backupPivots.map(p => ({ ...p }));
      }
      this.modal.classList.remove('active');
    });
  },

  open() {
    if (!Store.slicedFrames.length) return;
    if (Store.isPlaying) Sprite.stopAnimation();

    Store.backupPivots = Store.framePivots.map(p => ({ ...p }));
    Store.activePivotFrameIdx = 0;

    this.modal.classList.add('active');
    this.buildGrid();
    this.render();
    this.updateInputsUI();
  },

  buildGrid() {
    if (!this.grid) return;
    this.grid.innerHTML = '';
    Store.slicedFrames.forEach((fCanvas, idx) => {
      const card = document.createElement('div');
      card.className = `pivot-frame-thumb-card ${idx === Store.activePivotFrameIdx ? 'active-thumb' : ''}`;
      
      const img = document.createElement('img');
      img.src = fCanvas.toDataURL();

      const num = document.createElement('span');
      num.className = 'thumb-number';
      num.textContent = toEnDigits(idx + 1);

      card.appendChild(img);
      card.appendChild(num);

      card.addEventListener('click', () => {
        Store.activePivotFrameIdx = idx;
        document.querySelectorAll('.pivot-frame-thumb-card').forEach(c => c.classList.remove('active-thumb'));
        card.classList.add('active-thumb');
        this.updateInputsUI();
        this.render();
      });

      this.grid.appendChild(card);
    });
  },

  updateInputsUI() {
    const p = Store.framePivots[Store.activePivotFrameIdx] || { x: 0.5, y: 0.5 };
    if (this.xInput) this.xInput.value = toEnDigits(p.x.toFixed(2));
    if (this.yInput) this.yInput.value = toEnDigits(p.y.toFixed(2));

    document.querySelectorAll('.preset-dot').forEach(dot => {
      const dx = parseFloat(dot.dataset.x);
      const dy = parseFloat(dot.dataset.y);
      dot.classList.toggle('active', Math.abs(dx - p.x) < 0.05 && Math.abs(dy - p.y) < 0.05);
    });
  },

  drawTinted(targetCtx, srcCanvas, color, alpha) {
    const off = document.createElement('canvas');
    off.width = srcCanvas.width;
    off.height = srcCanvas.height;
    const oCtx = off.getContext('2d');
    oCtx.drawImage(srcCanvas, 0, 0);
    oCtx.globalCompositeOperation = 'source-in';
    oCtx.fillStyle = color;
    oCtx.fillRect(0, 0, off.width, off.height);

    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    targetCtx.drawImage(off, 0, 0);
    targetCtx.restore();
  },

  render() {
    if (!Store.slicedFrames.length) return;
    const current = Store.slicedFrames[Store.activePivotFrameIdx];
    this.canvas.width = current.width;
    this.canvas.height = current.height;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = false;

    if (Store.onionSkinActive && Store.slicedFrames.length > 1) {
      const prev = (Store.activePivotFrameIdx - 1 + Store.slicedFrames.length) % Store.slicedFrames.length;
      this.drawTinted(this.ctx, Store.slicedFrames[prev], '#FF4D6D', 0.45);
      const next = (Store.activePivotFrameIdx + 1) % Store.slicedFrames.length;
      this.drawTinted(this.ctx, Store.slicedFrames[next], '#38B6FF', 0.45);
    }

    this.ctx.drawImage(current, 0, 0);
    const p = Store.framePivots[Store.activePivotFrameIdx] || { x: 0.5, y: 0.5 };
    this.drawCrosshair(p.x * this.canvas.width, p.y * this.canvas.height);
  },

  drawCrosshair(px, py) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const fade = Math.max(w, h) * 0.7;

    this.ctx.save();
    this.ctx.lineWidth = 2.5;
    this.ctx.setLineDash([4, 4]);

    const line = (x1, y1, x2, y2, grad) => {
      this.ctx.strokeStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    };

    const gL = this.ctx.createLinearGradient(px, py, px - fade, py);
    gL.addColorStop(0, '#FF3B5C'); gL.addColorStop(1, 'rgba(255, 59, 92, 0)');
    line(px, py, 0, py, gL);

    const gR = this.ctx.createLinearGradient(px, py, px + fade, py);
    gR.addColorStop(0, '#FF3B5C'); gR.addColorStop(1, 'rgba(255, 59, 92, 0)');
    line(px, py, w, py, gR);

    const gT = this.ctx.createLinearGradient(px, py, px, py - fade);
    gT.addColorStop(0, '#FF3B5C'); gT.addColorStop(1, 'rgba(255, 59, 92, 0)');
    line(px, py, px, 0, gT);

    const gB = this.ctx.createLinearGradient(px, py, px, py + fade);
    gB.addColorStop(0, '#FF3B5C'); gB.addColorStop(1, 'rgba(255, 59, 92, 0)');
    line(px, py, px, h, gB);

    this.ctx.setLineDash([]);
    this.ctx.beginPath();
    this.ctx.arc(px, py, 11, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#FF3B5C';
    this.ctx.lineWidth = 3.5;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(px, py, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FF3B5C';
    this.ctx.fill();
    this.ctx.restore();
  },

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;

    const x = (cx - rect.left) * scaleX;
    const y = (cy - rect.top) * scaleY;

    Store.framePivots[Store.activePivotFrameIdx] = {
      x: Math.max(0, Math.min(1, x / this.canvas.width)),
      y: Math.max(0, Math.min(1, y / this.canvas.height))
    };

    this.updateInputsUI();
    this.render();
  }
};

// ==========================================
// 6. نظام استخراج الفيديو (Video Extraction)
// ==========================================
const VideoStudio = {
  uploadInput: document.getElementById('videoUpload'),
  dropZone: document.getElementById('videoDropZone'),
  importBtn: document.getElementById('videoImportActionBtn'),
  emptyNotice: document.getElementById('videoEmptyNotice'),
  wrapper: document.getElementById('videoPlayerWrapper'),
  player: document.getElementById('mainVideoPlayer'),

  durationBadge: document.getElementById('vidDurationBadge'),
  resBadge: document.getElementById('vidResBadge'),
  estFramesBadge: document.getElementById('vidEstFramesBadge'),

  fpsInput: document.getElementById('videoFpsInput'),
  fpsVal: document.getElementById('videoFpsVal'),
  maxInput: document.getElementById('videoMaxFramesInput'),
  maxVal: document.getElementById('videoMaxFramesVal'),

  gifBtn: document.getElementById('extractGifBtn'),
  zipBtn: document.getElementById('extractZipBtn'),
  transferBtn: document.getElementById('transferVidToCollageBtn'),

  init() {
    this.bindEvents();
  },

  bindEvents() {
    this.importBtn?.addEventListener('click', () => this.uploadInput?.click());
    this.dropZone?.addEventListener('click', (e) => {
      if (e.target === this.player) return;
      this.uploadInput?.click();
    });

    this.uploadInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        Store.currentVideoFile = e.target.files[0];
        this.player.src = URL.createObjectURL(Store.currentVideoFile);
        this.player.onloadedmetadata = () => {
          this.emptyNotice.style.display = 'none';
          this.wrapper.style.display = 'flex';
          this.gifBtn.disabled = false;
          this.zipBtn.disabled = false;
          this.transferBtn.disabled = false;

          this.durationBadge.textContent = `${toEnDigits(this.player.duration.toFixed(1))} ثانية`;
          this.resBadge.textContent = `${toEnDigits(this.player.videoWidth)}x${toEnDigits(this.player.videoHeight)}`;
          this.updateEstimated();
        };
      }
    });

    this.fpsInput?.addEventListener('input', (e) => {
      this.fpsVal.textContent = `${toEnDigits(e.target.value)} FPS`;
      this.updateEstimated();
    });

    this.maxInput?.addEventListener('input', (e) => {
      this.maxVal.textContent = toEnDigits(e.target.value);
      this.updateEstimated();
    });

    this.gifBtn?.addEventListener('click', async () => {
      const frames = await this.extractFrames();
      if (!frames.length) return hideProgress();

      showProgress('جاري إنشاء الـ GIF...');
      const images = frames.map(f => f.toDataURL('image/png'));
      window.gifshot.createGIF({
        images,
        gifWidth: Math.min(frames[0].width, 600),
        gifHeight: Math.min(frames[0].height, (frames[0].height * (600 / frames[0].width))),
        interval: 1 / (parseInt(toEnDigits(this.fpsInput.value)) || 10),
        numWorkers: 4
      }, (obj) => {
        if (!obj.error) {
          const a = document.createElement('a');
          a.href = obj.image;
          a.download = 'video_animation.gif';
          a.click();
        }
        hideProgress();
      });
    });

    this.zipBtn?.addEventListener('click', async () => {
      const frames = await this.extractFrames();
      if (!frames.length) return hideProgress();

      showProgress('جاري ضغط الصور...');
      const zip = new JSZip();
      const folder = zip.folder('video_frames');
      frames.forEach((f, idx) => {
        folder.file(`frame_${String(idx + 1).padStart(4, '0')}.png`, f.toDataURL('image/png').split(',')[1], { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' }, (m) => updateProgress(m.percent));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'video_frames.zip';
      a.click();
      hideProgress();
    });

    this.transferBtn?.addEventListener('click', async () => {
      const frames = await this.extractFrames();
      if (!frames.length) return hideProgress();

      const promises = frames.map(f => new Promise(res => {
        const img = new Image();
        img.onload = () => res({ img });
        img.src = f.toDataURL('image/png');
      }));
      const imported = await Promise.all(promises);
      Store.collageImages.push(...imported);
      hideProgress();
      DOM.tabCollageBtn?.click();
      Collage.updateUI();
      Collage.render();
    });
  },

  updateEstimated() {
    if (!this.player.duration) return;
    const fps = parseInt(toEnDigits(this.fpsInput.value)) || 10;
    const max = parseInt(toEnDigits(this.maxInput.value)) || 80;
    const est = Math.min(Math.floor(this.player.duration * fps), max);
    this.estFramesBadge.textContent = `${toEnDigits(est)} فريم`;
  },

  async extractFrames() {
    if (!Store.currentVideoFile) return [];
    const fps = parseInt(toEnDigits(this.fpsInput.value)) || 10;
    const max = parseInt(toEnDigits(this.maxInput.value)) || 80;
    showProgress('جاري استخراج الفريمات بدقة...');

    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.src = URL.createObjectURL(Store.currentVideoFile);
      v.muted = true;
      v.playsInline = true;

      v.onloadedmetadata = async () => {
        const duration = v.duration;
        const interval = 1 / fps;
        const total = Math.min(Math.floor(duration * fps), max);

        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext('2d');

        const extracted = [];
        let curr = 0;

        for (let i = 0; i < total; i++) {
          v.currentTime = curr;
          await new Promise(r => { v.onseeked = r; });
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

          const frame = document.createElement('canvas');
          frame.width = canvas.width;
          frame.height = canvas.height;
          frame.getContext('2d').drawImage(canvas, 0, 0);
          extracted.push(frame);

          curr += interval;
          if (curr > duration) break;
          updateProgress(((i + 1) / total) * 95);
        }

        updateProgress(100);
        resolve(extracted);
      };
    });
  }
};

// ==========================================
// 7. نظام استوديو تغيير الإسم (Rename Studio)
// ==========================================
const RenameStudio = {
  uploadInput: document.getElementById('renameUpload'),
  dropZone: document.getElementById('renameDropZone'),
  importBtn: document.getElementById('renameImportActionBtn'),
  clearBtn: document.getElementById('renameClearBtn'),
  emptyNotice: document.getElementById('renameEmptyNotice'),
  gridContainer: document.getElementById('renameGridContainer'),
  grid: document.getElementById('renameGrid'),

  // أدوات التحديد العلوية
  selectAllBtn: document.getElementById('renameSelectAllBtn'),
  deselectAllBtn: document.getElementById('renameDeselectAllBtn'),
  selectCountBadge: document.getElementById('renameSelectCountBadge'),
  totalCountBadge: document.getElementById('renameTotalCountBadge'),

  // عناصر التحكم السفلية
  baseNameInput: document.getElementById('renameBaseInput'),

  digitsNum: document.getElementById('renameDigitsNum'),
  digitsIncBtn: document.getElementById('renameDigitsIncBtn'),
  digitsDecBtn: document.getElementById('renameDigitsDecBtn'),

  startNum: document.getElementById('renameStartNum'),
  startIncBtn: document.getElementById('renameStartIncBtn'),
  startDecBtn: document.getElementById('renameStartDecBtn'),

  endNum: document.getElementById('renameEndNum'),
  endIncBtn: document.getElementById('renameEndIncBtn'),
  endDecBtn: document.getElementById('renameEndDecBtn'),

  applyBtn: document.getElementById('renameApplyBtn'),
  exportZipBtn: document.getElementById('renameExportZipBtn'),

  longPressTimer: null,
  isDragSelecting: false,
  dragSelectAction: true,
  dragStartIndex: null,

  init() {
    this.applyWhiteAreaStyles();
    this.bindEvents();
    this.updateControlsUI();
  },

  // جعل منطقة وضع الصور بلون أبيض صافي وإزالة التفاوتات اللونية
  applyWhiteAreaStyles() {
    if (this.dropZone) {
      this.dropZone.style.backgroundColor = '#FFFFFF';
    }
    if (this.gridContainer) {
      this.gridContainer.style.backgroundColor = '#FFFFFF';
    }
  },

  bindEvents() {
    this.importBtn?.addEventListener('click', () => this.uploadInput?.click());
    this.dropZone?.addEventListener('click', (e) => {
      if (e.target === this.dropZone || e.target.closest('#renameEmptyNotice')) {
        this.uploadInput?.click();
      }
    });

    this.uploadInput?.addEventListener('change', (e) => this.loadFiles(e.target.files));

    // السحب والإفلات
    ['dragenter', 'dragover'].forEach(n => {
      this.dropZone?.addEventListener(n, (e) => {
        e.preventDefault();
        this.dropZone.style.borderColor = 'var(--accent-red)';
      });
    });
    ['dragleave', 'drop'].forEach(n => {
      this.dropZone?.addEventListener(n, (e) => {
        e.preventDefault();
        this.dropZone.style.borderColor = 'transparent';
      });
    });
    this.dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files) this.loadFiles(e.dataTransfer.files);
    });

    // خانة الاسم الأساسي
    this.baseNameInput?.addEventListener('input', (e) => {
      Store.renameBaseName = e.target.value.trim();
    });

    // خانات الترقيم (Digits)
    this.digitsIncBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.digitsNum.value)) || 1;
      this.digitsNum.value = toEnDigits(Math.min(10, current + 1));
      Store.renameDigits = parseInt(toEnDigits(this.digitsNum.value));
    });

    this.digitsDecBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.digitsNum.value)) || 1;
      this.digitsNum.value = toEnDigits(Math.max(1, current - 1));
      Store.renameDigits = parseInt(toEnDigits(this.digitsNum.value));
    });

    this.digitsNum?.addEventListener('input', () => {
      this.digitsNum.value = toEnDigits(this.digitsNum.value);
      Store.renameDigits = Math.max(1, parseInt(toEnDigits(this.digitsNum.value)) || 1);
    });

    // بداية الترقيم (Start)
    this.startIncBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.startNum.value)) || 0;
      this.startNum.value = toEnDigits(current + 1);
      Store.renameStart = parseInt(toEnDigits(this.startNum.value));
      this.syncEndRange();
    });

    this.startDecBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.startNum.value)) || 0;
      this.startNum.value = toEnDigits(Math.max(0, current - 1));
      Store.renameStart = parseInt(toEnDigits(this.startNum.value));
      this.syncEndRange();
    });

    this.startNum?.addEventListener('input', () => {
      this.startNum.value = toEnDigits(this.startNum.value);
      Store.renameStart = parseInt(toEnDigits(this.startNum.value)) || 0;
      this.syncEndRange();
    });

    // نهاية الترقيم (End)
    this.endIncBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.endNum.value)) || 0;
      this.endNum.value = toEnDigits(current + 1);
      Store.renameEnd = parseInt(toEnDigits(this.endNum.value));
    });

    this.endDecBtn?.addEventListener('click', () => {
      let current = parseInt(toEnDigits(this.endNum.value)) || 0;
      this.endNum.value = toEnDigits(Math.max(Store.renameStart, current - 1));
      Store.renameEnd = parseInt(toEnDigits(this.endNum.value));
    });

    this.endNum?.addEventListener('input', () => {
      this.endNum.value = toEnDigits(this.endNum.value);
      Store.renameEnd = Math.max(Store.renameStart, parseInt(toEnDigits(this.endNum.value)) || Store.renameStart);
    });

    // التحديد والمسح
    this.selectAllBtn?.addEventListener('click', () => this.selectAll());
    this.deselectAllBtn?.addEventListener('click', () => this.deselectAll());
    this.clearBtn?.addEventListener('click', () => this.clearAll());

    // التطبيق والتصدير
    this.applyBtn?.addEventListener('click', () => this.applyRename());
    this.exportZipBtn?.addEventListener('click', () => this.exportZIP());

    // أحداث السحب الحر للتحديد المتعدد (Samsung Gallery Touch Selection)
    window.addEventListener('pointerup', () => this.endDragSelection());
    window.addEventListener('pointercancel', () => this.endDragSelection());
    this.grid?.addEventListener('pointermove', (e) => this.handleDragOverCards(e));
  },

  updateControlsUI() {
    if (this.digitsNum) this.digitsNum.value = toEnDigits(Store.renameDigits);
    if (this.startNum) this.startNum.value = toEnDigits(Store.renameStart);
    if (this.endNum) this.endNum.value = toEnDigits(Store.renameEnd);
    if (this.baseNameInput) this.baseNameInput.value = Store.renameBaseName;
  },

  syncEndRange() {
    const total = Store.selectedRenameIndices.size > 0 
      ? Store.selectedRenameIndices.size 
      : Store.renameImages.length;

    if (total > 0) {
      Store.renameEnd = Store.renameStart + total - 1;
      if (this.endNum) this.endNum.value = toEnDigits(Store.renameEnd);
    }
  },

  async loadFiles(files) {
    if (!files || !files.length) return;
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!valid.length) return;

    showProgress('جاري قراءة واستيراد الصور بالترتيب الأصلي...');
    const loaded = [];

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const dataUrl = await new Promise(res => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.readAsDataURL(file);
      });

      const img = await new Promise(res => {
        const image = new Image();
        image.onload = () => res(image);
        image.src = dataUrl;
      });

      const originalName = file.name;
      const dotIndex = originalName.lastIndexOf('.');
      const ext = dotIndex !== -1 ? originalName.substring(dotIndex + 1) : 'png';
      const cleanName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;

      loaded.push({
        id: `img_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
        file,
        originalName,
        cleanName,
        newName: cleanName,
        img,
        dataUrl,
        ext
      });

      updateProgress(((i + 1) / valid.length) * 100);
    }

    Store.renameImages.push(...loaded);
    if (this.uploadInput) this.uploadInput.value = '';

    this.syncEndRange();
    this.updateUI();
    this.renderGrid();
    hideProgress();
  },

  updateUI() {
    const hasImages = Store.renameImages.length > 0;
    if (this.emptyNotice) this.emptyNotice.style.display = hasImages ? 'none' : 'flex';
    if (this.gridContainer) this.gridContainer.style.display = hasImages ? 'flex' : 'none';
    if (this.totalCountBadge) this.totalCountBadge.textContent = `إجمالي الصور: ${toEnDigits(Store.renameImages.length)}`;

    [this.applyBtn, this.exportZipBtn, this.clearBtn].forEach(btn => {
      if (btn) btn.disabled = !hasImages;
    });

    this.updateSelectCountBadge();
  },

  updateSelectCountBadge() {
    const count = Store.selectedRenameIndices.size;
    if (this.selectCountBadge) {
      this.selectCountBadge.textContent = `تم تحديد: ${toEnDigits(count)}`;
    }
    if (this.deselectAllBtn) {
      this.deselectAllBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    this.syncEndRange();
  },

  renderGrid() {
    if (!this.grid) return;
    this.grid.innerHTML = '';
    this.applyWhiteAreaStyles();

    Store.renameImages.forEach((item, index) => {
      const isSelected = Store.selectedRenameIndices.has(index);

      const card = document.createElement('div');
      card.className = `rename-grid-card ${isSelected ? 'selected' : ''}`;
      card.dataset.index = index;

      // إزالة الهوامش والمساحة البيضاء الزائدة لتجلس الصورة بشكل نقي ومباشر
      card.style.padding = '4px';
      card.style.background = '#FFFFFF';

      // مربع التحديد (Samsung Style Checkbox)
      const checkBadge = document.createElement('div');
      checkBadge.className = 'rename-checkbox-badge';
      checkBadge.innerHTML = `<span class="material-symbols-rounded">${isSelected ? 'check_circle' : 'radio_button_unchecked'}</span>`;

      // إطار صورة المعاينة (بدون خلفيات رمادية، خلفية بيضاء نقية)
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'rename-card-thumb';
      imgWrapper.style.backgroundColor = '#FFFFFF';
      imgWrapper.style.boxShadow = 'none';

      const img = document.createElement('img');
      img.src = item.dataUrl;
      img.loading = 'lazy';
      img.style.objectFit = 'contain';
      img.style.backgroundColor = '#FFFFFF';
      imgWrapper.appendChild(img);

      // اسم الصورة المعروض أسفلها
      const nameTag = document.createElement('div');
      nameTag.className = 'rename-card-name';
      nameTag.title = `${item.newName}.${item.ext}`;
      nameTag.textContent = `${item.newName}.${item.ext}`;

      card.appendChild(checkBadge);
      card.appendChild(imgWrapper);
      card.appendChild(nameTag);

      this.attachCardEvents(card, index);
      this.grid.appendChild(card);
    });
  },

  attachCardEvents(card, index) {
    card.addEventListener('pointerdown', (e) => {
      this.clearLongPress();
      this.dragStartIndex = index;

      this.longPressTimer = setTimeout(() => {
        Store.isRenameSelectMode = true;
        this.isDragSelecting = true;
        this.dragSelectAction = !Store.selectedRenameIndices.has(index);
        this.toggleItemSelection(index, this.dragSelectAction);
        
        if (navigator.vibrate) navigator.vibrate(35);
      }, 350);
    });

    card.addEventListener('pointerup', () => this.clearLongPress());
    card.addEventListener('pointerleave', () => this.clearLongPress());

    card.addEventListener('click', (e) => {
      if (Store.isRenameSelectMode) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleItemSelection(index);
      }
    });
  },

  clearLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  },

  handleDragOverCards(e) {
    if (!this.isDragSelecting) return;
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const card = elem?.closest('.rename-grid-card');
    if (!card) return;

    const idx = parseInt(card.dataset.index);
    if (!isNaN(idx)) {
      this.toggleItemSelection(idx, this.dragSelectAction);
    }
  },

  endDragSelection() {
    this.clearLongPress();
    this.isDragSelecting = false;
  },

  toggleItemSelection(index, forceState = null) {
    const shouldSelect = forceState !== null ? forceState : !Store.selectedRenameIndices.has(index);
    if (shouldSelect) {
      Store.selectedRenameIndices.add(index);
    } else {
      Store.selectedRenameIndices.delete(index);
    }

    Store.isRenameSelectMode = Store.selectedRenameIndices.size > 0;

    const card = this.grid.querySelector(`.rename-grid-card[data-index="${index}"]`);
    if (card) {
      card.classList.toggle('selected', shouldSelect);
      const icon = card.querySelector('.rename-checkbox-badge .material-symbols-rounded');
      if (icon) {
        icon.textContent = shouldSelect ? 'check_circle' : 'radio_button_unchecked';
      }
    }

    this.updateSelectCountBadge();
  },

  selectAll() {
    if (!Store.renameImages.length) return;
    Store.isRenameSelectMode = true;
    Store.selectedRenameIndices.clear();
    for (let i = 0; i < Store.renameImages.length; i++) {
      Store.selectedRenameIndices.add(i);
    }
    this.renderGrid();
    this.updateSelectCountBadge();
  },

  deselectAll() {
    Store.isRenameSelectMode = false;
    Store.selectedRenameIndices.clear();
    this.renderGrid();
    this.updateSelectCountBadge();
  },

  clearAll() {
    Store.renameImages = [];
    Store.selectedRenameIndices.clear();
    Store.isRenameSelectMode = false;
    if (this.uploadInput) this.uploadInput.value = '';
    this.updateUI();
    this.renderGrid();
  },

  // تطبيق إعادة التسمية مع التحقق من فراغ خانة الاسم
  applyRename() {
    if (!Store.renameImages.length) return;

    const rawBase = this.baseNameInput ? this.baseNameInput.value.trim() : '';
    const digits = Math.max(1, parseInt(toEnDigits(this.digitsNum?.value)) || 2);
    const start = Math.max(0, parseInt(toEnDigits(this.startNum?.value)) || 1);

    const hasSelection = Store.selectedRenameIndices.size > 0;
    const targetIndices = hasSelection 
      ? Array.from(Store.selectedRenameIndices).sort((a, b) => a - b)
      : Store.renameImages.map((_, i) => i);

    showProgress('جاري تطبيق الأسماء الجديدة...');

    targetIndices.forEach((targetIdx, order) => {
      const currentNumber = start + order;
      const formattedNum = String(currentNumber).padStart(digits, '0');

      // إذا كانت خانة الاسم فارغة: ضع الأرقام وخانات الترقيم فقط دون إضافة أي شرطة أو نص
      const newFileName = rawBase !== '' ? `${rawBase}_${formattedNum}` : formattedNum;
      Store.renameImages[targetIdx].newName = newFileName;
    });

    Store.renameEnd = start + targetIndices.length - 1;
    if (this.endNum) this.endNum.value = toEnDigits(Store.renameEnd);

    this.renderGrid();
    hideProgress();
  },

  async exportZIP() {
    if (!Store.renameImages.length || !window.JSZip) return;

    showProgress('جاري تجهيز وتحويل الصور وضغطها كملف ZIP...');
    const zip = new JSZip();
    const folder = zip.folder('renamed_images');

    const total = Store.renameImages.length;

    for (let i = 0; i < total; i++) {
      const item = Store.renameImages[i];
      
      // تحويل وحفظ الصور بصيغة PNG صافية
      const offCanvas = document.createElement('canvas');
      offCanvas.width = item.img.naturalWidth || item.img.width;
      offCanvas.height = item.img.naturalHeight || item.img.height;
      const ctx = offCanvas.getContext('2d');
      ctx.drawImage(item.img, 0, 0);

      const pngData = offCanvas.toDataURL('image/png').split(',')[1];
      folder.file(`${item.newName}.png`, pngData, { base64: true });

      updateProgress(((i + 1) / total) * 70);
    }

    showProgress('جاري ضغط الحزمة النهائية...');
    const content = await zip.generateAsync({ type: 'blob' }, (meta) => {
      updateProgress(70 + (meta.percent * 0.3));
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'renamed_images_png.zip';
    link.click();
    URL.revokeObjectURL(link.href);

    hideProgress();
  }
};

// ==========================================
// 8. تشغيل كافة الأنظمة
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  Collage.init();
  Sprite.init();
  Pivot.init();
  VideoStudio.init();
  RenameStudio.init();
});
