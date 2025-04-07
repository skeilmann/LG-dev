document.addEventListener('DOMContentLoaded', function () {
    const FAVORITES_KEY = 'favorites';
    let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];

    // Initial setup of icons based on localStorage
    document.querySelectorAll('.favorite-icon').forEach(icon => {
        const id = icon.dataset.productId;
        if (favorites.includes(id)) {
            icon.classList.add('active');
        }
    });

    // Add click handlers
    document.querySelectorAll('.favorite-icon').forEach(icon => {
        icon.addEventListener('click', (event) => {
            const clickedIcon = event.currentTarget;
            const id = clickedIcon.dataset.productId;

            if (favorites.includes(id)) {
                favorites = favorites.filter(favId => favId !== id);
                clickedIcon.classList.remove('active');
            } else {
                favorites.push(id);
                clickedIcon.classList.add('active');
            }

            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        });
    });
});
