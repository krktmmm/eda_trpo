// Предпросмотр аватарки
document.getElementById('avatar-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('avatar-preview').src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Удаление аватарки
document.getElementById('delete-avatar').addEventListener('click', async function() {
    if (confirm('Удалить аватарку? Вернётся стандартное изображение.')) {
        const response = await fetch('/profile/delete-avatar/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            },
        });
        if (response.ok) {
            location.reload();
        } else {
            alert('Ошибка при удалении');
        }
    }
});