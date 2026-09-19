// ==========================================
// 1. إدارة PWA والواجهة العامة
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration error:', err));
  });
}

let deferredPrompt = null;
const installPwaBtn = document.getElementById('installPwaBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installPwaBtn) installPwaBtn.style.display = 'flex';
});

if (installPwaBtn) {
  installPwaBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') installPwaBtn.style.display = 'none';
    deferredPrompt = null;
  });
}

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

function setupDropZone(dropZoneElem, inputElem, onFiles) {
  dropZoneElem.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZoneElem.classList.add('drag-over');
  });
  dropZoneElem.addEventListener('dragleave', () => {
    dropZoneElem.classList.remove('drag-over');
  });
  dropZoneElem.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZoneElem.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      onFiles(e.dataTransfer.files);
    }
  });
  dropZoneElem.addEventListener('click', (e) => {
    if (e.target.tagName !== 'CANVAS' && e.target.tagName !== 'VIDEO') {
      inputElem.click();
    }
  });
}

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
  if (headerExportGroup) {
    headerExportGroup.style.visibility = (activeView === collageView) ? 'visible' : 'hidden';
  }
}

tabCollageBtn.addEventListener('click', () => switchTab(tabCollageBtn, collageView));
tabSpriteBtn.addEventListener('click', () => switchTab(tabSpriteBtn, spriteView));
tabVideoBtn.addEventListener('click', () => switchTab(tabVideoBtn, videoView));

const themeToggleBtn = document.getElementById('themeToggleBtn');
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});

document.getElementById('fullScreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
});

// ==========================================
// 2. استوديو التجميع (Collage Studio - Fill Container)
// ==========================================
let images = [];
let isCollageSelectMode = false;
let selectedCollageIndices = new Set();
let collagePositions = [];

const imgUpload = document.getElementById('imgUpload');
const dropZone = document.getElementById('dropZone');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
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

const collageSelectModeBtn = document.getElementById('collageSelectModeBtn');
const collageSelectActions = document.getElementById('collageSelectActions');
const collageDeleteSelectedBtn = document.getElementById('collageDeleteSelectedBtn');
const collageCancelSelectBtn = document.getElementById('collageCancelSelectBtn');
const collageSelectCountBadge = document.getElementById('collageSelectCountBadge');

document.getElementById('collageImportTrigger').addEventListener('click', () => imgUpload.click());
setupDropZone(dropZone, imgUpload, (files) => handleCollageFiles(files));
imgUpload.addEventListener('change', (e) => handleCollageFiles(e.target.files));

async function handleCollageFiles(files) {
  if (!files || files.length === 0) return;
  const imgFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  const promises = imgFiles.map(file => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve({ img }); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  });
  const loaded = await Promise.all(promises);
  images.push(...loaded.filter(Boolean));
  imgUpload.value = '';
  updateCollageUIState();
  generateCollagePreview(1);
}

imgSizeInput.addEventListener('input', (e) => { imgSizeNum.value = e.target.value; generateCollagePreview(1); });
imgSizeNum.addEventListener('input', (e) => { imgSizeInput.value = parseInt(e.target.value) || 50; generateCollagePreview(1); });
columnsInput.addEventListener('input', (e) => { columnsVal.textContent = e.target.value; generateCollagePreview(1); });
imgGapInput.addEventListener('input', (e) => { imgGapVal.textContent = `${e.target.value}px`; generateCollagePreview(1); });
strokeWidthInput.addEventListener('input', (e) => { strokeWidthVal.textContent = `${e.target.value}px`; generateCollagePreview(1); });
strokeColorInput.addEventListener('input', () => generateCollagePreview(1));

function updateCollageUIState() {
  if (images.length > 0) {
    emptyNotice.style.display = 'none';
    previewCanvas.style.display = 'block';
  } else {
    emptyNotice.style.display = 'flex';
    previewCanvas.style.display = 'none';
  }
  imageCounter.textContent = `${images.length} صور`;
}

