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
    
    // Устанавливаем аватарку
    const avatarImg = document.getElementById('match-avatar-img');
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const defaultAvatar = isDarkTheme 
        ? '/static/images/default_avatar_dark_theme.jpg' 
        : '/static/images/default_avatar.jpg';
    
    if (match.avatar_url) {
        avatarImg.src = match.avatar_url;
        avatarImg.onerror = function() {
            this.src = defaultAvatar;
            this.onerror = null;
        };
    } else {
        avatarImg.src = defaultAvatar;
    }
}

// ========== ГРУППОВОЙ МАТЧ ==========
function showGroupMatch(match) {
    document.getElementById('single-match-card').classList.add('hidden');
    document.getElementById('group-members-container').classList.remove('hidden');
    
    const slotsLeft = match.slots_left || (match.needed_people - match.current_members);
    
    if (slotsLeft === 1) {
        document.getElementById('match-title-text').textContent = 'Найдена компания! Последнее место!';
    } else {
        document.getElementById('match-title-text').textContent = 'Найдена компания!';
    }

    document.getElementById('screen-building').innerText = match.building;
    document.getElementById('screen-budget').innerText = match.budget;
    
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const defaultAvatar = isDarkTheme 
        ? '/static/images/default_avatar_dark_theme.jpg' 
        : '/static/images/default_avatar.jpg';

    const list = document.getElementById('group-members-list');
    
    let html = match.members.map(m => {
        const avatarSrc = m.avatar_url || defaultAvatar;
        const onError = m.avatar_url 
            ? `onerror="this.src='${defaultAvatar}'; this.onerror=null;"` 
            : '';
        
        return `
            <div class="group-member-card filled">
                <img src="${avatarSrc}" alt="${m.username}" ${onError}>
                <div class="member-name">${m.username}</div>
                <div class="member-contact">📱 ${m.telegram}</div>
            </div>
        `;
    }).join('');
    
    for (let i = 0; i < slotsLeft; i++) {
        html += `
            <div class="group-member-card empty">
                <div class="empty-slot">👤</div>
                <div class="member-name">Ещё нет</div>
                <div class="member-contact">Ожидаем...</div>
            </div>
        `;
    }
    
    html += `
        <div class="group-info">
            Собралось ${match.current_members} из ${match.needed_people} человек
        </div>
    `;
    
    list.innerHTML = html;
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
                'X-CSRFToken': window.CSRF_TOKEN
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
                document.querySelector('#not-found-title').textContent = 'Собеседник не найден!';
                document.querySelector('#not-found-text').textContent = 'Попробуйте изменить параметры поиска';
                document.getElementById('not-found-cancel').textContent = '❌ Не искать';
                document.getElementById('not-found-again').textContent = '🔄 Попробовать ещё раз';
                document.getElementById('not-found-create').classList.add('hidden');
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

    // Защита от двойного нажатия
    const submitBtn = document.getElementById('start-group');
    if (submitBtn.disabled) return;  // уже запущено
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Поиск...';
    }
    showSearchProcess();
    scrollToElement(searchProcess);
    try {
        const form = document.getElementById('create-group-form');
        const neededPeople = form.needed_people.value;

        const createRes = await fetch('/roulette/api/group/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.CSRF_TOKEN
            },
            body: JSON.stringify({
                building: form.building.value,
                budget: form.budget.value,
                needed_people: neededPeople || null
            })
        });
        const createData = await createRes.json();
        if (createData.dialog_id) {
            currentMatchData = { dialog_id: createData.dialog_id };
        }

        const searchStart = Date.now();
        const res = await fetch('/roulette/api/group/find/');
        const match = await res.json();
        const elapsed = Date.now() - searchStart;
        if (elapsed < MIN_SEARCH_TIME) {
            await new Promise(resolve => setTimeout(resolve, MIN_SEARCH_TIME - elapsed));
        }

        if (match.status === 'found') {
            currentMatchData = { ...match, dialog_id: match.dialog_id || currentMatchData?.dialog_id };
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
                        `🎉 Найдена компания!`,
                        () => { window.location.href = '/roulette/'; }
                    );
                }
            }, 1000);
        } else if (match.status === 'waiting') {
            stopSlotOnWin();
            searchProcessText.innerText = 'Компаний пока нет...';
            setTimeout(() => {
                hideSearchProcess();
                
                document.querySelector('.greeting').style.display = 'none';
                document.querySelector('.roulette-buttons').style.display = 'none';
                soloForm.classList.add('hidden');
                groupForm.classList.add('hidden');
                
                notFoundScreen.classList.remove('hidden');
                document.querySelector('#not-found-title').textContent = 'Компания не найдена';
                document.querySelector('#not-found-text').textContent = 'Нет доступных компаний. Станьте первым!';
                
                document.getElementById('not-found-cancel').textContent = '❌ Не искать';
                document.getElementById('not-found-again').textContent = '🔄 Попробовать ещё раз';
                document.getElementById('not-found-create').textContent = '🚀 Создать компанию';
                document.getElementById('not-found-create').classList.remove('hidden');
                
                document.getElementById('not-found-create').onclick = () => {
                    showCreateGroupModal();
                };
                
                setTimeout(() => {
                    notFoundScreen.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
            }, 2000);
        } else {
            stopSlotOnWin();
            setTimeout(() => {
                hideSearchProcess();
                notFoundScreen.classList.remove('hidden');
                document.querySelector('#not-found-title').textContent = 'Собеседник не найден';
                document.querySelector('#not-found-text').textContent = 'Попробуйте изменить параметры поиска';
                document.getElementById('not-found-cancel').textContent = '❌ Не искать';
                document.getElementById('not-found-again').textContent = '🔄 Попробовать ещё раз';
                document.getElementById('not-found-create').classList.add('hidden');
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

// ========== МОДАЛЬНОЕ ОКНО ДЛЯ СОЗДАНИЯ КОМПАНИИ ==========
function showCreateGroupModal() {
    const modal = document.getElementById('match-modal');
    const modalTitle = modal.querySelector('h3');
    const modalText = document.getElementById('modal-match-text');
    const confirmBtn = document.getElementById('modal-chat-btn');
    const cancelBtn = document.getElementById('modal-later-btn');
    
    // Получаем размер компании из формы (если был указан)
    const neededPeopleInput = document.querySelector('#create-group-form input[name="needed_people"]');
    const requestedSize = neededPeopleInput ? parseInt(neededPeopleInput.value) : null;
    
    if (requestedSize && requestedSize >= 3) {
        // Пользователь указал размер → спрашиваем подтверждение
        modalTitle.textContent = '🚀 Создать компанию?';
        modalText.innerHTML = `
            <p style="margin-bottom: 15px; font-size: 18px;">
                Создать компанию из <strong>${requestedSize} человек</strong> (включая вас)?
            </p>
            <p style="color: #888; font-size: 14px;">
                Вы станете первым участником и будете ждать остальных.
            </p>
        `;
        confirmBtn.textContent = `✅ Да`;
        cancelBtn.textContent = '✏️ Изменить';
        
        confirmBtn.onclick = async () => {
            modal.style.display = 'none';
            notFoundScreen.classList.add('hidden');
            await createCompany(requestedSize);
        };
        
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            // Показываем окно с выбором размера
            showSizePickerModal();
        };
    } else {
        // Размер не указан → сразу показываем выбор размера
        showSizePickerModal();
    }
    
    modal.style.display = 'flex';
}

// ========== ОКНО ВЫБОРА РАЗМЕРА КОМПАНИИ ==========
function showSizePickerModal() {
    const modal = document.getElementById('match-modal');
    const modalTitle = modal.querySelector('h3');
    const modalText = document.getElementById('modal-match-text');
    const confirmBtn = document.getElementById('modal-chat-btn');
    const cancelBtn = document.getElementById('modal-later-btn');
    
    modalTitle.textContent = '🚀 Создать компанию';
    modalText.innerHTML = `
        <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #2c3e50;">
                Сколько человек будет (включая вас)?
            </label>
            <input type="number" 
                   id="group-size-input" 
                   placeholder="Минимум 3 человека" 
                   min="3" 
                   max="10"
                   style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 15px; font-family: 'Tobi'; font-size: 16px; text-align: center; box-sizing: border-box;">
            <small style="color: #999; font-size: 12px; display: block; margin-top: 5px;">
                Компания от 3 человек (включая вас)
            </small>
        </div>
    `;
    confirmBtn.textContent = '✅ Создать';
    cancelBtn.textContent = '❌ Отмена';
    
    confirmBtn.onclick = async () => {
        const sizeInput = document.getElementById('group-size-input');
        const size = parseInt(sizeInput.value);
        
        if (!size || size < 3) {
            alert('Минимальный размер компании — 3 человека (включая вас)');
            return;
        }
        
        modal.style.display = 'none';
        notFoundScreen.classList.add('hidden');
        await createCompany(size);
    };
    
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    modal.style.display = 'flex';
}

// ========== ФУНКЦИЯ СОЗДАНИЯ КОМПАНИИ ==========
async function createCompany(size) {
    const res = await fetch('/roulette/api/group/create-company/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN
        },
        body: JSON.stringify({ size: size })
    });
    const data = await res.json();
    
    if (data.dialog_id) {
        currentMatchData = { dialog_id: data.dialog_id };
        
        showResultModal(
            '🚀 Компания создана!',
            `Вы ищете компанию из <strong>${size} человек</strong>.<br>Вы первый в очереди!`,
            '💬 Открыть чат',
            '⏰ Позже',
            () => { window.location.href = `/roulette/messages/${data.dialog_id}/`; },
            () => { location.href = '/roulette/'; }
        );
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
    cancelSearchBtn.onclick = async () => {
        if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }

        hideSearchProcess();
        
        if (currentSearchMode === 'solo') {
            await fetch('/roulette/api/solo/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.CSRF_TOKEN
                },
                body: JSON.stringify({ building: '1', budget: 'any' })
            });
        } else if (currentSearchMode === 'group') {
            await fetch('/roulette/api/group/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.CSRF_TOKEN
                },
                body: JSON.stringify({ building: '1', budget: 'any', needed_people: null })
            });
        }
        
        document.querySelector('.roulette-buttons').style.display = 'flex';
        document.querySelector('.greeting').style.display = '';
        if (currentSearchMode === 'solo') {
            soloForm.classList.remove('hidden');
        } else if (currentSearchMode === 'group') {
            groupForm.classList.remove('hidden');
        }
    };
}

