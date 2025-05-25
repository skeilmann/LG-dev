// Handles the product page favorite button logic for guest and logged-in users
// Requires favorites-handler.js to be loaded first

document.addEventListener('DOMContentLoaded', function () {
    // Check if favoritesHandler is available
    if (!window.favoritesHandler) {
        console.warn('favoritesHandler not found. Make sure favorites-handler.js is loaded first.');
        return;
    }

    const handler = window.favoritesHandler;

    // Check if user is logged in based on Shopify customer ID
    const isLoggedIn = !!(window.Shopify && window.Shopify.customerId);

    // Use debug logging only in development environments
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log("User login status:", isLoggedIn);
    }

    // Try to get product ID and handle from Shopify object first, then fall back to DOM elements
    let productId = null;
    let productHandle = null;

    try {
        // Primary source: Shopify global object
        productId = window?.Shopify?.product?.id;
        productHandle = window?.Shopify?.product?.handle;

        // Fallback: Look for data attributes in the DOM
        if (!productId) {
            const productIdElement = document.querySelector('[data-product-id]');
            productId = productIdElement?.dataset.productId;
        }

        if (!productHandle) {
            const productHandleElement = document.querySelector('[data-product-handle]');
            productHandle = productHandleElement?.dataset.productHandle;
        }

        // Convert productId to a number if it exists
        if (productId) {
            productId = Number(productId) || productId; // Keep original value if conversion fails
        }
    } catch (error) {
        console.error('Error retrieving product information:', error);
    }

    /**
     * Creates and inserts the favorite button into the DOM if it doesn't exist
     * @returns {HTMLElement} The created or existing button
     */
    function createFavoriteButton() {
        // Check if button already exists
        const existingBtn = document.querySelector('.product-favorite-btn');
        if (existingBtn) {
            return existingBtn;
        }

        // Create new button
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'button button--secondary product-favorite-btn';
        btn.style.width = '100%';
        btn.style.marginTop = '1rem';
        if (productId) {
            btn.dataset.productId = productId;
        }
        btn.innerHTML = `
            <svg class="favorite-heart" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 5.24L8.515 3.773a4.433 4.433 0 0 0-6.21 0 4.293 4.293 0 0 0 0 6.128L10 17.495l7.695-7.593a4.293 4.293 0 0 0 0-6.128 4.433 4.433 0 0 0-6.21 0z" stroke-width="2"/>
            </svg>
            <span class="favorite-label">Add to Favorites</span>
        `;
        // Create a wrapper div for the button
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'product-form__buttons';
        wrapperDiv.appendChild(btn);
        // Insert the wrapper div just before <share-button> if it exists, else fallback
        const shareBtn = document.querySelector('share-button');
        if (shareBtn && shareBtn.parentNode) {
            shareBtn.parentNode.insertBefore(wrapperDiv, shareBtn);
        } else {
            const cadSaveBtn = document.querySelector('.cad_save');
            if (cadSaveBtn && cadSaveBtn.parentNode) {
                cadSaveBtn.parentNode.insertBefore(wrapperDiv, cadSaveBtn.nextSibling);
            } else {
                const info = document.querySelector('.product__info-wrapper, .product__info-container');
                if (info) {
                    info.appendChild(wrapperDiv);
                } else {
                    document.body.appendChild(wrapperDiv);
                }
            }
        }
        return btn;
    }

    // Hide the .cad_save button if present
    function hideCadSaveButton() {
        const cadSaveBtn = document.querySelector('.cad_save');
        if (cadSaveBtn) {
            cadSaveBtn.style.display = 'none';
        }
    }

    // Create the favorite button and store the reference
    let favoriteBtn = createFavoriteButton();
    hideCadSaveButton();

    // If .cad_save might appear later, observe and hide it when it does
    const observer = new MutationObserver(() => {
        hideCadSaveButton();
        // Try to insert the favorite button after .cad_save if it appears later
        const cadSaveBtn = document.querySelector('.cad_save');
        if (cadSaveBtn && !document.querySelector('.product-favorite-btn')) {
            createFavoriteButton();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Use favoritesHandler to toggle and check state
    function updateFavoriteBtnState() {
        if (!favoriteBtn || !productId) return;
        // Use handler.favorites to check if product is favorited
        const isFavorited = handler.favorites && handler.favorites.has(Number(productId));
        favoriteBtn.classList.toggle('favorited', isFavorited);
        const label = favoriteBtn.querySelector('.favorite-label');
        if (label) label.textContent = isFavorited ? 'Added to Favorites' : 'Add to Favorites';
    }

    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', function () {
            if (!productId) return;
            handler.toggleFavorite(productId); // Use handler to toggle
            updateFavoriteBtnState();
        });
        // Initial state
        updateFavoriteBtnState();
        // Listen for changes from other tabs/windows or handler
        window.addEventListener('favorites:changed', updateFavoriteBtnState);
    }
});
