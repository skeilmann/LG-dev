document.addEventListener('DOMContentLoaded', () => {
    const bar = document.querySelector('.free-shipping-bar');
    if (!bar) return;

    const goal = parseInt(bar.dataset.freeShippingGoal, 10); // in cents
    const currentCountry = bar.dataset.currentCountry;
    
    // Parse translations
    const translations = bar.dataset.translations.split(',');
    const translationsObj = {
        remainingAmount: translations[0],
        youQualify: translations[1]
    };

    fetch('/cart.js')
        .then(response => response.json())
        .then(cart => {
            updateBar(cart.total_price);
        })
        .catch(error => {
            console.error('Error fetching cart:', error);
            // Initialize with empty cart
            updateBar(0);
        });

    function updateBar(total) {
        const fill = bar.querySelector('.progress-bar-fill');
        const message = bar.querySelector('.free-shipping-message');

        // Animate bar width (already works thanks to CSS transition)

        if (total >= goal) {
            fill.style.width = '100%';
            fadeText(message, translationsObj.youQualify);
        } else {
            const remaining = (goal - total) / 100; // back to base currency
            const progress = (total / goal) * 100;
            fill.style.width = `${progress}%`;

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

    // OPTIONAL: listen for cart updates (depends on your theme)
    document.addEventListener('cart:updated', e => {
        const cart = e.detail.cart;
        updateBar(cart.total_price);
    });
});