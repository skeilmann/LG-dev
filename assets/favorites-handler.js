document.addEventListener('DOMContentLoaded', function () {
    const FAVORITES_KEY = 'favorites';
    const customerId = window.Shopify?.customerId;
    const metafieldFavorites = window.Shopify?.favorites || [];

    let favorites = customerId ? metafieldFavorites : JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];

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

    fetch('/apps/favorites/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            customerId: Shopify.customerId,
            favorites: updatedFavoritesArray,
        }),
    });
});
