// --- 1. إدارة التبويبات والمظهر وملء الشاشة ---
const tabCollageBtn = document.getElementById('tabCollageBtn');
const tabSpriteBtn = document.getElementById('tabSpriteBtn');
const tabVideoBtn = document.getElementById('tabVideoBtn');

const collageView = document.getElementById('collageView');
const spriteView = document.getElementById('spriteView');
const videoView = document.getElementById('videoView');
const headerExportGroup = document.getElementById('headerExportGroup');

function switchTab(activeBtn, activeView) {
  [tabCollageBtn, tabSpriteBtn, tabVideoBtn].forEach(b => b.classList.remove('active'));
  [collageView, spriteView, videoView].forEach(v => v.classList.remove('active-view'));

  activeBtn.classList.add('active');
  activeView.classList.add('active-view');

  // إظهار أزرار التصدير العلوية في تبويب التجميع فقط وإخفائها في باقي التبويبات
  if (headerExportGroup) {
    headerExportGroup.style.visibility = (activeView === collageView) ? 'visible' : 'hidden';
  }
}

tabCollageBtn.addEventListener('click', () => switchTab(tabCollageBtn, collageView));
tabSpriteBtn.addEventListener('click', () => switchTab(tabSpriteBtn, spriteView));
tabVideoBtn.addEventListener('click', () => switchTab(tabVideoBtn, videoView));

// التبديل بين الوضع الليلي والنهاري
const themeToggleBtn = document.getElementById('themeToggleBtn');
const moonIconHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-5.4-5.4c0-1.81.89-3.42 2.26-4.4C12.92 3.04 12.46 3 12 3z"/></svg>`;
const sunIconHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
  themeToggleBtn.innerHTML = sunIconHTML;
} else {
  themeToggleBtn.innerHTML = moonIconHTML;
}

themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggleBtn.innerHTML = isDark ? sunIconHTML : moonIconHTML;
});

// ملء الشاشة
const fullScreenBtn = document.getElementById('fullScreenBtn');
fullScreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// إدارة شاشة وشريط التقدم
function showProgress(title) {
  document.getElementById('progressTitle').textContent = title;
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('progressText').textContent = '0%';
  document.getElementById('progressContainer').style.display = 'flex';
}

function updateProgress(percent) {
  document.getElementById('progressBar').style.width = `${percent}%`;
  document.getElementById('progressText').textContent = `${percent}%`;
}

function hideProgress() {
  setTimeout(() => {
    document.getElementById('progressContainer').style.display = 'none';
  }, 400);
}

// --- 2. منطق استوديو التجميع (Collage Studio) ---
const imgUpload = document.getElementById('imgUpload');
const dropZone = document.getElementById('dropZone');
const clearBtn = document.getElementById('clearBtn');
const exportPNGBtn = document.getElementById('exportPNGBtn');
const exportPDFBtn = document.getElementById('exportPDFBtn');
const previewCanvas = document.getElementById('previewCanvas');
const emptyNotice = document.getElementById('emptyNotice');
const imageCounter = document.getElementById('imageCounter');

const imgSizeInput = document.getElementById('imgSize');
const imgSizeNum = document.getElementById('imgSizeNum');
const columnsInput = document.getElementById('columns');
const columnsVal = document.getElementById('columnsVal');
const imgGapInput = document.getElementById('imgGap');
const imgGapVal = document.getElementById('imgGapVal');
const strokeWidthInput = document.getElementById('strokeWidth');
const strokeWidthVal = document.getElementById('strokeWidthVal');
const strokeColorInput = document.getElementById('strokeColor');

// أدوات التحديد والحذف المتعدد في التجميع
const collageSelectModeBtn = document.getElementById('collageSelectModeBtn');
const collageSelectActions = document.getElementById('collageSelectActions');
const collageDeleteSelectedBtn = document.getElementById('collageDeleteSelectedBtn');
const collageCancelSelectBtn = document.getElementById('collageCancelSelectBtn');
const collageSelectCountBadge = document.getElementById('collageSelectCountBadge');

let isCollageSelectMode = false;
let selectedCollageIndices = new Set();
let collagePositions = [];

const ctx = previewCanvas.getContext('2d');
let images = [];

imgSizeInput.addEventListener('input', (e) => { imgSizeNum.value = e.target.value; generatePreview(0.5); });
imgSizeNum.addEventListener('input', (e) => { imgSizeInput.value = parseInt(e.target.value) || 50; generatePreview(0.5); });
columnsInput.addEventListener('input', (e) => { columnsVal.textContent = e.target.value; generatePreview(0.5); });
imgGapInput.addEventListener('input', (e) => { imgGapVal.textContent = `${e.target.value}px`; generatePreview(0.5); });
strokeWidthInput.addEventListener('input', (e) => { strokeWidthVal.textContent = `${e.target.value}px`; generatePreview(0.5); });
strokeColorInput.addEventListener('input', () => generatePreview(0.5));

dropZone.addEventListener('click', (e) => {
  if (isCollageSelectMode || e.target === previewCanvas) return;
  imgUpload.click();
});

imgUpload.addEventListener('change', (e) => handleFiles(e.target.files));

async function handleFiles(files) {
  if (!files || files.length === 0) return;
  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
  const loadPromises = imageFiles.map(file => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = () => resolve({ img: img });
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  });

  const loadedImages = await Promise.all(loadPromises);
  images.push(...loadedImages.filter(item => item !== null));
  imgUpload.value = '';
  updateUIState();
  generatePreview(0.5);
}

function updateUIState() {
  if (images.length > 0) {
    emptyNotice.style.display = 'none';
    previewCanvas.style.display = 'block';
  } else {
    emptyNotice.style.display = 'flex';
    previewCanvas.style.display = 'none';
  }
  imageCounter.textContent = `${images.length} صور`;
}

