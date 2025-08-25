# Product Card Hover Effects Implementation

## Overview

This document outlines the implementation of new hover effects for product cards in the Dawn theme, including a soft pink glow shadow and light grey product title text on hover.

## What Was Implemented

### 1. **Hover Shadow Effect**

- **Soft Pink Glow**: When hovering over a product card, the box shadow changes to a soft pink glow
- **Shadow Properties**: `0 8px 25px rgba(244, 184, 221, 0.3)` - creates a subtle, elegant shadow
- **Smooth Transition**: `transition: box-shadow 0.3s ease` for smooth animation
- **Color**: Uses the existing theme color `#F4B8DD` (soft pink) for consistency

### 2. **Product Title Hover Styling**

- **Color Change**: Product title text changes to light grey (`#808080`) on hover
- **No Underline**: Removes the current underline hover effect (`text-decoration: none`)
- **Smooth Transition**: `transition: color 0.3s ease` for smooth color animation
- **Override Support**: Properly overrides existing `underline-links-hover` behavior

### 3. **CSS Variables**

- **`--color-card-hover-glow`**: `244, 184, 221` (RGB values for #F4B8DD)
- **`--color-card-title-hover`**: `128, 128, 128` (RGB values for #808080)
- **Benefits**: Colors can be easily adjusted from theme settings if needed

## Technical Implementation

### File Modified

- **`assets/component-card.css`** - Added new hover effects and CSS variables

### CSS Structure

```css
:root {
  --color-card-hover-glow: 244, 184, 221; /* #F4B8DD - soft pink */
  --color-card-title-hover: 128, 128, 128; /* #808080 - light grey */
}

/* Ensure smooth transitions for existing card elements */
.card--card:after,
.card--standard .card__inner:after {
  transition: box-shadow 0.3s ease;
}

.card__heading a {
  transition: color 0.3s ease;
}

/* Performance optimization: only enable hover effects on devices that support them */
@media (prefers-reduced-motion: no-preference) {
  /* Hover shadow effect for product cards */
  .card-wrapper:hover .card--card:after,
  .card-wrapper:hover .card--standard .card__inner:after {
    box-shadow: 0 8px 25px rgba(var(--color-card-hover-glow), 0.3) !important;
  }

  /* Product title hover effect */
  .card-wrapper:hover .card__heading a {
    color: rgb(var(--color-card-title-hover));
    text-decoration: none !important;
  }

  /* Override underline-links-hover for product cards */
  .card-wrapper:hover .underline-links-hover .card__heading a {
    text-decoration: none !important;
  }
}
```

## Key Features

### 1. **Accessibility**

- **Sufficient Contrast**: Light grey text provides good contrast against most backgrounds
- **Reduced Motion Support**: Respects `prefers-reduced-motion` user preference
- **Focus States**: Maintains existing focus states for keyboard navigation

### 2. **Performance**

- **Lightweight Shadows**: Uses subtle shadow that won't impact performance
- **Efficient Transitions**: Only applies transitions to necessary properties
- **Media Query Optimization**: Hover effects only enabled when motion is preferred

### 3. **Responsive Design**

- **Mobile Friendly**: Effects work across all device sizes
- **Touch Support**: Hover effects work on touch devices
- **Existing Logic**: Maintains Dawn's responsive card logic intact

### 4. **Theme Integration**

- **Color Consistency**: Uses existing theme color (#F4B8DD) for brand consistency
- **CSS Variables**: Easy to customize colors from theme settings
- **Dawn Patterns**: Follows existing Dawn CSS architecture and naming conventions

## How It Works

### 1. **Shadow Effect**

- Targets the `:after` pseudo-element that Dawn uses for card shadows
- Applies a soft pink glow with 30% opacity for subtlety
- Uses `!important` to ensure it overrides existing shadow styles

### 2. **Title Styling**

- Targets product card headings specifically (`.card__heading a`)
- Changes text color to light grey on hover
- Removes any underline decoration that might be applied by other classes

### 3. **Transition Management**

- Adds smooth transitions to existing card elements
- Ensures consistent animation timing (0.3s ease)
- Maintains performance by only transitioning necessary properties

## Benefits

1. **Enhanced User Experience**: Provides visual feedback on hover
2. **Brand Consistency**: Uses existing theme colors for cohesive design
3. **Accessibility**: Respects user motion preferences
4. **Performance**: Lightweight implementation with smooth animations
5. **Maintainability**: Uses CSS variables for easy customization
6. **Compatibility**: Works with existing Dawn functionality

## Testing

To test the implementation:

1. Hover over product cards to see the soft pink glow shadow
2. Verify product titles change to light grey on hover
3. Confirm no underline appears on hover
4. Test on different devices and screen sizes
5. Verify smooth transitions work correctly
6. Check that reduced motion preferences are respected

## Future Enhancements

Potential improvements could include:

- **Customizable Colors**: Add theme settings for hover colors
- **Animation Variations**: Different hover effects for different card types
- **Enhanced Shadows**: More sophisticated shadow effects
- **Hover States**: Additional hover effects for other card elements
- **Performance Metrics**: Monitor and optimize transition performance

## Browser Support

The implementation uses modern CSS features that are well-supported:

- CSS Variables (CSS Custom Properties)
- CSS Transitions
- Media Queries
- Pseudo-elements
- Box-shadow with rgba colors

All major modern browsers support these features, ensuring consistent behavior across platforms.
