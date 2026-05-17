// Удаление из избранного
document.querySelectorAll('.remove-favorite').forEach(btn => {
    btn.addEventListener('click', function() {
        const placeId = this.dataset.placeId;

        fetch(`/favorites/toggle/${placeId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.CSRF_TOKEN
            },
        })
        .then(response => {
            if (!response.ok) throw new Error('Ошибка');
            return response.json();
        })
        .then(() => {
            location.reload();
        })
        .catch(() => {
            alert('Ошибка при удалении из избранного');
        });
    });
});