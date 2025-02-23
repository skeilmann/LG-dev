//JS to add item to wishlist

var myObj, myJSON, text, obj, newValue, list, i, k, newList;

if (localStorage.getItem("products") != null) {
    myObj = localStorage.getItem("products");
} else {
    myObj = "";
}

function upDateStorage() {

    let products = [];

    if (localStorage.getItem('products')) {
        products = JSON.parse(localStorage.getItem('products'));
    }

    if (myObj.includes(document.getElementById("productHandle").value)) {

        document.getElementById("js-wish-list").innerHTML = '<p style="margin-top: 10px;">Added. <a href="/pages/favourites" style="text-decoration: underline;">View list</a></p>';

    } else {

        products.push({ 'productHandle': document.getElementById("productHandle").value });

        localStorage.setItem('products', JSON.stringify(products));

        document.getElementById("js-wish-list").innerHTML = '<p style="margin-top: 10px;">Added. <a href="/pages/favourites" style="text-decoration: underline;">View list</a></p>';
    }
}

// JS to remove item from wishlist

var getImageName = function () {
    document.onclick = function (e) {
        if (e.target.getAttribute("data-product") != null) {

            if (document.querySelectorAll('.removeStorage').length > 1) {

                var handle = e.target.getAttribute("data-product");
                //alert(handle);
                //document.getElementById('demo').innerHTML = handle;

                let storageProducts = JSON.parse(localStorage.getItem('products'));

                let products = storageProducts.filter(product => product.productHandle !== handle);

                localStorage.setItem('products', JSON.stringify(products));

                $('#' + handle).fadeOut();

                setTimeout(function () {
                    $('#' + handle).remove();
                }, 1000);

            } else {

                localStorage.removeItem('products');
                location.reload();

            }
        }
    }
}

getImageName()

// JS for search on page

function searchP() {
    // Declare variables
    var input, filter, ul, li, a, i, txtValue;
    input = document.getElementById('myInput');
    filter = input.value.toUpperCase();
    ul = document.getElementById("favourite-container");
    li = ul.querySelectorAll('ul li');
    // Loop through all list items, and hide those who don't match the search query
    for (i = 0; i < li.length; i++) {
        a = li[i];
        txtValue = a.textContent || a.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            li[i].style.display = "";
        } else {
            li[i].style.display = "none";
        }
    }
}

//Propagating the wishlist page.. NOTE: the append code will need to be adjusted with your product-grid-card.liquid code for your collection's page css settings to be reflected on the wishlist page

function initWishlist() {
    if (window.location.href.indexOf("favourites") > -1) {
        initializeWishlist();
    }
}

function initializeWishlist() {
    const text = localStorage.getItem("products");

    if (!text) {
        displayEmptyWishlist();
        return;
    }

    try {
        const products = JSON.parse(text);
        const productHandles = products.map(p => p.productHandle).filter(Boolean);

        if (productHandles.length === 0) {
            displayEmptyWishlist();
            return;
        }

        loadProducts(productHandles);
    } catch (e) {
        console.error('Error parsing wishlist:', e);
        displayEmptyWishlist();
    }
}

function displayEmptyWishlist() {
    document.getElementById("wishlist-here2").innerHTML = `
        <div class="empty-page-content text-center" data-empty-page-content="">
            <h1>Your Wishlist</h1>
            <p class="text-center">Your wishlist is currently empty.</p>
            <a href="/" class="btn btn--has-icon-after cart__continue-btn">Continue shopping</a>
        </div>`;
}

function loadProducts(productHandles) {
    let loadedCount = 0;
    const totalProducts = productHandles.length;

    productHandles.forEach((handle, index) => {
        if (!handle) return;

        jQuery.getJSON('/products/' + handle + '.js')
            .done(function (product) {
                const formattedPrice = Shopify.formatMoney(product.price, theme.moneyFormat);
                const productCard = createProductCard(product, formattedPrice, index);
                $('#wishlist-here2').append(productCard);

                loadedCount++;
                if (loadedCount === totalProducts) {
                    initializeLoadMore();
                }
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                console.error(`Failed to load product ${handle}:`, errorThrown);
                loadedCount++;
            });
    });
}

