// Кнопки выбора режима
const soloBtn = document.getElementById('solo-btn');
const groupBtn = document.getElementById('group-btn');

// Формы
const soloForm = document.getElementById('solo-form');
const groupForm = document.getElementById('group-form');
const soloSubmitForm = document.getElementById('create-solo-form');
const groupSubmitForm = document.getElementById('create-group-form');

// Экраны
const searchProcess = document.getElementById('search-process');
const notFoundScreen = document.getElementById('not-found-screen');
const matchScreen = document.getElementById('match-screen');

// Элементы поиска
const slotContainer = document.getElementById('slot-animation');
const cancelSearchBtn = document.getElementById('cancelSearchBtn');
const searchProcessText = document.getElementById('search-process-text');

// Кнопки действий
const screenAcceptBtn = document.getElementById('screen-accept');
const screenAgainBtn = document.getElementById('screen-again');
const screenCancelBtn = document.getElementById('screen-cancel');
const notFoundCancelBtn = document.getElementById('not-found-cancel');
const notFoundAgainBtn = document.getElementById('not-found-again');

const SLOT_SPEED = 0.5;
const MIN_SEARCH_TIME = 5000;

let slotAnimation = null;
let searchTimer = null;
let currentMatchData = null;
let currentSearchMode = null;  // 'solo' или 'group'
let activeFetchController = null;  // Для отмены fetch-запроса