function generatePreview(quality) {
  if (images.length === 0) {
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    return;
  }

  const imgSize = parseInt(imgSizeNum.value) || 300;
  const columns = parseInt(columnsInput.value) || 3;
  const gap = parseInt(imgGapInput.value) || 0;
  const strokeWidth = parseInt(strokeWidthInput.value) || 0;
  const strokeColor = strokeColorInput.value || '#FF3B5C';

  const cellWidth = imgSize * quality;
  const cellHeights = images.map(imageObj => (cellWidth / imageObj.img.width) * imageObj.img.height);
  const groups = Array.from({ length: columns }, () => 0);
  const positions = Array.from({ length: images.length }, () => 0);

  const effectiveGap = gap * quality;
  const effectiveStroke = strokeWidth * quality;

  for (let i = 0; i < images.length; i++) {
    const imageHeight = cellHeights[i];
    const groupIndex = i % columns; 
    const x = groupIndex * (cellWidth + effectiveGap) + effectiveStroke / 2;
    const y = groups[groupIndex] + effectiveStroke / 2;
    positions[i] = { x: x, y: y, w: cellWidth, h: imageHeight };
    groups[groupIndex] += imageHeight + effectiveGap;
  }

  collagePositions = positions;

  const maxHeight = Math.max(...groups) - effectiveGap + effectiveStroke;
  const totalWidth = columns * (cellWidth + effectiveGap) - effectiveGap + effectiveStroke;
  
  previewCanvas.width = totalWidth > 0 ? totalWidth : 100;
  previewCanvas.height = maxHeight > 0 ? maxHeight : 100;

  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  images.forEach((imageObj, index) => {
    const { img } = imageObj;
    const pos = positions[index];
    ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h);
    
    if (strokeWidth > 0) {
      ctx.lineWidth = effectiveStroke;
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
    }

    if (isCollageSelectMode && selectedCollageIndices.has(index)) {
      ctx.fillStyle = 'rgba(255, 59, 92, 0.4)';
      ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
      ctx.lineWidth = Math.max(3, pos.w * 0.03);
      ctx.strokeStyle = '#FF3B5C';
      ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);

      ctx.fillStyle = '#FF3B5C';
      ctx.beginPath();
      ctx.arc(pos.x + pos.w - 18, pos.y + 18, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pos.x + pos.w - 22, pos.y + 14);
      ctx.lineTo(pos.x + pos.w - 14, pos.y + 22);
      ctx.moveTo(pos.x + pos.w - 14, pos.y + 14);
      ctx.lineTo(pos.x + pos.w - 22, pos.y + 22);
      ctx.stroke();
    }
  });
}

// تفاعل النقر على صور التجميع للتحديد والحذف
previewCanvas.addEventListener('click', (e) => {
  if (!isCollageSelectMode || images.length === 0) return;
  e.stopPropagation();

  const rect = previewCanvas.getBoundingClientRect();
  const scaleX = previewCanvas.width / rect.width;
  const scaleY = previewCanvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  for (let i = 0; i < collagePositions.length; i++) {
    const pos = collagePositions[i];
    if (clickX >= pos.x && clickX <= pos.x + pos.w && clickY >= pos.y && clickY <= pos.y + pos.h) {
      if (selectedCollageIndices.has(i)) {
        selectedCollageIndices.delete(i);
      } else {
        selectedCollageIndices.add(i);
      }
      break;
    }
  }

  collageSelectCountBadge.textContent = `تم تحديد ${selectedCollageIndices.size} صور`;
  generatePreview(0.5);
});

collageSelectModeBtn.addEventListener('click', () => {
  if (images.length === 0) return;
  isCollageSelectMode = true;
  selectedCollageIndices.clear();

  collageSelectModeBtn.style.display = 'none';
  collageSelectActions.style.display = 'flex';
  previewCanvas.classList.add('selecting');
  collageSelectCountBadge.textContent = `تم تحديد 0 صور`;
  generatePreview(0.5);
});

collageCancelSelectBtn.addEventListener('click', () => {
  exitCollageSelectMode();
});

collageDeleteSelectedBtn.addEventListener('click', () => {
  if (selectedCollageIndices.size === 0) {
    exitCollageSelectMode();
    return;
  }
  images = images.filter((_, idx) => !selectedCollageIndices.has(idx));
  exitCollageSelectMode();
  updateUIState();
  generatePreview(0.5);
});

function exitCollageSelectMode() {
  isCollageSelectMode = false;
  selectedCollageIndices.clear();
  collageSelectModeBtn.style.display = 'flex';
  collageSelectActions.style.display = 'none';
  previewCanvas.classList.remove('selecting');
  generatePreview(0.5);
}

clearBtn.addEventListener('click', () => {
  images = [];
  imgUpload.value = '';
  exitCollageSelectMode();
  updateUIState();
  generatePreview(0.5);
});

exportPNGBtn.addEventListener('click', () => {
  if (images.length === 0) return;
  generatePreview(1);
  const dataURL = previewCanvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = 'collage.png';
  a.click();
  generatePreview(0.5);
});

exportPDFBtn.addEventListener('click', () => {
  if (images.length === 0) return;
  const { jsPDF } = window.jspdf;
  generatePreview(1);
  const pdf = new jsPDF(previewCanvas.width > previewCanvas.height ? 'l' : 'p', 'px', [previewCanvas.width, previewCanvas.height]);
  pdf.addImage(previewCanvas.toDataURL('image/png'), 'PNG', 0, 0, previewCanvas.width, previewCanvas.height);
  pdf.save('collage.pdf');
  generatePreview(0.5);
});

