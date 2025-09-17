// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', function() {
    // 컴포넌트 로더가 완료될 때까지 기다림
    waitForComponentsAndInitialize();
});

function waitForComponentsAndInitialize() {
    // 컴포넌트 로더가 존재하고 네비게이션이 로드되었는지 확인
    if (window.componentLoader && document.querySelector('.nav-menu') && document.querySelector('.nav-container')) {
        initializeMobileNavigation();
    } else {
        // 컴포넌트가 로드될 때까지 기다림
        setTimeout(waitForComponentsAndInitialize, 50);
    }
}

function initializeMobileNavigation() {
    // Mobile navigation toggle
    const navMenu = document.querySelector('.nav-menu');
    const navContainer = document.querySelector('.nav-container');

    // 요소들이 존재하지 않으면 함수 종료
    if (!navMenu || !navContainer) {
        console.log('네비게이션 요소를 찾을 수 없습니다.');
        return;
    }
    
    console.log('네비게이션 요소를 찾았습니다. 모바일 메뉴를 초기화합니다.');
    
    const navToggle = document.createElement('button');
    navToggle.className = 'mobile-menu-toggle';
    navToggle.innerHTML = '☰';
    navToggle.setAttribute('aria-label', '메뉴 열기');
    
    navContainer.appendChild(navToggle);
    
    navToggle.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
            navMenu.classList.toggle('mobile-open');
        }
    });
    
    // Close menu when clicking outside (mobile only)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && !navContainer.contains(e.target)) {
            navMenu.classList.remove('mobile-open');
        }
    });
    
    // Close menu when window is resized to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            navMenu.classList.remove('mobile-open');
        } else {
            navMenu.classList.remove('mobile-open');
        }
    });
    
    // Show/hide mobile menu button based on screen size
    function toggleMobileMenu() {
        if (window.innerWidth <= 768) {
            navToggle.style.display = 'block';
            navMenu.classList.remove('mobile-open');
        } else {
            navToggle.style.display = 'none';
            navMenu.classList.remove('mobile-open');
        }
    }
    
    toggleMobileMenu();
    window.addEventListener('resize', toggleMobileMenu);
}

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Form validation and enhancement
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            input.addEventListener('input', function() {
                if (this.classList.contains('error')) {
                    validateField(this);
                }
            });
        });
    });

    // Phone number formatting
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d]/g, '');
            if (value.length >= 3 && value.length <= 7) {
                value = value.replace(/(\d{3})(\d{1,4})/, '$1-$2');
            } else if (value.length > 7) {
                value = value.replace(/(\d{3})(\d{4})(\d{1,4})/, '$1-$2-$3');
            }
            e.target.value = value;
        });
    });

    // Add loading states for buttons
    const buttons = document.querySelectorAll('.cta-button, .submit-button');
    buttons.forEach(button => {
        if (button.type === 'submit') {
            button.addEventListener('click', function() {
                this.style.opacity = '0.7';
                setTimeout(() => {
                    this.style.opacity = '1';
                }, 2000);
            });
        }
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .benefit-item, .program-card');
    animateElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(el);
    });
});

// Field validation function
function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Remove existing error styling
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // Required field check
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = '이 필드는 필수입니다.';
    }

    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = '올바른 이메일 주소를 입력해주세요.';
        }
    }

    // Phone validation
    if (field.type === 'tel' && value) {
        const phoneRegex = /^\d{3}-\d{4}-\d{4}$/;
        if (!phoneRegex.test(value)) {
            isValid = false;
            errorMessage = '올바른 전화번호 형식을 입력해주세요. (010-0000-0000)';
        }
    }

    // Show error if validation fails
    if (!isValid) {
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.fontSize = '0.8rem';
        errorDiv.style.marginTop = '5px';
        errorDiv.textContent = errorMessage;
        field.parentNode.appendChild(errorDiv);
    }

    return isValid;
}

// Add some CSS for error states
const style = document.createElement('style');
style.textContent = `
    .error {
        border-color: #e74c3c !important;
        box-shadow: 0 0 5px rgba(231, 76, 60, 0.3) !important;
    }
    
    .nav-menu.mobile-open {
        display: flex !important;
        flex-direction: column;
        position: absolute;
        top: 70px;
        left: 0;
        width: 100%;
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        padding: 20px 0;
    }
    
    .nav-menu.mobile-open li {
        margin: 10px 0;
        text-align: center;
    }
    
    /* Desktop navigation - always visible */
    .nav-menu {
        display: flex;
    }
    
    .mobile-menu-toggle {
        display: none;
    }
    
    @media (max-width: 768px) {
        .nav-menu {
            display: none;
        }
        
        .mobile-menu-toggle {
            display: block;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #2c5530;
        }
    }
`;
document.head.appendChild(style);

// Note: Mobile menu functionality is now handled by components.js
// This section can be removed as it's redundant