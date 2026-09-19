import { initCollageStudio } from './collage.js';
import { initSpriteStudio } from './sprite.js';
import { initVideoExtractor } from './video.js';

// --- تسجيل الـ Service Worker لـ PWA ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
    });
}

// --- التعامل مع زر تثبيت التطبيق على الويندوز ---
let deferredPrompt;
const installPwaBtn = document.getElementById('installPwaBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installPwaBtn) {
        installPwaBtn.style.display = 'flex';
    }
});

if (installPwaBtn) {
    installPwaBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installPwaBtn.style.display = 'none';
        }
        deferredPrompt = null;
    });
}

// --- شريط التقدم المركزي ---
export function showProgress(title) {
    document.getElementById('progressTitle').textContent = title;
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
    document.getElementById('progressContainer').style.display = 'flex';
}

export function updateProgress(percent) {
    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = `${percent}%`;
}

export function hideProgress() {
    setTimeout(() => {
        document.getElementById('progressContainer').style.display = 'none';
    }, 400);
}

// --- تفعيل السحب والإفلات الشامل ---
export function setupDropZone(dropZoneElem, inputElem, onFilesDrop) {
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
            onFilesDrop(e.dataTransfer.files);
        }
    });

    dropZoneElem.addEventListener('click', (e) => {
        if (e.target.tagName !== 'CANVAS' && e.target.tagName !== 'VIDEO') {
            inputElem.click();
        }
    });
}

// --- إدارة التبويبات والمظهر العام ---
const tabCollageBtn = document.getElementById('tabCollageBtn');
const tabSpriteBtn = document.getElementById('tabSpriteBtn');
const tabVideoBtn = document.getElementById('tabVideoBtn');

const collageView = document.getElementById('collageView');
const spriteView = document.getElementById('spriteView');
const videoView = document.getElementById('videoView');
const headerExportGroup = document.getElementById('headerExportGroup');

export function switchTab(activeBtn, activeView) {
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

// المظهر الليلي / النهاري
const themeToggleBtn = document.getElementById('themeToggleBtn');
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});

// ملء الشاشة
document.getElementById('fullScreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => { });
    } else {
        document.exitFullscreen().catch(() => { });
    }
});

// تشغيل الوحدات
window.addEventListener('DOMContentLoaded', () => {
    initCollageStudio();
    initSpriteStudio();
    initVideoExtractor();
});