// --- 3. منطق استوديو السبرايت (Sprite Studio & Exporters) ---
const spriteUpload = document.getElementById('spriteUpload');
const spriteDropZone = document.getElementById('spriteDropZone');
const spriteEmptyNotice = document.getElementById('spriteEmptyNotice');
const spriteCanvasWrapper = document.getElementById('spriteCanvasWrapper');
const spriteCanvas = document.getElementById('spriteCanvas');
const spriteCtx = spriteCanvas.getContext('2d');

const spriteColsInput = document.getElementById('spriteCols');
const spriteColsVal = document.getElementById('spriteColsVal');
const spriteRowsInput = document.getElementById('spriteRows');
const spriteRowsVal = document.getElementById('spriteRowsVal');
const totalFramesBadge = document.getElementById('totalFramesBadge');

const animCanvas = document.getElementById('animCanvas');
const animCtx = animCanvas.getContext('2d');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const fpsInput = document.getElementById('fpsInput');
const fpsVal = document.getElementById('fpsVal');

const openPivotEditorBtn = document.getElementById('openPivotEditorBtn');
const exportSpriteMp4Btn = document.getElementById('exportSpriteMp4Btn');
const exportSpriteGifBtn = document.getElementById('exportSpriteGifBtn');
const exportZipBtn = document.getElementById('exportZipBtn');
const transferToCollageBtn = document.getElementById('transferToCollageBtn');

const editSpriteOrderBtn = document.getElementById('editSpriteOrderBtn');
const editModeActions = document.getElementById('editModeActions');
const confirmSpriteOrderBtn = document.getElementById('confirmSpriteOrderBtn');
const cancelSpriteOrderBtn = document.getElementById('cancelSpriteOrderBtn');

const spriteSelectDeleteBtn = document.getElementById('spriteSelectDeleteBtn');
const spriteDeleteActions = document.getElementById('spriteDeleteActions');
const confirmSpriteDeleteBtn = document.getElementById('confirmSpriteDeleteBtn');
const cancelSpriteDeleteBtn = document.getElementById('cancelSpriteDeleteBtn');
const spriteDeleteCountBadge = document.getElementById('spriteDeleteCountBadge');

let spriteImage = null;
let slicedFrames = [];
let framePivots = [];
let backupFrames = [];
let isEditMode = false;
let selectedFrameIndex = null;

let isSpriteDeleteMode = false;
let selectedSpriteDeleteFrames = new Set();

let isPlaying = false;
let currentFrameIndex = 0;
let animInterval = null;

spriteDropZone.addEventListener('click', (e) => {
  if (isEditMode || isSpriteDeleteMode || e.target === spriteCanvas) return;
  spriteUpload.click();
});

spriteUpload.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        spriteImage = img;
        spriteEmptyNotice.style.display = 'none';
        spriteCanvasWrapper.style.display = 'flex';

        playPauseBtn.disabled = false;
        openPivotEditorBtn.disabled = false;
        exportSpriteMp4Btn.disabled = false;
        exportSpriteGifBtn.disabled = false;
        exportZipBtn.disabled = false;
        transferToCollageBtn.disabled = false;
        editSpriteOrderBtn.disabled = false;
        spriteSelectDeleteBtn.disabled = false;

        exitEditMode(false);
        exitSpriteDeleteMode();
        updateSpriteGrid();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

spriteColsInput.addEventListener('input', (e) => {
  spriteColsVal.textContent = e.target.value;
  exitEditMode(false);
  exitSpriteDeleteMode();
  updateSpriteGrid();
});

spriteRowsInput.addEventListener('input', (e) => {
  spriteRowsVal.textContent = e.target.value;
  exitEditMode(false);
  exitSpriteDeleteMode();
  updateSpriteGrid();
});

fpsInput.addEventListener('input', (e) => {
  fpsVal.textContent = e.target.value;
  if (isPlaying) {
    stopAnimation();
    startAnimation();
  }
});

function updateSpriteGrid() {
  if (!spriteImage) return;

  const cols = parseInt(spriteColsInput.value) || 1;
  const rows = parseInt(spriteRowsInput.value) || 1;
  const totalFrames = cols * rows;
  totalFramesBadge.textContent = `إجمالي الإطارات: ${totalFrames}`;

  spriteCanvas.width = spriteImage.width;
  spriteCanvas.height = spriteImage.height;

  const cellWidth = spriteImage.width / cols;
  const cellHeight = spriteImage.height / rows;

  sliceSpriteFrames(cols, rows, cellWidth, cellHeight);
  renderSpriteCanvas();
  drawAnimFrame();
}

function sliceSpriteFrames(cols, rows, cellWidth, cellHeight) {
  slicedFrames = [];
  framePivots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = cellWidth;
      frameCanvas.height = cellHeight;
      const fCtx = frameCanvas.getContext('2d');
      fCtx.drawImage(
        spriteImage,
        c * cellWidth, r * cellHeight, cellWidth, cellHeight,
        0, 0, cellWidth, cellHeight
      );
      slicedFrames.push(frameCanvas);
      framePivots.push({ x: 0.5, y: 0.5 });
    }
  }
  currentFrameIndex = 0;
}

