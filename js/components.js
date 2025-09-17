/**
 * 컴포넌트 동적 로딩 시스템
 * 프레임워크 없이 HTML 컴포넌트를 모듈화하여 관리
 */

// 중복 로딩 방지
if (typeof window.ComponentLoader !== 'undefined') {
    console.log('ComponentLoader가 이미 로드되었습니다.');
} else {

class ComponentLoader {
    constructor() {
        this.components = new Map();
        // 뉴스레터 페이지에서는 상위 디렉토리의 components를 참조
        const currentPath = window.location.pathname;
        this.basePath = currentPath.includes('newsletter/') ? '../components/' : 'components/';
        console.log('Component base path:', this.basePath);
    }

    /**
     * 컴포넌트를 로드하고 캐시에 저장
     * @param {string} componentName - 컴포넌트 파일명 (확장자 제외)
     * @returns {Promise<string>} HTML 내용
     */
    async loadComponent(componentName) {
        console.log(`컴포넌트 파일 로딩: ${componentName}.html`);
        
        // 이미 로드된 컴포넌트가 있으면 캐시에서 반환
        if (this.components.has(componentName)) {
            console.log(`캐시에서 컴포넌트 반환: ${componentName}`);
            return this.components.get(componentName);
        }

        try {
            const url = `${this.basePath}${componentName}.html`;
            console.log(`컴포넌트 요청 URL: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`컴포넌트 로드 실패: ${componentName} (${response.status})`);
            }
            
            const html = await response.text();
            console.log(`컴포넌트 로드 성공: ${componentName} (${html.length} bytes)`);
            this.components.set(componentName, html);
            return html;
        } catch (error) {
            console.error(`컴포넌트 로드 오류 (${componentName}):`, error);
            return '';
        }
    }

    /**
     * 컴포넌트를 특정 요소에 삽입
     * @param {string} componentName - 컴포넌트 파일명
     * @param {string} targetSelector - 대상 요소 선택자
     * @param {Object} options - 추가 옵션
     */
    async insertComponent(componentName, targetSelector, options = {}) {
        console.log(`컴포넌트 로딩 시도: ${componentName} -> ${targetSelector}`);
        
        const html = await this.loadComponent(componentName);
        const targetElement = document.querySelector(targetSelector);
        
        if (!targetElement) {
            console.error(`대상 요소를 찾을 수 없습니다: ${targetSelector}`);
            console.log('현재 DOM 상태:', document.querySelector('body')?.innerHTML.substring(0, 200));
            return;
        }

        // 옵션에 따른 HTML 처리
        let processedHtml = html;
        if (options.replacements) {
            Object.entries(options.replacements).forEach(([key, value]) => {
                processedHtml = processedHtml.replace(new RegExp(`{{${key}}}`, 'g'), value);
            });
        }

        console.log(`HTML 삽입 시도: ${componentName} -> ${targetSelector}`);
        console.log(`삽입할 HTML:`, processedHtml.substring(0, 100) + '...');
        
        if (options.insertMethod === 'append') {
            targetElement.insertAdjacentHTML('beforeend', processedHtml);
        } else {
            targetElement.innerHTML = processedHtml;
        }
        console.log(`HTML 삽입 완료: ${componentName}`);

        // 컴포넌트 로드 후 실행할 콜백
        if (options.onLoad) {
            options.onLoad(targetElement);
        }
    }

    /**
     * 네비게이션 컴포넌트 로드
     * @param {string} targetSelector - 대상 요소 선택자 (기본값: '.nav-container')
     */
    async loadNavigation(targetSelector = '.nav-container') {
        await this.insertComponent('navigation', targetSelector, {
            onLoad: (element) => {
                // 뉴스레터 페이지에서 상대 경로 수정
                const currentPath = window.location.pathname;
                if (currentPath.includes('newsletter/')) {
                    const links = element.querySelectorAll('a');
                    links.forEach(link => {
                        if (link.getAttribute('href') && !link.getAttribute('href').startsWith('http')) {
                            link.setAttribute('href', '../' + link.getAttribute('href'));
                        }
                    });
                }
                
                // 네비게이션 로드 후 모바일 메뉴 토글 기능 초기화
                this.initializeMobileMenu();
            }
        });
    }

    /**
     * 푸터 컴포넌트 로드
     * @param {string} targetSelector - 대상 요소 선택자 (기본값: 'footer')
     */
    async loadFooter(targetSelector = 'footer') {
        await this.insertComponent('footer', targetSelector);
    }

    /**
     * 브레드크럼 컴포넌트 로드
     * @param {string} targetSelector - 대상 요소 선택자
     * @param {string} currentPage - 현재 페이지명
     */
    async loadBreadcrumb(targetSelector, currentPage) {
        await this.insertComponent('breadcrumb', targetSelector, {
            replacements: {
                'current': currentPage
            },
            onLoad: (element) => {
                // 뉴스레터 페이지에서 상대 경로 수정
                const currentPath = window.location.pathname;
                if (currentPath.includes('newsletter/')) {
                    const links = element.querySelectorAll('a');
                    links.forEach(link => {
                        if (link.getAttribute('href') && !link.getAttribute('href').startsWith('http')) {
                            link.setAttribute('href', '../' + link.getAttribute('href'));
                        }
                    });
                }
            }
        });
    }

    /**
     * 모바일 메뉴 토글 기능 초기화
     */
    initializeMobileMenu() {
        const navContainer = document.querySelector('.nav-container');
        if (!navContainer) return;

        // 기존 모바일 토글 버튼 제거
        const existingToggle = navContainer.querySelector('.mobile-menu-toggle');
        if (existingToggle) {
            existingToggle.remove();
        }

        // 모바일에서만 토글 버튼 추가
        if (window.innerWidth <= 768) {
            const menuToggle = document.createElement('button');
            menuToggle.className = 'mobile-menu-toggle';
            menuToggle.innerHTML = '☰';
            menuToggle.addEventListener('click', () => {
                const navMenu = document.querySelector('.nav-menu');
                navMenu.classList.toggle('mobile-open');
                menuToggle.innerHTML = navMenu.classList.contains('mobile-open') ? '✕' : '☰';
            });
            navContainer.appendChild(menuToggle);
        }

        // 외부 클릭 시 메뉴 닫기 (모바일에서만)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !navContainer.contains(e.target)) {
                const navMenu = document.querySelector('.nav-menu');
                navMenu.classList.remove('mobile-open');
                const toggle = navContainer.querySelector('.mobile-menu-toggle');
                if (toggle) toggle.innerHTML = '☰';
            }
        });

        // 윈도우 리사이즈 시 토글 버튼 관리
        window.addEventListener('resize', () => {
            const toggle = navContainer.querySelector('.mobile-menu-toggle');
            if (window.innerWidth <= 768 && !toggle) {
                this.initializeMobileMenu();
            } else if (window.innerWidth > 768 && toggle) {
                toggle.remove();
                const navMenu = document.querySelector('.nav-menu');
                navMenu.classList.remove('mobile-open');
            }
        });
    }

    /**
     * 모든 공통 컴포넌트 로드
     * @param {Object} config - 페이지별 설정
     */
    async loadAllComponents(config = {}) {
        const promises = [];

        // 네비게이션 로드
        if (config.loadNavigation !== false) {
            promises.push(this.loadNavigation());
        }

        // 푸터 로드
        if (config.loadFooter !== false) {
            promises.push(this.loadFooter());
        }

        // 브레드크럼 로드
        if (config.breadcrumb) {
            promises.push(this.loadBreadcrumb(config.breadcrumb.selector, config.breadcrumb.currentPage));
        }

        // 갤러리 모달 로드 (필요한 페이지에서만)
        if (config.loadGallery) {
            // 갤러리 콜라주 컨테이너가 존재할 때만 로드 (모달은 직접 포함됨)
            const galleryContainer = document.querySelector('#gallery-collage-container');
            if (galleryContainer) {
                promises.push(this.insertComponent('gallery-collage', '#gallery-collage-container'));
            }
        }

        await Promise.all(promises);
    }
}

// 전역 인스턴스 생성 (중복 방지)
if (!window.componentLoader) {
    window.componentLoader = new ComponentLoader();
}

// 페이지 로드 완료 시 자동 초기화 (중복 방지)
if (!window.componentsInitialized) {
    window.componentsInitialized = true;
    document.addEventListener('DOMContentLoaded', () => {
    // 페이지별 설정
    const pageConfig = {
        'index.html': {
            breadcrumb: {
                selector: '#breadcrumb-container',
                currentPage: '정대표의 오토플랜'
            }
        },
        'membership.html': {
            breadcrumb: {
                selector: '#breadcrumb-container',
                currentPage: '김포 지역 비즈니스 커뮤니티 멤버쉽'
            },
            loadGallery: true  // 갤러리 콜라주만 로드
        },
        'benefits.html': {
            breadcrumb: {
                selector: '#breadcrumb-container',
                currentPage: 'AI 자동화 혜택 & 서비스'
            }
        },
        'signup.html': {
            breadcrumb: {
                selector: '#breadcrumb-container',
                currentPage: '지역 생태계 참여하기'
            }
        },
        'newsletter/autoplan_newsletter_html.html': {
            loadNavigation: true,
            loadFooter: false,
            breadcrumb: {
                selector: '#breadcrumb-container',
                currentPage: '지역 비즈니스 뉴스레터'
            }
        }
    };

    // 현재 페이지 경로를 정확히 감지
    const currentPath = window.location.pathname;
    let currentPage = 'index.html';

    console.log('Current path:', currentPath);

    // 뉴스레터 페이지 특별 처리
    if (currentPath.includes('newsletter/autoplan_newsletter_html.html')) {
        currentPage = 'newsletter/autoplan_newsletter_html.html';
    } else {
        currentPage = currentPath.split('/').pop() || 'index.html';
    }

    console.log('Detected current page:', currentPage);
    const config = pageConfig[currentPage] || {};
    console.log('Page config:', config);

    // 모든 컴포넌트 로드
    window.componentLoader.loadAllComponents(config);
    });
}

} // 중복 로딩 방지 끝
