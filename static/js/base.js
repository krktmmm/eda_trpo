// Выпадающее меню профиля
const profileBtn = document.getElementById('profileBtn');
const dropdown = document.getElementById('dropdownMenu');
if (profileBtn) {
    profileBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        dropdown.classList.toggle('show');
    });
    window.addEventListener('click', () => {
        if (dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    });
}

// Обновление счётчика непрочитанных сообщений
function updateUnreadMessagesCount() {
    fetch('/roulette/api/messages/unread/')
        .then(r => r.json())
        .then(data => {
            const badge = document.getElementById('messagesBadge');
            if (data.unread_count > 0) {
                if (data.unread_count > 99) {
                    badge.textContent = '99+';
                    badge.classList.add('count');
                } else if (data.unread_count > 9) {
                    badge.textContent = data.unread_count;
                    badge.classList.add('count');
                } else {
                    badge.textContent = '';
                    badge.classList.remove('count');
                }
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });
}

// Запускаем при загрузке страницы
updateUnreadMessagesCount();

// Обновляем каждые 5 секунд
setInterval(updateUnreadMessagesCount, 5000);

// ===== УВЕДОМЛЕНИЯ =====
let notifications = [];

function renderNotifications() {
    const list = document.getElementById('notificationsList');
    const badge = document.getElementById('notifBadge');
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Обновляем кружок
    if (unreadCount > 0) {
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
    
    // Рендерим список
    if (notifications.length === 0) {
        list.innerHTML = '<div class="notification-empty">Нет новых уведомлений</div>';
        return;
    }
    
    list.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}">
            <div class="notification-text">${notif.text}</div>
            <div class="notification-time">${notif.time}</div>
        </div>
    `).join('');
    
    // Вешаем обработчики на уведомления
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

function markAsRead(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        renderNotifications();
    }
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

// Открытие/закрытие окна уведомлений
const notifIcon = document.getElementById('notifIcon');
const notifMenu = document.getElementById('notificationsMenu');

if (notifIcon) {
    notifIcon.addEventListener('click', (event) => {
        event.stopPropagation();
        notifMenu.classList.toggle('show');
    });
    window.addEventListener('click', () => {
        if (notifMenu.classList.contains('show')) {
            notifMenu.classList.remove('show');
        }
    });
}

// Функция для вызова из рулетки (глобальная)
window.addNotification = addNotification;

// Очистка настроек при выходе из аккаунта
document.getElementById('logout-form')?.addEventListener('submit', function() {
    localStorage.removeItem('theme');
    localStorage.removeItem('fontSize');
    localStorage.removeItem('animations');
});

// Проверка авторизации для кнопки "Чат" в меню
document.getElementById('messagesIcon')?.addEventListener('click', function(e) {
    if (document.body.getAttribute('data-user-authenticated') !== 'true') {
        e.preventDefault();
        alert('Войдите или зарегистрируйтесь, чтобы открыть чат');
        window.location.href = '/accounts/login/';
    }
});