function renderSpriteCanvas() {
  if (!spriteImage || slicedFrames.length === 0) return;

  const cols = parseInt(spriteColsInput.value) || 1;
  const rows = parseInt(spriteRowsInput.value) || 1;
  const cellWidth = spriteCanvas.width / cols;
  const cellHeight = spriteCanvas.height / rows;

  spriteCtx.clearRect(0, 0, spriteCanvas.width, spriteCanvas.height);

  for (let i = 0; i < slicedFrames.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const frame = slicedFrames[i];
    if (frame) {
      spriteCtx.drawImage(frame, c * cellWidth, r * cellHeight, cellWidth, cellHeight);
    }

    if (isEditMode) {
      spriteCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      spriteCtx.fillRect(c * cellWidth + 6, r * cellHeight + 6, 26, 20);
      spriteCtx.fillStyle = '#FFFFFF';
      spriteCtx.font = 'bold 12px sans-serif';
      spriteCtx.textAlign = 'center';
      spriteCtx.textBaseline = 'middle';
      spriteCtx.fillText(i + 1, c * cellWidth + 19, r * cellHeight + 16);
    }

    if (isSpriteDeleteMode && selectedSpriteDeleteFrames.has(i)) {
      spriteCtx.fillStyle = 'rgba(255, 59, 92, 0.45)';
      spriteCtx.fillRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);
      spriteCtx.strokeStyle = '#FF3B5C';
      spriteCtx.lineWidth = Math.max(3, Math.min(cellWidth, cellHeight) * 0.04);
      spriteCtx.strokeRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);

      const cx = c * cellWidth + cellWidth / 2;
      const cy = r * cellHeight + cellHeight / 2;
      const sz = Math.min(cellWidth, cellHeight) * 0.2;
      spriteCtx.strokeStyle = '#FFFFFF';
      spriteCtx.lineWidth = 3.5;
      spriteCtx.beginPath();
      spriteCtx.moveTo(cx - sz, cy - sz);
      spriteCtx.lineTo(cx + sz, cy + sz);
      spriteCtx.moveTo(cx + sz, cy - sz);
      spriteCtx.lineTo(cx - sz, cy + sz);
      spriteCtx.stroke();
    }
  }

  spriteCtx.strokeStyle = isEditMode ? 'rgba(255, 59, 92, 0.7)' : (isSpriteDeleteMode ? 'rgba(255, 59, 92, 0.5)' : '#FF3B5C');
  spriteCtx.lineWidth = Math.max(1, Math.min(cellWidth, cellHeight) * 0.02);

  for (let c = 1; c < cols; c++) {
    spriteCtx.beginPath();
    spriteCtx.moveTo(c * cellWidth, 0);
    spriteCtx.lineTo(c * cellWidth, spriteCanvas.height);
    spriteCtx.stroke();
  }

  for (let r = 1; r < rows; r++) {
    spriteCtx.beginPath();
    spriteCtx.moveTo(0, r * cellHeight);
    spriteCtx.lineTo(spriteCanvas.width, r * cellHeight);
    spriteCtx.stroke();
  }

  if (isEditMode && selectedFrameIndex !== null) {
    const r = Math.floor(selectedFrameIndex / cols);
    const c = selectedFrameIndex % cols;
    spriteCtx.fillStyle = 'rgba(0, 200, 83, 0.35)';
    spriteCtx.fillRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);
    spriteCtx.strokeStyle = '#00E676';
    spriteCtx.lineWidth = Math.max(3, Math.min(cellWidth, cellHeight) * 0.04);
    spriteCtx.strokeRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);
  }
}

spriteCanvas.addEventListener('click', (e) => {
  if ((!isEditMode && !isSpriteDeleteMode) || slicedFrames.length === 0) return;
  e.stopPropagation();

  const rect = spriteCanvas.getBoundingClientRect();
  const scaleX = spriteCanvas.width / rect.width;
  const scaleY = spriteCanvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const cols = parseInt(spriteColsInput.value) || 1;
  const rows = parseInt(spriteRowsInput.value) || 1;
  const cellWidth = spriteCanvas.width / cols;
  const cellHeight = spriteCanvas.height / rows;

  const col = Math.floor(x / cellWidth);
  const row = Math.floor(y / cellHeight);

  if (col < 0 || col >= cols || row < 0 || row >= rows) return;

  const clickedIndex = row * cols + col;
  if (clickedIndex >= slicedFrames.length) return;

  if (isSpriteDeleteMode) {
    if (selectedSpriteDeleteFrames.has(clickedIndex)) {
      selectedSpriteDeleteFrames.delete(clickedIndex);
    } else {
      selectedSpriteDeleteFrames.add(clickedIndex);
    }
    spriteDeleteCountBadge.textContent = `تم تحديد ${selectedSpriteDeleteFrames.size} فريم`;
  } else if (isEditMode) {
    if (selectedFrameIndex === null) {
      selectedFrameIndex = clickedIndex;
    } else if (selectedFrameIndex === clickedIndex) {
      selectedFrameIndex = null;
    } else {
      const tempFrame = slicedFrames[selectedFrameIndex];
      slicedFrames[selectedFrameIndex] = slicedFrames[clickedIndex];
      slicedFrames[clickedIndex] = tempFrame;

      const tempPivot = framePivots[selectedFrameIndex];
      framePivots[selectedFrameIndex] = framePivots[clickedIndex];
      framePivots[clickedIndex] = tempPivot;

      selectedFrameIndex = null;
    }
  }

  renderSpriteCanvas();
  drawAnimFrame();
});

editSpriteOrderBtn.addEventListener('click', () => {
  if (slicedFrames.length === 0) return;
  if (isPlaying) stopAnimation();
  exitSpriteDeleteMode();

  isEditMode = true;
  backupFrames = [...slicedFrames];
  selectedFrameIndex = null;

  editSpriteOrderBtn.style.display = 'none';
  editModeActions.style.display = 'flex';
  spriteCanvasWrapper.classList.add('editing');

  renderSpriteCanvas();
});

confirmSpriteOrderBtn.addEventListener('click', () => {
  exitEditMode(true);
});

cancelSpriteOrderBtn.addEventListener('click', () => {
  if (backupFrames.length > 0) {
    slicedFrames = [...backupFrames];
  }
  exitEditMode(false);
});