// خوارزمية التجميع المتكيفة (تأخذ الأعمدة الفعلية وتتمدد لملء الحاوية بالكامل)
function generateCollagePreview(quality) {
  if (images.length === 0) {
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    return;
  }

  const baseSize = parseInt(imgSizeNum.value) || 300;
  const userColumns = parseInt(columnsInput.value) || 3;
  // استخدام الأعمدة الفعلية إذا كان عدد الصور أقل لمنع الفراغات الجانبية
  const columns = Math.min(images.length, userColumns) || 1;
  const gap = parseInt(imgGapInput.value) || 0;
  const strokeWidth = parseInt(strokeWidthInput.value) || 0;
  const strokeColor = strokeColorInput.value || '#FF3B5C';

  const cellWidth = baseSize * quality;
  const cellHeights = images.map(item => (cellWidth / item.img.width) * item.img.height);
  const groups = Array.from({ length: columns }, () => 0);
  const positions = Array.from({ length: images.length }, () => 0);

  const effGap = gap * quality;
  const effStroke = strokeWidth * quality;

  for (let i = 0; i < images.length; i++) {
    const imageHeight = cellHeights[i];
    const groupIndex = i % columns; 
    const x = groupIndex * (cellWidth + effGap) + effStroke / 2;
    const y = groups[groupIndex] + effStroke / 2;
    positions[i] = { x, y, w: cellWidth, h: imageHeight };
    groups[groupIndex] += imageHeight + effGap;
  }

  collagePositions = positions;
  const maxHeight = Math.max(...groups) - effGap + effStroke;
  const totalWidth = columns * (cellWidth + effGap) - effGap + effStroke;
  
  previewCanvas.width = Math.max(10, totalWidth);
  previewCanvas.height = Math.max(10, maxHeight);

  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.fillStyle = "#FFFFFF";
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  images.forEach((imageObj, index) => {
    const pos = positions[index];
    previewCtx.drawImage(imageObj.img, pos.x, pos.y, pos.w, pos.h);
    
    if (strokeWidth > 0) {
      previewCtx.lineWidth = effStroke;
      previewCtx.strokeStyle = strokeColor;
      previewCtx.strokeRect(pos.x, pos.y, pos.w, pos.h);
    }

    if (isCollageSelectMode && selectedCollageIndices.has(index)) {
      previewCtx.fillStyle = 'rgba(255, 59, 92, 0.4)';
      previewCtx.fillRect(pos.x, pos.y, pos.w, pos.h);
      previewCtx.strokeStyle = '#FF3B5C';
      previewCtx.lineWidth = 3;
      previewCtx.strokeRect(pos.x, pos.y, pos.w, pos.h);
    }
  });
}

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
      if (selectedCollageIndices.has(i)) selectedCollageIndices.delete(i);
      else selectedCollageIndices.add(i);
      break;
    }
  }
  collageSelectCountBadge.textContent = `تم تحديد ${selectedCollageIndices.size} صور`;
  generateCollagePreview(1);
});

collageSelectModeBtn.addEventListener('click', () => {
  if (images.length === 0) return;
  isCollageSelectMode = true;
  selectedCollageIndices.clear();
  collageSelectModeBtn.style.display = 'none';
  collageSelectActions.style.display = 'flex';
  previewCanvas.classList.add('selecting');
  collageSelectCountBadge.textContent = `تم تحديد 0 صور`;
  generateCollagePreview(1);
});

collageCancelSelectBtn.addEventListener('click', exitCollageSelectMode);
collageDeleteSelectedBtn.addEventListener('click', () => {
  if (selectedCollageIndices.size > 0) {
    images = images.filter((_, idx) => !selectedCollageIndices.has(idx));
  }
  exitCollageSelectMode();
  updateCollageUIState();
  generateCollagePreview(1);
});

function exitCollageSelectMode() {
  isCollageSelectMode = false;
  selectedCollageIndices.clear();
  collageSelectModeBtn.style.display = 'flex';
  collageSelectActions.style.display = 'none';
  previewCanvas.classList.remove('selecting');
  generateCollagePreview(1);
}

document.getElementById('clearBtn').addEventListener('click', () => {
  images = [];
  imgUpload.value = '';
  exitCollageSelectMode();
  updateCollageUIState();
  generateCollagePreview(1);
});

document.getElementById('exportPNGBtn').addEventListener('click', () => {
  if (images.length === 0) return;
  generateCollagePreview(1);
  const a = document.createElement('a');
  a.href = previewCanvas.toDataURL('image/png');
  a.download = 'collage.png';
  a.click();
});

document.getElementById('exportPDFBtn').addEventListener('click', () => {
  if (images.length === 0) return;
  const { jsPDF } = window.jspdf;
  generateCollagePreview(1);
  const isLandscape = previewCanvas.width > previewCanvas.height;
  const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'px', [previewCanvas.width, previewCanvas.height]);
  pdf.addImage(previewCanvas.toDataURL('image/png'), 'PNG', 0, 0, previewCanvas.width, previewCanvas.height);
  pdf.save('collage.pdf');
});

