# Enhanced Shopify Dawn Theme Header

## Overview

This enhancement adds dynamic menu management to the Shopify Dawn theme header, allowing merchants to configure separate left and right navigation menus through the Shopify admin without code changes.

## Features

### 🎯 Dynamic Menu Management

- **Left Menu**: Configurable menu displayed to the left of the logo
- **Right Menu**: Configurable menu displayed to the right of the logo
- **Catalog Dropdown**: Fixed "Catalog" link with dropdown populated from the left menu selection

### 🎨 Theme Customizer Settings

Merchants can now configure:

- **Left Menu**: Select from available Shopify navigation menus (section setting)
- **Right Menu**: Select from available Shopify navigation menus (block setting)
- **Legacy Menu**: Maintained for backward compatibility

### ♿ Accessibility Features

- Full keyboard navigation support (Tab, Enter, Space, Escape, Arrow keys)
- ARIA attributes for screen readers (`aria-expanded`, `aria-controls`, `aria-hidden`)
- Focus management and visible focus indicators
- Skip link for keyboard users
- Proper semantic HTML structure

### 📱 Responsive Design

- Desktop: Full menu display with hover dropdowns
- Mobile: Collapsed into hamburger menu with accordion-style navigation
- Preserves "Catalog" dropdown functionality on mobile

## Implementation Details

### Why Blocks Instead of Multiple Settings?

Shopify's schema system has a limitation: only one `link_list` type setting can exist per section. To work around this limitation while maintaining two independently selectable menus, we use a hybrid approach:

- **Left Menu**: Configured as a section setting (`link_list`)
- **Right Menu**: Configured as a block setting (`link_list`)

This approach allows merchants to:

- Select the left menu directly in the section settings
- Add a "Right Menu Block" to configure the right menu
- Maintain full functionality without schema errors

**Note**: The left menu uses translation keys for internationalization, while the right menu block uses direct text to avoid translation complexity and ensure compatibility.

### File Structure

```
sections/
├── header.liquid (Enhanced with new menu system)
assets/
├── component-custom-header.css (Enhanced styling)
├── custom-header.js (Enhanced JavaScript functionality)
locales/
├── en.default.json (Added translation keys)
```

### Key Components

#### 1. Header Schema (`sections/header.liquid`)

```liquid
{% schema %}
{
  "settings": [
    {
      "type": "link_list",
      "id": "left_menu",
      "default": "main-menu",
      "label": "t:sections.header.settings.left_menu.label"
    }
  ],
  "blocks": [
    {
      "type": "right_menu",
      "name": "Right Menu Block",
      "limit": 1,
      "settings": [
        {
          "type": "link_list",
          "id": "right_menu",
          "default": "main-menu",
          "label": "Right Menu",
          "info": "Select the menu to display on the right side of the logo"
        }
      ]
    }
  ]
}
{% endschema %}
```

#### 2. Menu Rendering

- **Left Side**: Fixed "Catalog" dropdown + selected left menu items
- **Right Side**: Selected right menu items
- **Mobile**: All menus collapsed into hamburger with accordion structure

#### 3. JavaScript Functionality (`assets/custom-header.js`)

- Enhanced dropdown management
- Keyboard navigation support
- Focus management
- Mobile menu functionality

#### 4. CSS Enhancements (`assets/component-custom-header.css`)

- Hover effects for dropdowns
- Responsive design
- Accessibility-focused styling
- Smooth transitions

## Usage Instructions

### For Merchants

1. **Access Theme Customizer**

   - Go to Shopify Admin → Online Store → Themes
   - Click "Customize" on your active theme

2. **Configure Navigation**

   - In the header section, you'll see new settings:
     - **Left Menu**: Choose which menu appears on the left
   - **Add Right Menu Block**:
     - Click "Add block" and select "Right Menu Block"
     - Choose which menu appears on the right

3. **Create Navigation Menus**
   - Go to Shopify Admin → Online Store → Navigation
   - Create or edit menus as needed
   - Assign them to the header settings

### For Developers

#### Adding New Menu Settings

```liquid
{
  "type": "link_list",
  "id": "custom_menu",
  "label": "Custom Menu Label",
  "info": "Helpful information for merchants"
}
```

#### Accessing Menu Data

```liquid
{% if section.settings.left_menu != blank %}
  {% for link in section.settings.left_menu.links %}
    <a href="{{ link.url }}">{{ link.title }}</a>
  {% endfor %}
{% endif %}
```

## Translation Support

### New Translation Keys

```json
{
  "sections": {
    "header": {
      "settings": {
        "navigation": {
          "content": "Navigation Settings"
        },
        "left_menu": {
          "label": "Left Menu",
          "info": "Select the menu to display on the left side of the logo"
        },
        "right_menu": {
          "label": "Right Menu",
          "info": "Select the menu to display on the right side of the logo"
        }
      }
    }
  }
}
```

### Adding New Languages

1. Copy the new keys to your language file
2. Translate the values appropriately
3. Ensure all `t:` references have corresponding translations

## Accessibility Compliance

### WCAG 2.1 AA Standards

- ✅ **Keyboard Navigation**: Full keyboard support
- ✅ **Focus Management**: Visible focus indicators
- ✅ **Screen Reader Support**: Proper ARIA attributes
- ✅ **Skip Links**: Quick access to main content
- ✅ **Color Contrast**: Meets accessibility guidelines

### Keyboard Shortcuts

- **Tab**: Navigate between menu items
- **Enter/Space**: Open/close dropdowns
- **Escape**: Close open dropdowns
- **Arrow Keys**: Navigate within dropdowns

## Browser Support

- **Desktop**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- **Accessibility**: Screen readers, keyboard-only navigation

## Performance Considerations

- Minimal JavaScript overhead
- CSS transitions use hardware acceleration
- Efficient DOM queries and event handling
- No external dependencies

## Troubleshooting

### Common Issues

1. **Menus Not Displaying**

   - Check if menus are assigned in theme customizer
   - Verify menu handles exist in Shopify admin
   - Check browser console for JavaScript errors
   - **Right Menu Issue**: Ensure "Right Menu Block" is added to the header section

2. **Right Menu Not Working**

   - Verify "Right Menu Block" is added to the header section
   - Check that the block is not disabled
   - Ensure a menu is selected in the block settings

3. **Dropdown Not Working**

   - Ensure JavaScript is loading properly
   - Check for CSS conflicts
   - Verify ARIA attributes are present

4. **Mobile Menu Issues**
   - Check viewport meta tag
   - Verify CSS media queries
   - Test on actual mobile devices

### Debug Mode

Enable debug logging by adding to browser console:

```javascript
window.customHeader.debug = true;
```

## Future Enhancements

- [ ] Multi-level dropdown support (3+ levels)
- [ ] Mega menu layouts
- [ ] Sticky navigation options
- [ ] Search integration
- [ ] Language-specific menu configurations

## Support

For technical support or feature requests:

1. Check the troubleshooting section above
2. Review Shopify's theme documentation
3. Test in a development environment first

## Changelog

### Version 1.0.0

- Initial implementation of dynamic menu management
- Added left and right menu settings
- Enhanced accessibility features
- Mobile-responsive design
- Comprehensive keyboard navigation

### Version 1.1.0

- Fixed Shopify schema limitation by using blocks for right menu
- Resolved "Invalid schema: setting link_list type can only be inserted once" error
- Maintained full functionality while working within Shopify's constraints

---

**Note**: This enhancement maintains full backward compatibility with existing Dawn theme installations while adding powerful new customization options for merchants.
