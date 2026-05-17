const avatarUpload = document.getElementById('avatar-upload');
const avatarPreview = document.getElementById('avatar-preview');
const deleteAvatarBtn = document.getElementById('delete-avatar');

// Предпросмотр аватарки
if (avatarUpload) {
    avatarUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                avatarPreview.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Удаление аватарки
if (deleteAvatarBtn) {
    deleteAvatarBtn.addEventListener('click', async function() {
        if (!confirm('Удалить аватарку? Вернётся стандартное изображение.')) return;

        const response = await fetch('/profile/delete-avatar/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': window.CSRF_TOKEN
            },
        });

        if (response.ok) {
            location.reload();
        } else {
            alert('Ошибка при удалении');
        }
    });
}