// ==========================================
// 3. استوديو السبرايت (Sprite Studio)
// ==========================================
let spriteImage = null;
let slicedFrames = [];
let framePivots = [];
let isPlaying = false;
let currentFrameIndex = 0;
let animInterval = null;

let isEditMode = false;
let selectedFrameIndex = null;
let backupFrames = [];

let isSpriteDeleteMode = false;
let selectedSpriteDeleteFrames = new Set();

const spriteUpload = document.getElementById('spriteUpload');
const spriteDropZone = document.getElementById('spriteDropZone');
const spriteCanvas = document.getElementById('spriteCanvas');
const spriteCtx = spriteCanvas.getContext('2d');
const spriteCanvasWrapper = document.getElementById('spriteCanvasWrapper');
const spriteColsInput = document.getElementById('spriteCols');
const spriteColsVal = document.getElementById('spriteColsVal');
const spriteRowsInput = document.getElementById('spriteRows');
const spriteRowsVal = document.getElementById('spriteRowsVal');
const fpsInput = document.getElementById('fpsInput');
const fpsVal = document.getElementById('fpsVal');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const animCanvas = document.getElementById('animCanvas');
const animCtx = animCanvas.getContext('2d');

const editSpriteOrderBtn = document.getElementById('editSpriteOrderBtn');
const editModeActions = document.getElementById('editModeActions');
const confirmSpriteOrderBtn = document.getElementById('confirmSpriteOrderBtn');
const cancelSpriteOrderBtn = document.getElementById('cancelSpriteOrderBtn');

const spriteSelectDeleteBtn = document.getElementById('spriteSelectDeleteBtn');
const spriteDeleteActions = document.getElementById('spriteDeleteActions');
const confirmSpriteDeleteBtn = document.getElementById('confirmSpriteDeleteBtn');
const cancelSpriteDeleteBtn = document.getElementById('cancelSpriteDeleteBtn');
const spriteDeleteCountBadge = document.getElementById('spriteDeleteCountBadge');

document.getElementById('spriteImportTrigger').addEventListener('click', () => spriteUpload.click());
setupDropZone(spriteDropZone, spriteUpload, (files) => loadSpriteFile(files[0]));
spriteUpload.addEventListener('change', (e) => loadSpriteFile(e.target.files[0]));

function loadSpriteFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    spriteImage = img;
    
    // إظهار الكانفاسات والتأكد من أنها block
    document.getElementById('spriteEmptyNotice').style.display = 'none';
    spriteCanvasWrapper.style.display = 'flex';
    spriteCanvas.style.display = 'block';
    animCanvas.style.display = 'block';

    ['playPauseBtn', 'openPivotEditorBtn', 'exportSpriteMp4Btn', 'exportSpriteGifBtn', 
     'exportZipBtn', 'transferToCollageBtn', 'editSpriteOrderBtn', 'spriteSelectDeleteBtn'].forEach(id => {
      document.getElementById(id).disabled = false;
    });

    exitEditMode(false);
    exitSpriteDeleteMode();
    updateSpriteGrid();
  };
  img.src = url;
}

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
  if (isPlaying) { stopAnimation(); startAnimation(); }
});

playPauseBtn.addEventListener('click', () => {
  if (isPlaying) stopAnimation();
  else startAnimation();
});

function updateSpriteGrid() {
  if (!spriteImage) return;
  const cols = parseInt(spriteColsInput.value) || 1;
  const rows = parseInt(spriteRowsInput.value) || 1;
  document.getElementById('totalFramesBadge').textContent = `إجمالي الإطارات: ${cols * rows}`;

  const cellWidth = spriteImage.width / cols;
  const cellHeight = spriteImage.height / rows;

  slicedFrames = [];
  framePivots = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fCanvas = document.createElement('canvas');
      fCanvas.width = cellWidth;
      fCanvas.height = cellHeight;
      const fCtx = fCanvas.getContext('2d');
      fCtx.drawImage(spriteImage, c * cellWidth, r * cellHeight, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
      slicedFrames.push(fCanvas);
      framePivots.push({ x: 0.5, y: 0.5 });
    }
  }

  currentFrameIndex = 0;
  renderSpriteCanvas();
  drawAnimFrame();
}

