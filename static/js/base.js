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

/* Отмечает уведомление как прочитанное (меняет цвет) */
async function markAsRead(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
        notification.read = true;
        
        // Отправляем запрос на сервер
        try {
            await fetch(`/roulette/api/notifications/mark-read/${id}/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': window.CSRF_TOKEN }
            });
        } catch(err) {
            console.error('Ошибка:', err);
        }
        
        renderNotifications();
    }
}

/* Удаляет уведомление из списка */
async function deleteNotification(id) {
    // Сначала отмечаем как прочитанное на сервере
    try {
        await fetch(`/roulette/api/notifications/mark-read/${id}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': window.CSRF_TOKEN }
        });
    } catch(err) {
        console.error('Ошибка:', err);
    }
    
    // Удаляем из массива
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
        notifications.splice(index, 1);
        renderNotifications();
    }
}

// Получение уведомлений с сервера (каждые 5 секунд)
function fetchNotifications() {
    if (document.body.getAttribute('data-user-authenticated') !== 'true') return;
    
    fetch('/roulette/api/notifications/')
        .then(r => r.json())
        .then(data => {
            if (data.notifications && data.notifications.length > 0) {
                // Добавляем только новые уведомления (которых ещё нет в списке)
                data.notifications.forEach(notif => {
                    const exists = notifications.some(n => n.id === notif.id);
                    if (!exists) {
                        addNotification(
                            notif.text,
                            () => { if (notif.link) window.location.href = notif.link; },
                            notif.id
                        );
                    }
                });
                
                // Обновляем бейдж
                const unreadCount = notifications.filter(n => !n.read).length;
                if (unreadCount > 0) {
                    notifBadge.classList.remove('hidden');
                    notifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                } else {
                    notifBadge.classList.add('hidden');
                }
            }
        })
        .catch(err => console.error('Ошибка получения уведомлений:', err));
}

// Запускаем polling каждые 5 секунд
setInterval(fetchNotifications, 5000);

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

// Уведомления - рендер с крестиком
function renderNotifications() {
    if (!notificationsList || !notifBadge) return;

    const unreadCount = notifications.filter(n => !n.read).length;

    // Обновляем кружок
    if (unreadCount > 0) {
        notifBadge.classList.remove('hidden');
        notifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    } else {
        notifBadge.classList.add('hidden');
    }

    // Рендерим список
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="notification-empty">Нет уведомлений</div>';
        return;
    }

    notificationsList.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? 'read' : 'unread'}" data-id="${notif.id}">
            <div class="notification-content" data-link="${notif.link || ''}">
                <div class="notification-text">${notif.text}</div>
                <div class="notification-time">${notif.time}</div>
            </div>
            <button class="notification-delete" data-id="${notif.id}">✖</button>
        </div>
    `).join('');

    // Обработчик клика по содержимому уведомления (переход + отметить прочитанным)
    document.querySelectorAll('.notification-content').forEach(content => {
        content.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = content.closest('.notification-item');
            const id = parseInt(item.dataset.id);
            const notification = notifications.find(n => n.id === id);
            const link = content.dataset.link;
            
            // Отмечаем как прочитанное
            markAsRead(id);
            
            // Переходим по ссылке, если есть
            if (notification && notification.onClick) {
                notification.onClick();
            } else if (link) {
                window.location.href = link;
            }
        });
    });
    
    // Обработчик клика по крестику (удаление)
    document.querySelectorAll('.notification-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            deleteNotification(id);
        });
    });
}

function addNotification(text, onClick = null, id = null) {
    const newNotif = {
        id: id || Date.now(),
        text: text,
        time: new Date().toLocaleTimeString(),
        read: false,
        onClick: onClick
    };
    notifications.unshift(newNotif);
    renderNotifications();
}

// Кнопка "Все прочитаны" (отмечает все как прочитанные, но не удаляет)
const markAllReadBtn = document.getElementById('mark-all-read');
if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        try {
            const response = await fetch('/roulette/api/notifications/mark-all-read/', {
                method: 'POST',
                headers: { 'X-CSRFToken': window.CSRF_TOKEN }
            });
            if (response.ok) {
                // Отмечаем все как прочитанные
                notifications.forEach(n => { n.read = true; });
                renderNotifications();
            }
        } catch(err) {
            console.error('Ошибка:', err);
        }
    });
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