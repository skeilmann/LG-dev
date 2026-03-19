/**
 * product-favorite-button.js
 * Handles the product page favorite heart button and buy-now button logic.
 * Requires favorites-handler.js to be loaded first.
 */

document.addEventListener('DOMContentLoaded', function () {
    // ── Favorite Heart Button ──────────────────────────────────
    const handler = window.favoritesHandler;

    // Find the Liquid-rendered heart button
    const favoriteBtn = document.querySelector('.button--favorite-heart');

    if (favoriteBtn && handler) {
        const productId = Number(favoriteBtn.dataset.productId) || null;

        function updateFavoriteBtnState() {
            if (!favoriteBtn || !productId) return;
            const isFavorited = handler.favorites && handler.favorites.has(productId);
            favoriteBtn.classList.toggle('favorited', isFavorited);
        }

        favoriteBtn.addEventListener('click', function () {
            if (!productId) return;
            handler.toggleFavorite(productId);
            updateFavoriteBtnState();
        });

        // Initial state
        updateFavoriteBtnState();

        // Listen for changes from other tabs/windows
        window.addEventListener('favorites:changed', updateFavoriteBtnState);
    }

    // Hide legacy .cad_save button if present
    const cadSaveBtn = document.querySelector('.cad_save');
    if (cadSaveBtn) {
        cadSaveBtn.style.display = 'none';
    }

    // ── Buy Now Button ─────────────────────────────────────────
    const buyNowBtn = document.querySelector('[data-buy-now]');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', function () {
            if (buyNowBtn.disabled) return;

            // Find the variant ID from the product form
            const form = document.querySelector('[data-type="add-to-cart-form"]');
            const variantInput = form ? form.querySelector('.product-variant-id') : null;
            const variantId = variantInput ? variantInput.value : null;

            if (!variantId) return;

            // Get quantity
            const quantityInput = document.querySelector('.quantity__input');
            const quantity = quantityInput ? quantityInput.value : 1;

            // Add to cart then redirect to checkout
            buyNowBtn.classList.add('loading');
            fetch('/cart/add.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: [{ id: parseInt(variantId), quantity: parseInt(quantity) }] })
            })
            .then(function (response) {
                if (response.ok) {
                    window.location.href = '/checkout';
                } else {
                    buyNowBtn.classList.remove('loading');
                }
            })
            .catch(function () {
                buyNowBtn.classList.remove('loading');
            });
        });
    }
});
