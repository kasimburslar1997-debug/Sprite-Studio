import { slicedFrames, framePivots } from './sprite.js';

let activePivotFrameIdx = 0;
let onionSkinActive = true;
let isDraggingPivot = false;
let backupPivots = [];

// متغيرات التكبير والتحريك (Zoom & Pan)
let zoomScale = 1;
let panX = 0;
let panY = 0;

export function openPivotEditor() {
    if (slicedFrames.length === 0) return;
    backupPivots = framePivots.map(p => ({ ...p }));
    activePivotFrameIdx = 0;
    zoomScale = 1;
    panX = 0;
    panY = 0;

    document.getElementById('pivotEditorModal').classList.add('active');
    setupPivotListeners();
    buildPivotFramesGrid();
    renderPivotCanvas();
    updatePivotInputsUI();
}

function setupPivotListeners() {
    const pivotCanvas = document.getElementById('pivotCanvas');
    const pivotContainer = document.getElementById('pivotCanvasContainer');

    // ميزة التكبير بعجلة الماوس
    pivotContainer.onwheel = (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
        zoomScale = Math.min(Math.max(0.5, zoomScale * zoomFactor), 15);
        renderPivotCanvas();
    };

    document.getElementById('resetPivotZoomBtn').onclick = () => {
        zoomScale = 1;
        panX = 0;
        panY = 0;
        renderPivotCanvas();
    };

    // تفاعل الفأرة لتحديد البيفوت
    pivotCanvas.onpointerdown = (e) => {
        isDraggingPivot = true;
        handlePointer(e);
    };

    window.onpointermove = (e) => {
        if (isDraggingPivot) handlePointer(e);
    };

    window.onpointerup = () => {
        isDraggingPivot = false;
    };

    document.getElementById('toggleOnionSkinBtn').onclick = () => {
        onionSkinActive = !onionSkinActive;
        document.getElementById('toggleOnionSkinBtn').classList.toggle('active-onion', onionSkinActive);
        renderPivotCanvas();
    };

    document.getElementById('savePivotBtn').onclick = () => {
        document.getElementById('pivotEditorModal').classList.remove('active');
    };

    document.getElementById('cancelPivotBtn').onclick = () => {
        framePivots.splice(0, framePivots.length, ...backupPivots.map(p => ({ ...p })));
        document.getElementById('pivotEditorModal').classList.remove('active');
    };

    // ميزة تصدير إحداثيات البيفوت لمحركات الألعاب
    document.getElementById('exportPivotJsonBtn').onclick = () => {
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
    };
}

function handlePointer(e) {
    const pivotCanvas = document.getElementById('pivotCanvas');
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

function buildPivotFramesGrid() {
    const grid = document.getElementById('pivotFramesGrid');
    grid.innerHTML = '';

    slicedFrames.forEach((fCanvas, idx) => {
        const card = document.createElement('div');
        card.className = `pivot-frame-thumb-card ${idx === activePivotFrameIdx ? 'active-thumb' : ''}`;

        // رسم الصورة مباشرة على كانفاس خفيف بدلاً من DataURL لتوفير الذاكرة
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

        grid.appendChild(card);
    });
}

function renderPivotCanvas() {
    const canvas = document.getElementById('pivotCanvas');
    const ctx = canvas.getContext('2d');
    const frame = slicedFrames[activePivotFrameIdx];

    canvas.width = frame.width;
    canvas.height = frame.height;
    canvas.style.transform = `scale(${zoomScale})`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // تأثير Onion Skinning
    if (onionSkinActive && slicedFrames.length > 1) {
        const prevIdx = (activePivotFrameIdx - 1 + slicedFrames.length) % slicedFrames.length;
        drawTintedFrame(ctx, slicedFrames[prevIdx], '#FF4D6D', 0.4);
        const nextIdx = (activePivotFrameIdx + 1) % slicedFrames.length;
        drawTintedFrame(ctx, slicedFrames[nextIdx], '#38B6FF', 0.4);
    }

    ctx.drawImage(frame, 0, 0);

    // رسم علامة الارتكاز (Crosshair)
    const p = framePivots[activePivotFrameIdx];
    const px = p.x * canvas.width;
    const py = p.y * canvas.height;

    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#FF3B5C';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
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

function updatePivotInputsUI() {
    const p = framePivots[activePivotFrameIdx];
    document.getElementById('pivotXInput').value = p.x.toFixed(2);
    document.getElementById('pivotYInput').value = p.y.toFixed(2);
}
