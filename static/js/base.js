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