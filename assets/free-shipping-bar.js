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

    // Function to update threshold based on country
    function updateThresholdForCountry() {
        let newThreshold = goal / 100; // Convert back to base unit
        
        switch(currentCountry) {
            case 'US':
                newThreshold = 50;
                break;
            case 'CA':
                newThreshold = 75;
                break;
            case 'GB':
                newThreshold = 40;
                break;
            case 'DE':
            case 'FR':
            case 'IT':
            case 'ES':
            case 'NL':
            case 'BE':
            case 'AT':
            case 'CH':
                newThreshold = 60;
                break;
            case 'AU':
                newThreshold = 80;
                break;
            case 'JP':
                newThreshold = 5000;
                break;
            default:
                // Keep original threshold
                break;
        }
        
        return newThreshold * 100; // Convert back to cents
    }

    // Listen for country changes
    document.addEventListener('submit', (event) => {
        if (event.target.classList.contains('localization-form')) {
            // Country is being changed, update threshold after a delay
            setTimeout(() => {
                const newCountry = document.querySelector('[data-value]')?.dataset.value;
                if (newCountry && newCountry !== currentCountry) {
                    location.reload(); // Reload to get updated translations and threshold
                }
            }, 1000);
        }
    });

    fetch('/cart.js')
        .then(response => response.json())
        .then(cart => {
            updateBar(cart.total_price);
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
            const newText = translationsObj.remainingAmount.replace('{{amount}}', remainingFormatted);
            fadeText(message, newText);
        }
    }

    // Helper to fade out + change text + fade in
    function fadeText(element, newText) {
        element.style.opacity = 0;
        setTimeout(() => {
            element.textContent = newText;
            element.style.opacity = 1;
        }, 200); // half of CSS transition
    }

    // Helper to format money
    function formatMoney(amount) {
        const currencySymbol = document.querySelector('[data-currency-symbol]')?.dataset.currencySymbol || '$';
        return currencySymbol + amount.toFixed(2);
    }

    // OPTIONAL: listen for cart updates (depends on your theme)
    document.addEventListener('cart:updated', e => {
        const cart = e.detail.cart;
        updateBar(cart.total_price);
    });
});