// ========== КНОПКА "ИСКАТЬ ДРУГОГО" ==========
document.getElementById('screen-again').onclick = () => {
    matchScreen.classList.add('hidden');
    if (currentSearchMode === 'group') {
        document.getElementById('create-group-form').dispatchEvent(new Event('submit'));
    } else {
        document.getElementById('create-solo-form').dispatchEvent(new Event('submit'));
    }
};

// ========== ФУНКЦИЯ ПОКАЗА МОДАЛЬНОГО ОКНА РЕЗУЛЬТАТА ==========
function showResultModal(title, message, confirmText, cancelText, onConfirm, onCancel) {
    const modal = document.getElementById('match-modal');
    const modalTitle = modal.querySelector('h3');
    const modalText = document.getElementById('modal-match-text');
    const confirmBtn = document.getElementById('modal-chat-btn');
    const cancelBtn = document.getElementById('modal-later-btn');
    
    modalTitle.textContent = title;
    modalText.innerHTML = message;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    
    confirmBtn.onclick = () => {
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    };
    
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
        if (onCancel) onCancel();
    };
    
    modal.style.display = 'flex';
}

// ========== ФУНКЦИЯ ДИАЛОГА ПОДТВЕРЖДЕНИЯ (для "Выйти"/"Не искать") ==========
function showConfirmDialog(message, confirmText, cancelText, onConfirm, onCancel) {
    showResultModal('🤔 Подтверждение', message, confirmText, cancelText, onConfirm, onCancel);
}

