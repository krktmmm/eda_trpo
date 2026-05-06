const mapContainer = document.getElementById('places-map');

if (mapContainer) {
    const map = L.map('places-map').setView([55.0080, 82.9512], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // ===== КОРПУСА =====
    // Корпус №1
    L.marker([55.012836, 82.950580], {
        icon: L.divIcon({
            className: 'building-marker',
            html: '<div class="building-label">1</div>',
            iconSize: [30, 30]
        })
    }).addTo(map).bindPopup('🏰 СибГУТИ — корпус №1');

    // Корпус №3
    L.marker([55.013203, 82.947836], {
        icon: L.divIcon({
            className: 'building-marker',
            html: '<div class="building-label">3</div>',
            iconSize: [30, 30]
        })
    }).addTo(map).bindPopup('⛪️ СибГУТИ — корпус №3');

    // Корпус №5
    L.marker([55.016966, 82.949674], {
        icon: L.divIcon({
            className: 'building-marker',
            html: '<div class="building-label">5</div>',
            iconSize: [30, 30]
        })
    }).addTo(map).bindPopup('🏨 СибГУТИ — корпус №5');

    // ===== ЗАВЕДЕНИЯ =====
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
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}