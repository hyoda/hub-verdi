class GalleryManager {
    constructor() {
        this.images = [
            'IMG_5121.webp', 'IMG_5135.webp', 'IMG_5128.webp', 'IMG_5120.webp', 'IMG_3847.webp',
            'IMG_3846.webp', 'IMG_3819.webp', 'IMG_3773.webp', 'IMG_3755.webp', 'IMG_3754.webp',
            'IMG_3729.webp', 'IMG_3718.webp', 'IMG_3713.webp', 'IMG_3705.webp', 'IMG_3704.webp',
            'IMG_3703.webp', 'IMG_3649.webp', 'IMG_3625.webp', 'IMG_3610.webp', 'IMG_3139.webp',
            'IMG_3131.webp', 'IMG_3122.webp', 'IMG_2277.webp', 'IMG_2275.webp', 'IMG_2269.webp',
            'IMG_4496.webp', 'IMG_4495.webp', 'IMG_4488.webp', 'IMG_4460.webp', 'IMG_4457.webp',
            'IMG_4423.webp', 'IMG_4411.webp', 'IMG_4340.webp', 'IMG_4330.webp', 'IMG_4321.webp',
            'IMG_4315.webp', 'IMG_4294.webp', 'IMG_4266.webp', 'IMG_4228.webp', 'IMG_4178.webp',
            'IMG_4171.webp', 'IMG_4123.webp', 'IMG_4093.webp', 'IMG_4089.webp', 'IMG_4084.webp',
            'IMG_4078.webp', 'IMG_4075.webp', 'IMG_4063.webp', 'IMG_4055.webp', 'IMG_4052.webp',
            'IMG_4046.webp', 'IMG_4037.webp', 'IMG_4036.webp', 'IMG_4021.webp', 'IMG_3990.webp',
            'IMG_3938.webp', 'IMG_3914.webp', 'IMG_3880.webp', 'IMG_3872.webp', 'IMG_3831.webp',
            'IMG_7964.webp', 'IMG_7955.webp', 'IMG_7949.webp', 'IMG_7945.webp', 'IMG_7943.webp',
            'IMG_7932.webp', 'IMG_7930.webp', 'IMG_7918.webp', 'IMG_7895.webp', 'IMG_7893.webp',
            'IMG_7891.webp', 'IMG_7888.webp', 'IMG_7874.webp', 'IMG_7868.webp', 'IMG_7858.webp',
            'IMG_7854.webp', 'IMG_7090.webp', 'IMG_7089.webp', 'IMG_7088.webp', 'IMG_6294.webp',
            'IMG_5398.webp', 'IMG_5139.webp'
        ];
        this.currentIndex = 0;
        this.isModalOpen = false;
        this.init();
    }

    init() {
        this.generateThumbnails();
        this.bindEvents();
    }

    generateThumbnails() {
        const thumbnailsContainer = document.getElementById('galleryThumbnails');
        if (!thumbnailsContainer) return;

        thumbnailsContainer.innerHTML = '';
        
        this.images.forEach((image, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'gallery-thumbnail';
            thumbnail.innerHTML = `<img src="assets/img/gallery/${image}" alt="썸네일 ${index + 1}" onclick="galleryManager.goToImage(${index})">`;
            thumbnailsContainer.appendChild(thumbnail);
        });
    }

    bindEvents() {
        // 키보드 네비게이션
        document.addEventListener('keydown', (event) => {
            if (!this.isModalOpen) return;
            
            switch(event.key) {
                case 'ArrowLeft':
                    this.previousImage();
                    break;
                case 'ArrowRight':
                    this.nextImage();
                    break;
                case 'Escape':
                    this.closeModal();
                    break;
            }
        });

        // 모달 외부 클릭으로 닫기
        document.addEventListener('click', (event) => {
            if (event.target.id === 'galleryModal') {
                this.closeModal();
            }
        });

        // 썸네일 컨테이너에 터치/드래그 스크롤 지원 추가
        this.initThumbnailScroll();
    }

    initThumbnailScroll() {
        const thumbnailsContainer = document.querySelector('.gallery-thumbnails');
        if (!thumbnailsContainer) return;

        let isDragging = false;
        let startX = 0;
        let scrollLeft = 0;

        // 마우스 이벤트
        thumbnailsContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            thumbnailsContainer.style.cursor = 'grabbing';
            startX = e.pageX - thumbnailsContainer.offsetLeft;
            scrollLeft = thumbnailsContainer.scrollLeft;
        });

        thumbnailsContainer.addEventListener('mouseleave', () => {
            isDragging = false;
            thumbnailsContainer.style.cursor = 'grab';
        });

        thumbnailsContainer.addEventListener('mouseup', () => {
            isDragging = false;
            thumbnailsContainer.style.cursor = 'grab';
        });

        thumbnailsContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - thumbnailsContainer.offsetLeft;
            const walk = (x - startX) * 2; // 스크롤 속도 조절
            thumbnailsContainer.scrollLeft = scrollLeft - walk;
        });

        // 터치 이벤트
        thumbnailsContainer.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].pageX - thumbnailsContainer.offsetLeft;
            scrollLeft = thumbnailsContainer.scrollLeft;
        });

        thumbnailsContainer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.touches[0].pageX - thumbnailsContainer.offsetLeft;
            const walk = (x - startX) * 2;
            thumbnailsContainer.scrollLeft = scrollLeft - walk;
        });

        thumbnailsContainer.addEventListener('touchend', () => {
            isDragging = false;
        });

        // 커서 스타일 설정
        thumbnailsContainer.style.cursor = 'grab';
    }

    openModal() {
        const modal = document.getElementById('galleryModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.isModalOpen = true;
            this.updateDisplay();
        }
    }

    closeModal() {
        const modal = document.getElementById('galleryModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.isModalOpen = false;
        }
    }

    goToImage(index) {
        this.currentIndex = index;
        this.updateDisplay();
    }

    nextImage() {
        if (this.currentIndex < this.images.length - 1) {
            this.currentIndex++;
            this.updateDisplay();
        }
    }

    previousImage() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateDisplay();
        }
    }

    updateDisplay() {
        const mainImg = document.getElementById('galleryMainImg');
        const counter = document.getElementById('galleryCounter');
        const prevBtn = document.getElementById('galleryPrevBtn');
        const nextBtn = document.getElementById('galleryNextBtn');

        if (mainImg) {
            mainImg.src = `assets/img/gallery/${this.images[this.currentIndex]}`;
            mainImg.alt = `갤러리 이미지 ${this.currentIndex + 1}`;
        }

        if (counter) {
            counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentIndex === 0;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentIndex === this.images.length - 1;
        }

        // 썸네일 활성화 상태 업데이트
        const thumbnails = document.querySelectorAll('.gallery-thumbnail');
        thumbnails.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === this.currentIndex);
        });

        // 현재 선택된 썸네일이 보이도록 자동 스크롤
        this.scrollToActiveThumbnail();
    }

    scrollToActiveThumbnail() {
        const thumbnailsContainer = document.querySelector('.gallery-thumbnails');
        const activeThumbnail = document.querySelector('.gallery-thumbnail.active');
        
        if (thumbnailsContainer && activeThumbnail) {
            const containerRect = thumbnailsContainer.getBoundingClientRect();
            const thumbnailRect = activeThumbnail.getBoundingClientRect();
            
            // 썸네일이 컨테이너의 왼쪽이나 오른쪽에 가려져 있으면 스크롤
            if (thumbnailRect.left < containerRect.left) {
                activeThumbnail.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest', 
                    inline: 'start' 
                });
            } else if (thumbnailRect.right > containerRect.right) {
                activeThumbnail.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest', 
                    inline: 'end' 
                });
            }
        }
    }
}

// 전역 함수들 (기존 코드와의 호환성을 위해)
let galleryManager;

function openGalleryModal() {
    if (galleryManager) {
        galleryManager.openModal();
    }
}

function closeGalleryModal() {
    if (galleryManager) {
        galleryManager.closeModal();
    }
}

function nextGalleryImage() {
    if (galleryManager) {
        galleryManager.nextImage();
    }
}

function previousGalleryImage() {
    if (galleryManager) {
        galleryManager.previousImage();
    }
}

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    galleryManager = new GalleryManager();
});

// 전역으로 노출
window.galleryManager = galleryManager;