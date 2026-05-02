// Функция проверки, включены ли анимации
function areAnimationsEnabled() {
    const localSetting = localStorage.getItem('animations');
    if (localSetting !== null) {
        return localSetting !== 'off';
    }
    const body = document.body;
    if (body && body.classList) {
        return !body.classList.contains('animations-off');
    }
    return true;
}

// Загрузка статичного Lottie (замороженного на определённом кадре)
function loadStaticLottie(container, path, frame = 0) {
    container.innerHTML = '';
    
    const animation = lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: path
    });
    
    animation.addEventListener('DOMLoaded', () => {
        // Останавливаем на нужном кадре (0 - первый, totalFrames-1 - последний)
        if (frame === 'last') {
            animation.goToAndStop(animation.totalFrames - 1, true);
        } else {
            animation.goToAndStop(frame, true);
        }
        container.style.pointerEvents = 'none';
    });
    
    return animation;
}

// Загрузка анимаций
function loadAnimationsIfEnabled() {
    const plateContainer = document.getElementById('plate-animation');
    const diceContainer = document.getElementById('dice-animation');
    
    if (!areAnimationsEnabled()) {
        // Анимации выключены — показываем статичные Lottie
        // Хинкали — первый кадр, Кубик — последний кадр
        if (plateContainer) {
            loadStaticLottie(plateContainer, '/static/animations/glavnaya/chpic.su_-_unkib2w_005.json', 0);
        }
        if (diceContainer) {
            loadStaticLottie(diceContainer, '/static/animations/glavnaya/chpic.su_-_DiceCubeEmoji_001.json', 'last');
        }
        return;
    }
    
    // Анимации включены — грузим с возможностью проигрыша
    if (plateContainer && !plateContainer.hasAttribute('data-lottie-loaded')) {
        const plateAnimation = lottie.loadAnimation({
            container: plateContainer,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: '/static/animations/glavnaya/chpic.su_-_unkib2w_005.json'
        });
        
        const plateCard = plateContainer.closest('.menu-card');
        if (plateCard) {
            plateCard.addEventListener('mouseenter', () => {
                plateAnimation.goToAndPlay(0, true);
            });
        }
        plateContainer.setAttribute('data-lottie-loaded', 'true');
    }
    
    if (diceContainer && !diceContainer.hasAttribute('data-lottie-loaded')) {
        const diceAnimation = lottie.loadAnimation({
            container: diceContainer,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: '/static/animations/glavnaya/chpic.su_-_DiceCubeEmoji_001.json'
        });
        
        // Ставим на последний кадр (чтобы кубик был виден в нормальном положении)
        diceAnimation.addEventListener('DOMLoaded', () => {
            diceAnimation.goToAndStop(diceAnimation.totalFrames - 1, true);
        });
        
        const diceCard = diceContainer.closest('.menu-card');
        if (diceCard) {
            diceCard.addEventListener('mouseenter', () => {
                diceAnimation.goToAndPlay(0, true);
            });
        }
        diceContainer.setAttribute('data-lottie-loaded', 'true');
    }
}

document.addEventListener('DOMContentLoaded', loadAnimationsIfEnabled);