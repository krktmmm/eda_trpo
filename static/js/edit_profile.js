const avatarUpload = document.getElementById('avatar-upload');
const avatarPreview = document.getElementById('avatar-preview');
const deleteAvatarBtn = document.getElementById('delete-avatar');

const cropModal = document.getElementById('avatar-crop-modal');
const cropImage = document.getElementById('crop-image');
const cropSaveBtn = document.getElementById('crop-save-btn');
const cropCancelBtn = document.getElementById('crop-cancel-btn');

let cropper = null;

// Выбор и кадрирование аватарки
if (avatarUpload) {
    avatarUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(event) {
            cropImage.src = event.target.result;
            cropModal.style.display = 'flex';

            if (cropper) {
                cropper.destroy();
            }

            cropper = new Cropper(cropImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                responsive: true,
                background: false,
                movable: true,
                zoomable: true,
                rotatable: false,
                scalable: false,
            });
        };

        reader.readAsDataURL(file);
    });
}

// Применить кадрирование
if (cropSaveBtn) {
    cropSaveBtn.addEventListener('click', function() {
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas({
            width: 400,
            height: 400,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        canvas.toBlob(function(blob) {
            const croppedFile = new File([blob], 'avatar.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now(),
            });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(croppedFile);
            avatarUpload.files = dataTransfer.files;

            avatarPreview.src = canvas.toDataURL('image/jpeg');

            cropper.destroy();
            cropper = null;
            cropModal.style.display = 'none';
        }, 'image/jpeg', 0.9);
    });
}

// Отмена кадрирования
if (cropCancelBtn) {
    cropCancelBtn.addEventListener('click', function() {
        avatarUpload.value = '';

        if (cropper) {
            cropper.destroy();
            cropper = null;
        }

        cropModal.style.display = 'none';
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