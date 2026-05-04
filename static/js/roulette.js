const soloBtn = document.getElementById('solo-btn');
const groupBtn = document.getElementById('group-btn');
const soloForm = document.getElementById('solo-form');
const groupForm = document.getElementById('group-form');

const searchProcess = document.getElementById('search-process');
const slotContainer = document.getElementById('slot-animation');
const cancelSearchBtn = document.getElementById('cancelSearchBtn');
const searchProcessText = document.getElementById('search-process-text');
const matchScreen = document.getElementById('match-screen');

let slotAnimation = null;
let searchTimer = null;
let currentMatchData = null;
let currentSearchMode = null;

const SLOT_SPEED = 0.5;
const MIN_SEARCH_TIME = 5000;

function showForm(formToShow) {
    soloForm.classList.add('hidden');
    groupForm.classList.add('hidden');

    soloForm.style.display = '';
    groupForm.style.display = '';

    formToShow.classList.remove('hidden');
}

function initSlotAnimation() {
    if (slotAnimation) {
        slotAnimation.destroy();
        slotAnimation = null;
    }

    if (slotContainer) {
        slotContainer.innerHTML = '';
    }

    slotAnimation = lottie.loadAnimation({
        container: slotContainer,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        path: '/static/animations/obed-ruletka/SlotMachine.json'
    });
}

function stopSlotOnWin() {
    if (!slotAnimation) return;

    slotAnimation.loop = false;
    slotAnimation.setSpeed(SLOT_SPEED);

    slotAnimation.playSegments(
        [Math.floor(slotAnimation.currentFrame), slotAnimation.totalFrames - 1],
        true
    );
}

function showSearchProcess() {
    document.querySelector('.roulette-buttons').style.display = 'none';
    document.querySelector('.greeting').style.display = 'none';

    const greetingText = document.getElementById('greeting-text');
    if (greetingText) {
        greetingText.style.display = 'none';
    }

    soloForm.classList.add('hidden');
    groupForm.classList.add('hidden');

    searchProcessText.innerText = 'Подождите, поиск собеседника...';
    searchProcess.classList.remove('hidden');

    initSlotAnimation();

    if (slotAnimation) {
        slotAnimation.setSpeed(SLOT_SPEED);
        slotAnimation.loop = true;
        slotAnimation.goToAndPlay(0, true);
    }
}

function hideSearchProcess() {
    searchProcess.classList.add('hidden');

    if (slotAnimation) {
        slotAnimation.stop();
    }
}

function showMatchScreen(match) {
    document.querySelector('.greeting').style.display = 'none';
    document.querySelector('.roulette-buttons').style.display = 'none';

    const greetingText = document.getElementById('greeting-text');
    if (greetingText) {
        greetingText.style.display = 'none';
    }

    soloForm.classList.add('hidden');
    groupForm.classList.add('hidden');
    searchProcess.classList.add('hidden');

    document.getElementById('screen-username').innerText = match.username;
    document.getElementById('screen-building').innerText = match.building;
    document.getElementById('screen-budget').innerText = match.budget;
    document.getElementById('screen-telegram').innerText = match.telegram || '—';
    document.getElementById('screen-vk').innerText = match.vk || '—';

    matchScreen.classList.remove('hidden');
}

async function startSolo(e) {
    e.preventDefault();
    
    // Блокируем кнопку
    const submitBtn = document.getElementById('start-solo');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Поиск...';
    }
    
    showSearchProcess();
    
    try {
        const form = document.getElementById('create-solo-form');
        
        await fetch('/roulette/api/solo/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({
                building: form.building.value,
                budget: form.budget.value
            })
        });
        
        const res = await fetch('/roulette/api/solo/find/');
        const match = await res.json();
        
        if (match.status === 'found') {
            currentMatchData = match;
            
            searchTimer = setTimeout(() => {
                stopSlotOnWin();
                searchProcessText.innerText = 'Собеседник найден!';
                
                setTimeout(() => {
                    hideSearchProcess();
                    showMatchScreen(match);
                    
                    if (window.addNotification) {
                        window.addNotification(
                            `🎉 Найден собеседник: ${match.username}!`,
                            () => { window.location.href = '/roulette/'; }
                        );
                    }
                }, 1000);
            }, MIN_SEARCH_TIME);
        } else {
            hideSearchProcess();
            alert('Не найдено подходящих собеседников');
        }
    } finally {
        // Разблокировка кнопки в любом случае
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🎲 Начать поиск';
        }
    }
}

