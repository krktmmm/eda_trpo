document.addEventListener('DOMContentLoaded', function() {
    const favBtn = document.getElementById('favorite-detail-btn');
    if (favBtn) {
        favBtn.addEventListener('click', function() {
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
            })
            .catch(error => {
                console.error('Ошибка:', error);
            });
        });
    }
});