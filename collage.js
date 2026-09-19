import { setupDropZone } from './app.js';

let images = [];
let isCollageSelectMode = false;
let selectedCollageIndices = new Set();
let collagePositions = [];

export function addImagesToCollage(newImages) {
    images.push(...newImages);
    updateUIState();
    generatePreview(0.5);
}

export function initCollageStudio() {
    const imgUpload = document.getElementById('imgUpload');
    const dropZone = document.getElementById('dropZone');
    const previewCanvas = document.getElementById('previewCanvas');
    const clearBtn = document.getElementById('clearBtn');
    const exportPNGBtn = document.getElementById('exportPNGBtn');
    const exportPDFBtn = document.getElementById('exportPDFBtn');

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

    setupDropZone(dropZone, imgUpload, (files) => handleFiles(files));
    imgUpload.addEventListener('change', (e) => handleFiles(e.target.files));

    async function handleFiles(files) {
        if (!files || files.length === 0) return;
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

        const loadPromises = imageFiles.map(file => {
            return new Promise((resolve) => {
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = () => {
                    URL.revokeObjectURL(url); // حماية من تسريب الذاكرة
                    resolve({ img });
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve(null);
                };
                img.src = url;
            });
        });

        const loaded = await Promise.all(loadPromises);
        images.push(...loaded.filter(Boolean));
        imgUpload.value = '';
        updateUIState();
        generatePreview(0.5);
    }

    imgSizeInput.addEventListener('input', (e) => { imgSizeNum.value = e.target.value; generatePreview(0.5); });
    imgSizeNum.addEventListener('input', (e) => { imgSizeInput.value = parseInt(e.target.value) || 50; generatePreview(0.5); });
    columnsInput.addEventListener('input', (e) => { columnsVal.textContent = e.target.value; generatePreview(0.5); });
    imgGapInput.addEventListener('input', (e) => { imgGapVal.textContent = `${e.target.value}px`; generatePreview(0.5); });
    strokeWidthInput.addEventListener('input', (e) => { strokeWidthVal.textContent = `${e.target.value}px`; generatePreview(0.5); });
    strokeColorInput.addEventListener('input', () => generatePreview(0.5));

    // تفاعل التحديد والحذف
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

    collageCancelSelectBtn.addEventListener('click', exitCollageSelectMode);
    collageDeleteSelectedBtn.addEventListener('click', () => {
        if (selectedCollageIndices.size > 0) {
            images = images.filter((_, idx) => !selectedCollageIndices.has(idx));
        }
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
        const a = document.createElement('a');
        a.href = previewCanvas.toDataURL('image/png');
        a.download = 'collage.png';
        a.click();
        generatePreview(0.5);
    });

    exportPDFBtn.addEventListener('click', () => {
        if (images.length === 0) return;
        const { jsPDF } = window.jspdf;
        generatePreview(1);
        const isLandscape = previewCanvas.width > previewCanvas.height;
        const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'px', [previewCanvas.width, previewCanvas.height]);
        pdf.addImage(previewCanvas.toDataURL('image/png'), 'PNG', 0, 0, previewCanvas.width, previewCanvas.height);
        pdf.save('collage.pdf');
        generatePreview(0.5);
    });
}

function updateUIState() {
    const emptyNotice = document.getElementById('emptyNotice');
    const previewCanvas = document.getElementById('previewCanvas');
    const imageCounter = document.getElementById('imageCounter');

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
    const previewCanvas = document.getElementById('previewCanvas');
    const ctx = previewCanvas.getContext('2d');
    if (images.length === 0) {
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        return;
    }

    const imgSize = parseInt(document.getElementById('imgSizeNum').value) || 300;
    const columns = parseInt(document.getElementById('columns').value) || 3;
    const gap = parseInt(document.getElementById('imgGap').value) || 0;
    const strokeWidth = parseInt(document.getElementById('strokeWidth').value) || 0;
    const strokeColor = document.getElementById('strokeColor').value || '#FF3B5C';

    const cellWidth = imgSize * quality;
    const cellHeights = images.map(item => (cellWidth / item.img.width) * item.img.height);
    const groups = Array.from({ length: columns }, () => 0);
    const positions = Array.from({ length: images.length }, () => 0);

    const effectiveGap = gap * quality;
    const effectiveStroke = strokeWidth * quality;

    for (let i = 0; i < images.length; i++) {
        const imageHeight = cellHeights[i];
        const groupIndex = i % columns;
        const x = groupIndex * (cellWidth + effectiveGap) + effectiveStroke / 2;
        const y = groups[groupIndex] + effectiveStroke / 2;
        positions[i] = { x, y, w: cellWidth, h: imageHeight };
        groups[groupIndex] += imageHeight + effectiveGap;
    }

    collagePositions = positions;

    const maxHeight = Math.max(...groups) - effectiveGap + effectiveStroke;
    const totalWidth = columns * (cellWidth + effectiveGap) - effectiveGap + effectiveStroke;

    previewCanvas.width = Math.max(10, totalWidth);
    previewCanvas.height = Math.max(10, maxHeight);

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

    images.forEach((imageObj, index) => {
        const pos = positions[index];
        ctx.drawImage(imageObj.img, pos.x, pos.y, pos.w, pos.h);

        if (strokeWidth > 0) {
            ctx.lineWidth = effectiveStroke;
            ctx.strokeStyle = strokeColor;
            ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
        }

        if (isCollageSelectMode && selectedCollageIndices.has(index)) {
            ctx.fillStyle = 'rgba(255, 59, 92, 0.4)';
            ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
            ctx.strokeStyle = '#FF3B5C';
            ctx.lineWidth = 3;
            ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
        }
    });
}