function renderSpriteCanvas() {
  if (!spriteImage || slicedFrames.length === 0) return;
  const cols = parseInt(spriteColsInput.value) || 1;
  const rows = parseInt(spriteRowsInput.value) || 1;
  spriteCanvas.width = spriteImage.width;
  spriteCanvas.height = spriteImage.height;

  const cellWidth = spriteCanvas.width / cols;
  const cellHeight = spriteCanvas.height / rows;

  spriteCtx.clearRect(0, 0, spriteCanvas.width, spriteCanvas.height);

  for (let i = 0; i < slicedFrames.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    if (slicedFrames[i]) {
      spriteCtx.drawImage(slicedFrames[i], c * cellWidth, r * cellHeight, cellWidth, cellHeight);
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
      spriteCtx.lineWidth = 3;
      spriteCtx.strokeRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);
    }
  }

  // خطوط الشبكة
  spriteCtx.strokeStyle = '#FF3B5C';
  spriteCtx.lineWidth = 1.5;
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
    spriteCtx.lineWidth = 3;
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
  const clickedIdx = row * cols + col;
  if (clickedIdx >= slicedFrames.length) return;

  if (isSpriteDeleteMode) {
    if (selectedSpriteDeleteFrames.has(clickedIdx)) selectedSpriteDeleteFrames.delete(clickedIdx);
    else selectedSpriteDeleteFrames.add(clickedIdx);
    spriteDeleteCountBadge.textContent = `تم تحديد ${selectedSpriteDeleteFrames.size} فريم`;
  } else if (isEditMode) {
    if (selectedFrameIndex === null) {
      selectedFrameIndex = clickedIdx;
    } else if (selectedFrameIndex === clickedIdx) {
      selectedFrameIndex = null;
    } else {
      const tmpFrame = slicedFrames[selectedFrameIndex];
      slicedFrames[selectedFrameIndex] = slicedFrames[clickedIdx];
      slicedFrames[clickedIdx] = tmpFrame;

      const tmpPivot = framePivots[selectedFrameIndex];
      framePivots[selectedFrameIndex] = framePivots[clickedIdx];
      framePivots[clickedIdx] = tmpPivot;

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

confirmSpriteOrderBtn.addEventListener('click', () => exitEditMode(true));
cancelSpriteOrderBtn.addEventListener('click', () => {
  if (backupFrames.length > 0) slicedFrames = [...backupFrames];
  exitEditMode(false);
});

function exitEditMode(save) {
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

cancelSpriteDeleteBtn.addEventListener('click', exitSpriteDeleteMode);
confirmSpriteDeleteBtn.addEventListener('click', () => {
  if (selectedSpriteDeleteFrames.size > 0) {
    slicedFrames = slicedFrames.filter((_, idx) => !selectedSpriteDeleteFrames.has(idx));
    framePivots = framePivots.filter((_, idx) => !selectedSpriteDeleteFrames.has(idx));
    document.getElementById('totalFramesBadge').textContent = `إجمالي الإطارات: ${slicedFrames.length}`;
    currentFrameIndex = 0;
  }
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

// تصدير GIF للسبرايت
document.getElementById('exportSpriteGifBtn').addEventListener('click', () => {
  if (slicedFrames.length === 0) return;
  showProgress('جاري إنشاء ملف الـ GIF...');
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
      alert('حدث خطأ أثناء تصدير الـ GIF');
    }
    hideProgress();
  });
});

// تصدير MP4 للسبرايت
document.getElementById('exportSpriteMp4Btn').addEventListener('click', async () => {
  if (slicedFrames.length === 0) return;
  showProgress('جاري تصدير الفيديو...');
  const fps = parseInt(fpsInput.value) || 12;

  const recCanvas = document.createElement('canvas');
  recCanvas.width = slicedFrames[0].width;
  recCanvas.height = slicedFrames[0].height;
  const recCtx = recCanvas.getContext('2d');

  const stream = recCanvas.captureStream(fps);
  let mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
  let recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start();

  for (let i = 0; i < slicedFrames.length; i++) {
    recCtx.clearRect(0, 0, recCanvas.width, recCanvas.height);
    recCtx.drawImage(slicedFrames[i], 0, 0);
    updateProgress(Math.round(((i + 1) / slicedFrames.length) * 100));
    await new Promise(r => setTimeout(r, 1000 / fps));
  }

  recorder.stop();
  await new Promise(r => recorder.onstop = r);

  const blob = new Blob(chunks, { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = mimeType === 'video/mp4' ? 'sprite_animation.mp4' : 'sprite_animation.webm';
  a.click();
  URL.revokeObjectURL(url);
  hideProgress();
});

// تصدير ZIP
document.getElementById('exportZipBtn').addEventListener('click', async () => {
  if (slicedFrames.length === 0) return;
  showProgress('جاري تجميع وضغط الإطارات...');
  const zip = new JSZip();
  const folder = zip.folder("sprite_frames");

  for (let i = 0; i < slicedFrames.length; i++) {
    const blob = await new Promise(r => slicedFrames[i].toBlob(r, 'image/png'));
    folder.file(`frame_${String(i + 1).padStart(3, '0')}.png`, blob);
    updateProgress(Math.round(((i + 1) / slicedFrames.length) * 60));
  }

  const content = await zip.generateAsync({ type: "blob" }, (meta) => {
    updateProgress(60 + Math.round(meta.percent * 0.4));
  });

  const a = document.createElement('a');
  const url = URL.createObjectURL(content);
  a.href = url;
  a.download = 'sprite_frames.zip';
  a.click();
  URL.revokeObjectURL(url);
  hideProgress();
});

// نقل إلى التجميع
document.getElementById('transferToCollageBtn').addEventListener('click', async () => {
  if (slicedFrames.length === 0) return;
  const loaded = await Promise.all(slicedFrames.map(fCanvas => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img });
      img.src = fCanvas.toDataURL();
    });
  }));
  images.push(...loaded);
  updateCollageUIState();
  generateCollagePreview(1);
  switchTab(tabCollageBtn, collageView);
});