function exitEditMode(saveChanges) {
  isEditMode = false;
  selectedFrameIndex = null;
  backupFrames = [];

  editSpriteOrderBtn.style.display = 'flex';
  editModeActions.style.display = 'none';
  spriteCanvasWrapper.classList.remove('editing');

  renderSpriteCanvas();
  drawAnimFrame();
}

spriteSelectDeleteBtn.addEventListener('click', () => {
  if (slicedFrames.length === 0) return;
  if (isPlaying) stopAnimation();
  exitEditMode(false);

  isSpriteDeleteMode = true;
  selectedSpriteDeleteFrames.clear();

  spriteSelectDeleteBtn.style.display = 'none';
  spriteDeleteActions.style.display = 'flex';
  spriteCanvasWrapper.classList.add('deleting');
  spriteDeleteCountBadge.textContent = `تم تحديد 0 فريم`;

  renderSpriteCanvas();
});

cancelSpriteDeleteBtn.addEventListener('click', () => {
  exitSpriteDeleteMode();
});

confirmSpriteDeleteBtn.addEventListener('click', () => {
  if (selectedSpriteDeleteFrames.size === 0) {
    exitSpriteDeleteMode();
    return;
  }

  slicedFrames = slicedFrames.filter((_, idx) => !selectedSpriteDeleteFrames.has(idx));
  framePivots = framePivots.filter((_, idx) => !selectedSpriteDeleteFrames.has(idx));

  totalFramesBadge.textContent = `إجمالي الإطارات: ${slicedFrames.length}`;
  currentFrameIndex = 0;

  exitSpriteDeleteMode();
  renderSpriteCanvas();
  drawAnimFrame();
});

function exitSpriteDeleteMode() {
  isSpriteDeleteMode = false;
  selectedSpriteDeleteFrames.clear();
  spriteSelectDeleteBtn.style.display = 'flex';
  spriteDeleteActions.style.display = 'none';
  spriteCanvasWrapper.classList.remove('deleting');
  renderSpriteCanvas();
}

function drawAnimFrame() {
  if (slicedFrames.length === 0) return;
  const frame = slicedFrames[currentFrameIndex % slicedFrames.length];
  animCanvas.width = frame.width;
  animCanvas.height = frame.height;
  animCtx.clearRect(0, 0, animCanvas.width, animCanvas.height);
  animCtx.imageSmoothingEnabled = false;
  animCtx.drawImage(frame, 0, 0);
}

playPauseBtn.addEventListener('click', () => {
  if (isPlaying) stopAnimation();
  else startAnimation();
});

function startAnimation() {
  if (slicedFrames.length === 0) return;
  isPlaying = true;
  playIcon.textContent = '❚❚ إيقاف';
  const fps = parseInt(fpsInput.value) || 12;
  animInterval = setInterval(() => {
    currentFrameIndex = (currentFrameIndex + 1) % slicedFrames.length;
    drawAnimFrame();
  }, 1000 / fps);
}

function stopAnimation() {
  isPlaying = false;
  playIcon.textContent = '► تشغيل';
  if (animInterval) clearInterval(animInterval);
}

// تصدير السبرايت كفيديو MP4
exportSpriteMp4Btn.addEventListener('click', async () => {
  if (slicedFrames.length === 0) return;
  showProgress('جاري تصدير فيديو الحركة MP4...');

  const fps = parseInt(fpsInput.value) || 12;
  const frameDuration = 1000 / fps;
  const totalSteps = slicedFrames.length;

  const recCanvas = document.createElement('canvas');
  recCanvas.width = slicedFrames[0].width;
  recCanvas.height = slicedFrames[0].height;
  const recCtx = recCanvas.getContext('2d');

  const stream = recCanvas.captureStream(fps);
  let mimeType = 'video/mp4';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  }

  let mediaRecorder;
  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
  } catch (e) {
    mediaRecorder = new MediaRecorder(stream);
  }

  const chunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const isMp4 = mimeType.includes('mp4');
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isMp4 ? 'sprite_animation.mp4' : 'sprite_animation.webm';
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    };
  });

  mediaRecorder.start();

  for (let i = 0; i < totalSteps; i++) {
    recCtx.clearRect(0, 0, recCanvas.width, recCanvas.height);
    recCtx.drawImage(slicedFrames[i], 0, 0);
    updateProgress(Math.round(((i + 1) / totalSteps) * 100));
    await new Promise(r => setTimeout(r, frameDuration));
  }

  await new Promise(r => setTimeout(r, frameDuration));
  mediaRecorder.stop();
  await recordingPromise;
  hideProgress();
});

// تصدير السبرايت كصورة متحركة GIF
exportSpriteGifBtn.addEventListener('click', () => {
  if (slicedFrames.length === 0) return;
  showProgress('جاري تركيب وإنشاء ملف GIF...');

  const imagesBase64 = slicedFrames.map(f => f.toDataURL('image/png'));
  const fps = parseInt(fpsInput.value) || 12;

  window.gifshot.createGIF({
    images: imagesBase64,
    gifWidth: Math.min(slicedFrames[0].width, 600),
    gifHeight: Math.min(slicedFrames[0].height, (slicedFrames[0].height * (600 / slicedFrames[0].width))),
    interval: 1 / fps,
    numWorkers: 4
  }, function (obj) {
    if (!obj.error) {
      const a = document.createElement('a');
      a.href = obj.image;
      a.download = 'sprite_animation.gif';
      a.click();
    } else {
      alert('حدث خطأ أثناء إنشاء الـ GIF');
    }
    hideProgress();
  });
});

// نقل الإطارات إلى استوديو التجميع
transferToCollageBtn.addEventListener('click', async () => {
  if (slicedFrames.length === 0) return;
  const loadPromises = slicedFrames.map(frameCanvas => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img: img });
      img.src = frameCanvas.toDataURL('image/png');
    });
  });

  const importedImages = await Promise.all(loadPromises);
  images.push(...importedImages);
  tabCollageBtn.click();
  updateUIState();
  generatePreview(0.5);
});

