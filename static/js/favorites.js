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
        .then(response => response.json())
        .then(() => {
            location.reload();
        });
    });
});