function createProductCard(product, formattedPrice, index) {
    const variant = product.variants[0];
    const isAvailable = variant && variant.available;
    const variantId = isAvailable ? variant.id : '';
    const buttonState = isAvailable ? '' : 'disabled';
    const buttonText = isAvailable ? 'ADD TO BAG' : 'SOLD OUT';

    return `
        <li id="${product.handle}" class="grid__item content" ${index >= 40 ? 'style="display:none;"' : ''}>
            <div class="card-wrapper product-card-wrapper underline-links-hover">
                <div class="card card--standard">
                    <div class="card__inner ratio">
                        <div class="card__media">
                            <div class="media media--transparent media--hover-effect">
                                <img src="${product.featured_image}" 
                                     alt="${escapeHtml(product.title)}" 
                                     class="motion-reduce"
                                     loading="lazy">
                            </div>
                        </div>
                    </div>
                    <div class="card__content">
                        <div class="card__information">
                            <h3 class="card__heading">
                                <a href="${product.url}" class="full-unstyled-link">${escapeHtml(product.title)}</a>
                            </h3>
                            <div class="card-information">
                                ${product.vendor ? `<span class="caption-large light">${escapeHtml(product.vendor)}</span>` : ''}
                                <span class="caption-large light">${formattedPrice}</span>
                            </div>
                            <form method="post" action="/cart/add" class="product-form" data-product-id="${product.id}">
                                <input type="hidden" name="id" value="${variantId}">
                                <input type="hidden" name="quantity" value="1">
                                <button type="submit" 
                                        class="button button--full-width button--secondary"
                                        ${buttonState}>
                                    ${buttonText}
                                </button>
                            </form>
                            <button class="button button--full-width removeStorage" data-product="${product.handle}">
                                <span class="icon">&#8553;</span>
                                <span>REMOVE</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </li>`;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function initializeLoadMore() {
    const $content = $(".content");
    const $loadMore = $("#loadMore");

    // Show first 40 items
    $content.slice(0, 40).show();

    if ($content.length <= 40) {
        $loadMore.hide();
    }

    // Infinite scroll
    $(window).off('scroll.wishlist').on('scroll.wishlist', debounce(function () {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 200) {
            const $hidden = $(".content:hidden");
            if ($hidden.length > 0) {
                $hidden.slice(0, 40).slideDown();
            }
        }
    }, 250));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

//Page's loadmore with 40 products loaded per time..

(function () {
    function waitForJQuery(callback) {
        if (typeof window.jQuery === 'undefined') {
            setTimeout(function () { waitForJQuery(callback) }, 100);
        } else {
            callback();
        }
    }

    function initializeWishlistFeatures() {
        waitForJQuery(function () {
            // Initialize wishlist when jQuery is available
            if (window.location.href.indexOf("favourites") > -1) {
                initializeWishlist();
            }

            // Initialize load more functionality
            setTimeout(function () {
                jQuery(".content").slice(0, 40).show();

                if (jQuery('#wishlist-here2 li')[0]) {
                    jQuery('#favourite-container .section-header').fadeIn();
                }
            }, 1000);

            // Initialize scroll loading
            setTimeout(function () {
                jQuery(window).on('resize scroll', debounce(function () {
                    var nearToBottom = jQuery('#shopify-section-footer').outerHeight() - 200;

                    if (jQuery(window).scrollTop() + jQuery(window).height() > jQuery(document).height() - nearToBottom) {
                        if (jQuery(".content:hidden").length > 0) {
                            jQuery("#loadMore").html('LOADING...').show();

                            setTimeout(function () {
                                jQuery(".content:hidden").slice(0, 40).slideDown();
                                jQuery("#loadMore").fadeOut();
                            }, 1000);
                        } else {
                            jQuery("#loadMore").fadeOut();
                        }
                    }
                }, 250));
            }, 1500);
        });
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWishlistFeatures);
    } else {
        initializeWishlistFeatures();
    }
})();