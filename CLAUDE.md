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
- **`sections/`** — Reusable page-level components with their own Liquid + schema definitions.
- **`snippets/`** — Reusable fragments rendered via `{% render 'snippet-name' %}`.
- **`blocks/`** — Block-level components (e.g., `LG.liquid`, `LG-progress-bar.liquid`).
- **`assets/`** — CSS and JS files loaded by sections. `base.css` is the core stylesheet; `global.js` has shared utilities.
- **`config/`** — `settings_schema.json` (theme settings UI definition) and `settings_data.json` (current values).
- **`locales/`** — 50+ language JSON files. `en.default.json` is the source of truth.

### Theme Load Order

Scripts load in this sequence via `theme.liquid`:

1. `constants.js` (defer) — PUB_SUB event name constants
2. `pubsub.js` (defer) — Publish-subscribe implementation
3. Inline script — Sets `window.Shopify.customerId` and `window.Shopify.favorites` from customer metafields
4. `global.js` (defer) — Core utilities, base Web Components (`QuantityInput`, `MenuDrawer`, `DeferredMedia`, etc.)
5. `details-disclosure.js`, `details-modal.js`, `search-form.js` (defer)
6. `favorites-handler.js` (defer) — Auto-initializes on page load
7. `loyalty-handler.js` (defer) — Auto-initializes on page load
8. `animations.js` (defer, conditional on theme settings)

### PUB_SUB Event System

Components communicate via a lightweight publish-subscribe system (`pubsub.js` + `constants.js`):

- **`cartUpdate`** — Fired when cart contents change. Consumed by cart drawer, cart page, free shipping bar, quantity inputs.
- **`quantityUpdate`** — Fired when product quantity changes.
- **`variantChange`** — Variant selection changes on product pages.
- **`optionValueSelectionChange`** — Variant option dropdowns/swatches selected.
- **`cartError`** — Cart operations fail.

**Usage pattern:** Call `subscribe(eventName, callback)` in `connectedCallback()`, store the returned unsubscriber function, and call it in `disconnectedCallback()`.

```javascript
connectedCallback() {
  this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate.bind(this));
}
disconnectedCallback() {
  if (this.cartUpdateUnsubscriber) this.cartUpdateUnsubscriber();
}
```

### Section Rendering API

The theme uses Shopify's Section Rendering API for dynamic partial updates without full page reloads:

- Append `?section_id=<section-name>` to any Shopify URL to get only that section's HTML
- Common patterns: `/cart.js?section_id=cart-drawer`, `{productUrl}?section_id=main-product`
- `HTMLUpdateUtility.viewTransition()` in `global.js` handles smooth DOM swaps with pre/post-process callbacks
- `SectionId` class parses qualified IDs like `template--12345__main` into components

### Key Patterns

**Liquid:** Use `{%- liquid %}` blocks for multi-line logic. Check `!= blank` (not `!= nil`). Use `{% render %}` (not `{% include %}`). Maximum 3 levels of nesting. Always filter output with `| escape`, `| image_url`, etc.

**JavaScript:** Web Components pattern — define custom elements with `customElements.define()`, guard with `if (!customElements.get('name'))`. Vanilla JS only (no jQuery). Use `defer` for non-critical scripts. Hook into DOM via `data-` attributes.

**CSS:** BEM naming (`.block__element--modifier`). Use Dawn CSS custom properties: `rgb(var(--color-background))`, `var(--font-heading-scale)`. Mobile-first media queries (`min-width: 750px`). No inline styles, no `!important`. Prefer Dawn utility classes: `page-width`, `grid`, `grid--2-col`, `section-{{ section.id }}-padding`, `h1`/`h2`/`body`, `button`/`button--secondary`.

**Translations:** All user-facing text must use `{{ 'key.path' | t }}`. Check `locales/en.default.json` for existing keys before adding new ones.

**Section Schemas:** Always include `name`, `settings`, and `presets`. Use `t:` prefix for translatable labels. Set sensible defaults. Add `"limit": 1` on blocks where only one instance makes sense.

**File Headers:** Section files should include a comment block with filename, purpose, and dependencies. Snippet files should document parameters and usage example.

**Metafields:** Use `custom.*` namespace. Always check `!= blank` before rendering. Document required metafields in file headers.

### Accessibility Requirements

- One `<h1>` per page, logical heading order
- All images have descriptive `alt` text (or `alt=""` if decorative)
- Interactive elements keyboard-accessible (test with Tab key)
- Buttons use `<button>`, links use `<a>`
- Forms have associated `<label>` elements
- Color contrast minimum 4.5:1 for text
- ARIA attributes where needed: `aria-label`, `aria-describedby`
- Use semantic HTML with `aria-labelledby` on sections

## Custom Features

### Favorites/Wishlist

**Files:** `assets/favorites-handler.js`, `assets/favorites-page.js`, `sections/LG-favorites.liquid`

