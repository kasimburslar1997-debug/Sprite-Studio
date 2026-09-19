import { setupDropZone, showProgress, updateProgress, hideProgress, switchTab } from './app.js';
import { openPivotEditor } from './pivot.js';
import { addImagesToCollage } from './collage.js';

export let spriteImage = null;
export let slicedFrames = [];
export let framePivots = [];

let isPlaying = false;
let currentFrameIndex = 0;
let animInterval = null;
let isEditMode = false;
let selectedFrameIndex = null;
let backupFrames = [];
let isSpriteDeleteMode = false;
let selectedSpriteDeleteFrames = new Set();

export function setSlicedFrames(newFrames, newPivots) {
    slicedFrames = newFrames;
    if (newPivots) framePivots = newPivots;
    renderSpriteCanvas();
    drawAnimFrame();
}

export function initSpriteStudio() {
    const spriteUpload = document.getElementById('spriteUpload');
    const spriteDropZone = document.getElementById('spriteDropZone');
    const spriteColsInput = document.getElementById('spriteCols');
    const spriteRowsInput = document.getElementById('spriteRows');
    const fpsInput = document.getElementById('fpsInput');
    const playPauseBtn = document.getElementById('playPauseBtn');

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
            document.getElementById('spriteEmptyNotice').style.display = 'none';
            document.getElementById('spriteCanvasWrapper').style.display = 'flex';

            ['playPauseBtn', 'openPivotEditorBtn', 'exportSpriteMp4Btn', 'exportSpriteGifBtn',
                'exportZipBtn', 'transferToCollageBtn', 'editSpriteOrderBtn', 'spriteSelectDeleteBtn'].forEach(id => {
                    document.getElementById(id).disabled = false;
                });

            updateSpriteGrid();
        };
        img.src = url;
    }

    spriteColsInput.addEventListener('input', (e) => {
        document.getElementById('spriteColsVal').textContent = e.target.value;
        updateSpriteGrid();
    });

    spriteRowsInput.addEventListener('input', (e) => {
        document.getElementById('spriteRowsVal').textContent = e.target.value;
        updateSpriteGrid();
    });

    fpsInput.addEventListener('input', (e) => {
        document.getElementById('fpsVal').textContent = e.target.value;
        if (isPlaying) {
            stopAnimation();
            startAnimation();
        }
    });

    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) stopAnimation();
        else startAnimation();
    });

    // فتح نافذة البيفوت
    document.getElementById('openPivotEditorBtn').addEventListener('click', () => {
        if (isPlaying) stopAnimation();
        openPivotEditor();
    });

    // نقل إلى التجميع
    document.getElementById('transferToCollageBtn').addEventListener('click', async () => {
        if (slicedFrames.length === 0) return;
        const loadedImgs = await Promise.all(slicedFrames.map(fCanvas => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ img });
                img.src = fCanvas.toDataURL();
            });
        }));
        addImagesToCollage(loadedImgs);
        switchTab(document.getElementById('tabCollageBtn'), document.getElementById('collageView'));
    });

    // تصدير ZIP محسّن (استخدام toBlob بدلاً من toDataURL لتوفير الذاكرة)
    document.getElementById('exportZipBtn').addEventListener('click', async () => {
        if (slicedFrames.length === 0) return;
        showProgress('جاري إنشاء ملف الـ ZIP...');
        const zip = new JSZip();
        const folder = zip.folder("sprite_frames");

        const total = slicedFrames.length;
        for (let i = 0; i < total; i++) {
            const blob = await new Promise(r => slicedFrames[i].toBlob(r, 'image/png'));
            folder.file(`frame_${String(i + 1).padStart(3, '0')}.png`, blob);
            updateProgress(Math.round(((i + 1) / total) * 60));
        }

        const content = await zip.generateAsync({ type: "blob" }, (meta) => {
            updateProgress(60 + Math.round(meta.percent * 0.4));
        });

        const a = document.createElement('a');
        const blobUrl = URL.createObjectURL(content);
        a.href = blobUrl;
        a.download = 'sprite_frames.zip';
        a.click();
        URL.revokeObjectURL(blobUrl);
        hideProgress();
    });

    // تصدير MP4/WebM
    document.getElementById('exportSpriteMp4Btn').addEventListener('click', async () => {
        if (slicedFrames.length === 0) return;
        showProgress('جاري معالجة وتصدير الفيديو...');

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
        a.download = mimeType === 'video/mp4' ? 'sprite_anim.mp4' : 'sprite_anim.webm';
        a.click();
        URL.revokeObjectURL(url);
        hideProgress();
    });
}

export function updateSpriteGrid() {
    if (!spriteImage) return;
    const cols = parseInt(document.getElementById('spriteCols').value) || 1;
    const rows = parseInt(document.getElementById('spriteRows').value) || 1;
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

export function renderSpriteCanvas() {
    const spriteCanvas = document.getElementById('spriteCanvas');
    const spriteCtx = spriteCanvas.getContext('2d');
    if (!spriteImage || slicedFrames.length === 0) return;

    const cols = parseInt(document.getElementById('spriteCols').value) || 1;
    const rows = parseInt(document.getElementById('spriteRows').value) || 1;
    spriteCanvas.width = spriteImage.width;
    spriteCanvas.height = spriteImage.height;

    const cellWidth = spriteCanvas.width / cols;
    const cellHeight = spriteCanvas.height / rows;

    spriteCtx.clearRect(0, 0, spriteCanvas.width, spriteCanvas.height);

    for (let i = 0; i < slicedFrames.length; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        spriteCtx.drawImage(slicedFrames[i], c * cellWidth, r * cellHeight, cellWidth, cellHeight);
    }

    // رسم شبكة التقسيم
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
}

export function drawAnimFrame() {
    if (slicedFrames.length === 0) return;
    const animCanvas = document.getElementById('animCanvas');
    const animCtx = animCanvas.getContext('2d');
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
    document.getElementById('playIcon').textContent = '❚❚ إيقاف';
    const fps = parseInt(document.getElementById('fpsInput').value) || 12;
    animInterval = setInterval(() => {
        currentFrameIndex = (currentFrameIndex + 1) % slicedFrames.length;
        drawAnimFrame();
    }, 1000 / fps);
}

function stopAnimation() {
    isPlaying = false;
    document.getElementById('playIcon').textContent = '► تشغيل';
    if (animInterval) clearInterval(animInterval);
}
