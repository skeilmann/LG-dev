# Free Shipping Progress Module

This theme uses a centralized module to compute and render the free-shipping progress bar across the site.

Files

- assets/free-shipping-progress.js: Single source of truth for fetching cart totals from /cart.js, computing remaining amount, and updating any progress bars.

How to use

1. Include a container anywhere you want a progress bar:

```
<div data-free-shipping-progress
     data-threshold-cents="5000"
     data-currency-code="USD"
     data-locale-message-progress="{{ 'announcement.free_shipping.progress' | t: remaining: '__REMAINING__' }}"
     data-locale-message-empty="{{ 'announcement.free_shipping.empty' | t }}"
     data-locale-message-reached="{{ 'announcement.free_shipping.reached' | t }}">
  <div class="progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
    <div class="progress__fill"></div>
  </div>
  <div class="message" aria-live="polite"></div>
</div>
```

2. The module auto-initializes on DOM ready and on theme editor section load.
3. It also listens to existing PUB_SUB cartUpdate events where available to avoid duplicate fetches.

Translations and settings

- Default strings are provided via locales under `announcement.free_shipping`.
- Section settings can override messages (`message_empty`, `message_progress`, `message_reached`) where added (e.g. `sections/announcement-bar.liquid`).
- The module replaces placeholders `{{ remaining }}`, `__REMAINING__`, or `[remaining]` with the formatted money.

Testing

- Use Shopify CLI to serve the theme and test:
  - Empty cart → shows empty message.
  - Below threshold → shows progress message with remaining.
  - At/above threshold → shows reached message and 100% progress.
  - Change quantities in cart drawer and cart page; the bar updates.