/** Прокрутка к элементу */
function scrollToElement(element) {
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/** Прокрутка к форме */
function scrollToForm(formElement) {
    if (formElement && !formElement.classList.contains('hidden')) {
        setTimeout(() => {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

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

/** Загружает статичный Lottie на определённом кадре */
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

/** Показывает форму выбранного режима */
function showForm(formToShow) {
    soloForm.classList.add('hidden');
    groupForm.classList.add('hidden');
    formToShow.classList.remove('hidden');
}

/** Запускает анимацию слота */
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

/** Останавливает слот на последнем кадре */
function stopSlotOnWin() {
    if (!slotAnimation) return;
    slotAnimation.loop = false;
    slotAnimation.setSpeed(SLOT_SPEED);
    if (slotAnimation.totalFrames && slotAnimation.currentFrame) {
        slotAnimation.playSegments(
            [Math.floor(slotAnimation.currentFrame), slotAnimation.totalFrames - 1],
            true
        );
    }
}

/** Отменяет текущий поиск (очищает заявки) */
async function cancelCurrentSearch() {
    if (activeFetchController) {
        activeFetchController.abort();
        activeFetchController = null;
    }
    await fetch('/roulette/api/cancel-search/', {
        method: 'POST',
        headers: { 'X-CSRFToken': window.CSRF_TOKEN }
    });
}

/** Показывает экран процесса поиска */
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

/** Скрывает экран процесса поиска */
function hideSearchProcess() {
    searchProcess.classList.add('hidden');
    if (slotAnimation) {
        slotAnimation.stop();
    }
}

/** Показывает главный экран */
function showMainScreen() {
    document.querySelector('.greeting').style.display = '';
    document.querySelector('.roulette-buttons').style.display = 'flex';
}

/** Отображает соло-матч */
function showSoloMatch(match) {
    document.getElementById('group-members-container').classList.add('hidden');
    document.getElementById('single-match-card').classList.remove('hidden');
    document.getElementById('match-title-text').textContent = 'Найден сообедник!';
    document.getElementById('screen-username').innerText = match.username;
    document.getElementById('screen-building').innerText = match.building;
    document.getElementById('screen-budget').innerText = match.budget;
    document.getElementById('screen-telegram').innerText = match.telegram || '—';
    document.getElementById('screen-vk').innerText = match.vk || '—';

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

/** Отображает групповой матч */
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

/** Показывает экран матча */
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

/** Показывает модальное окно результата */
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
        modal.classList.add('hidden');
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        if (onCancel) onCancel();
    };

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

/** Показывает диалог подтверждения */
function showConfirmDialog(message, confirmText, cancelText, onConfirm, onCancel) {
    showResultModal('Подтверждение', message, confirmText, cancelText, onConfirm, onCancel);
}

/** Показывает окно создания группы */
function showCreateGroupModal() {
    const modal = document.getElementById('match-modal');
    const modalTitle = modal.querySelector('h3');
    const modalText = document.getElementById('modal-match-text');
    const confirmBtn = document.getElementById('modal-chat-btn');
    const cancelBtn = document.getElementById('modal-later-btn');

    const neededPeopleInput = document.querySelector('#create-group-form input[name="needed_people"]');
    const requestedSize = neededPeopleInput ? parseInt(neededPeopleInput.value) : null;

    if (requestedSize && requestedSize >= 3) {
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
            modal.classList.add('hidden');
            modal.style.display = 'none';
            notFoundScreen.classList.add('hidden');
            await createCompany(requestedSize);
        };

        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            showSizePickerModal();
        };
    } else {
        showSizePickerModal();
        return;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

/** Показывает окно выбора размера компании */
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

        modal.classList.add('hidden');
        modal.style.display = 'none';
        notFoundScreen.classList.add('hidden');
        await createCompany(size);
    };

    cancelBtn.onclick = () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    };

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

/** Создаёт компанию */
async function createCompany(size) {
    const modal = document.getElementById('match-modal');
    const modalButtons = modal.querySelectorAll('button');
    modalButtons.forEach(btn => btn.disabled = true);

    try {
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
    } catch (error) {
        console.error('Ошибка при создании компании:', error);
        alert('Произошла ошибка. Попробуйте ещё раз.');
    } finally {
        modalButtons.forEach(btn => btn.disabled = false);
    }
}

/** Перезапустить соло-поиск с существующей заявкой */
async function startSoloFromExisting() {
    showSearchProcess();
    scrollToElement(searchProcess);

    activeFetchController = new AbortController();

    try {
        const searchStart = Date.now();
        const res = await fetch('/roulette/api/solo/find/', {
            signal: activeFetchController.signal
        });
        const match = await res.json();
        const elapsed = Date.now() - searchStart;

        if (elapsed < MIN_SEARCH_TIME) {
            await new Promise(resolve => setTimeout(resolve, MIN_SEARCH_TIME - elapsed));
        }

        if (activeFetchController.signal.aborted) return;

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
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Поиск отменён');
        } else {
            console.error('Ошибка:', error);
            hideSearchProcess();
            showMainScreen();
            soloForm.classList.remove('hidden');
            alert('Ошибка соединения');
        }
    } finally {
        activeFetchController = null;
    }
}

/** Перезапустить групповой поиск с существующей заявкой */
async function startGroupFromExisting() {
    showSearchProcess();
    scrollToElement(searchProcess);

    activeFetchController = new AbortController();

    try {
        const searchStart = Date.now();
        const res = await fetch('/roulette/api/group/find/', {
            signal: activeFetchController.signal
        });
        const match = await res.json();
        const elapsed = Date.now() - searchStart;

        if (elapsed < MIN_SEARCH_TIME) {
            await new Promise(resolve => setTimeout(resolve, MIN_SEARCH_TIME - elapsed));
        }

        if (activeFetchController.signal.aborted) return;

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
                soloForm.classList.add('hidden');
                groupForm.classList.add('hidden');
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
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Поиск отменён');
        } else {
            console.error('Ошибка:', error);
            hideSearchProcess();
            showMainScreen();
            groupForm.classList.remove('hidden');
            alert('Ошибка соединения');
        }
    } finally {
        activeFetchController = null;
    }
}

/** Старт соло-поиска */
async function startSolo(e) {
    e.preventDefault();

    const form = document.getElementById('create-solo-form');
    const allButtons = form.querySelectorAll('button, select, input');
    allButtons.forEach(el => el.disabled = true);

    const submitBtn = document.getElementById('start-solo');
    if (submitBtn) {
        submitBtn.textContent = '⏳ Поиск...';
    }

    showSearchProcess();
    scrollToElement(searchProcess);

    activeFetchController = new AbortController();

    try {
        await fetch('/roulette/api/solo/save-params/', {
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
        const res = await fetch('/roulette/api/solo/find/', {
            signal: activeFetchController.signal
        });
        const match = await res.json();
        const elapsed = Date.now() - searchStart;

        if (elapsed < MIN_SEARCH_TIME) {
            await new Promise(resolve => setTimeout(resolve, MIN_SEARCH_TIME - elapsed));
        }

        if (activeFetchController.signal.aborted) return;

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
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Поиск отменён пользователем');
        } else {
            console.error('Ошибка при поиске:', error);
            hideSearchProcess();
            showMainScreen();
            soloForm.classList.remove('hidden');
            alert('Ошибка соединения. Проверьте интернет и попробуйте снова.');
        }
    } finally {
        activeFetchController = null;
        allButtons.forEach(el => el.disabled = false);
        if (submitBtn) {
            submitBtn.textContent = '🎲 Начать поиск';
        }
    }
}

/** Старт группового поиска */
async function startGroup(e) {
    e.preventDefault();

    const form = document.getElementById('create-group-form');
    const allButtons = form.querySelectorAll('button, select, input');
    allButtons.forEach(el => el.disabled = true);

    const submitBtn = document.getElementById('start-group');
    if (submitBtn) {
        submitBtn.textContent = '⏳ Поиск...';
    }

    showSearchProcess();
    scrollToElement(searchProcess);

    activeFetchController = new AbortController();

    try {
        const neededPeople = form.needed_people.value;

        await fetch('/roulette/api/group/save-params/', {
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

        const searchStart = Date.now();
        const res = await fetch('/roulette/api/group/find/', {
            signal: activeFetchController.signal
        });
        const match = await res.json();
        const elapsed = Date.now() - searchStart;

        if (elapsed < MIN_SEARCH_TIME) {
            await new Promise(resolve => setTimeout(resolve, MIN_SEARCH_TIME - elapsed));
        }

        if (activeFetchController.signal.aborted) return;

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
                soloForm.classList.add('hidden');
                groupForm.classList.add('hidden');
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
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Поиск отменён пользователем');
        } else {
            console.error('Ошибка при поиске:', error);
            hideSearchProcess();
            showMainScreen();
            groupForm.classList.remove('hidden');
            alert('Ошибка соединения. Проверьте интернет и попробуйте снова.');
        }
    } finally {
        activeFetchController = null;
        allButtons.forEach(el => el.disabled = false);
        if (submitBtn) {
            submitBtn.textContent = '🎲 Начать поиск';
        }
    }
}

// Отправка форм
if (soloSubmitForm) soloSubmitForm.onsubmit = startSolo;
if (groupSubmitForm) groupSubmitForm.onsubmit = startGroup;

// Кнопки выбора режима
if (soloBtn) {
    soloBtn.onclick = () => {
        currentSearchMode = 'solo';
        showForm(soloForm);
        scrollToForm(soloForm);
    };
}

if (groupBtn) {
    groupBtn.onclick = () => {
        currentSearchMode = 'group';
        showForm(groupForm);
        scrollToForm(groupForm);
    };
}

// Кнопка "Назад" во время поиска — ОТМЕНЯЕТ ПОИСК И УДАЛЯЕТ ЗАЯВКУ
if (cancelSearchBtn) {
    cancelSearchBtn.onclick = async () => {
        if (activeFetchController) {
            activeFetchController.abort();
            activeFetchController = null;
        }
        await cancelCurrentSearch();
        hideSearchProcess();
        showMainScreen();
        if (currentSearchMode === 'solo') {
            soloForm.classList.remove('hidden');
        } else if (currentSearchMode === 'group') {
            groupForm.classList.remove('hidden');
        }
    };
}

// Кнопка "Искать другого" — ОЧИЩАЕТ СПИСОК ПРОПУЩЕННЫХ И ПЕРЕЗАПУСКАЕТ ПОИСК С ТОЙ ЖЕ ЗАЯВКОЙ
if (screenAgainBtn) {
    screenAgainBtn.onclick = function() {
        if (this.disabled) return;
        this.disabled = true;
        this.textContent = '⏳ Поиск...';

        matchScreen.classList.add('hidden');

        fetch('/roulette/api/clear-skipped/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': window.CSRF_TOKEN
            }
        }).then(() => {
            if (currentSearchMode === 'group') {
                startGroupFromExisting();
            } else {
                startSoloFromExisting();
            }
        }).finally(() => {
            setTimeout(() => {
                this.disabled = false;
                this.textContent = '🔄 Искать другого';
            }, 5000);
        });
    };
}

// Кнопка "Пойду"
if (screenAcceptBtn) {
    screenAcceptBtn.onclick = async () => {
        if (screenAcceptBtn.disabled) return;

        screenAcceptBtn.disabled = true;
        screenAcceptBtn.textContent = '⏳...';

        try {
            if (currentMatchData && currentMatchData.group_id) {
                const joinRes = await fetch(`/roulette/api/group/join/${currentMatchData.group_id}/`, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': window.CSRF_TOKEN }
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
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка. Попробуйте ещё раз.');
        } finally {
            screenAcceptBtn.disabled = false;
            screenAcceptBtn.textContent = '✅ Пойду';
        }
    };
}

// Кнопка "Выйти" (с экрана матча) — удаляет заявку
if (screenCancelBtn) {
    screenCancelBtn.onclick = () => {
        showConfirmDialog(
            'У вас есть активная заявка.<br>Оставить её, чтобы попадаться другим в обед-рулетке?',
            '✅ Да',
            '🗑️ Нет',
            () => {
                matchScreen.classList.add('hidden');
                showMainScreen();
            },
            async () => {
                await cancelCurrentSearch();
                matchScreen.classList.add('hidden');
                showMainScreen();
            }
        );
    };
}

// Кнопка "Не искать" — удаляет заявку
if (notFoundCancelBtn) {
    notFoundCancelBtn.addEventListener('click', () => {
        showConfirmDialog(
            'У вас есть активная заявка.<br>Оставить её, чтобы попадаться другим в обед-рулетке?',
            '✅ Да',
            '🗑️ Нет',
            () => {
                notFoundScreen.classList.add('hidden');
                showMainScreen();
            },
            async () => {
                await cancelCurrentSearch();
                notFoundScreen.classList.add('hidden');
                showMainScreen();
            }
        );
    });
}

// Кнопка "Попробовать ещё раз"
if (notFoundAgainBtn) {
    notFoundAgainBtn.addEventListener('click', function() {
        if (this.disabled) return;
        this.disabled = true;
        this.textContent = '⏳ Поиск...';

        notFoundScreen.classList.add('hidden');

        if (currentSearchMode === 'group') {
            groupSubmitForm?.dispatchEvent(new Event('submit'));
        } else {
            soloSubmitForm?.dispatchEvent(new Event('submit'));
        }

        setTimeout(() => {
            this.disabled = false;
            this.textContent = '🔄 Попробовать ещё раз';
        }, 3000);
    });
}

// Инициализация анимаций при загрузке
document.addEventListener('DOMContentLoaded', function() {
    const onepersonIcon = document.getElementById('oneperson-animation');
    const twopersonIcon = document.getElementById('twoperson-animation');

    if (!areAnimationsEnabled()) {
        if (onepersonIcon) loadStaticLottie(onepersonIcon, '/static/animations/obed-ruletka/oneperson.json', 0);
        if (twopersonIcon) loadStaticLottie(twopersonIcon, '/static/animations/obed-ruletka/twoperson.json', 0);
    } else {
        if (onepersonIcon) {
            const anim = lottie.loadAnimation({
                container: onepersonIcon,
                renderer: 'svg',
                loop: false,
                autoplay: false,
                path: '/static/animations/obed-ruletka/oneperson.json'
            });
            anim.addEventListener('DOMLoaded', () => anim.goToAndStop(0, true));
            soloBtn?.addEventListener('mouseenter', () => anim.goToAndPlay(0, true));
            soloBtn?.addEventListener('mouseleave', () => anim.goToAndStop(0, true));
        }
        if (twopersonIcon) {
            const anim = lottie.loadAnimation({
                container: twopersonIcon,
                renderer: 'svg',
                loop: false,
                autoplay: false,
                path: '/static/animations/obed-ruletka/twoperson.json'
            });
            anim.addEventListener('DOMLoaded', () => anim.goToAndStop(0, true));
            groupBtn?.addEventListener('mouseenter', () => anim.goToAndPlay(0, true));
            groupBtn?.addEventListener('mouseleave', () => anim.goToAndStop(0, true));
        }
    }
});

// Переопределение initSlotAnimation для учёта настроек анимаций
const originalInitSlot = initSlotAnimation;
initSlotAnimation = function() {
    if (!slotContainer) return;
    if (!areAnimationsEnabled()) {
        loadStaticLottie(slotContainer, '/static/animations/obed-ruletka/SlotMachine.json', 0);
        return;
    }
    originalInitSlot();
};