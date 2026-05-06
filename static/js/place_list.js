let selectedBuilding = null;
let selectedTime = null;

const buildingButtons = document.querySelectorAll('.building-btn');
const timeButtons = document.querySelectorAll('.time-btn');
const placeCards = document.querySelectorAll('.place-card');

const buildingScreen = document.getElementById('building-screen');
const timeScreen = document.getElementById('time-screen');
const backBtn = document.getElementById('back-btn');
const placesTitle = document.getElementById('places-title');

const mapPlaceholder = document.getElementById('map-placeholder');
const placesContainer = document.getElementById('places-container');

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
}

buildingButtons.forEach(button => {
    button.addEventListener('click', function () {
        selectedBuilding = this.dataset.building;
        selectedTime = null;

        buildingScreen.classList.add('hidden');
        timeScreen.classList.remove('hidden');
        timeScreen.classList.add('show-flex');

        mapPlaceholder.style.display = 'none';
        placesContainer.style.display = 'block';
        placesTitle.textContent = '🍴 Заведения рядом с корпусом №' + selectedBuilding;

        placeCards.forEach(card => {
            card.style.display = 'block';
        });
        filterPlaces();
    });
});

timeButtons.forEach(button => {
    button.addEventListener('click', function () {
        selectedTime = parseInt(this.dataset.time);
        filterPlaces();
    });
});

backBtn.addEventListener('click', function () {
    selectedBuilding = null;
    selectedTime = null;

    timeScreen.classList.add('hidden');
    buildingScreen.classList.remove('hidden');

    placeCards.forEach(card => {
        card.style.display = 'block';
    });
});

// Кнопки избранного в списке заведений
document.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Проверка на авторизацию
        const isAuthenticated = document.body.getAttribute('data-user-authenticated') === 'true';
        if (!isAuthenticated) {
            alert('Войдите или зарегистрируйтесь, чтобы добавлять в избранное');
            window.location.href = '/accounts/login/';
            return;
        }
        
        const placeId = this.dataset.placeId;
        const csrf = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        fetch(`/favorites/toggle/${placeId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf
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
        });
    });
});