async function startGroup(e) {
    e.preventDefault();
    showSearchProcess();

    const form = document.getElementById('create-group-form');

    await fetch('/roulette/api/group/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        },
        body: JSON.stringify({
            building: form.building.value,
            budget: form.budget.value,
            needed_people: form.needed_people.value
        })
    });

    const res = await fetch('/roulette/api/group/find/');
    const match = await res.json();

    if (match.status === 'found') {
        currentMatchData = match;

        searchTimer = setTimeout(() => {
            stopSlotOnWin();
            searchProcessText.innerText = 'Компания найдена!';

            setTimeout(() => {
                hideSearchProcess();
                showMatchScreen(match);

                if (window.addNotification) {
                    window.addNotification(
                        `🎉 Найдена компания от ${match.username}!`,
                        () => {
                            window.location.href = '/roulette/';
                        }
                    );
                }
            }, 1000);

        }, MIN_SEARCH_TIME);
    } else {
        hideSearchProcess();
        alert('Не найдено подходящих компаний');
    }
}

document.getElementById('create-solo-form').onsubmit = startSolo;
document.getElementById('create-group-form').onsubmit = startGroup;

function scrollToForm(formElement) {
    if (formElement && !formElement.classList.contains('hidden')) {
        setTimeout(() => {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

soloBtn.onclick = () => {
    currentSearchMode = 'solo';
    showForm(soloForm);
    scrollToForm(soloForm);
};

groupBtn.onclick = () => {
    currentSearchMode = 'group';
    showForm(groupForm);
    scrollToForm(groupForm);
};

if (cancelSearchBtn) {
    cancelSearchBtn.onclick = () => {
        if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }

        hideSearchProcess();

        document.querySelector('.roulette-buttons').style.display = 'flex';

        if (currentSearchMode === 'solo') {
            soloForm.classList.remove('hidden');
        }

        if (currentSearchMode === 'group') {
            groupForm.classList.remove('hidden');
        }
    };
}

document.getElementById('screen-accept').onclick = async () => {
    if (currentMatchData && currentMatchData.group_id) {
        await fetch(`/roulette/api/group/join/${currentMatchData.group_id}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        });
    }

    alert(`Вы идёте на обед с ${currentMatchData.username}`);
    location.href = '/roulette/';
};

document.getElementById('screen-again').onclick = () => {
    matchScreen.classList.add('hidden');

    if (currentSearchMode === 'group') {
        document.getElementById('create-group-form').dispatchEvent(new Event('submit'));
    } else {
        document.getElementById('create-solo-form').dispatchEvent(new Event('submit'));
    }
};

document.getElementById('screen-cancel').onclick = () => {
    matchScreen.classList.add('hidden');
    location.href = '/roulette/';
};

// Анимации для кнопок рулетки
const onepersonIcon = document.getElementById('oneperson-animation');
const twopersonIcon = document.getElementById('twoperson-animation');

if (onepersonIcon && twopersonIcon) {
    const onepersonAnimation = lottie.loadAnimation({
        container: onepersonIcon,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: '/static/animations/obed-ruletka/oneperson.json'
    });

    const twopersonAnimation = lottie.loadAnimation({
        container: twopersonIcon,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: '/static/animations/obed-ruletka/twoperson.json'
    });

    onepersonAnimation.addEventListener('DOMLoaded', () => {
        onepersonAnimation.goToAndStop(0, true);
    });

    twopersonAnimation.addEventListener('DOMLoaded', () => {
        twopersonAnimation.goToAndStop(0, true);
    });

    soloBtn.addEventListener('mouseenter', () => {
        onepersonAnimation.stop();
        onepersonAnimation.goToAndPlay(0, true);
    });

    groupBtn.addEventListener('mouseenter', () => {
        twopersonAnimation.stop();
        twopersonAnimation.goToAndPlay(0, true);
    });

    soloBtn.addEventListener('mouseleave', () => {
        onepersonAnimation.goToAndStop(0, true);
    });

    groupBtn.addEventListener('mouseleave', () => {
        twopersonAnimation.goToAndStop(0, true);
    });
}