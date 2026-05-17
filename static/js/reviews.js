// Удаление отзыва
function deleteReview(reviewId) {
    if (!confirm('Удалить отзыв? Это действие нельзя отменить.')) return;

    fetch(`/place/review/${reviewId}/delete/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': window.CSRF_TOKEN,
        },
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'ok') {
            location.reload();
        } else {
            alert(data.error || 'Ошибка при удалении');
        }
    })
    .catch(() => {
        alert('Ошибка при удалении');
    });
}

// Редактирование отзыва
function editReview(reviewId) {
    window.location.href = `/place/review/${reviewId}/edit/`;
}

/** Открыть/закрыть выпадающее меню отзыва */
function toggleReviewMenu(event, reviewId) {
    event.stopPropagation();

    const dropdown = document.getElementById('review-dropdown-' + reviewId);

    // Закрыть все другие меню
    document.querySelectorAll('.review-dropdown.show').forEach(menu => {
        if (menu !== dropdown) menu.classList.remove('show');
    });

    dropdown.classList.toggle('show');
}

// Закрытие всех меню при клике вне
document.addEventListener('click', () => {
    document.querySelectorAll('.review-dropdown.show').forEach(menu => {
        menu.classList.remove('show');
    });
});

// Копирование текста отзыва
function copyReviewText(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Текст отзыва скопирован!');
    }).catch(() => {
        alert('Не удалось скопировать');
    });
}

// Жалоба на отзыв (пока не работает)
function reportReview(reviewId) {
    alert('Жалоба отправлена. Спасибо!');
}