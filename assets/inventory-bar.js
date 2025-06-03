// inventory-bar.js
// Hides the default inventory element and adds a styled inventory bar after the favorite button

document.addEventListener('DOMContentLoaded', function () {
    // Hide the original inventory element
    var inventoryEl = document.querySelector('.product__inventory');
    if (inventoryEl) {
        inventoryEl.style.display = 'none';
    }

    // Find the favorite button (assume it has class 'favorite-button' or similar)
    var favoriteBtn = document.querySelector('.favorite-button, .product-favorite-button');
    if (!favoriteBtn) return;

    // Get inventory quantity from the hidden element (if available)
    var inventoryQty = 0;
    var invDataEl = document.querySelector('.product__inventory');
    if (invDataEl && invDataEl.textContent.trim()) {
        var match = invDataEl.textContent.match(/\d+/);
        if (match && !isNaN(match[0])) inventoryQty = parseInt(match[0], 10);
        inventoryQty = parseInt(match[0], 10);
    }

    // Fallback: try to get from data attribute if available
    if (invDataEl && invDataEl.dataset.inventory) {
        inventoryQty = parseInt(invDataEl.dataset.inventory, 10);
    }

    // Define thresholds for 5 levels (customize as needed)
    var thresholds = [1, 3, 5, 10, 11]; // 0-2: red, 3-4: orange, 5-9: yellow, 10+: green
    var filled = 0;
    for (var i = 0; i < thresholds.length; i++) {
        if (inventoryQty >= thresholds[i]) filled = i + 1;
    }

    // Determine bar color
    var barColor = '#e74c3c'; // red
    if (inventoryQty >= 10) {
        barColor = '#3ed660'; // green
    } else if (inventoryQty >= 5) {
        barColor = '#f1c40f'; // yellow
    } else if (inventoryQty >= 3) {
        barColor = '#e69441'; // orange
    }

    // Create the bar
    var bar = document.createElement('div');
    bar.className = 'inventory-bar';
    bar.style.setProperty('--inventory-bar-color', barColor);
    for (var i = 0; i < 5; i++) {
        var section = document.createElement('span');
        section.className = 'inventory-bar__section';
        // Do not color yet, will be colored after scroll
        bar.appendChild(section);
    }

    // Add a label with stock quantity
    var label = document.createElement('span');
    label.className = 'inventory-bar__label';
    label.textContent = inventoryQty > 0 ? `Stock: ${inventoryQty}` : 'Out of stock';
    bar.appendChild(label);

    // Insert after favorite button
    favoriteBtn.parentNode.insertBefore(bar, favoriteBtn.nextSibling);

    // --- Animate bar and label after scroll into view + 1s ---
    function animateBarAndLabel() {
        var sections = bar.querySelectorAll('.inventory-bar__section');
        for (var i = 0; i < filled; i++) {
            sections[i].style.background = barColor;
        }
        // Emphasize label
        label.classList.add('emphasize');
        setTimeout(function () {
            label.classList.remove('emphasize');
        }, 900);
    }

    // Intersection Observer to trigger animation
    var observer = new window.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                setTimeout(animateBarAndLabel, 1000);
                observer.disconnect();
            }
        });
    }, { threshold: 0.3 });
    observer.observe(bar);
});
