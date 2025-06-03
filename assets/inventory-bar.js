// inventory-bar.js
// Hides the default inventory element and adds a styled inventory bar after the favorite button

document.addEventListener('DOMContentLoaded', function () {
    // Find the wrapper and bar correctly
    var wrapper = document.querySelector('.inventory-bar__wrapper');
    if (!wrapper) return;
    var bar = wrapper.querySelector('.inventory-bar');
    if (!bar) return;

    // Get inventory quantity
    var inventoryQty = parseInt(bar.getAttribute('data-inventory'), 10) || 0;

    var sections = bar.querySelectorAll('.inventory-bar__section');
    // Remove all fill classes
    sections.forEach(function (s) {
        s.className = 'inventory-bar__section';
    });
    // Remove all glow classes
    wrapper.classList.remove('glow-green', 'glow-yellow', 'glow-red');
    // Fill logic for 3 segments and set glow
    if (inventoryQty > 20) {
        sections.forEach(function (s) {
            s.classList.add('filled-green');
        });
        wrapper.classList.add('glow-green');
    } else if (inventoryQty > 7) {
        if (sections[0]) sections[0].classList.add('filled-yellow');
        if (sections[1]) sections[1].classList.add('filled-yellow');
        wrapper.classList.add('glow-yellow');
    } else if (inventoryQty > 0) {
        if (sections[0]) sections[0].classList.add('filled-red');
        wrapper.classList.add('glow-red');
    } else {
        // No fill if 0, red glow
        wrapper.classList.add('glow-red');
    }
});
