# Cart Quantity Implementation

This implementation adds dynamic cart quantity display to your Dawn theme, showing both per-product quantities on product cards and total cart count in the header.

## Features

- **Product Card Quantities**: Shows how many of each product are currently in the cart
- **Header Cart Count**: Displays total items in cart with a badge
- **Real-time Updates**: Automatically updates when items are added/removed
- **Performance Optimized**: Single cart fetch per update, efficient DOM manipulation
- **Accessibility**: Proper ARIA labels and screen reader support

## Files Added/Modified

### New Files

- `assets/cart-quantity.js` - Main JavaScript functionality
- `assets/component-cart-quantity.css` - Styling for quantity displays
- `snippets/cart-quantity-display.liquid` - Product card quantity snippet
- `snippets/header-cart-count.liquid` - Header cart count snippet

### Modified Files

- `snippets/card-product.liquid` - Added cart quantity display
- `sections/header.liquid` - Updated cart count display and added assets
- `locales/en.default.json` - Added translation key for "in cart"

## How It Works

1. **Initialization**: CartQuantityManager initializes on page load
2. **Cart Fetching**: Fetches current cart data from `/cart.js`
3. **Event Subscription**: Listens to cart update events from other components
4. **DOM Updates**: Updates both product cards and header when cart changes

## Usage

### Product Cards

The cart quantity automatically appears on product cards when items are in the cart. No additional code needed.

### Header Cart Count

The cart count badge automatically appears in the header when items are in the cart. No additional code needed.

### Custom Implementation

```javascript
// Get quantity for a specific product
const quantity = window.cartQuantityManager.getProductQuantity(productId);

// Manually update cart quantities
window.cartQuantityManager.updateCartQuantities(cartData);
```

## Styling

The quantity displays use CSS custom properties for theming:

- `--color-accent` - Background color
- `--color-accent-foreground` - Text color
- `--color-background` - Border color for header badge

## Browser Support

- Modern browsers with ES6+ support
- Graceful degradation for older browsers
- Responsive design for mobile and desktop

## Performance Considerations

- Single cart fetch per update
- Efficient DOM querying and updates
- Debounced event handling
- Minimal re-renders

## Troubleshooting

### Cart quantities not showing

1. Check browser console for JavaScript errors
2. Verify `cart-quantity.js` is loaded in header
3. Ensure product cards have `data-product-id` attributes

### Styling issues

1. Verify `component-cart-quantity.css` is loaded
2. Check CSS custom properties are defined
3. Ensure no conflicting CSS rules

### Translation issues

1. Verify locale files have required keys
2. Check translation syntax in snippets
3. Ensure proper pluralization rules

## Customization

### Change quantity display position

Modify the `createQuantityDisplay` method in `cart-quantity.js` to change where quantities appear on product cards.

### Modify styling

Update `component-cart-quantity.css` to change colors, sizes, and animations.

### Add additional functionality

Extend the `CartQuantityManager` class to add features like:

- Quantity change animations
- Custom quantity formats
- Additional cart information display
