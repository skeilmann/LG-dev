/**
 * cart-restore.js
 * Keeps the shopper's cart safe around "купить в один клик" (buy in one click).
 *
 * The one-click button sends the shopper to checkout with a cart permalink
 * (/cart/<variant>:<qty>), which replaces the online store cart. Just before that,
 * saveCurrentCart() stores the existing cart lines in localStorage. On the next
 * storefront page load (after paying or after leaving checkout), restore() adds
 * back any saved lines that aren't in the cart.
 *
 * Exposes: window.VevCartRestore.saveCurrentCart()
 * Depends on (optional): pubsub.js / constants.js to refresh cart UI.
 */
(function () {
  if (window.VevCartRestore) return;

  const STORAGE_KEY = 'vev:savedCart';
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

  const storage = {
    get() {
      try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      } catch (error) {
        return null;
      }
    },
    set(value) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch (error) {
        /* storage blocked: the one-click checkout still works, the cart just isn't restored */
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        /* ignore */
      }
    },
  };

  async function getCart() {
    const response = await fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`cart.js ${response.status}`);
    return response.json();
  }

  function toLine(item) {
    const line = { id: item.id, quantity: item.quantity };
    if (item.properties && Object.keys(item.properties).length > 0) line.properties = item.properties;
    if (item.selling_plan) line.selling_plan = item.selling_plan;
    return line;
  }

  async function addLines(lines) {
    const post = (items) =>
      fetch(`${root}cart/add.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items }),
      });

    const response = await post(lines);
    if (response.ok || lines.length === 1) return;

    // One line failed (e.g. now sold out): add the others one by one.
    for (const line of lines) {
      try {
        await post([line]);
      } catch (error) {
        /* skip unavailable line */
      }
    }
  }

  async function saveCurrentCart() {
    try {
      const cart = await getCart();
      if (!cart.items || cart.items.length === 0) {
        storage.clear();
        return;
      }
      storage.set({
        savedAt: Date.now(),
        items: cart.items.map((item) => ({
          id: item.variant_id,
          quantity: item.quantity,
          properties: item.properties || {},
          selling_plan:
            item.selling_plan_allocation && item.selling_plan_allocation.selling_plan
              ? item.selling_plan_allocation.selling_plan.id
              : null,
        })),
      });
    } catch (error) {
      /* could not read the cart: continue to checkout anyway */
    }
  }

  let restoring = false;

  async function restore() {
    if (restoring) return;
    const saved = storage.get();
    if (!saved) return;

    // Clear first so another tab or a reload can't add the lines twice.
    storage.clear();
    if (!Array.isArray(saved.items) || Date.now() - saved.savedAt > MAX_AGE_MS) return;

    restoring = true;
    try {
      const cart = await getCart();
      const inCart = new Set(cart.items.map((item) => item.variant_id));
      const lines = saved.items.filter((item) => !inCart.has(item.id)).map(toLine);
      if (lines.length === 0) return;

      await addLines(lines);

      const updatedCart = await getCart();
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-restore', cartData: updatedCart });
      }
      if (/\/cart\/?$/.test(window.location.pathname)) window.location.reload();
    } catch (error) {
      console.error('Cart restore failed:', error);
    } finally {
      restoring = false;
    }
  }

  window.VevCartRestore = { saveCurrentCart, restore };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore);
  } else {
    restore();
  }

  // Back button from checkout can show this page from the browser cache without reloading.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) restore();
  });
})();
