const soloBtn = document.getElementById('solo-btn');
const groupBtn = document.getElementById('group-btn');
const soloForm = document.getElementById('solo-form');
const groupForm = document.getElementById('group-form');
const matchModal = document.getElementById('matchModal');
const confirmModal = document.getElementById('confirmModal');

let currentMatchData = null;

function showForm(formToShow) {
    soloForm.classList.add('hidden');
    groupForm.classList.add('hidden');
    formToShow.classList.remove('hidden');
}

soloBtn.onclick = () => showForm(soloForm);
groupBtn.onclick = () => showForm(groupForm);

function hideMatchModal() {
    matchModal.style.display = 'none';
}

function hideConfirmModal() {
    confirmModal.style.display = 'none';
}

function showMatchModal(match) {
    const title = match.needed_people ? '🍽️ Найдена компания!' : '🍽️ Найден собеседник!';
    document.querySelector('#matchModal h3').innerText = title;
    document.getElementById('modal-username').innerText = match.username;
    document.getElementById('modal-building').innerText = match.building;
    document.getElementById('modal-budget').innerText = match.budget;
    document.getElementById('modal-telegram').innerText = match.telegram || '—';
    document.getElementById('modal-vk').innerText = match.vk || '—';
    matchModal.style.display = 'flex';
}

function showConfirmModal(username) {
    document.getElementById('confirm-username').innerText = username;
    confirmModal.style.display = 'flex';
}

async function startSolo(e) {
    e.preventDefault();
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
        showMatchModal(match);
        
        // Уведомление в колокольчик
        if (window.addNotification) {
            window.addNotification(
                `🎉 Найден собеседник: ${match.username}!`,
                () => {
                    window.location.href = '/roulette/';
                }
            );
        }
    } else {
        alert('Не найдено подходящих собеседников');
    }
}

document.getElementById('create-solo-form').onsubmit = startSolo;

// КНОПКА "ПОЙДУ" — закрывает первое модальное окно, открывает второе
document.getElementById('acceptMatch').onclick = async () => {
    if (currentMatchData && currentMatchData.group_id) {
        await fetch(`/roulette/api/group/join/${currentMatchData.group_id}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        });
    }
    
    // Закрываем первое окно, открываем второе
    hideMatchModal();
    showConfirmModal(currentMatchData.username);
};

// КНОПКА "НАПИСАТЬ В ЧАТ" во втором окне
document.getElementById('goToChatBtn').onclick = () => {
    if (currentMatchData && currentMatchData.dialog_id) {
        window.location.href = `/roulette/messages/${currentMatchData.dialog_id}/`;
    } else {
        alert('Ошибка: диалог не найден');
    }
};

// КНОПКА "ПОЗЖЕ" — закрывает второе окно и возвращает на главную рулетки
document.getElementById('laterBtn').onclick = () => {
    hideConfirmModal();
    window.location.href = '/roulette/';
};

document.getElementById('searchAgain').onclick = () => {
    hideMatchModal();
    document.getElementById('create-solo-form').dispatchEvent(new Event('submit'));
};

document.getElementById('cancelMatch').onclick = () => {
    hideMatchModal();
    window.location.href = '/roulette/';
};

// ГРУППОВОЙ РЕЖИМ
async function startGroup(e) {
    e.preventDefault();
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
        showMatchModal(match);
        
        if (window.addNotification) {
            window.addNotification(
                `🎉 Найдена компания от ${match.username}!`,
                () => {
                    window.location.href = '/roulette/';
                }
            );
        }
    } else {
        alert('Не найдено подходящих компаний');
    }
}

document.getElementById('create-group-form').onsubmit = startGroup;

// Автоскролл к форме
function scrollToForm(formElement) {
    if (formElement && !formElement.classList.contains('hidden')) {
        setTimeout(() => {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

const originalSoloShow = () => showForm(soloForm);
const originalGroupShow = () => showForm(groupForm);

soloBtn.onclick = () => {
    originalSoloShow();
    scrollToForm(soloForm);
};
groupBtn.onclick = () => {
    originalGroupShow();
    scrollToForm(groupForm);
};