// تصدير الإطارات كملف ZIP
exportZipBtn.addEventListener('click', async () => {
  if (slicedFrames.length === 0) return;
  showProgress('جاري ضغط الملفات...');

  const zip = new JSZip();
  const folder = zip.folder("sprite_frames");

  slicedFrames.forEach((frameCanvas, index) => {
    const dataUrl = frameCanvas.toDataURL('image/png').split(',')[1];
    folder.file(`frame_${String(index + 1).padStart(3, '0')}.png`, dataUrl, { base64: true });
  });

  const content = await zip.generateAsync({ type: "blob" }, (meta) => {
    updateProgress(Math.round(meta.percent));
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = 'sprite_frames.zip';
  a.click();
  hideProgress();
});

// ================= 4. محرك محرر نقطة الارتكاز (PIVOT EDITOR ENGINE) =================
const pivotEditorModal = document.getElementById('pivotEditorModal');
const pivotCanvas = document.getElementById('pivotCanvas');
const pivotCtx = pivotCanvas.getContext('2d');
const pivotFramesGrid = document.getElementById('pivotFramesGrid');

const pivotXInput = document.getElementById('pivotXInput');
const pivotYInput = document.getElementById('pivotYInput');
const toggleOnionSkinBtn = document.getElementById('toggleOnionSkinBtn');
const openPivotPresetsBtn = document.getElementById('openPivotPresetsBtn');
const pivotPresetsPopup = document.getElementById('pivotPresetsPopup');
const savePivotBtn = document.getElementById('savePivotBtn');
const cancelPivotBtn = document.getElementById('cancelPivotBtn');

let activePivotFrameIdx = 0;
let onionSkinActive = true;
let isDraggingPivot = false;
let backupPivots = [];

openPivotEditorBtn.addEventListener('click', () => {
  if (slicedFrames.length === 0) return;
  if (isPlaying) stopAnimation();

  backupPivots = framePivots.map(p => ({ ...p }));
  activePivotFrameIdx = 0;

  pivotEditorModal.classList.add('active');
  buildPivotFramesGrid();
  renderPivotCanvas();
  updatePivotInputsUI();
});

function buildPivotFramesGrid() {
  pivotFramesGrid.innerHTML = '';
  slicedFrames.forEach((fCanvas, idx) => {
    const card = document.createElement('div');
    card.className = `pivot-frame-thumb-card ${idx === activePivotFrameIdx ? 'active-thumb' : ''}`;
    
    const img = document.createElement('img');
    img.src = fCanvas.toDataURL();
    
    const num = document.createElement('span');
    num.className = 'thumb-number';
    num.textContent = idx + 1;

    card.appendChild(img);
    card.appendChild(num);

    card.addEventListener('click', () => {
      activePivotFrameIdx = idx;
      document.querySelectorAll('.pivot-frame-thumb-card').forEach(c => c.classList.remove('active-thumb'));
      card.classList.add('active-thumb');
      updatePivotInputsUI();
      renderPivotCanvas();
    });

    pivotFramesGrid.appendChild(card);
  });
}

function updatePivotInputsUI() {
  const p = framePivots[activePivotFrameIdx] || { x: 0.5, y: 0.5 };
  pivotXInput.value = p.x.toFixed(2);
  pivotYInput.value = p.y.toFixed(2);

  document.querySelectorAll('.preset-dot').forEach(dot => {
    const dx = parseFloat(dot.dataset.x);
    const dy = parseFloat(dot.dataset.y);
    if (Math.abs(dx - p.x) < 0.05 && Math.abs(dy - p.y) < 0.05) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function drawTintedFrame(targetCtx, srcCanvas, color, alpha) {
  const offscreen = document.createElement('canvas');
  offscreen.width = srcCanvas.width;
  offscreen.height = srcCanvas.height;
  const oCtx = offscreen.getContext('2d');

  oCtx.drawImage(srcCanvas, 0, 0);
  oCtx.globalCompositeOperation = 'source-in';
  oCtx.fillStyle = color;
  oCtx.fillRect(0, 0, offscreen.width, offscreen.height);

  targetCtx.save();
  targetCtx.globalAlpha = alpha;
  targetCtx.drawImage(offscreen, 0, 0);
  targetCtx.restore();
}

function renderPivotCanvas() {
  if (slicedFrames.length === 0) return;

  const currentFrame = slicedFrames[activePivotFrameIdx];
  pivotCanvas.width = currentFrame.width;
  pivotCanvas.height = currentFrame.height;

  pivotCtx.clearRect(0, 0, pivotCanvas.width, pivotCanvas.height);
  pivotCtx.imageSmoothingEnabled = false;

  if (onionSkinActive && slicedFrames.length > 1) {
    const prevIdx = (activePivotFrameIdx - 1 + slicedFrames.length) % slicedFrames.length;
    drawTintedFrame(pivotCtx, slicedFrames[prevIdx], '#FF4D6D', 0.45);

    const nextIdx = (activePivotFrameIdx + 1) % slicedFrames.length;
    drawTintedFrame(pivotCtx, slicedFrames[nextIdx], '#38B6FF', 0.45);
  }

  pivotCtx.drawImage(currentFrame, 0, 0);

  const p = framePivots[activePivotFrameIdx] || { x: 0.5, y: 0.5 };
  const px = p.x * pivotCanvas.width;
  const py = p.y * pivotCanvas.height;

  drawPivotCrosshair(px, py);
}

function drawPivotCrosshair(px, py) {
  const w = pivotCanvas.width;
  const h = pivotCanvas.height;
  const fadeLength = Math.max(w, h) * 0.7;

  pivotCtx.save();
  pivotCtx.lineWidth = 2.5;
  pivotCtx.setLineDash([4, 4]);

  const gradLeft = pivotCtx.createLinearGradient(px, py, px - fadeLength, py);
  gradLeft.addColorStop(0, '#FF3B5C');
  gradLeft.addColorStop(1, 'rgba(255, 59, 92, 0)');
  pivotCtx.strokeStyle = gradLeft;
  pivotCtx.beginPath();
  pivotCtx.moveTo(px, py);
  pivotCtx.lineTo(0, py);
  pivotCtx.stroke();

  const gradRight = pivotCtx.createLinearGradient(px, py, px + fadeLength, py);
  gradRight.addColorStop(0, '#FF3B5C');
  gradRight.addColorStop(1, 'rgba(255, 59, 92, 0)');
  pivotCtx.strokeStyle = gradRight;
  pivotCtx.beginPath();
  pivotCtx.moveTo(px, py);
  pivotCtx.lineTo(w, py);
  pivotCtx.stroke();

  const gradTop = pivotCtx.createLinearGradient(px, py, px, py - fadeLength);
  gradTop.addColorStop(0, '#FF3B5C');
  gradTop.addColorStop(1, 'rgba(255, 59, 92, 0)');
  pivotCtx.strokeStyle = gradTop;
  pivotCtx.beginPath();
  pivotCtx.moveTo(px, py);
  pivotCtx.lineTo(px, 0);
  pivotCtx.stroke();

  const gradBottom = pivotCtx.createLinearGradient(px, py, px, py + fadeLength);
  gradBottom.addColorStop(0, '#FF3B5C');
  gradBottom.addColorStop(1, 'rgba(255, 59, 92, 0)');
  pivotCtx.strokeStyle = gradBottom;
  pivotCtx.beginPath();
  pivotCtx.moveTo(px, py);
  pivotCtx.lineTo(px, h);
  pivotCtx.stroke();

  pivotCtx.setLineDash([]);
  pivotCtx.beginPath();
  pivotCtx.arc(px, py, 11, 0, Math.PI * 2);
  pivotCtx.strokeStyle = '#FF3B5C';
  pivotCtx.lineWidth = 3.5;
  pivotCtx.fillStyle = '#FFFFFF';
  pivotCtx.fill();
  pivotCtx.stroke();

  pivotCtx.beginPath();
  pivotCtx.arc(px, py, 3, 0, Math.PI * 2);
  pivotCtx.fillStyle = '#FF3B5C';
  pivotCtx.fill();

  pivotCtx.restore();
}

function handlePivotPointer(e) {
  const rect = pivotCanvas.getBoundingClientRect();
  const scaleX = pivotCanvas.width / rect.width;
  const scaleY = pivotCanvas.height / rect.height;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  const normX = Math.max(0, Math.min(1, x / pivotCanvas.width));
  const normY = Math.max(0, Math.min(1, y / pivotCanvas.height));

  framePivots[activePivotFrameIdx] = { x: normX, y: normY };
  updatePivotInputsUI();
  renderPivotCanvas();
}

pivotCanvas.addEventListener('pointerdown', (e) => {
  isDraggingPivot = true;
  handlePivotPointer(e);
});

window.addEventListener('pointermove', (e) => {
  if (isDraggingPivot) handlePivotPointer(e);
});

window.addEventListener('pointerup', () => {
  isDraggingPivot = false;
});

pivotXInput.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value) || 0;
  framePivots[activePivotFrameIdx].x = Math.max(0, Math.min(1, val));
  renderPivotCanvas();
});

pivotYInput.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value) || 0;
  framePivots[activePivotFrameIdx].y = Math.max(0, Math.min(1, val));
  renderPivotCanvas();
});

