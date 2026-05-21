// Кнопка избранного на странице заведения
document.addEventListener('DOMContentLoaded', function() {
    const favBtn = document.getElementById('favorite-detail-btn');
    if (!favBtn) return;

    favBtn.addEventListener('click', function() {
        // Проверка авторизации
        const isAuthenticated = document.body.getAttribute('data-user-authenticated') === 'true';
        if (!isAuthenticated) {
            alert('Войдите или зарегистрируйтесь, чтобы добавлять в избранное');
            window.location.href = '/accounts/login/';
            return;
        }

        // Отправка запроса
        const placeId = this.dataset.placeId;

        fetch(`/favorites/toggle/${placeId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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