// ========== КНОПКА "ПОЙДУ" ==========
document.getElementById('screen-accept').onclick = async () => {
    const acceptBtn = document.getElementById('screen-accept');
    acceptBtn.disabled = true;
    acceptBtn.textContent = '⏳...';
    try {
        // ГРУППОВОЙ МАТЧ
        if (currentMatchData && currentMatchData.group_id) {
            const joinRes = await fetch(`/roulette/api/group/join/${currentMatchData.group_id}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': window.CSRF_TOKEN
                }
            });
            const joinData = await joinRes.json();
            if (joinData.dialog_id) {
                currentMatchData.dialog_id = joinData.dialog_id;
            }
            
            if (joinData.is_full) {
                showResultModal(
                    '🎉 Группа собрана!',
                    'Все участники в сборе!<br>Приятного обеда! 🍽️',
                    '💬 Открыть чат',
                    '⏰ Позже',
                    () => { window.location.href = `/roulette/messages/${currentMatchData.dialog_id}/`; },
                    () => { location.href = '/roulette/'; }
                );
            } else {
                showResultModal(
                    '✅ Вы присоединились к компании!',
                    `Осталось найти ещё <strong>${joinData.slots_left} чел.</strong><br>Можете начать общаться в чате.`,
                    '💬 Открыть чат',
                    '⏰ Позже',
                    () => { window.location.href = `/roulette/messages/${currentMatchData.dialog_id}/`; },
                    () => { location.href = '/roulette/'; }
                );
            }
            return;
        }
        
        // СОЛО-МАТЧ
        const response = await fetch('/roulette/api/solo/accept/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.CSRF_TOKEN
            }
        });
        const data = await response.json();
        if (data.dialog_id) {
            currentMatchData.dialog_id = data.dialog_id;
        }
        
        showResultModal(
            '🎉 Вы договорились об обеде!',
            `Хотите связаться с <strong>${currentMatchData.username}</strong>?`,
            '💬 Написать в чат',
            '⏰ Позже',
            () => { window.location.href = `/roulette/messages/${currentMatchData.dialog_id}/`; },
            () => { location.href = '/roulette/'; }
        );
    } finally {
        acceptBtn.disabled = false;
        acceptBtn.textContent = '✅ Пойду';
    }
};

// ========== КНОПКА "ВЫЙТИ" (с экрана матча) ==========
document.getElementById('screen-cancel').onclick = () => {
    showConfirmDialog(
        'У вас есть активная заявка.<br>Оставить её или аннулировать?',
        '✅ Оставить',
        '🗑️ Аннулировать',
        () => {
            matchScreen.classList.add('hidden');
            document.querySelector('.greeting').style.display = '';
            document.querySelector('.roulette-buttons').style.display = '';
        },
        async () => {
            if (currentSearchMode === 'solo') {
                await fetch('/roulette/api/solo/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': window.CSRF_TOKEN
                    },
                    body: JSON.stringify({ building: '1', budget: 'any' })
                });
            } else if (currentSearchMode === 'group') {
                await fetch('/roulette/api/group/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': window.CSRF_TOKEN
                    },
                    body: JSON.stringify({ building: '1', budget: 'any', needed_people: null })
                });
            }
            
            matchScreen.classList.add('hidden');
            document.querySelector('.greeting').style.display = '';
            document.querySelector('.roulette-buttons').style.display = '';
        }
    );
};

// ========== КНОПКА "НЕ ИСКАТЬ" ==========
document.getElementById('not-found-cancel').addEventListener('click', () => {
    showConfirmDialog(
        'У вас есть активная заявка.<br>Оставить её или аннулировать?',
        '✅ Оставить',
        '🗑️ Аннулировать',
        () => {
            notFoundScreen.classList.add('hidden');
            document.querySelector('.greeting').style.display = '';
            document.querySelector('.roulette-buttons').style.display = '';
        },
        async () => {
            if (currentSearchMode === 'solo') {
                await fetch('/roulette/api/solo/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': window.CSRF_TOKEN
                    },
                    body: JSON.stringify({ building: '1', budget: 'any' })
                });
            } else if (currentSearchMode === 'group') {
                await fetch('/roulette/api/group/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': window.CSRF_TOKEN
                    },
                    body: JSON.stringify({ building: '1', budget: 'any', needed_people: null })
                });
            }
            
            notFoundScreen.classList.add('hidden');
            document.querySelector('.greeting').style.display = '';
            document.querySelector('.roulette-buttons').style.display = '';
        }
    );
});

// ========== КНОПКА "ПОПРОБОВАТЬ ЕЩЁ РАЗ" ==========
document.getElementById('not-found-again').addEventListener('click', () => {
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