// ==========================================
// 4. محرك محرر البيفوت (Pivot Editor)
// ==========================================
let activePivotFrameIdx = 0;
let onionSkinActive = true;
let isDraggingPivot = false;
let backupPivots = [];
let zoomScale = 1;

const pivotEditorModal = document.getElementById('pivotEditorModal');
const pivotCanvas = document.getElementById('pivotCanvas');
const pivotCtx = pivotCanvas.getContext('2d');
const pivotFramesGrid = document.getElementById('pivotFramesGrid');
const pivotContainer = document.getElementById('pivotCanvasContainer');

const pivotXInput = document.getElementById('pivotXInput');
const pivotYInput = document.getElementById('pivotYInput');
const toggleOnionSkinBtn = document.getElementById('toggleOnionSkinBtn');
const openPivotPresetsBtn = document.getElementById('openPivotPresetsBtn');
const pivotPresetsPopup = document.getElementById('pivotPresetsPopup');
const savePivotBtn = document.getElementById('savePivotBtn');
const cancelPivotBtn = document.getElementById('cancelPivotBtn');
const resetPivotZoomBtn = document.getElementById('resetPivotZoomBtn');
const exportPivotJsonBtn = document.getElementById('exportPivotJsonBtn');

document.getElementById('openPivotEditorBtn').addEventListener('click', () => {
  if (slicedFrames.length === 0) return;
  if (isPlaying) stopAnimation();

  backupPivots = framePivots.map(p => ({ ...p }));
  activePivotFrameIdx = 0;
  zoomScale = 1;

  pivotEditorModal.classList.add('active');
  buildPivotFramesGrid();
  renderPivotCanvas();
  updatePivotInputsUI();
});

pivotContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  zoomScale = Math.min(Math.max(0.5, zoomScale * zoomFactor), 15);
  pivotCanvas.style.transform = `scale(${zoomScale})`;
}, { passive: false });

resetPivotZoomBtn.addEventListener('click', () => {
  zoomScale = 1;
  pivotCanvas.style.transform = `scale(1)`;
});

