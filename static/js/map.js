const MAP_CENTER = [55.0080, 82.9512];
const MAP_ZOOM = 16;

const BUILDINGS = [
    { coords: [55.013159, 82.950629], label: '1', popup: '🏰 СибГУТИ — корпус №1' },
    { coords: [55.013816, 82.948528], label: '3', popup: '⛪️ СибГУТИ — корпус №3' },
    { coords: [55.016970, 82.949707], label: '5', popup: '🏨 СибГУТИ — корпус №5' },
];

// Инициализация карты
const mapContainer = document.getElementById('places-map');

if (mapContainer) {
    const map = L.map('places-map').setView([55.0080, 82.9512], 16);
    const isDarkTheme = document.body.classList.contains('dark-theme');

    const tileUrl = isDarkTheme
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = isDarkTheme
        ? '&copy; OpenStreetMap &copy; CARTO'
        : '© OpenStreetMap';

    L.tileLayer(tileUrl, {
        attribution: attribution,
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Маркеры корпусов
    BUILDINGS.forEach(building => {
        L.marker(building.coords, {
            icon: L.divIcon({
                className: 'building-marker',
                html: `<div class="building-label">${building.label}</div>`,
                iconSize: [30, 30]
            })
        }).addTo(map).bindPopup(building.popup);
    });

    // Маркеры заведений
    const dataElement = document.getElementById('places-map-data');

    if (dataElement) {
        const places = JSON.parse(dataElement.textContent);
        const markerBounds = [];

        places.forEach(place => {
            const marker = L.marker([place.lat, place.lng]).addTo(map);
            markerBounds.push([place.lat, place.lng]);

            marker.bindPopup(`
                <b>${place.name}</b><br>
                ${place.address || ''}<br><br>
                <button onclick="window.location.href='/place/${place.id}/'">
                    Открыть заведение
                </button>
            `);
        });

        if (markerBounds.length > 0) {
            map.fitBounds(markerBounds, {
                padding: [30, 30],
                maxZoom: 17
            });
        }
    }

    // Фикс размера карты
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}