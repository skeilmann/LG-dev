# Custom Header Setup Guide

This guide explains how to set up the new custom header design that matches the provided image.

## Overview

The new header features:

- **Logo in the center**
- **4 navigation links on the left** (including a dropdown for Catalog)
- **3 navigation links on the right**
- **Utility icons on the far right** (search, favorites, cart, account)
- **Mobile hamburger menu** that hides the desktop navigation
- **Full translation support** for RO, RU, and EN

## Required Setup

### 1. Create Menu Structure in Shopify Admin

#### Single Menu Structure

Navigate to **Online Store > Navigation** and create a single menu (e.g., `main-menu`) with these items in order:

**First 4 items (Left side):**

1. **КАТАЛОГ** (Catalog) - Set as dropdown with sub-items
   - Add your catalog categories as sub-items
   - This will create the dropdown functionality
2. **БРЕНДЫ** (Brands)
3. **НОВИНКИ** (New Arrivals)
4. **СКИДКИ ДО 50%** (Discounts up to 50%)

**Next 3 items (Right side):** 5. **МАГАЗИН** (Store) 6. **КОНТАКТЫ** (Contacts) 7. **ДЛЯ СТУДИЙ** (For Studios)

**Important:** The order matters! The first 4 items will appear on the left, and the next 3 items will appear on the right.

### 2. Configure Header Section

In your theme customizer:

1. Go to **Theme Customize > Header**
2. Set **Menu** to your single menu (e.g., `main-menu`)
3. Set **Logo Position** to "middle-center"
4. Enable **Show Line Separator** for the bottom decorative line

### 3. Translation Files

The header automatically supports translations for:

- **Romanian (RO)**: Uses `locales/ro.json`
- **Russian (RU)**: Uses `locales/ru.json`
- **English (EN)**: Uses `locales/en.default.json`

Menu item translations are already included in these files under:

```json
"sections": {
  "header": {
    "menu_items": {
      "catalog": "КАТАЛОГ",
      "brands": "БРЕНДЫ",
      "new_arrivals": "НОВИНКИ",
      "discounts": "СКИДКИ ДО 50%",
      "store": "МАГАЗИН",
      "contacts": "КОНТАКТЫ",
      "for_studios": "ДЛЯ СТУДИЙ"
    }
  }
}
```

## Features

### Desktop Layout

- **Grid-based layout** with logo centered
- **Left menu**: 4 items with first item (Catalog) as dropdown
- **Right menu**: 3 items + utility icons
- **Responsive design** that adapts to different screen sizes

### Mobile Layout

- **Hamburger menu** that appears on mobile devices
- **Full-screen overlay** with smooth animations
- **Dropdown support** maintained in mobile view
- **Touch-friendly** navigation

### Dropdown Functionality

- **Hover/click activation** on desktop
- **Click activation** on mobile
- **Automatic closing** when clicking outside
- **Keyboard navigation** support
- **Accessibility features** with ARIA attributes

### Utility Icons

- **Search**: Opens search modal
- **Favorites**: Shows favorites count
- **Cart**: Shows cart count with bubble
- **Account**: Links to customer account/login

## Customization

### Colors

The header uses your theme's color scheme variables:

- `--color-foreground`: Text color
- `--color-background`: Background color
- `--color-accent`: Accent color for focus states

### Styling

All styles are in `assets/component-custom-header.css` and can be customized:

- Menu item spacing and typography
- Dropdown appearance and animations
- Mobile menu styling
- Responsive breakpoints

### JavaScript

The header functionality is in `assets/custom-header.js` and includes:

- Mobile menu toggle
- Dropdown management
- Keyboard navigation
- Touch event handling

## Browser Support

- **Modern browsers**: Full functionality
- **Mobile browsers**: Touch-optimized navigation
- **Screen readers**: Full accessibility support
- **Keyboard navigation**: Complete keyboard support

## Troubleshooting

### Menu Not Appearing

1. Check that the single menu is assigned in theme customizer
2. Verify menu items are published and in the correct order
3. Ensure you have at least 7 menu items (4 for left + 3 for right)
4. Clear browser cache

### Dropdown Not Working

1. Ensure first left menu item has sub-items
2. Check JavaScript console for errors
3. Verify CSS is loading properly

### Mobile Menu Issues

1. Test on actual mobile device
2. Check viewport meta tag
3. Verify JavaScript is loading

### Translation Issues

1. Check locale file syntax
2. Verify translation keys match
3. Clear theme cache

## Performance Notes

- **CSS**: Optimized with minimal selectors
- **JavaScript**: Lightweight with event delegation
- **Images**: SVG icons for crisp display
- **Animations**: Hardware-accelerated transitions

## Accessibility

- **ARIA labels** for screen readers
- **Keyboard navigation** support
- **Focus management** for mobile menu
- **Semantic HTML** structure
- **Color contrast** compliance

## Support

For issues or questions:

1. Check browser console for errors
2. Verify all files are properly uploaded
3. Test with different menu configurations
4. Ensure theme compatibility
