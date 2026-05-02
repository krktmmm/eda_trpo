// Применение темы
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
}

// Применение размера шрифта
function applyFontSize(size) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    if (size === 'small') {
        document.body.classList.add('font-small');
    } else if (size === 'medium') {
        document.body.classList.add('font-medium');
    } else if (size === 'large') {
        document.body.classList.add('font-large');
    }
    localStorage.setItem('fontSize', size);
}

// Функция проверки и применения анимаций
function checkAndApplyAnimations() {
    const animationsSelect = document.getElementById('animations-select');
    if (animationsSelect) {
        // Просто синхронизируем select с сохранённым значением
        const savedAnimations = localStorage.getItem('animations');
        if (savedAnimations) {
            animationsSelect.value = savedAnimations;
        }
    }
}

// Загрузка сохранённых настроек
document.addEventListener('DOMContentLoaded', function() {
    const themeSelect = document.getElementById('theme-select');
    const fontSizeSelect = document.getElementById('font-size-select');
    
    // Загружаем из localStorage
    const savedTheme = localStorage.getItem('theme');
    const savedFontSize = localStorage.getItem('fontSize');
    
    if (savedTheme && themeSelect) {
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);
    } else if (themeSelect) {
        applyTheme(themeSelect.value);
    }
    
    if (savedFontSize && fontSizeSelect) {
        fontSizeSelect.value = savedFontSize;
        applyFontSize(savedFontSize);
    } else if (fontSizeSelect) {
        applyFontSize(fontSizeSelect.value);
    }
    
    // Обработчики изменений
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            applyTheme(this.value);
        });
    }
    
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', function() {
            applyFontSize(this.value);
        });
    }
    
    checkAndApplyAnimations();
    
    const animationsSelect = document.getElementById('animations-select');
    if (animationsSelect) {
        animationsSelect.addEventListener('change', function() {
            localStorage.setItem('animations', this.value);
            // При изменении анимаций перезагружаем страницу
            location.reload();
        });
    }
});