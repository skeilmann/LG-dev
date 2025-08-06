document.addEventListener('DOMContentLoaded', () => {
    const bar = document.querySelector('.free-shipping-bar');
    if (!bar) return;

    const goal = parseInt(bar.dataset.freeShippingGoal, 10); // in cents
    const currentCountry = bar.dataset.currentCountry;
    let lastCartTotal = 0;
    let isUpdating = false;
    
    // Parse translations
    const translations = bar.dataset.translations.split(',');
    const translationsObj = {
        title: translations[0],
        addMore: translations[1],
        moreForFreeShipping: translations[2],
        youQualify: translations[3],
        remainingAmount: translations[4]
    };

    // Initial load
    fetchCartAndUpdate();

    // Comprehensive cart event listeners
    setupCartListeners();

    function setupCartListeners() {
        // Listen for custom cart events
        document.addEventListener('cart:updated', () => {
            fetchCartAndUpdate();
        });

        // Listen for cart drawer events
        document.addEventListener('cart:drawer:opened', () => {
            fetchCartAndUpdate();
        });

        // Listen for quantity changes
        document.addEventListener('change', (event) => {
            if (event.target.matches('[name="updates[]"], .quantity-input, .cart-quantity')) {
                setTimeout(() => fetchCartAndUpdate(), 300);
            }
        });

        // Listen for remove buttons
        document.addEventListener('click', (event) => {
            if (event.target.matches('.cart-remove, .remove-item, [data-action="remove"]')) {
                setTimeout(() => fetchCartAndUpdate(), 300);
            }
        });

        // Listen for add to cart forms
        document.addEventListener('submit', (event) => {
            if (event.target.matches('form[action*="/cart/add"], .add-to-cart-form')) {
                setTimeout(() => fetchCartAndUpdate(), 500);
            }
        });

        // Listen for quick add buttons
        document.addEventListener('click', (event) => {
            if (event.target.matches('.quick-add, .quick-add-button, [data-quick-add]')) {
                setTimeout(() => fetchCartAndUpdate(), 500);
            }
        });

        // Listen for AJAX cart updates
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if cart-related elements were added
                            if (node.querySelector && (
                                node.querySelector('[data-cart-total]') ||
                                node.querySelector('.cart-total') ||
                                node.querySelector('[data-cart-count]')
                            )) {
                                setTimeout(() => fetchCartAndUpdate(), 200);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Fallback: check for cart updates every 2 seconds
        setInterval(() => {
            checkForCartChanges();
        }, 2000);
    }

    async function fetchCartAndUpdate() {
        if (isUpdating) return; // Prevent concurrent updates
        
        isUpdating = true;
        
        try {
            const response = await fetch('/cart.js');
            const cart = await response.json();
            
            // Only update if cart total has actually changed
            if (cart.total_price !== lastCartTotal) {
                lastCartTotal = cart.total_price;
                updateBar(cart.total_price);
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
            // Initialize with empty cart
            updateBar(0);
        } finally {
            isUpdating = false;
        }
    }

    function checkForCartChanges() {
        // Only check if we're not already updating
        if (isUpdating) return;
        
        // Check if cart total has changed by looking for cart-related elements
        const cartTotalElement = document.querySelector('[data-cart-total]');
        const cartTotalText = document.querySelector('.cart-total, .cart__total, [class*="total"]');
        
        if (cartTotalElement || cartTotalText) {
            // If we find cart elements, fetch the latest cart data
            fetchCartAndUpdate();
        }
    }

    function updateBar(total) {
        const fill = bar.querySelector('.progress-bar-fill');
        const message = bar.querySelector('.free-shipping-text');
        const progressContainer = bar.querySelector('.progress-bar-container');
        const header = bar.querySelector('.free-shipping-header');
        const currentAmount = bar.querySelector('.free-shipping-current');
        const targetAmount = bar.querySelector('.free-shipping-target');

        // Update current amount display
        if (currentAmount) {
            currentAmount.textContent = formatMoney(total / 100);
        }

        if (total >= goal) {
            // Hide progress bar and show only success message
            showSuccessState();
        } else {
            // Show progress bar and animate update
            showProgressState();
            animateProgressBar(total);
            
            const remaining = (goal - total) / 100; // back to base currency
            const remainingFormatted = formatMoney(remaining);
            
            // Replace the placeholder with the actual amount
            let newText = translationsObj.remainingAmount.replace('{{amount}}', remainingFormatted);
            
            // Check if replacement worked
            if (newText.includes('{{amount}}')) {
                // Fallback: create a simple message
                const fallbackText = `Вам не хватает ${remainingFormatted} для бесплатной доставки!`;
                fadeText(message, fallbackText);
            } else {
                // Clear any existing content first
                message.textContent = '';
                
                // Set the new message
                fadeText(message, newText);
            }
        }
    }

    function showSuccessState() {
        // Hide progress bar elements
        const progressContainer = bar.querySelector('.progress-bar-container');
        const header = bar.querySelector('.free-shipping-header');
        
        if (progressContainer) progressContainer.style.display = 'none';
        if (header) header.style.display = 'none';
        
        // Show only success message
        const message = bar.querySelector('.free-shipping-text');
        if (message) {
            fadeText(message, translationsObj.youQualify);
        }
    }

    function showProgressState() {
        // Show progress bar elements
        const progressContainer = bar.querySelector('.progress-bar-container');
        const header = bar.querySelector('.free-shipping-header');
        
        if (progressContainer) progressContainer.style.display = 'block';
        if (header) header.style.display = 'flex';
    }

    function animateProgressBar(total) {
        const fill = bar.querySelector('.progress-bar-fill');
        const progress = (total / goal) * 100;
        
        // Set the CSS custom property for the animation target
        fill.style.setProperty('--target-width', progress + '%');
        
        // Add loading class to trigger animation
        fill.classList.add('loading');
        
        // Remove loading class after animation completes
        setTimeout(() => {
            fill.classList.remove('loading');
            // Ensure final width is set correctly
            fill.style.width = progress + '%';
        }, 1000);
    }

    // Helper to fade out + change text + fade in
    function fadeText(element, newText) {
        element.style.opacity = 0;
        setTimeout(() => {
            // Clear any existing content
            element.textContent = '';
            // Set the new text
            element.textContent = newText;
            element.style.opacity = 1;
        }, 200); // half of CSS transition
    }

    // Helper to format money
    function formatMoney(amount) {
        // Get currency symbol from the bar's data attribute
        const currencySymbol = bar.dataset.currencySymbol || '$';
        return currencySymbol + amount.toFixed(2);
    }
});