toggleOnionSkinBtn.addEventListener('click', () => {
  onionSkinActive = !onionSkinActive;
  toggleOnionSkinBtn.classList.toggle('active-onion', onionSkinActive);
  renderPivotCanvas();
});

openPivotPresetsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isHidden = pivotPresetsPopup.style.display === 'none';
  pivotPresetsPopup.style.display = isHidden ? 'flex' : 'none';
});

document.addEventListener('click', (e) => {
  if (!pivotPresetsPopup.contains(e.target) && e.target !== openPivotPresetsBtn) {
    pivotPresetsPopup.style.display = 'none';
  }
});

document.querySelectorAll('.preset-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    const dx = parseFloat(dot.dataset.x);
    const dy = parseFloat(dot.dataset.y);
    framePivots[activePivotFrameIdx] = { x: dx, y: dy };
    updatePivotInputsUI();
    renderPivotCanvas();
    pivotPresetsPopup.style.display = 'none';
  });
});

savePivotBtn.addEventListener('click', () => {
  pivotEditorModal.classList.remove('active');
  backupPivots = [];
});

cancelPivotBtn.addEventListener('click', () => {
  if (backupPivots.length > 0) {
    framePivots = backupPivots.map(p => ({ ...p }));
  }
  pivotEditorModal.classList.remove('active');
});

// --- 5. منطق استخراج الفريمات من الفيديو ---
const videoUpload = document.getElementById('videoUpload');
const videoDropZone = document.getElementById('videoDropZone');
const videoEmptyNotice = document.getElementById('videoEmptyNotice');
const videoPlayerWrapper = document.getElementById('videoPlayerWrapper');
const mainVideoPlayer = document.getElementById('mainVideoPlayer');

const vidDurationBadge = document.getElementById('vidDurationBadge');
const vidResBadge = document.getElementById('vidResBadge');
const vidEstFramesBadge = document.getElementById('vidEstFramesBadge');

