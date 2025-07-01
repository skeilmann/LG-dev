document.addEventListener('DOMContentLoaded', () => {
    const bar = document.querySelector('.free-shipping-bar');
    if (!bar) return;

    const goal = parseInt(bar.dataset.freeShippingGoal, 10); // in cents
    const initialMessage = bar.querySelector('.free-shipping-message').textContent;

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
            fadeText(message, bar.dataset.unlockedMessage || 'Congratulations! You unlocked free shipping!');
        } else {
            const remaining = (goal - total) / 100; // back to euros
            const progress = (total / goal) * 100;
            fill.style.width = `${progress}%`;

            const newText = initialMessage.replace('{{amount}}', remaining.toFixed(2));
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

    // OPTIONAL: listen for cart updates (depends on your theme)
    document.addEventListener('cart:updated', e => {
        const cart = e.detail.cart;
        updateBar(cart.total_price);
    });
});