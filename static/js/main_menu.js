const plate = document.getElementById('plate-animation');
const dice = document.getElementById('dice-animation');

const plateAnimation = lottie.loadAnimation({
    container: plate,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: '/static/animations/chpic.su_-_unkib2w_005.json'
});

const diceAnimation = lottie.loadAnimation({
    container: dice,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: '/static/animations/chpic.su_-_DiceCubeEmoji_001.json'
});

// Настройки кадра анимации после обновления страницы
diceAnimation.addEventListener('DOMLoaded', () => {
    diceAnimation.goToAndStop(diceAnimation.totalFrames - 1, true);
});

const plateCard = plate.closest('.menu-card');
const diceCard = dice.closest('.menu-card');

plateCard.addEventListener('mouseenter', () => {
    plateAnimation.goToAndPlay(0, true);
});

diceCard.addEventListener('mouseenter', () => {
    diceAnimation.goToAndPlay(0, true);
});