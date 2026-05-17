/** Проверяет, включены ли анимации */
function areAnimationsEnabled() {
    const localSetting = localStorage.getItem('animations');
    if (localSetting !== null) {
        return localSetting !== 'off';
    }
    if (document.body && document.body.classList) {
        return !document.body.classList.contains('animations-off');
    }
    return true;
}

/** Загружает статичный Lottie, замороженный на определённом кадре */
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
        if (frame === 'last') {
            animation.goToAndStop(animation.totalFrames - 1, true);
        } else {
            animation.goToAndStop(frame, true);
        }
        container.style.pointerEvents = 'none';
    });

    return animation;
}

// Загрузка анимаций главного меню
function loadAnimationsIfEnabled() {
    const plateContainer = document.getElementById('plate-animation');
    const diceContainer = document.getElementById('dice-animation');

    // Анимации выключены — статичные заглушки
    if (!areAnimationsEnabled()) {
        if (plateContainer) {
            loadStaticLottie(plateContainer, '/static/animations/glavnaya/chpic.su_-_unkib2w_005.json', 0);
        }
        if (diceContainer) {
            loadStaticLottie(diceContainer, '/static/animations/glavnaya/chpic.su_-_DiceCubeEmoji_001.json', 'last');
        }
        return;
    }

    // Тарелка
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

    // Кубик
    if (diceContainer && !diceContainer.hasAttribute('data-lottie-loaded')) {
        const diceAnimation = lottie.loadAnimation({
            container: diceContainer,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: '/static/animations/glavnaya/chpic.su_-_DiceCubeEmoji_001.json'
        });

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

// Проверка авторизации для рулетки
function checkRouletteAuth() {
    const rouletteLink = document.querySelector('a[href="/roulette/"]');
    if (!rouletteLink) return;

    rouletteLink.addEventListener('click', function(e) {
        if (document.body.getAttribute('data-user-authenticated') !== 'true') {
            e.preventDefault();
            alert('Войдите или зарегистрируйтесь, чтобы найти компанию для обеда');
            window.location.href = '/accounts/login/';
        }
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadAnimationsIfEnabled();
    checkRouletteAuth();
});