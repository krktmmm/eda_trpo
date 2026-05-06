const searchInput = document.getElementById('global-search');
const suggestionsBox = document.getElementById('search-suggestions');

if (searchInput && suggestionsBox) {

    searchInput.addEventListener('input', async () => {

        const query = searchInput.value.trim();

        if (query.length < 2) {
            suggestionsBox.classList.add('hidden');
            suggestionsBox.innerHTML = '';
            return;
        }

        const res = await fetch(`/api/search-places/?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        suggestionsBox.innerHTML = '';

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

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search')) {
            suggestionsBox.classList.add('hidden');
        }
    });
}

const searchButton = document.getElementById('global-search-btn');
async function openSearchPage() {
    const query = searchInput.value.trim();
    if (!query) return;
    const res = await fetch(`/api/search-places/?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        const exactMatch = data.results.find(place =>
            place.name.toLowerCase() === query.toLowerCase()
        );
        if (exactMatch) {
            window.location.href = `/place/${exactMatch.id}/`;
            return;
        }
    }
    suggestionsBox.innerHTML = `
        <div class="suggestion-item suggestion-muted">
            Выберите заведение из подсказок
        </div>
    `;
    suggestionsBox.classList.remove('hidden');
}

if (searchButton) {
    searchButton.onclick = openSearchPage;
}
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        openSearchPage();
    }
});