const dialogId = {{ dialog.id }};
let lastMessageId = {{ messages.0.id|default:0 }};
const messagesContainer = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function loadNewMessages() {
    fetch(`/roulette/api/messages/new/${dialogId}/?after_id=${lastMessageId}`)
        .then(r => r.json())
        .then(data => {
            if (data.messages && data.messages.length) {
                data.messages.forEach(msg => {
                    const div = document.createElement('div');
                    div.className = `message ${msg.is_mine ? 'message-mine' : 'message-other'}`;
                    div.setAttribute('data-id', msg.id);
                    div.innerHTML = `<div class="message-text">${escapeHtml(msg.text)}</div>
                        <div class="message-time">${msg.created_at}</div>`;
                    messagesContainer.appendChild(div);
                    if (msg.id > lastMessageId) {
                        lastMessageId = msg.id;
                    }
                });
                scrollToBottom();
            }
        });
}

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    fetch(`/roulette/api/messages/send/${dialogId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        },
        body: JSON.stringify({text: text})
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'ok') {
            messageInput.value = '';
            loadNewMessages();
        }
    });
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Периодически проверяем новые сообщения
setInterval(loadNewMessages, 3000);

// Прокручиваем вниз при загрузке
scrollToBottom();