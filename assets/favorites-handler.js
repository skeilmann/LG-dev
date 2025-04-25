/**
 * Handles favorite product functionality for non-logged-in users
 * Manages favorite IDs storage, UI updates, and modal interactions.
 * Modal content is loaded dynamically from a Shopify endpoint.
 */
class FavoritesHandler {
    constructor() {
        // Initialize core properties
        this.isLoggedIn = !!(window.Shopify && window.Shopify.customerId);
        // Favorites are now just a Set of product IDs for non-logged-in users
        this.favorites = this.loadFavorites(); 
        this.createModal();
        this.initializeUI();

        // Guest migration logic might need adjustment if logged-in state relies on this handler
        // For now, assuming this handler is primarily for guest/non-logged-in experience
        // if (this.isLoggedIn) { ... migration logic ... }
    }

    /**
     * Creates and sets up the favorites modal structure.
     * Content will be loaded dynamically.
     * @private
     */
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'favorites-modal global-settings-popup';
        modal.innerHTML = `
            <div class="favorites-modal__content">
                <button type="button" class="favorites-modal__close" aria-label="${window.translations?.accessibility?.close || 'Close'}">
                    <svg class="icon icon-close" aria-hidden="true" focusable="false">
                        <use href="#icon-close"/>
                    </svg>
                </button>
                <div class="favorites-modal__body">
                    </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.modal = modal;
        this.modalBody = modal.querySelector('.favorites-modal__body'); 
        this.setupModalEvents();
    }

    /**
     * Sets up modal related event listeners
     * @private
     */
    setupModalEvents() {
        this.modal.querySelector('.favorites-modal__close').addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    /**
     * Initializes UI elements and sets up event listeners
     * @private
     */
    initializeUI() {
        this.updateButtons();
        this.setupEventListeners();
    }

    /**
     * Updates visibility and state of all favorite buttons in the UI
     * Based on whether the product ID is in the favorites Set.
     * @private
     * @param {HTMLElement} [root=document] - Root element to search from
     */
    updateButtons(root = document) {
        // Simplified: Only handles non-logged-in favorite icons
        if (this.isLoggedIn) {
             // Hide guest favorite icons if logged in
             root.querySelectorAll('.favorite-icon').forEach(icon => {
                icon.classList.add('hidden');
             });
             // Optionally show different logged-in icons if needed here
             return; 
        }

        // Handle favorite icons for non-logged-in users
        root.querySelectorAll('.favorite-icon').forEach(icon => {
            icon.style.removeProperty('display'); // Ensure visible
            icon.classList.remove('hidden'); // Ensure visible

            if (icon.dataset.productId) {
                const productId = parseInt(icon.dataset.productId, 10);
                const isFavorite = this.favorites.has(productId);
                icon.classList.toggle('active', isFavorite);
                icon.setAttribute('aria-label',
                    isFavorite ?
                        (window.translations?.customer?.favorites?.remove || 'Remove from Favorites') :
                        (window.translations?.customer?.favorites?.add || 'Add to Favorites')
                );
            }
        });
        
        // Update header icon based on whether there are any favorites
         const headerIconContainer = document.querySelector('.header__icon--favorites-guest'); // Adjust selector if needed
         if (headerIconContainer) {
             headerIconContainer.classList.toggle('has-favorites', this.favorites.size > 0);
         }
    }

    /**
     * Loads favorite product IDs from localStorage.
     * @returns {Set<number>} Set of favorite product IDs.
     */
    loadFavorites() {
        // Only load for non-logged-in users
        if (this.isLoggedIn) return new Set(); 

        try {
            const stored = localStorage.getItem('favorites');
            if (!stored) return new Set();

            const parsed = JSON.parse(stored);
            // Expect an array of IDs
            if (!Array.isArray(parsed)) return new Set(); 

            // Filter out any non-numeric values and convert to numbers
            const numericIds = parsed
                .map(id => parseInt(id, 10))
                .filter(id => !isNaN(id));
                
            return new Set(numericIds);
        } catch (e) {
            console.error("Error loading favorites from localStorage:", e);
            return new Set();
        }
    }

    /**
     * Saves favorite product IDs to localStorage for non-logged-in users.
     * @private
     */
    saveFavorites() {
        if (this.isLoggedIn) return; // Don't save if logged in

        try {
            // Convert Set back to an array for storage
            const favoritesArray = Array.from(this.favorites); 
            localStorage.setItem('favorites', JSON.stringify(favoritesArray));
        } catch (e) {
            console.error("Error saving favorites to localStorage:", e);
            // Silently fail if localStorage is not available or full
        }
    }

    /**
     * Sets up event listeners for favorites functionality (non-logged-in users)
     * @private
     */
    setupEventListeners() {
        if (this.isLoggedIn) return; // Only attach listeners for guests

        // Handle favorite toggle and modal open
        document.addEventListener('click', (e) => {
            // Toggle favorite status
            const favoriteButton = e.target.closest('.favorite-icon');
            if (favoriteButton?.dataset.productId) {
                this.toggleFavorite(favoriteButton.dataset.productId);
            }

            // Open modal (adjust selector if needed)
            const favoritesHeaderIcon = e.target.closest('.header__icon--favorites-guest'); 
            if (favoritesHeaderIcon) {
                e.preventDefault();
                this.showModal();
            }
        });

        // Handle dynamically added elements (e.g., in quick view, search results)
        new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                         // Check if the added node itself or its descendants contain favorite icons
                         if (node.matches('.favorite-icon') || node.querySelector('.favorite-icon')) {
                            this.updateButtons(node); // Update only within the new node for efficiency
                         }
                    }
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Shows the favorites modal and loads its content.
     */
    showModal() {
        if (this.isLoggedIn) return; // Prevent modal for logged-in users if handled separately
        this.updateModalContent(); // Load content when showing
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Closes the favorites modal.
     */
    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        // Optional: Clear modal body on close to ensure fresh load next time
        // this.modalBody.innerHTML = ''; 
    }

   /**
     * Fetches and updates the content of the favorites modal from a Shopify endpoint.
     * @private
     */
    async updateModalContent() {
        // Show loading indicator
        this.modalBody.innerHTML = `<div class="loading-overlay gradient"></div>`; 

        try {
            // ---- IMPORTANT ----
            // Ensure this URL points to your Shopify page/section that renders favorites
            const contentUrl = '/pages/favorites-modal-content?view=modal'; // <-- ADJUST THIS URL
            // Pass current favorite IDs if the endpoint needs them (optional)
            // const idsParam = encodeURIComponent(JSON.stringify(Array.from(this.favorites)));
            // const contentUrl = `/pages/favorites-modal-content?view=modal&ids=${idsParam}`; 
            // ---- IMPORTANT ----

            const response = await fetch(contentUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const contentHtml = await response.text();

            this.modalBody.innerHTML = contentHtml;
            // Re-initialize favorite buttons within the newly loaded content
            this.updateButtons(this.modalBody); 

        } catch (error) {
            console.error('Error fetching favorites modal content:', error);
            this.modalBody.innerHTML = `<p>${window.translations?.customer?.favorites?.load_error || 'Error loading favorites content.'}</p>`;
        }
    }

    /**
     * Toggles favorite status for a product ID (non-logged-in).
     * @param {string|number} productId - Product ID to toggle.
     */
    toggleFavorite(productId) {
        if (this.isLoggedIn) return; // Ignore if logged in

        const id = parseInt(productId, 10);
        if (isNaN(id)) return; // Ignore invalid IDs

        if (this.favorites.has(id)) {
            this.favorites.delete(id);
        } else {
            this.favorites.add(id);
        }
        
        this.saveFavorites();
        // Update buttons globally as the change might affect icons outside the immediate click target
        this.updateButtons(); 
        this.notifyStateChange();

        // If the modal is open, reload its content to reflect the change
        if (this.modal.classList.contains('active')) {
             this.updateModalContent();
        }
    }

    /**
     * Notifies listeners of favorites state changes.
     * Sends only the array of favorite IDs.
     * @private
     */
    notifyStateChange() {
        window.dispatchEvent(new CustomEvent('favorites:changed', {
            detail: { favorites: Array.from(this.favorites) } // Send array of IDs
        }));
    }

    // Removed extractProductData method
    // Removed migrateGuestFavorites method (assuming logged-in handled elsewhere or not needed for guest-only handler)

    // Placeholder for migration logic if needed - currently removed
    // async migrateGuestFavorites(guestFavorites) { ... }
}

// Initialize the favorites handler when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if the user is NOT logged in, 
    // assuming a different mechanism handles logged-in favorites.
    if (!(window.Shopify && window.Shopify.customerId)) {
        window.favoritesHandler = new FavoritesHandler();
    }
});