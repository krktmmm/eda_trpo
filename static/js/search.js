const searchInput = document.getElementById('global-search');
const suggestionsBox = document.getElementById('search-suggestions');
const searchButton = document.getElementById('global-search-btn');

// Поиск при вводе (живые подсказки)
if (searchInput && suggestionsBox) {

    searchInput.addEventListener('input', async () => {
        const query = searchInput.value.trim();

        // Слишком короткий запрос
        if (query.length < 2) {
            suggestionsBox.classList.add('hidden');
            suggestionsBox.innerHTML = '';
            return;
        }

        // Запрос к серверу
        const res = await fetch(`/api/search-places/?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        suggestionsBox.innerHTML = '';

        // Ничего не найдено
        if (data.results.length === 0) {
            if (data.suggestion) {
                suggestionsBox.innerHTML = `
                    <div class="suggestion-item suggestion-muted">
                        Возможно, вы имели в виду: <strong>${data.suggestion}</strong>
                    </div>
                `;

                document.querySelector('.suggestion-muted').onclick = () => {
                    searchInput.value = data.suggestion;
                    searchInput.dispatchEvent(new Event('input'));
                };
            } else {
                suggestionsBox.innerHTML =
                    '<div class="suggestion-item suggestion-muted">Ничего не найдено</div>';
            }

            suggestionsBox.classList.remove('hidden');
            return;
        }

        // Результаты найдены
        data.results.forEach(place => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <strong>${place.name}</strong>
                <span>${place.address || ''}</span>
            `;
            item.onclick = () => {
                window.location.href = `/place/${place.id}/`;
            };
            suggestionsBox.appendChild(item);
        });

        suggestionsBox.classList.remove('hidden');
    });

    // Закрытие подсказок при клике вне поиска
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search')) {
            suggestionsBox.classList.add('hidden');
        }
    });
}

// Поиск по кнопке или enter
async function openSearchPage() {
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (!query) return;

    const res = await fetch(`/api/search-places/?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    // Точное совпадение — переходим сразу
    if (data.results && data.results.length > 0) {
        const exactMatch = data.results.find(place =>
            place.name.toLowerCase() === query.toLowerCase()
        );
        if (exactMatch) {
            window.location.href = `/place/${exactMatch.id}/`;
            return;
        }
    }

    // Показываем подсказки
    if (suggestionsBox) {
        suggestionsBox.innerHTML = `
            <div class="suggestion-item suggestion-muted">
                Выберите заведение из подсказок
            </div>
        `;
        suggestionsBox.classList.remove('hidden');
    }
}

// Кнопка поиска
if (searchButton) {
    searchButton.onclick = openSearchPage;
}

// Enter в поле поиска
if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            openSearchPage();
        }
    });
}