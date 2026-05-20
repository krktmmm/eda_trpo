const buildingButtons = document.querySelectorAll('.building-btn');
const timeButtons = document.querySelectorAll('.time-btn');
const placeCards = document.querySelectorAll('.place-card');

const buildingScreen = document.getElementById('building-screen');
const timeScreen = document.getElementById('time-screen');
const backBtn = document.getElementById('back-btn');
const placesTitle = document.getElementById('places-title');

const mapPlaceholder = document.getElementById('map-placeholder');
const placesContainer = document.getElementById('places-container');

let selectedBuilding = null;
let selectedTime = null;

// Обновление активных кнопок
function updateActiveButtons() {
    // Корпуса
    document.querySelectorAll('.building-btn').forEach(btn => {
        if (selectedBuilding && btn.dataset.building === selectedBuilding) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Время
    document.querySelectorAll('.time-btn[data-time]').forEach(btn => {
        if (selectedTime !== null && parseInt(btn.dataset.time) === selectedTime) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Сохранение параметров в сессию
function saveSelectionToSession(building, time) {
    fetch('/api/save-roulette-selection/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN
        },
        body: JSON.stringify({
            building: building,
            time: time
        })
    }).catch(err => console.error('Ошибка сохранения параметров:', err));
}

// Фильтрация заведений
function filterPlaces() {
    placeCards.forEach(card => {
        let neededTime = 999;

        if (selectedBuilding === '1') {
            neededTime = parseInt(card.dataset.time1 || 999);
        } else if (selectedBuilding === '3') {
            neededTime = parseInt(card.dataset.time3 || 999);
        } else if (selectedBuilding === '5') {
            neededTime = parseInt(card.dataset.time5 || 999);
        }

        const timeSpan = card.querySelector('.time-needed');
        if (timeSpan) {
            timeSpan.textContent = neededTime === 999 ? '-- мин' : `⏰ ${neededTime} мин`;
        }

        if (selectedTime !== null && neededTime > selectedTime) {
            card.style.display = 'none';
        } else {
            card.style.display = 'block';
        }
    });
    const cards = Array.from(placeCards);

    cards.sort((a, b) => {
        let timeA = 999;
        let timeB = 999;

        if (selectedBuilding === '1') {
            timeA = parseInt(a.dataset.time1 || 999);
            timeB = parseInt(b.dataset.time1 || 999);
        } else if (selectedBuilding === '3') {
            timeA = parseInt(a.dataset.time3 || 999);
            timeB = parseInt(b.dataset.time3 || 999);
        } else if (selectedBuilding === '5') {
            timeA = parseInt(a.dataset.time5 || 999);
            timeB = parseInt(b.dataset.time5 || 999);
        }

        return timeA - timeB;
    });

    cards.forEach(card => {
        placesContainer.appendChild(card);
    });
}

// Выбор корпуса
buildingButtons.forEach(button => {
    button.addEventListener('click', function () {
        selectedBuilding = this.dataset.building;
        selectedTime = null;

        saveSelectionToSession(selectedBuilding, null);
        updateActiveButtons();

        buildingScreen.classList.add('hidden');
        timeScreen.classList.remove('hidden');
        timeScreen.classList.add('show-flex');

        mapPlaceholder.style.display = 'none';
        placesContainer.classList.remove('hidden');

        placesTitle.textContent = '🍴 Заведения рядом с корпусом №' + selectedBuilding;

        placeCards.forEach(card => {
            card.style.display = 'block';
        });
        filterPlaces();
    });
});

// Выбор времени
timeButtons.forEach(button => {
    button.addEventListener('click', function () {
        selectedTime = parseInt(this.dataset.time);
        saveSelectionToSession(selectedBuilding, selectedTime);
        updateActiveButtons();
        filterPlaces();
    });
});

// Кнопка "назад" — сбрасываем ТОЛЬКО время
if (backBtn) {
    backBtn.addEventListener('click', function () {
        selectedTime = null;  // Сбрасываем только время
        saveSelectionToSession(selectedBuilding, null);
        updateActiveButtons();

        timeScreen.classList.add('hidden');
        timeScreen.classList.remove('show-flex');
        buildingScreen.classList.remove('hidden');

        mapPlaceholder.style.display = 'block';
        placesContainer.classList.add('hidden');

        placeCards.forEach(card => {
            card.style.display = 'block';
        });
    });
}

// Кнопки избранного в списке
document.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const isAuthenticated = document.body.getAttribute('data-user-authenticated') === 'true';
        if (!isAuthenticated) {
            alert('Войдите или зарегистрируйтесь, чтобы добавлять в избранное');
            window.location.href = '/accounts/login/';
            return;
        }

        const placeId = this.dataset.placeId;

        fetch(`/favorites/toggle/${placeId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': window.CSRF_TOKEN
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.is_favorited) {
                this.innerHTML = '❤️';
                this.classList.add('active');
            } else {
                this.innerHTML = '🤍';
                this.classList.remove('active');
            }
        })
        .catch(() => {
            alert('Ошибка при обновлении избранного');
        });
    });
});