const soloBtn = document.getElementById('solo-btn');
const groupBtn = document.getElementById('group-btn');
const soloForm = document.getElementById('solo-form');
const groupForm = document.getElementById('group-form');

const searchProcess = document.getElementById('search-process');
const slotContainer = document.getElementById('slot-animation');
const cancelSearchBtn = document.getElementById('cancelSearchBtn');
const searchProcessText = document.getElementById('search-process-text');
const notFoundScreen = document.getElementById('not-found-screen');
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

    searchProcessText.innerText = 'Подождите, ищем компанию...';
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

// ========== СОЛО-МАТЧ ==========
function showSoloMatch(match) {
    document.getElementById('group-members-container').classList.add('hidden');
    document.getElementById('single-match-card').classList.remove('hidden');
    document.getElementById('match-title-text').textContent = 'Найден сообедник!';

    document.getElementById('screen-username').innerText = match.username;
    document.getElementById('screen-building').innerText = match.building;
    document.getElementById('screen-budget').innerText = match.budget;
    document.getElementById('screen-telegram').innerText = match.telegram || '—';
    document.getElementById('screen-vk').innerText = match.vk || '—';
}

// ========== ГРУППОВОЙ МАТЧ ==========
function showGroupMatch(match) {
    document.getElementById('single-match-card').classList.add('hidden');
    document.getElementById('group-members-container').classList.remove('hidden');
    document.getElementById('match-title-text').textContent = 'Найдена компания!';

    document.getElementById('screen-building').innerText = match.building;
    document.getElementById('screen-budget').innerText = match.budget;

    const list = document.getElementById('group-members-list');
    list.innerHTML = match.members.map(m => `
        <div class="group-member-card">
            <img src="/static/images/default_avatar.jpg" alt="${m.username}">
            <div class="member-name">${m.username}</div>
            <div class="member-contact">📱 ${m.telegram}</div>
            <div class="member-contact">📘 ${m.vk}</div>
        </div>
    `).join('');
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

    // Определяем тип матча: соло или группа
    if (match.members && match.members.length > 0) {
        showGroupMatch(match);
    } else {
        showSoloMatch(match);
    }

    matchScreen.classList.remove('hidden');
}

