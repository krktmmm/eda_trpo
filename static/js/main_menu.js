// Функция проверки, включены ли анимации
function areAnimationsEnabled() {
    // Сначала проверяем localStorage (для мгновенного применения без перезагрузки)
    const localSetting = localStorage.getItem('animations');
    if (localSetting !== null) {
        return localSetting !== 'off';
    }
    
    // Если в localStorage нет — смотрим, что в БД (через атрибут на body)
    const body = document.body;
    if (body && body.classList) {
        // Если на body есть класс animations-off — значит анимации выключены
        return !body.classList.contains('animations-off');
    }
    
    return true; // по умолчанию включены
}

// Загрузка анимаций только если они включены
function loadAnimationsIfEnabled() {
    if (!areAnimationsEnabled()) {
        // Анимации выключены — показываем статичные эмодзи
        const plateIcon = document.getElementById('plate-animation');
        const diceIcon = document.getElementById('dice-animation');
        
        if (plateIcon) {
            plateIcon.innerHTML = '🍽️';
            plateIcon.classList.add('static-icon');
        }
        if (diceIcon) {
            diceIcon.innerHTML = '🎲';
            diceIcon.classList.add('static-icon');
        }
        return;
    }
    
    // Анимации включены — грузим Lottie
    const plate = document.getElementById('plate-animation');
    const dice = document.getElementById('dice-animation');
    
    if (plate && !plate.hasAttribute('data-lottie-loaded')) {
        const plateAnimation = lottie.loadAnimation({
            container: plate,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: '/static/animations/chpic.su_-_unkib2w_005.json'
        });
        
        const plateCard = plate.closest('.menu-card');
        if (plateCard) {
            plateCard.addEventListener('mouseenter', () => {
                plateAnimation.goToAndPlay(0, true);
            });
        }
        plate.setAttribute('data-lottie-loaded', 'true');
    }
    
    if (dice && !dice.hasAttribute('data-lottie-loaded')) {
        const diceAnimation = lottie.loadAnimation({
            container: dice,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: '/static/animations/chpic.su_-_DiceCubeEmoji_001.json'
        });
        
        // Ставим на последний кадр (чтобы кубик был виден)
        diceAnimation.addEventListener('DOMLoaded', () => {
            diceAnimation.goToAndStop(diceAnimation.totalFrames - 1, true);
        });
        
        const diceCard = dice.closest('.menu-card');
        if (diceCard) {
            diceCard.addEventListener('mouseenter', () => {
                diceAnimation.goToAndPlay(0, true);
            });
        }
        dice.setAttribute('data-lottie-loaded', 'true');
    }
}

// Запускаем загрузку анимаций после загрузки страницы
document.addEventListener('DOMContentLoaded', loadAnimationsIfEnabled);