function buildPivotFramesGrid() {
  pivotFramesGrid.innerHTML = '';
  slicedFrames.forEach((fCanvas, idx) => {
    const card = document.createElement('div');
    card.className = `pivot-frame-thumb-card ${idx === activePivotFrameIdx ? 'active-thumb' : ''}`;
    
    const mini = document.createElement('canvas');
    mini.width = fCanvas.width;
    mini.height = fCanvas.height;
    mini.getContext('2d').drawImage(fCanvas, 0, 0);

    const num = document.createElement('span');
    num.className = 'thumb-number';
    num.textContent = idx + 1;

    card.appendChild(mini);
    card.appendChild(num);

    card.onclick = () => {
      activePivotFrameIdx = idx;
      document.querySelectorAll('.pivot-frame-thumb-card').forEach(c => c.classList.remove('active-thumb'));
      card.classList.add('active-thumb');
      updatePivotInputsUI();
      renderPivotCanvas();
    };

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
    if (Math.abs(dx - p.x) < 0.05 && Math.abs(dy - p.y) < 0.05) dot.classList.add('active');
    else dot.classList.remove('active');
  });
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
    drawTintedFrame(pivotCtx, slicedFrames[prevIdx], '#FF4D6D', 0.4);
    const nextIdx = (activePivotFrameIdx + 1) % slicedFrames.length;
    drawTintedFrame(pivotCtx, slicedFrames[nextIdx], '#38B6FF', 0.4);
  }

  pivotCtx.drawImage(currentFrame, 0, 0);

  const p = framePivots[activePivotFrameIdx] || { x: 0.5, y: 0.5 };
  const px = p.x * pivotCanvas.width;
  const py = p.y * pivotCanvas.height;

  pivotCtx.beginPath();
  pivotCtx.arc(px, py, 6, 0, Math.PI * 2);
  pivotCtx.fillStyle = '#FF3B5C';
  pivotCtx.fill();
  pivotCtx.lineWidth = 2;
  pivotCtx.strokeStyle = '#FFFFFF';
  pivotCtx.stroke();
}

function drawTintedFrame(targetCtx, srcCanvas, color, alpha) {
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
}

function handlePivotPointer(e) {
  const rect = pivotCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  framePivots[activePivotFrameIdx] = {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y))
  };

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

window.addEventListener('pointerup', () => { isDraggingPivot = false; });

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
    framePivots[activePivotFrameIdx] = {
      x: parseFloat(dot.dataset.x),
      y: parseFloat(dot.dataset.y)
    };
    updatePivotInputsUI();
    renderPivotCanvas();
    pivotPresetsPopup.style.display = 'none';
  });
});

savePivotBtn.addEventListener('click', () => {
  pivotEditorModal.classList.remove('active');
});

cancelPivotBtn.addEventListener('click', () => {
  if (backupPivots.length > 0) {
    framePivots = backupPivots.map(p => ({ ...p }));
  }
  pivotEditorModal.classList.remove('active');
});

