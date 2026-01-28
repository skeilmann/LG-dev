# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Shopify Dawn theme** (v15.2.0 base) for an e-commerce store. The codebase uses Liquid templating, vanilla ES6+ JavaScript (Web Components pattern), and CSS with BEM methodology. No build step is required — Shopify CLI serves the theme directly.

**Repository:** https://github.com/skeilmann/LG-dev.git

## Development Commands

```bash
# Serve theme locally with hot reload
shopify theme dev

# Push theme to Shopify store
shopify theme push

# Pull latest theme from store
shopify theme pull
```

There is no test suite, linter, or build pipeline. Testing is manual: verify in Theme Editor, check responsiveness at 375px / 768px / 1440px, confirm no console errors, and run Lighthouse.

## Architecture

### Directory Layout

- **`layout/`** — Page shells. `theme.liquid` is the main HTML document that wraps every page.
- **`templates/`** — JSON files mapping page types (product, collection, cart, etc.) to sections. Customer account pages live in `templates/customers/`.
- **`sections/`** — Reusable page-level components with their own Liquid + schema definitions. Key custom sections: `Header-2.liquid` (navigation/mega menu), `LG-favorites.liquid` (wishlist), `announcement-bar.liquid`.
- **`snippets/`** — Reusable fragments rendered via `{% render 'snippet-name' %}`. Key ones: `card-product.liquid` (product card), `cart-drawer.liquid` (cart sidebar), `buy-buttons.liquid`.
- **`blocks/`** — Block-level components (e.g., `LG.liquid`, `LG-progress-bar.liquid`).
- **`assets/`** — CSS and JS files loaded by sections. `base.css` is the core stylesheet; `global.js` has shared utilities.
- **`config/`** — `settings_schema.json` (theme settings UI definition) and `settings_data.json` (current values).
- **`locales/`** — 50+ language JSON files. `en.default.json` is the source of truth.

### Key Patterns

**Liquid:** Use `{%- liquid %}` blocks for multi-line logic. Check `!= blank` (not `!= nil`). Use `{% render %}` (not `{% include %}`). Maximum 3 levels of nesting. Always filter output with `| escape`, `| image_url`, etc.

**JavaScript:** Web Components pattern — define custom elements with `customElements.define()`, guard with `if (!customElements.get('name'))`. Vanilla JS only (no jQuery). Use `defer` for non-critical scripts. Hook into DOM via `data-` attributes.

**CSS:** BEM naming (`.block__element--modifier`). Use Dawn CSS custom properties: `rgb(var(--color-background))`, `var(--font-heading-scale)`. Mobile-first media queries (`min-width: 750px`). No inline styles, no `!important`. Prefer Dawn utility classes: `page-width`, `grid`, `grid--2-col`, `section-{{ section.id }}-padding`, `h1`/`h2`/`body`, `button`/`button--secondary`.

**Translations:** All user-facing text must use `{{ 'key.path' | t }}`. Check `locales/en.default.json` for existing keys before adding new ones.

**Section Schemas:** Always include `name`, `settings`, and `presets`. Use `t:` prefix for translatable labels. Set sensible defaults. Add `"limit": 1` on blocks where only one instance makes sense.

**Metafields:** Use `custom.*` namespace. Always check `!= blank` before rendering. Document required metafields in file headers.

### Notable Custom Features

- **Favorites/Wishlist** — `assets/favorites-handler.js` manages favorites for logged-in users (customer metafields) and guests (localStorage), with guest-to-user migration on login. Page section: `sections/LG-favorites.liquid`.
- **Free Shipping Progress Bar** — `assets/free-shipping-progress.js` auto-initializes on any element with `data-free-shipping-progress`. Listens to PUB_SUB `cartUpdate` events. Configurable via data attributes and locale keys under `announcement.free_shipping.*`.
- **Cart Quantity Sync** — `assets/cart-quantity.js` handles real-time cart count updates across the page.
- **Custom Header/Mega Menu** — `sections/Header-2.liquid` with enhanced hover navigation and dropdown handling.

### Reference Files for Patterns

When building new sections or components, study:
- `/sections/main-product.liquid` — complex schema patterns
- `/sections/image-banner.liquid` — media handling
- `/snippets/card-product.liquid` — component structure
- `/assets/component-card.css` — BEM CSS patterns
- `/assets/global.js` — JS utilities and shared functions

## Git Conventions

Commit messages use conventional format:
```
feat(section): add video hero with autoplay
fix(snippet): product card image aspect ratio
style(section): improve mobile spacing
refactor(snippet): simplify icon rendering
perf(section): lazy load collection images
```

Prefixes: `feat`, `fix`, `style`, `refactor`, `perf`, `docs`.

## Performance Guidelines

- Use `loading="lazy"` for below-fold images
- Use `image_url` filter with explicit width (not deprecated `img_url`)
- Paginate long lists: `{% paginate collection.products by 24 %}`
- Cache expensive operations in Liquid variables
- Limit collection queries with `limit: N`
- Avoid nested loops over products/tags (O(n^2)); use `where` filter instead
