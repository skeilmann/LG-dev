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

    // ── Buy Now Button ("купить в один клик") ──────────────────
    // Goes straight to checkout with ONLY this product (cart permalink).
    // A cart permalink replaces the shopper's cart, so the current cart is saved
    // first and put back by cart-restore.js when the shopper returns to the store.
    const buyNowBtn = document.querySelector('[data-buy-now]');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', async function () {
            if (buyNowBtn.disabled || buyNowBtn.classList.contains('loading')) return;

            const container = buyNowBtn.closest('.product__info-container') || document;
            const form = container.querySelector('[data-type="add-to-cart-form"]');
            const variantInput = form ? form.querySelector('.product-variant-id') : null;
            const variantId = variantInput ? parseInt(variantInput.value, 10) : NaN;
            if (!variantId) return;

            const quantityInput = form && form.id
                ? document.querySelector(`.quantity__input[form="${form.id}"]`) || container.querySelector('.quantity__input')
                : container.querySelector('.quantity__input');
            const quantity = Math.max(1, parseInt(quantityInput ? quantityInput.value : 1, 10) || 1);

            buyNowBtn.classList.add('loading');
            buyNowBtn.setAttribute('aria-busy', 'true');

            if (window.VevCartRestore) await window.VevCartRestore.saveCurrentCart();

            window.location.href = `${window.Shopify?.routes?.root || '/'}cart/${variantId}:${quantity}`;
        });

        // Coming back with the browser "back" button: reset the button.
        window.addEventListener('pageshow', function () {
            buyNowBtn.classList.remove('loading');
            buyNowBtn.removeAttribute('aria-busy');
        });
    }
});
