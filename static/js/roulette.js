const soloBtn = document.getElementById('solo-btn');
const groupBtn = document.getElementById('group-btn');
const soloForm = document.getElementById('solo-form');
const groupForm = document.getElementById('group-form');
const modal = document.getElementById('matchModal');

let currentMatchData = null;

function showForm(formToShow) {
    soloForm.classList.add('hidden');
    groupForm.classList.add('hidden');
    formToShow.classList.remove('hidden');
}

soloBtn.onclick = () => showForm(soloForm);
groupBtn.onclick = () => showForm(groupForm);

function showModal(match) {
    const title = match.needed_people ? '🍽️ Найдена компания!' : '🍽️ Найден собеседник!';
    document.querySelector('#matchModal h3').innerText = title;
    document.getElementById('modal-username').innerText = match.username;
    document.getElementById('modal-building').innerText = match.building;
    document.getElementById('modal-budget').innerText = match.budget;
    document.getElementById('modal-telegram').innerText = match.telegram || '—';
    document.getElementById('modal-vk').innerText = match.vk || '—';
    modal.style.display = 'flex';
}

function hideModal() {
    modal.style.display = 'none';
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
        showModal(match);
    } else {
        alert('Не найдено подходящих собеседников');
    }
}

document.getElementById('create-solo-form').onsubmit = startSolo;

document.getElementById('acceptMatch').onclick = async () => {
    if (currentMatchData && currentMatchData.group_id) {
        await fetch(`/roulette/api/group/join/${currentMatchData.group_id}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        });
        alert(`Вы присоединились к компании ${currentMatchData.username}!`);
    } else if (currentMatchData) {
        alert(`Вы договорились об обеде с ${currentMatchData.username}!`);
    }
    hideModal();
    location.href = '/roulette/';
};
document.getElementById('searchAgain').onclick = () => {
    hideModal();
    document.getElementById('create-solo-form').dispatchEvent(new Event('submit'));
};
document.getElementById('cancelMatch').onclick = () => {
    hideModal();
    location.href = '/roulette/';
};

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
        showModal(match);
    } else {
        alert('Не найдено подходящих компаний');
    }
}

document.getElementById('create-group-form').onsubmit = startGroup;

// Автоскролл к форме после её появления
function scrollToForm(formElement) {
    if (formElement && !formElement.classList.contains('hidden')) {
        setTimeout(() => {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// Переопределяем показ формы с автоскроллом
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