const videoFpsInput = document.getElementById('videoFpsInput');
const videoFpsVal = document.getElementById('videoFpsVal');
const videoMaxFramesInput = document.getElementById('videoMaxFramesInput');
const videoMaxFramesVal = document.getElementById('videoMaxFramesVal');

const extractGifBtn = document.getElementById('extractGifBtn');
const extractZipBtn = document.getElementById('extractZipBtn');
const transferVidToCollageBtn = document.getElementById('transferVidToCollageBtn');

let currentVideoFile = null;

videoDropZone.addEventListener('click', (e) => {
  if (e.target === mainVideoPlayer) return;
  videoUpload.click();
});

videoUpload.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    currentVideoFile = e.target.files[0];
    const videoUrl = URL.createObjectURL(currentVideoFile);
    mainVideoPlayer.src = videoUrl;

    mainVideoPlayer.onloadedmetadata = () => {
      videoEmptyNotice.style.display = 'none';
      videoPlayerWrapper.style.display = 'flex';
      extractGifBtn.disabled = false;
      extractZipBtn.disabled = false;
      transferVidToCollageBtn.disabled = false;

      vidDurationBadge.textContent = `${mainVideoPlayer.duration.toFixed(1)} ثانية`;
      vidResBadge.textContent = `${mainVideoPlayer.videoWidth}x${mainVideoPlayer.videoHeight}`;
      updateEstimatedFrames();
    };
  }
});

function updateEstimatedFrames() {
  if (!mainVideoPlayer.duration) return;
  const fps = parseInt(videoFpsInput.value);
  const max = parseInt(videoMaxFramesInput.value);
  const est = Math.min(Math.floor(mainVideoPlayer.duration * fps), max);
  vidEstFramesBadge.textContent = `${est} فريم`;
}

videoFpsInput.addEventListener('input', (e) => {
  videoFpsVal.textContent = `${e.target.value} FPS`;
  updateEstimatedFrames();
});

videoMaxFramesInput.addEventListener('input', (e) => {
  videoMaxFramesVal.textContent = e.target.value;
  updateEstimatedFrames();
});

async function extractFramesAsync() {
  if (!currentVideoFile) return [];

  const fps = parseInt(videoFpsInput.value) || 10;
  const maxFrames = parseInt(videoMaxFramesInput.value) || 80;
  
  showProgress('جاري قراءة واستخراج فريمات الفيديو...');

  return new Promise((resolve) => {
    const tempVideo = document.createElement('video');
    tempVideo.src = URL.createObjectURL(currentVideoFile);
    tempVideo.muted = true;
    tempVideo.playsInline = true;

    tempVideo.onloadedmetadata = async () => {
      const duration = tempVideo.duration;
      const interval = 1 / fps;
      const totalFrames = Math.min(Math.floor(duration * fps), maxFrames);

      const canvas = document.createElement('canvas');
      canvas.width = tempVideo.videoWidth;
      canvas.height = tempVideo.videoHeight;
      const tempCtx = canvas.getContext('2d');

      const extracted = [];
      let currentTime = 0;

      for (let i = 0; i < totalFrames; i++) {
        tempVideo.currentTime = currentTime;
        await new Promise(r => { tempVideo.onseeked = r; });

        tempCtx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = canvas.width;
        frameCanvas.height = canvas.height;
        frameCanvas.getContext('2d').drawImage(canvas, 0, 0);
        extracted.push(frameCanvas);

        currentTime += interval;
        if (currentTime > duration) break;
        updateProgress(Math.round(((i + 1) / totalFrames) * 90));
      }

      updateProgress(100);
      resolve(extracted);
    };
  });
}

extractGifBtn.addEventListener('click', async () => {
  const frames = await extractFramesAsync();
  if (frames.length === 0) {
    hideProgress();
    return;
  }

  showProgress('جاري تركيب وتحويل ملف GIF...');
  const imagesBase64 = frames.map(f => f.toDataURL('image/png'));
  const fps = parseInt(videoFpsInput.value) || 10;

  window.gifshot.createGIF({
    images: imagesBase64,
    gifWidth: Math.min(frames[0].width, 600),
    gifHeight: Math.min(frames[0].height, (frames[0].height * (600 / frames[0].width))),
    interval: 1 / fps,
    numWorkers: 4
  }, function (obj) {
    if (!obj.error) {
      const a = document.createElement('a');
      a.href = obj.image;
      a.download = 'video_animation.gif';
      a.click();
    } else {
      alert('حدث خطأ أثناء إنشاء الـ GIF');
    }
    hideProgress();
  });
});

extractZipBtn.addEventListener('click', async () => {
  const frames = await extractFramesAsync();
  if (frames.length === 0) {
    hideProgress();
    return;
  }

  showProgress('جاري ضغط ملفات PNG...');
  const zip = new JSZip();
  const folder = zip.folder("video_frames");

  frames.forEach((fCanvas, idx) => {
    const dataUrl = fCanvas.toDataURL('image/png').split(',')[1];
    folder.file(`frame_${String(idx + 1).padStart(4, '0')}.png`, dataUrl, { base64: true });
  });

  const content = await zip.generateAsync({ type: "blob" }, (meta) => {
    updateProgress(Math.round(meta.percent));
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = 'video_frames.zip';
  a.click();
  hideProgress();
});

transferVidToCollageBtn.addEventListener('click', async () => {
  const frames = await extractFramesAsync();
  if (frames.length === 0) {
    hideProgress();
    return;
  }

  const loadPromises = frames.map(frameCanvas => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img: img });
      img.src = frameCanvas.toDataURL('image/png');
    });
  });

  const importedImages = await Promise.all(loadPromises);
  images.push(...importedImages);
  hideProgress();

  tabCollageBtn.click();
  updateUIState();
  generatePreview(0.5);
});