exportPivotJsonBtn.addEventListener('click', () => {
  if (slicedFrames.length === 0) return;
  const exportData = {
    meta: {
      app: "Media & Sprite Studio",
      frameCount: slicedFrames.length,
      frameWidth: slicedFrames[0].width,
      frameHeight: slicedFrames[0].height
    },
    frames: framePivots.map((pivot, idx) => ({
      index: idx + 1,
      pivot: { x: parseFloat(pivot.x.toFixed(3)), y: parseFloat(pivot.y.toFixed(3)) },
      pixelPivot: {
        x: Math.round(pivot.x * slicedFrames[0].width),
        y: Math.round(pivot.y * slicedFrames[0].height)
      }
    }))
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sprite_pivots.json';
  a.click();
  URL.revokeObjectURL(url);
});

// ==========================================
// 5. استخراج الفريمات من الفيديو
// ==========================================
const videoUpload = document.getElementById('videoUpload');
const videoDropZone = document.getElementById('videoDropZone');
const mainVideoPlayer = document.getElementById('mainVideoPlayer');
const vidDurationBadge = document.getElementById('vidDurationBadge');
const vidResBadge = document.getElementById('vidResBadge');
const vidEstFramesBadge = document.getElementById('vidEstFramesBadge');

const videoFpsInput = document.getElementById('videoFpsInput');
const videoFpsVal = document.getElementById('videoFpsVal');
const videoMaxFramesInput = document.getElementById('videoMaxFramesInput');
const videoMaxFramesVal = document.getElementById('videoMaxFramesVal');

let currentVideoFile = null;
let currentVideoObjectUrl = null;

document.getElementById('videoImportTrigger').addEventListener('click', () => videoUpload.click());
setupDropZone(videoDropZone, videoUpload, (files) => loadVideoFile(files[0]));
videoUpload.addEventListener('change', (e) => loadVideoFile(e.target.files[0]));

function loadVideoFile(file) {
  if (!file || !file.type.startsWith('video/')) return;
  currentVideoFile = file;

  if (currentVideoObjectUrl) URL.revokeObjectURL(currentVideoObjectUrl);
  currentVideoObjectUrl = URL.createObjectURL(file);
  mainVideoPlayer.src = currentVideoObjectUrl;

  mainVideoPlayer.onloadedmetadata = () => {
    document.getElementById('videoEmptyNotice').style.display = 'none';
    document.getElementById('videoPlayerWrapper').style.display = 'flex';
    ['extractGifBtn', 'extractZipBtn', 'transferVidToCollageBtn'].forEach(id => {
      document.getElementById(id).disabled = false;
    });

    vidDurationBadge.textContent = `${mainVideoPlayer.duration.toFixed(1)} ثانية`;
    vidResBadge.textContent = `${mainVideoPlayer.videoWidth}x${mainVideoPlayer.videoHeight}`;
    updateEstimatedFrames();
  };
}

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

async function extractVideoFramesAsync() {
  if (!currentVideoFile) return [];
  const fps = parseInt(videoFpsInput.value) || 10;
  const maxFrames = parseInt(videoMaxFramesInput.value) || 80;

  showProgress('جاري استخراج الفريمات بأعلى دقة...');

  return new Promise((resolve) => {
    const tempVideo = document.createElement('video');
    const tempUrl = URL.createObjectURL(currentVideoFile);
    tempVideo.src = tempUrl;
    tempVideo.muted = true;
    tempVideo.playsInline = true;

    tempVideo.onloadedmetadata = async () => {
      const duration = tempVideo.duration;
      const interval = 1 / fps;
      const totalFrames = Math.min(Math.floor(duration * fps), maxFrames);

      const canvas = document.createElement('canvas');
      canvas.width = tempVideo.videoWidth;
      canvas.height = tempVideo.videoHeight;
      const ctx = canvas.getContext('2d');

      const extracted = [];
      let currentTime = 0;

      for (let i = 0; i < totalFrames; i++) {
        tempVideo.currentTime = currentTime;

        await new Promise((r) => {
          let doneOnce = false;
          const handler = () => { if (!doneOnce) { doneOnce = true; tempVideo.removeEventListener('seeked', handler); r(); } };
          tempVideo.addEventListener('seeked', handler);
          setTimeout(handler, 400);
        });

        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        const fCanvas = document.createElement('canvas');
        fCanvas.width = canvas.width;
        fCanvas.height = canvas.height;
        fCanvas.getContext('2d').drawImage(canvas, 0, 0);
        extracted.push(fCanvas);

        currentTime += interval;
        if (currentTime > duration) break;
        updateProgress(Math.round(((i + 1) / totalFrames) * 95));
      }

      URL.revokeObjectURL(tempUrl);
      resolve(extracted);
    };
  });
}

document.getElementById('extractGifBtn').addEventListener('click', async () => {
  const frames = await extractVideoFramesAsync();
  if (frames.length === 0) { hideProgress(); return; }

  showProgress('جاري تركيب الـ GIF...');
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
      a.download = 'video_frames.gif';
      a.click();
    } else {
      alert('حدث خطأ أثناء تركيب الـ GIF');
    }
    hideProgress();
  });
});

document.getElementById('extractZipBtn').addEventListener('click', async () => {
  const frames = await extractVideoFramesAsync();
  if (frames.length === 0) { hideProgress(); return; }

  showProgress('جاري إنشاء أرشيف ZIP...');
  const zip = new JSZip();
  const folder = zip.folder("video_frames");

  for (let i = 0; i < frames.length; i++) {
    const blob = await new Promise(r => frames[i].toBlob(r, 'image/png'));
    folder.file(`frame_${String(i + 1).padStart(4, '0')}.png`, blob);
    updateProgress(Math.round(((i + 1) / frames.length) * 70));
  }

  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement('a');
  const url = URL.createObjectURL(content);
  a.href = url;
  a.download = 'video_frames.zip';
  a.click();
  URL.revokeObjectURL(url);
  hideProgress();
});

document.getElementById('transferVidToCollageBtn').addEventListener('click', async () => {
  const frames = await extractVideoFramesAsync();
  if (frames.length === 0) { hideProgress(); return; }

  const loaded = await Promise.all(frames.map(fCanvas => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img });
      img.src = fCanvas.toDataURL();
    });
  }));

  images.push(...loaded);
  hideProgress();
  updateCollageUIState();
  generateCollagePreview(1);
  switchTab(tabCollageBtn, collageView);
});