**Dual-storage architecture:**
- Logged-in users: customer metafield `custom.fav_prod` (JSON: `{saved: [{id, handle}, ...]}`)
- Guests: localStorage key `guestFavorites` (same format)
- On login, `migrateGuestFavorites()` merges guest favorites into the customer metafield
- `window.Shopify.favorites` is set in `theme.liquid` from metafield data

### Free Shipping Progress Bar

**Files:** `assets/free-shipping-progress.js`, `snippets/free-shipping-progress.liquid`

- Auto-initializes on any element with `[data-free-shipping-progress]` attribute
- Uses internal `CartStore` pattern for centralized, debounced `/cart.js` fetching (300ms min interval)
- Subscribes to PUB_SUB `cartUpdate` for real-time updates
- Message placeholders: `{{ remaining }}`, `__REMAINING__`, or `[remaining]`
- Configured via data attributes: `data-threshold-cents`, `data-currency-code`
- Locale keys: `announcement.free_shipping.{progress,empty,reached}`

### Custom Header / Mega Menu

**Files:** `sections/Header-2.liquid`, `assets/custom-header.js`, `assets/component-custom-header.css`

- 4-zone mega menu: categories → subcategories → sub-subcategories → featured images
- Data-driven selectors: `data-target-list` and `data-target-image` on links
- Universal `.is-visible` class for all visibility states
- Hover intent delay (50ms) prevents accidental triggers
- CSS-driven image display with lazy loading
- RAF-based animations with GPU acceleration
- Mobile accordion with touch swipe gestures

### Recently Viewed Products

**Files:** `assets/recently-viewed.js`, `sections/recently-viewed-products.liquid`

- localStorage key `recentlyViewedProducts`, max 20 products
- Tracks via `<recently-viewed-products>` Web Component or fallback meta tag extraction
- Stores: id, handle, title, url, vendor, price, image, timestamp
- Template cloning for card rendering with slider integration
- Fires `recentlyViewed:cleared` custom event on history clear

### Loyalty / Cashback System

**Files:** `assets/loyalty-handler.js`, `sections/loyalty-rewards-page.liquid`

- Integrates with external VPS loyalty API
- Tier system: Bronze (1x) → Silver (1.5x) → Gold (2x) points multiplier
- Fetches balance, tier, redemption status, and history
- Updates UI in points badge, cart widget, and account section
- Guest-friendly tier preview for unauthenticated users

### Mobile Bottom Navigation

**File:** `assets/mobile-bottom-nav.js`

- Fixed translucent bottom bar (iOS style)
- Bottom sheet drawer with touch gestures and drag-to-close (velocity detection)
- Active page detection and responsive resize observer

### Instagram Circular Video Feed

**File:** `assets/instagram-circular-feed.js`

- Fetches videos from Instagram Graph API using access token
- Configurable video count via `data-video-count`
- Responsive slides-per-view calculation
- Error states: no token, empty feed, network failure

### Predictive Search

**Files:** `assets/predictive-search.js`, `sections/predictive-search.liquid`

- Extends `SearchForm` class from `search-form.js`
- Caches results to avoid re-fetching identical queries
- Uses `AbortController` to cancel in-flight requests
- Keyboard navigation (arrow keys + Enter) with `aria-selected` state management
- Fetches from `/search/suggest?section_id=predictive-search`

### Cart Quantity Sync

**File:** `assets/cart-quantity.js`

- Real-time cart count updates across the page via PUB_SUB `cartUpdate`

## Reference Files for Patterns

When building new sections or components, study:
- `sections/main-product.liquid` — complex schema patterns
- `sections/image-banner.liquid` — media handling
- `snippets/card-product.liquid` — component structure
- `assets/component-card.css` — BEM CSS patterns
- `assets/global.js` — JS utilities and shared functions (`HTMLUpdateUtility`, `SectionId`, `debounce`, `fetchConfig`)

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
- Use `loading="eager"` + `fetchpriority="high"` on hero/banner images (above-fold only)
- Use `image_url` filter with explicit width (not deprecated `img_url`)
- Always set `width`/`height` attributes on images to prevent CLS; use `aspect-ratio` CSS on containers for dynamic content
- Paginate long lists: `{% paginate collection.products by 24 %}`
- Cache expensive operations in Liquid variables
- Limit collection queries with `limit: N`
- Avoid nested loops over products/tags (O(n^2)); use `where` filter instead
- Use `font-display: swap` for custom fonts; preload critical fonts with `<link rel="preload" as="font" crossorigin>`
- Add `<link rel="preconnect">` for `fonts.shopifycdn.com`; use `<link rel="dns-prefetch">` for third-party domains (analytics, chat widgets)
- Load non-essential third-party scripts (analytics, chat, reviews) on first user interaction (`mousedown`/`scroll`/`touchstart`) with a 5s fallback timeout — never on page load
- Lazy-load below-fold section content via `IntersectionObserver` with `rootMargin: '200px'` to prefetch before viewport entry