// ========== СТАРТ СОЛО-ПОИСКА ==========
async function startSolo(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('start-solo');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Поиск...';
    }
    
    showSearchProcess();
    scrollToElement(searchProcess);
    
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
        
        const searchStart = Date.now();
        const res = await fetch('/roulette/api/solo/find/');
        const match = await res.json();
        
        const elapsed = Date.now() - searchStart;
        if (elapsed < MIN_SEARCH_TIME) {
            await new Promise(resolve => setTimeout(resolve, MIN_SEARCH_TIME - elapsed));
        }
        
        if (match.status === 'found') {
            currentMatchData = match;
            
            stopSlotOnWin();
            searchProcessText.innerText = 'Собеседник найден!';
            
            setTimeout(() => {
                hideSearchProcess();
                showMatchScreen(match);
                setTimeout(() => {
                    matchScreen.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
                
                if (window.addNotification) {
                    window.addNotification(
                        `🎉 Найден собеседник: ${match.username}!`,
                        () => { window.location.href = '/roulette/'; }
                    );
                }
            }, 1000);
        } else {
            stopSlotOnWin();
            setTimeout(() => {
                hideSearchProcess();
                document.querySelector('.greeting').style.display = 'none';
                document.querySelector('.roulette-buttons').style.display = 'none';
                soloForm.classList.add('hidden');
                groupForm.classList.add('hidden');
                notFoundScreen.classList.remove('hidden');
                setTimeout(() => {
                    notFoundScreen.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
            }, 2000);
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🎲 Начать поиск';
        }
    }
}

// ========== СТАРТ ГРУППОВОГО ПОИСКА ==========
async function startGroup(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('start-group');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Поиск...';
    }
    
    showSearchProcess();
    scrollToElement(searchProcess);

    try {
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

        const searchStart = Date.now();
        const res = await fetch('/roulette/api/group/find/');
        const match = await res.json();
        
        const elapsed = Date.now() - searchStart;
        if (elapsed < MIN_SEARCH_TIME) {
            await new Promise(resolve => setTimeout(resolve, MIN_SEARCH_TIME - elapsed));
        }

        if (match.status === 'found') {
            currentMatchData = match;

            stopSlotOnWin();
            searchProcessText.innerText = 'Компания найдена!';

            setTimeout(() => {
                hideSearchProcess();
                showMatchScreen(match);
                setTimeout(() => {
                    matchScreen.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);

                if (window.addNotification) {
                    window.addNotification(
                        `🎉 Найдена компания от ${match.group_name || match.username}!`,
                        () => { window.location.href = '/roulette/'; }
                    );
                }
            }, 1000);
        } else if (match.status === 'waiting') {
            // Групп пока нет — ждём
            stopSlotOnWin();
            searchProcessText.innerText = 'Ищем компанию... Пока никого нет, но вы в очереди!';
            
            setTimeout(() => {
                hideSearchProcess();
                document.querySelector('.greeting').style.display = 'none';
                document.querySelector('.roulette-buttons').style.display = 'none';
                soloForm.classList.add('hidden');
                groupForm.classList.add('hidden');
                notFoundScreen.classList.remove('hidden');
                setTimeout(() => {
                    notFoundScreen.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
            }, 2000);
        } else {
            stopSlotOnWin();
            setTimeout(() => {
                hideSearchProcess();
                document.querySelector('.greeting').style.display = 'none';
                document.querySelector('.roulette-buttons').style.display = 'none';
                soloForm.classList.add('hidden');
                groupForm.classList.add('hidden');
                notFoundScreen.classList.remove('hidden');
                setTimeout(() => {
                    notFoundScreen.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
            }, 2000);
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🎲 Начать поиск';
        }
    }
}

// ========== ОБРАБОТЧИКИ ФОРМ ==========
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

// ========== КНОПКА "НАЗАД" ВО ВРЕМЯ ПОИСКА ==========
if (cancelSearchBtn) {
    cancelSearchBtn.onclick = () => {
        if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }

        hideSearchProcess();
        document.querySelector('.roulette-buttons').style.display = 'flex';
        document.querySelector('.greeting').style.display = '';

        if (currentSearchMode === 'solo') {
            soloForm.classList.remove('hidden');
        } else if (currentSearchMode === 'group') {
            groupForm.classList.remove('hidden');
        }
    };
}

// ========== КНОПКА "ПОЙДУ" ==========
document.getElementById('screen-accept').onclick = async () => {
    const acceptBtn = document.getElementById('screen-accept');
    acceptBtn.disabled = true;
    acceptBtn.textContent = '⏳...';
    
    try {
        // Групповой матч — присоединяемся к группе
        if (currentMatchData && currentMatchData.group_id) {
            const joinRes = await fetch(`/roulette/api/group/join/${currentMatchData.group_id}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });
            const joinData = await joinRes.json();
            
            if (joinData.dialog_id) {
                currentMatchData.dialog_id = joinData.dialog_id;
            }
            
            document.getElementById('modal-username').textContent = 'компанией';
            document.getElementById('modal-match-text').innerHTML = 
                `Вы присоединились к компании!${joinData.is_full ? ' Группа собрана!' : ''}`;
            document.getElementById('match-modal').style.display = 'flex';
            
            document.getElementById('modal-chat-btn').onclick = () => {
                if (joinData.dialog_id) {
                    window.location.href = `/roulette/messages/${joinData.dialog_id}/`;
                }
            };
            
            document.getElementById('modal-later-btn').onclick = () => {
                document.getElementById('match-modal').style.display = 'none';
                location.href = '/roulette/';
            };
            return;
        }
        
        // Соло-матч
        const response = await fetch('/roulette/api/solo/accept/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        });
        
        const data = await response.json();
        
        if (data.dialog_id) {
            currentMatchData.dialog_id = data.dialog_id;
        }
        
        document.getElementById('modal-username').textContent = currentMatchData.username;
        document.getElementById('match-modal').style.display = 'flex';
        
        document.getElementById('modal-chat-btn').onclick = () => {
            if (currentMatchData && currentMatchData.dialog_id) {
                window.location.href = `/roulette/messages/${currentMatchData.dialog_id}/`;
            }
        };
        
        document.getElementById('modal-later-btn').onclick = () => {
            document.getElementById('match-modal').style.display = 'none';
            location.href = '/roulette/';
        };
    } finally {
        acceptBtn.disabled = false;
        acceptBtn.textContent = '✅ Пойду';
    }
};

// ========== КНОПКА "ИСКАТЬ ДРУГОГО" ==========
document.getElementById('screen-again').onclick = () => {
    matchScreen.classList.add('hidden');

    if (currentSearchMode === 'group') {
        document.getElementById('create-group-form').dispatchEvent(new Event('submit'));
    } else {
        document.getElementById('create-solo-form').dispatchEvent(new Event('submit'));
    }
};

// ========== КНОПКА "НЕ ПОЙДУ" ==========
document.getElementById('screen-cancel').onclick = () => {
    matchScreen.classList.add('hidden');
    document.querySelector('.greeting').style.display = '';
    document.querySelector('.roulette-buttons').style.display = '';
};

// ========== КНОПКА "НЕ ИСКАТЬ" (после not found) ==========
document.getElementById('not-found-cancel')?.addEventListener('click', () => {
    notFoundScreen.classList.add('hidden');
    document.querySelector('.greeting').style.display = '';
    document.querySelector('.roulette-buttons').style.display = '';
});

// ========== КНОПКА "ПОПРОБОВАТЬ ЕЩЁ РАЗ" ==========
document.getElementById('not-found-again')?.addEventListener('click', () => {
    notFoundScreen.classList.add('hidden');
    
    if (currentSearchMode === 'group') {
        document.getElementById('create-group-form').dispatchEvent(new Event('submit'));
    } else {
        document.getElementById('create-solo-form').dispatchEvent(new Event('submit'));
    }
});

function scrollToElement(element) {
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ========== АНИМАЦИИ ==========
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

document.addEventListener('DOMContentLoaded', function() {
    const onepersonIcon = document.getElementById('oneperson-animation');
    const twopersonIcon = document.getElementById('twoperson-animation');
    
    if (!areAnimationsEnabled()) {
        if (onepersonIcon) loadStaticLottie(onepersonIcon, '/static/animations/obed-ruletka/oneperson.json', 0);
        if (twopersonIcon) loadStaticLottie(twopersonIcon, '/static/animations/obed-ruletka/twoperson.json', 0);
    } else {
        if (onepersonIcon) {
            const onepersonAnimation = lottie.loadAnimation({
                container: onepersonIcon,
                renderer: 'svg',
                loop: false,
                autoplay: false,
                path: '/static/animations/obed-ruletka/oneperson.json'
            });
            onepersonAnimation.addEventListener('DOMLoaded', () => onepersonAnimation.goToAndStop(0, true));
            soloBtn.addEventListener('mouseenter', () => onepersonAnimation.goToAndPlay(0, true));
            soloBtn.addEventListener('mouseleave', () => onepersonAnimation.goToAndStop(0, true));
        }
        if (twopersonIcon) {
            const twopersonAnimation = lottie.loadAnimation({
                container: twopersonIcon,
                renderer: 'svg',
                loop: false,
                autoplay: false,
                path: '/static/animations/obed-ruletka/twoperson.json'
            });
            twopersonAnimation.addEventListener('DOMLoaded', () => twopersonAnimation.goToAndStop(0, true));
            groupBtn.addEventListener('mouseenter', () => twopersonAnimation.goToAndPlay(0, true));
            groupBtn.addEventListener('mouseleave', () => twopersonAnimation.goToAndStop(0, true));
        }
    }
});

const originalInitSlot = initSlotAnimation;
initSlotAnimation = function() {
    if (!slotContainer) return;
    if (!areAnimationsEnabled()) {
        loadStaticLottie(slotContainer, '/static/animations/obed-ruletka/SlotMachine.json', 0);
        return;
    }
    originalInitSlot();
};