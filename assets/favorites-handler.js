class FavoritesHandler {
    constructor() {
        this.favorites = new Set(this.loadFavorites());
        this.isLoggedIn = window.Shopify && window.Shopify.customerId;
        this.handleAppHeartIcons();
        this.bindEvents();
        this.updateAllButtons();
    }

    loadFavorites() {
        try {
            // If logged in, use app's favorites, otherwise use localStorage
            if (this.isLoggedIn && window.Shopify.favorites) {
                return window.Shopify.favorites || [];
            }
            const stored = localStorage.getItem('favorites');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading favorites:', e);
            return [];
        }
    }

    handleAppHeartIcons() {
        // Only update icons if their current state doesn't match what we want
        document.querySelectorAll('.heart-icon').forEach(heart => {
            const currentDisplay = heart.style.display;
            const newDisplay = this.isLoggedIn ? 'block' : 'none';
            if (currentDisplay !== newDisplay) {
                heart.style.display = newDisplay;
            }
        });

        document.querySelectorAll('.favorite-icon').forEach(heart => {
            const currentDisplay = heart.style.display;
            const newDisplay = this.isLoggedIn ? 'none' : 'block';
            if (currentDisplay !== newDisplay) {
                heart.style.display = newDisplay;
            }
        });
    }

    saveFavorites() {
        if (!this.isLoggedIn) {
            try {
                localStorage.setItem('favorites', JSON.stringify(Array.from(this.favorites)));
            } catch (e) {
                console.error('Error saving favorites:', e);
            }
        }
    }

    toggleFavorite(productId) {
        if (this.isLoggedIn) {
            // Let the app handle favorites for logged-in users
            return;
        }

        if (this.favorites.has(productId)) {
            this.favorites.delete(productId);
        } else {
            this.favorites.add(productId);
        }
        this.saveFavorites();
        this.updateAllButtons();
        this.publishStateChange();
    }

    updateAllButtons() {
        if (this.isLoggedIn) return;

        document.querySelectorAll('.favorite-icon').forEach(button => {
            const productId = button.dataset.productId;
            this.updateButton(button, this.favorites.has(productId));
        });
    }

    updateButton(button, isFavorite) {
        if (this.isLoggedIn) return;

        button.classList.toggle('active', isFavorite);
        button.setAttribute('aria-label',
            isFavorite ?
                window.translations?.customer?.favorites?.remove || 'Remove from Favorites' :
                window.translations?.customer?.favorites?.add || 'Add to Favorites'
        );
    }

    publishStateChange() {
        window.dispatchEvent(new CustomEvent('favorites:changed', {
            detail: {
                favorites: Array.from(this.favorites)
            }
        }));
    }

    bindEvents() {
        if (!this.isLoggedIn) {
            document.addEventListener('click', (e) => {
                const button = e.target.closest('.favorite-icon');
                if (button) {
                    const productId = button.dataset.productId;
                    if (productId) {
                        this.toggleFavorite(productId);
                    }
                }
            });
        }

        // In case new favorite buttons are added to the DOM dynamically
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Handle newly added heart icons
                        if (!this.isLoggedIn) {
                            const buttons = node.querySelectorAll('.favorite-icon');
                            buttons.forEach(button => {
                                const productId = button.dataset.productId;
                                if (productId) {
                                    this.updateButton(button, this.favorites.has(productId));
                                }
                            });
                        }
                        // Update visibility of app vs local heart icons
                        this.handleAppHeartIcons();
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize the handler when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.favoritesHandler = new FavoritesHandler();
});
