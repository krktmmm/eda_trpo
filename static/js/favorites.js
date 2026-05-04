document.querySelectorAll('.remove-favorite').forEach(btn => {
    btn.addEventListener('click', function() {
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
        .then(() => {
            location.reload();
        });
    });
});