// Предпросмотр и сохранение файла
document.getElementById('avatar-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // Предпросмотр
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('avatar-preview').src = event.target.result;
        };
        reader.readAsDataURL(file);
        
        // Передаём файл в скрытое поле формы
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        document.getElementById('avatar-field').files = dataTransfer.files;
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