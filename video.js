import { setupDropZone, showProgress, updateProgress, hideProgress, switchTab } from './app.js';
import { addImagesToCollage } from './collage.js';

let currentVideoFile = null;
let currentVideoObjectUrl = null;

export function initVideoExtractor() {
    const videoUpload = document.getElementById('videoUpload');
    const videoDropZone = document.getElementById('videoDropZone');
    const mainVideoPlayer = document.getElementById('mainVideoPlayer');

    document.getElementById('videoImportTrigger').addEventListener('click', () => videoUpload.click());
    setupDropZone(videoDropZone, videoUpload, (files) => loadVideoFile(files[0]));
    videoUpload.addEventListener('change', (e) => loadVideoFile(e.target.files[0]));

    function loadVideoFile(file) {
        if (!file || !file.type.startsWith('video/')) return;
        currentVideoFile = file;

        if (currentVideoObjectUrl) URL.revokeObjectURL(currentVideoObjectUrl); // تنظيف الرابط القديم
        currentVideoObjectUrl = URL.createObjectURL(file);
        mainVideoPlayer.src = currentVideoObjectUrl;

        mainVideoPlayer.onloadedmetadata = () => {
            document.getElementById('videoEmptyNotice').style.display = 'none';
            document.getElementById('videoPlayerWrapper').style.display = 'flex';
            ['extractGifBtn', 'extractZipBtn', 'transferVidToCollageBtn'].forEach(id => {
                document.getElementById(id).disabled = false;
            });

            document.getElementById('vidDurationBadge').textContent = `${mainVideoPlayer.duration.toFixed(1)} ثانية`;
            document.getElementById('vidResBadge').textContent = `${mainVideoPlayer.videoWidth}x${mainVideoPlayer.videoHeight}`;
            updateEstimatedFrames();
        };
    }

    function updateEstimatedFrames() {
        if (!mainVideoPlayer.duration) return;
        const fps = parseInt(document.getElementById('videoFpsInput').value);
        const max = parseInt(document.getElementById('videoMaxFramesInput').value);
        const est = Math.min(Math.floor(mainVideoPlayer.duration * fps), max);
        document.getElementById('vidEstFramesBadge').textContent = `${est} فريم`;
    }

    document.getElementById('videoFpsInput').addEventListener('input', updateEstimatedFrames);
    document.getElementById('videoMaxFramesInput').addEventListener('input', updateEstimatedFrames);

    // نقل الفريمات إلى التجميع
    document.getElementById('transferVidToCollageBtn').addEventListener('click', async () => {
        const frames = await extractFramesAsync();
        if (frames.length === 0) return;

        const loadedImgs = await Promise.all(frames.map(fCanvas => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ img });
                img.src = fCanvas.toDataURL();
            });
        }));

        addImagesToCollage(loadedImgs);
        hideProgress();
        switchTab(document.getElementById('tabCollageBtn'), document.getElementById('collageView'));
    });

    // تصدير ZIP غير متزامن
    document.getElementById('extractZipBtn').addEventListener('click', async () => {
        const frames = await extractFramesAsync();
        if (frames.length === 0) return;

        showProgress('جاري إنشاء ملف الـ ZIP...');
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
}

async function extractFramesAsync() {
    if (!currentVideoFile) return [];

    const fps = parseInt(document.getElementById('videoFpsInput').value) || 10;
    const maxFrames = parseInt(document.getElementById('videoMaxFramesInput').value) || 80;

    showProgress('جاري قراءة واستخراج فريمات الفيديو بدقة...');

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

                // حماية من تعليق المتصفح مع حدث seeked بمهلة 500ms
                await new Promise((r) => {
                    let resolved = false;
                    const done = () => { if (!resolved) { resolved = true; tempVideo.removeEventListener('seeked', done); r(); } };
                    tempVideo.addEventListener('seeked', done);
                    setTimeout(done, 500);
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

            URL.revokeObjectURL(tempUrl); // تنظيف الرابط
            resolve(extracted);
        };
    });
}