// Выпадающие меню
const profileBtn = document.getElementById('profileBtn');
const dropdown = document.getElementById('dropdownMenu');
const notifIcon = document.getElementById('notifIcon');
const notifMenu = document.getElementById('notificationsMenu');

// Бейджи
const messagesBadge = document.getElementById('messagesBadge');
const notifBadge = document.getElementById('notifBadge');

// Список уведомлений
const notificationsList = document.getElementById('notificationsList');

let notifications = [];

/* Отмечает уведомление как прочитанное */
function markAsRead(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        renderNotifications();
    }
}

// Открытие/закрытие меню профиля
if (profileBtn) {
    profileBtn.addEventListener('click', (event) => {
        event.stopPropagation();

        if (notifMenu && notifMenu.classList.contains('show')) {
            notifMenu.classList.remove('show');
        }

        dropdown.classList.toggle('show');
    });
}

// Открытие/закрытие меню уведомлений
if (notifIcon) {
    notifIcon.addEventListener('click', (event) => {
        event.stopPropagation();

        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }

        notifMenu.classList.toggle('show');
    });
}

// Закрытие всех выпадающих меню при клике вне
window.addEventListener('click', () => {
    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }
    if (notifMenu && notifMenu.classList.contains('show')) {
        notifMenu.classList.remove('show');
    }
});

// Счётчик непрочитанных сообщений
function updateUnreadMessagesCount() {
    fetch('/roulette/api/messages/unread/')
        .then(r => r.json())
        .then(data => {
            if (!messagesBadge) return;

            if (data.unread_count > 0) {
                if (data.unread_count > 99) {
                    messagesBadge.textContent = '99+';
                    messagesBadge.classList.add('count');
                } else if (data.unread_count > 9) {
                    messagesBadge.textContent = data.unread_count;
                    messagesBadge.classList.add('count');
                } else {
                    messagesBadge.textContent = data.unread_count;
                    messagesBadge.classList.remove('count');
                }
                messagesBadge.classList.remove('hidden');
            } else {
                messagesBadge.classList.add('hidden');
            }
        });
}

// Запуск и автообновление
updateUnreadMessagesCount();
setInterval(updateUnreadMessagesCount, 5000);

// Уведомления
function renderNotifications() {
    if (!notificationsList || !notifBadge) return;

    const unreadCount = notifications.filter(n => !n.read).length;

    // Обновляем кружок
    if (unreadCount > 0) {
        notifBadge.classList.remove('hidden');
    } else {
        notifBadge.classList.add('hidden');
    }

    // Рендерим список
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="notification-empty">Нет новых уведомлений</div>';
        return;
    }

    notificationsList.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}">
            <div class="notification-text">${notif.text}</div>
            <div class="notification-time">${notif.time}</div>
        </div>
    `).join('');

    // Вешаем обработчики
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            const notification = notifications.find(n => n.id === id);
            if (notification && notification.onClick) {
                notification.onClick();
            }
            markAsRead(id);
        });
    });
}

function addNotification(text, onClick = null) {
    const newNotif = {
        id: Date.now(),
        text: text,
        time: new Date().toLocaleTimeString(),
        read: false,
        onClick: onClick
    };
    notifications.unshift(newNotif);
    renderNotifications();
}

// Глобальный доступ для рулетки
window.addNotification = addNotification;

// Проверка авторизации
document.getElementById('messagesIcon')?.addEventListener('click', function(e) {
    if (document.body.getAttribute('data-user-authenticated') !== 'true') {
        e.preventDefault();
        alert('Войдите или зарегистрируйтесь, чтобы открыть чат');
        window.location.href = '/accounts/login/';
    }
});

// Очистка при выходе
document.getElementById('logout-form')?.addEventListener('submit', function() {
    localStorage.removeItem('theme');
    localStorage.removeItem('fontSize');
    localStorage.removeItem('animations');
});

// Обработка ошибок загрузки аватарок
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', function() {
            if (this.src.includes('media/avatars/') || this.src.includes('avatars/')) {
                const isDarkTheme = document.body.classList.contains('dark-theme');
                this.src = isDarkTheme
                    ? '/static/images/default_avatar_dark_theme.jpg'
                    : '/static/images/default_avatar.jpg';
                this.onerror = null;
            }
        });
    });
});