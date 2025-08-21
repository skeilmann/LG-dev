# Mega Menu Refactor Guide

## Overview

The mega menu has been refactored to use a **DRY (Don't Repeat Yourself)** approach with universal visibility classes and data-driven attributes. This guide explains how to implement the new system.

## Key Changes

### 1. Universal `.is-visible` Class

**Before:** Multiple custom classes (`.mega-menu-visible`, `.mega-menu-hidden`, `.active`) **After:** Single `.is-visible` class controls all visibility states

```css
/* Single universal visibility class */
.is-visible {
  opacity: 1 !important;
  visibility: visible !important;
  transform: translateY(0) !important;
  pointer-events: auto !important;
  position: relative !important;
}
```

### 2. DRY Helper Functions

**Before:** Repetitive DOM manipulation in each hover handler **After:** Reusable helper functions

```javascript
// Universal helper to hide elements
resetVisibility(elements, (setAriaHidden = true));

// Universal helper to show elements
showElements(elements);
```

### 3. Data-Driven Approach

**Before:** Hardcoded selectors in JavaScript **After:** Flexible data attributes on HTML elements

## Translation Setup

To use proper translations in JavaScript, add this to your `sections/header.liquid` file in the `<head>` or before the closing `</body>` tag:

```liquid
<script>
  document.documentElement.setAttribute('data-no-image-text', '{{ "sections.header.no_image" | t }}');
</script>
```

This passes the translated "No image available" text to JavaScript for use in mobile image loading.

## Required HTML Structure Updates

### Category Links (Column 1)

Update your category links in `sections/header.liquid` to include data attributes:

```liquid
<a
  href="{{ link.url }}"
  class="mega-menu-link mega-menu-category"
  role="menuitem"
  data-target-list="[data-parent-category='{{ link.handle }}']"
  data-target-image="[data-category-image='{{ link.handle }}']"
  aria-label="{{ 'sections.header.categories' | t }}: {{ link.title | escape }}"
  {% if link.current %}
    aria-current="page"
  {% endif %}
>
  {{ link.title | escape }}
</a>
```

### Subcategory Links (Column 2)

Update subcategory links to include data attributes:

```liquid
<a
  href="{{ sublink.url }}"
  class="mega-menu-link mega-menu-sublink"
  role="menuitem"
  data-target-list="[data-parent-subcategory='{{ sublink.handle }}']"
  data-target-image="[data-subcategory-image='{{ sublink.handle }}']"
  aria-label="{{ 'sections.header.subcategories' | t }}: {{ sublink.title | escape }}"
  {% if sublink.current %}
    aria-current="page"
  {% endif %}
>
  {{ sublink.title | escape }}
</a>
```

### Sub-subcategory Links (Column 3)

Update sub-subcategory links to include image data attributes:

```liquid
<a
  href="{{ grandchildlink.url }}"
  class="mega-menu-link mega-menu-sub-sublink"
  role="menuitem"
  data-target-image="[data-sub-subcategory-image='{{ grandchildlink.handle }}']"
  aria-label="{{ 'sections.header.sub_subcategories' | t }}: {{ grandchildlink.title | escape }}"
  {% if grandchildlink.current %}
    aria-current="page"
  {% endif %}
>
  {{ grandchildlink.title | escape }}
</a>
```

### Update List Classes

Change list classes from custom visibility classes to default hidden state:

```liquid
<!-- Before -->
<ul class="mega-menu-list mega-menu-subcategories mega-menu-hidden">

<!-- After -->
<ul class="mega-menu-list mega-menu-subcategories">
```

### Image Structure (Column 4)

Ensure images have proper data attributes for targeting:

```liquid
<!-- Category images -->
<img
  src="{{ category_image_url }}"
  alt="{{ category.title }}"
  class="mega-menu-category-image"
  data-category-image="{{ category.handle }}"
  loading="lazy"
  width="200"
  height="200"
  style="object-fit: cover;"
>

<!-- Subcategory images -->
<img
  src="{{ subcategory_image_url }}"
  alt="{{ subcategory.title }}"
  class="mega-menu-subcategory-image"
  data-subcategory-image="{{ subcategory.handle }}"
  loading="lazy"
  width="200"
  height="200"
  style="object-fit: cover;"
>

<!-- Sub-subcategory images -->
<img
  src="{{ sub_subcategory_image_url }}"
  alt="{{ sub_subcategory.title }}"
  class="mega-menu-sub-subcategory-image"
  data-sub-subcategory-image="{{ sub_subcategory.handle }}"
  loading="lazy"
  width="200"
  height="200"
  style="object-fit: cover;"
>
```

## Data Attributes Reference

| Attribute                    | Purpose                                      | Example Value                            |
| ---------------------------- | -------------------------------------------- | ---------------------------------------- |
| `data-target-list`           | Specifies which list to show on hover        | `"[data-parent-category='electronics']"` |
| `data-target-image`          | Specifies which image to show on hover       | `"[data-category-image='electronics']"`  |
| `data-parent-category`       | Links subcategory lists to categories        | `"electronics"`                          |
| `data-parent-subcategory`    | Links sub-subcategory lists to subcategories | `"smartphones"`                          |
| `data-category-image`        | Identifies category images                   | `"electronics"`                          |
| `data-subcategory-image`     | Identifies subcategory images                | `"smartphones"`                          |
| `data-sub-subcategory-image` | Identifies sub-subcategory images            | `"iphones"`                              |

## Implementation Example

Here's a complete example for a category with subcategories and images:

```liquid
<!-- Category Link -->
<a
  href="/collections/electronics"
  class="mega-menu-link mega-menu-category"
  data-target-list="[data-parent-category='electronics']"
  data-target-image="[data-category-image='electronics']"
>
  Electronics
</a>

<!-- Subcategory List (hidden by default, shown when Electronics is hovered) -->
<ul
  class="mega-menu-list mega-menu-subcategories"
  data-parent-category="electronics"
>
  <li>
    <a
      href="/collections/smartphones"
      class="mega-menu-link mega-menu-sublink"
      data-target-list="[data-parent-subcategory='smartphones']"
      data-target-image="[data-subcategory-image='smartphones']"
    >
      Smartphones
    </a>
  </li>
</ul>

<!-- Sub-subcategory List (hidden by default, shown when Smartphones is hovered) -->
<ul
  class="mega-menu-list mega-menu-sub-subcategories"
  data-parent-subcategory="smartphones"
>
  <li>
    <a
      href="/collections/iphones"
      class="mega-menu-link mega-menu-sub-sublink"
      data-target-image="[data-sub-subcategory-image='iphones']"
    >
      iPhones
    </a>
  </li>
</ul>

<!-- Images (all hidden by default, shown based on hover state) -->
<img
  src="/path/to/electronics.jpg"
  class="mega-menu-category-image"
  data-category-image="electronics"
  loading="lazy" width="200" height="200"
>

<img
  src="/path/to/smartphones.jpg"
  class="mega-menu-subcategory-image"
  data-subcategory-image="smartphones"
  loading="lazy" width="200" height="200"
>

<img
  src="/path/to/iphones.jpg"
  class="mega-menu-sub-subcategory-image"
  data-sub-subcategory-image="iphones"
  loading="lazy" width="200" height="200"
>
```

## Benefits of This Approach

1. **Maintainable**: Single visibility class reduces CSS complexity
2. **Flexible**: Easy to add new categories without changing JavaScript
3. **Performance**: Optimized with lazy loading and GPU acceleration
4. **Accessible**: Maintains all ARIA attributes and keyboard navigation
5. **DRY**: Eliminates code duplication across hover handlers

## Migration Checklist

- [ ] Add translation setup script to `sections/header.liquid`
- [ ] Update category links with `data-target-list` and `data-target-image` attributes
- [ ] Update subcategory links with `data-target-list` and `data-target-image` attributes
- [ ] Update sub-subcategory links with `data-target-image` attributes
- [ ] Remove old visibility classes (`mega-menu-visible`, `mega-menu-hidden`) from HTML
- [ ] Ensure all images have proper `data-*-image` attributes
- [ ] Add `loading="lazy"`, `width="200"`, `height="200"` to all images
- [ ] Test hover functionality in both directions (top-to-bottom and bottom-to-top)
- [ ] Test keyboard navigation
- [ ] Verify mobile accordion functionality
- [ ] Verify translations work correctly

## Troubleshooting

**Q: Images not showing on hover** A: Check that `data-target-image` attribute values match the image `data-*-image` attributes exactly.

**Q: Lists not appearing on hover** A: Verify `data-target-list` attribute values match the list `data-parent-*` attributes exactly.

**Q: Hover states not working** A: Ensure you've removed old visibility classes from HTML and that elements have the correct base classes.
