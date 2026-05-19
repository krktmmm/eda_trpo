// static/js/gallery.js

(function() {
    'use strict';

    let currentImages = [];
    let currentIndex = 0;

    // Создаём модальное окно (если его нет на странице)
    function ensureModal() {
        if (document.getElementById('gallery-modal')) return;

        const modalHtml = `
            <div id="gallery-modal" class="gallery-modal" style="display: none;">
                <div class="gallery-modal-content">
                    <div class="gallery-close">&times;</div>
                    <div class="gallery-prev">&#10094;</div>
                    <div class="gallery-next">&#10095;</div>
                    <img id="gallery-image" src="">
                    <div class="gallery-counter"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    function openGallery(images, index) {
        ensureModal();
        
        currentImages = images;
        currentIndex = index;
        
        const modal = document.getElementById('gallery-modal');
        const modalImg = document.getElementById('gallery-image');
        const counter = document.querySelector('.gallery-counter');
        
        modal.style.display = 'flex';
        updateGalleryImage();
    }

    function openGalleryFromData(element) {
        const images = JSON.parse(element.getAttribute('data-gallery'));
        const index = parseInt(element.getAttribute('data-index'));
        openGallery(images, index);
    }

    function updateGalleryImage() {
        const modalImg = document.getElementById('gallery-image');
        const counter = document.querySelector('.gallery-counter');
        
        if (currentImages.length > 0 && modalImg) {
            modalImg.src = currentImages[currentIndex].url;
            if (counter) {
                counter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
            }
        }
    }

    function prevImage() {
        if (currentImages.length > 0) {
            currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
            updateGalleryImage();
        }
    }

    function nextImage() {
        if (currentImages.length > 0) {
            currentIndex = (currentIndex + 1) % currentImages.length;
            updateGalleryImage();
        }
    }

    function bindEvents() {
        const modal = document.getElementById('gallery-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.gallery-close');
        const prevBtn = modal.querySelector('.gallery-prev');
        const nextBtn = modal.querySelector('.gallery-next');

        if (closeBtn) {
            closeBtn.onclick = () => modal.style.display = 'none';
        }
        if (prevBtn) {
            prevBtn.onclick = prevImage;
        }
        if (nextBtn) {
            nextBtn.onclick = nextImage;
        }

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };

        document.addEventListener('keydown', (e) => {
            if (modal.style.display === 'flex') {
                if (e.key === 'ArrowLeft') prevImage();
                if (e.key === 'ArrowRight') nextImage();
                if (e.key === 'Escape') modal.style.display = 'none';
            }
        });
    }

    // Инициализация
    function initGallery() {
        ensureModal();
        bindEvents();
        
        // Глобальные функции для использования в других скриптах
        window.openGallery = openGallery;
        window.openGalleryFromData = openGalleryFromData;
    }

    // Запускаем при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGallery);
    } else {
        initGallery();
    }
})();