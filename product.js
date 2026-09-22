/* =========================================================
   FRRIDAY PRODUCT ENGINE
   Shopify Storefront API via /api/shopify
   ========================================================= */

(() => {
  "use strict";

  const CART_KEY = "frriday-cart-id";
  const SHOPIFY_ENDPOINT = "/api/shopify";

  let product = null;
  let galleryImages = [];
  let selectedVariant = null;
  let quantity = 1;
  let galleryIndex = 0;


  /* -------------------------------------------------------
     DOM HELPERS
     ------------------------------------------------------- */

  const $ = (selector) => document.querySelector(selector);

  const $$ = (selector) => [
    ...document.querySelectorAll(selector)
  ];


  function setText(selector, value) {
    const el = $(selector);

    if (el) {
      el.textContent = value ?? "";
    }

    return el;
  }


  function setHTML(selector, value) {
    const el = $(selector);

    if (el) {
      el.innerHTML = value ?? "";
    }

    return el;
  }


  function show(selector) {
    const el = $(selector);

    if (el) {
      el.hidden = false;
    }
  }


  function hide(selector) {
    const el = $(selector);

    if (el) {
      el.hidden = true;
    }
  }


  /* -------------------------------------------------------
     GENERAL HELPERS
     ------------------------------------------------------- */

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function money(amount, currency = "USD") {
    const number = Number(amount || 0);

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2
      }).format(number);
    } catch {
      return `$${number.toFixed(2)}`;
    }
  }


  function humanTitle(title) {
    return String(title || "FRRIDAY")
      .replace(/\s+/g, " ")
      .trim();
  }


  function getHandle() {
    const url = new URL(window.location.href);

    const parts = url.pathname
      .split("/")
      .filter(Boolean);

    const productIndex = parts.indexOf("products");

    if (productIndex !== -1 && parts[productIndex + 1]) {
      return decodeURIComponent(
        parts[productIndex + 1]
      );
    }

    return url.searchParams.get("handle") || "";
  }


  function getProductUrl(handle) {
    return `/products/${encodeURIComponent(handle)}`;
  }


  /* -------------------------------------------------------
     SHOPIFY GRAPHQL
     ------------------------------------------------------- */

  async function shopify(query, variables = {}) {

    const response = await fetch(SHOPIFY_ENDPOINT, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        query,
        variables
      })
    });


    let data = null;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Shopify returned an invalid response."
      );
    }


    if (!response.ok) {

      const message =
        data?.errors?.map(error => error.message).join("; ") ||
        data?.error ||
        `Shopify request failed (${response.status}).`;

      throw new Error(message);
    }


    if (data?.errors?.length) {

      throw new Error(
        data.errors
          .map(error => error.message)
          .join("; ")
      );
    }


    return data?.data;
  }


  /* -------------------------------------------------------
     PRODUCT QUERY
     ------------------------------------------------------- */

  const PRODUCT_QUERY = `
    query ProductByHandle($handle: String!) {

      productByHandle(handle: $handle) {

        id

        handle

        title

        description

        descriptionHtml

        availableForSale

        featuredImage {
          url
          altText
        }

        images(first: 20) {
          nodes {
            id
            url
            altText
          }
        }

        variants(first: 100) {

          nodes {

            id

            title

            availableForSale

            quantityAvailable

            price {
              amount
              currencyCode
            }

            compareAtPrice {
              amount
              currencyCode
            }

            selectedOptions {
              name
              value
            }

            image {
              url
              altText
            }

          }

        }

      }

    }
  `;


  async function loadProduct() {

    const handle = getHandle();

    if (!handle) {
      throw new Error(
        "No product handle was found in the URL."
      );
    }


    const data = await shopify(
      PRODUCT_QUERY,
      { handle }
    );


    const loadedProduct =
      data?.productByHandle;


    if (!loadedProduct) {
      throw new Error(
        `Product "${handle}" was not found in Shopify.`
      );
    }


    product = loadedProduct;

    return product;
  }


  /* -------------------------------------------------------
     LOCAL PRODUCT IMAGES
     ------------------------------------------------------- */

  function localGallery() {

    const handle =
      product?.handle || "";


    if (
      handle ===
      "unisex-half-zip-pullover"
    ) {

      return [

        {
          id: "local-half-front",

          url:
            "/assets/halfzip-front.jpg",

          alt:
            "FRRIDAY CORE 01 Half-Zip Pullover front"
        },

        {
          id: "local-half-back",

          url:
            "/assets/halfzip-back.jpg",

          alt:
            "FRRIDAY CORE 01 Half-Zip Pullover back"
        }

      ];

    }


    if (
      handle ===
      "unisex-full-zip-hoodie"
    ) {

      return [

        {
          id: "local-full-front",

          url:
            "/assets/fullzip-front.jpg",

          alt:
            "FRRIDAY CORE 02 Full-Zip Pullover front"
        },

        {
          id: "local-full-back",

          url:
            "/assets/fullzip-back.jpg",

          alt:
            "FRRIDAY CORE 02 Full-Zip Pullover back"
        }

      ];

    }


    return [];
  }


  /* -------------------------------------------------------
     GALLERY
     ------------------------------------------------------- */

  function setGallery(index) {

    if (!galleryImages.length) {
      return;
    }


    galleryIndex =
      Math.max(
        0,
        Math.min(
          index,
          galleryImages.length - 1
        )
      );


    const image =
      galleryImages[galleryIndex];


    if (!image) {
      return;
    }


    const main =
      $("#mainImage");

    const fallback =
      $("#galleryFallback");


    if (!main) {
      return;
    }


    if (fallback) {
      fallback.hidden = true;
    }


    main.classList.remove(
      "is-ready",
      "is-error"
    );


    main.onload = () => {

      main.classList.add(
        "is-ready"
      );

    };


    main.onerror = () => {

      main.classList.remove(
        "is-ready"
      );

      main.classList.add(
        "is-error"
      );


      if (fallback) {
        fallback.hidden = false;
      }

    };


    main.alt =
      image.alt ||
      humanTitle(product?.title);


    const absoluteUrl =
      new URL(
        image.url,
        window.location.origin
      ).href;


    if (main.src !== absoluteUrl) {

      main.src = image.url;

    } else if (
      main.complete &&
      main.naturalWidth > 0
    ) {

      main.classList.add(
        "is-ready"
      );

    }


    $$(".gallery-thumb")
      .forEach((button, index) => {

        button.classList.toggle(
          "active",
          index === galleryIndex
        );

      });


    setText(
      "#galleryIndex",
      `${String(galleryIndex + 1).padStart(2, "0")} / ${String(galleryImages.length).padStart(2, "0")}`
    );
  }


  function renderGallery() {

    galleryImages =
      localGallery();


    if (!galleryImages.length) {

      galleryImages =
        product?.images?.nodes?.length
          ? product.images.nodes
          : product?.featuredImage
            ? [product.featuredImage]
            : [];

    }


    const thumbs =
      $("#thumbs");


    if (!thumbs) {
      return;
    }


    thumbs.innerHTML = "";


    galleryImages.forEach(
      (image, index) => {

        const button =
          document.createElement(
            "button"
          );


        button.type = "button";

        button.className =
          "gallery-thumb" +
          (index === 0
            ? " active"
            : "");


        button.setAttribute(
          "aria-label",
          `View image ${index + 1}`
        );


        const img =
          document.createElement(
            "img"
          );


        img.src =
          image.url;

        img.alt =
          image.altText ||
          image.alt ||
          humanTitle(
            product?.title
          );

        img.loading =
          index === 0
            ? "eager"
            : "lazy";


        button.appendChild(img);


        button.addEventListener(
          "click",
          () => setGallery(index)
        );


        thumbs.appendChild(
          button
        );

      }
    );


    setGallery(0);
  }


  /* -------------------------------------------------------
     PRODUCT INFORMATION
     ------------------------------------------------------- */

  function renderProduct() {

    if (!product) {
      return;
    }


    setText(
      "#productTitle",
      humanTitle(product.title)
    );


    const variants =
      product?.variants?.nodes || [];


    const firstVariant =
      variants.find(
        variant =>
          variant.availableForSale
      ) ||
      variants[0];


    selectedVariant =
      firstVariant || null;


    if (selectedVariant) {

      setText(
        "#productPrice",
        money(
          selectedVariant.price.amount,
          selectedVariant.price.currencyCode
        )
      );

    }


    const description =
      product.description ||
      "";


    setText(
      "#productDescription",
      description
    );


    const kicker =
      product.handle
        ?.includes("half-zip")
        ? "CORE 01"
        : product.handle
          ?.includes("full-zip")
            ? "CORE 02"
            : "FRRIDAY";


    setText(
      "#productType",
      kicker
    );


    setText(
      "#productAvailability",
      product.availableForSale
        ? "AVAILABLE"
        : "SOLD OUT"
    );


    const details =
      $("#detailsContent");


    if (details) {

      if (product.descriptionHtml) {

        details.innerHTML =
          product.descriptionHtml;

      } else {

        details.textContent =
          description ||
          "Designed as an everyday FRRIDAY layer.";

      }

    }


    renderSizes(
      variants
    );


    updatePurchaseState();
  }


  /* -------------------------------------------------------
     SIZE SELECTOR
     ------------------------------------------------------- */

  function getSize(variant) {

    const option =
      variant.selectedOptions?.find(
        item =>
          String(item.name)
            .toLowerCase()
            === "size"
      );


    if (option) {
      return option.value;
    }


    const title =
      variant.title || "";


    return title
      .split(" / ")
      .pop()
      .trim();
  }


  function renderSizes(variants) {

    const grid =
      $("#sizeGrid");


    if (!grid) {
      return;
    }


    grid.innerHTML = "";


    variants.forEach(
      (variant, index) => {

        const size =
          getSize(variant);


        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "size-option";


        button.textContent =
          size;


        button.dataset.variantId =
          variant.id;


        button.disabled =
          !variant.availableForSale;


        if (
          selectedVariant &&
          selectedVariant.id ===
            variant.id
        ) {

          button.classList.add(
            "active"
          );

        }


        button.addEventListener(
          "click",
          () => {

            selectedVariant =
              variant;


            $$(".size-option")
              .forEach(
                item =>
                  item.classList.toggle(
                    "active",
                    item === button
                  )
              );


            updateVariantPrice();

            updatePurchaseState();

          }
        );


        grid.appendChild(
          button
        );

      }
    );


    if (!selectedVariant && variants[0]) {

      selectedVariant =
        variants[0];

    }


    updateVariantPrice();
  }


  function updateVariantPrice() {

    if (!selectedVariant) {
      return;
    }


    setText(
      "#productPrice",
      money(
        selectedVariant.price.amount,
        selectedVariant.price.currencyCode
      )
    );


    const note =
      $("#selectionNote");


    if (note) {

      const size =
        getSize(
          selectedVariant
        );


      note.textContent =
        selectedVariant.availableForSale
          ? `Selected: ${size}`
          : `${size} is currently unavailable`;

    }

  }


  /* -------------------------------------------------------
     PURCHASE STATE
     ------------------------------------------------------- */

  function updatePurchaseState() {

    const button =
      $("#addToBag");


    if (!button) {
      return;
    }


    const valid =
      selectedVariant &&
      selectedVariant.availableForSale &&
      quantity > 0;


    button.disabled =
      !valid;


    button.textContent =
      valid
        ? "ADD TO BAG"
        : selectedVariant
          ? "SOLD OUT"
          : "SELECT SIZE";
  }


  /* -------------------------------------------------------
     QUANTITY
     ------------------------------------------------------- */

  function updateQuantity() {

    quantity =
      Math.max(
        1,
        Math.min(
          quantity,
          10
        )
      );


    setText(
      "#qtyValue",
      String(quantity)
    );


    updatePurchaseState();
  }


  function setupQuantity() {

    const minus =
      $("#qtyMinus");

    const plus =
      $("#qtyPlus");


    if (minus) {

      minus.addEventListener(
        "click",
        () => {

          quantity--;

          updateQuantity();

        }
      );

    }


    if (plus) {

      plus.addEventListener(
        "click",
        () => {

          quantity++;

          updateQuantity();

        }
      );

    }

  }


  /* -------------------------------------------------------
     CART
     ------------------------------------------------------- */

  const CART_CREATE = `

    mutation CartCreate(
      $input: CartInput!
    ) {

      cartCreate(
        input: $input
      ) {

        cart {

          id

          checkoutUrl

          totalQuantity

        }

        userErrors {

          field

          message

        }

      }

    }

  `;


  const CART_ADD = `

    mutation CartLinesAdd(
      $cartId: ID!,
      $lines: [CartLineInput!]!
    ) {

      cartLinesAdd(
        cartId: $cartId,
        lines: $lines
      ) {

        cart {

          id

          checkoutUrl

          totalQuantity

        }

        userErrors {

          field

          message

        }

      }

    }

  `;


  async function createCart() {

    if (!selectedVariant) {
      throw new Error(
        "Please select a size."
      );
    }


    const data =
      await shopify(
        CART_CREATE,
        {
          input: {

            lines: [

              {
                merchandiseId:
                  selectedVariant.id,

                quantity:
                  quantity

              }

            ]

          }

        }
      );


    const payload =
      data?.cartCreate;


    if (
      payload?.userErrors?.length
    ) {

      throw new Error(
        payload.userErrors
          .map(
            error =>
              error.message
          )
          .join("; ")
      );

    }


    if (!payload?.cart?.id) {

      throw new Error(
        "Shopify did not return a cart."
      );

    }


    localStorage.setItem(
      CART_KEY,
      payload.cart.id
    );


    return payload.cart;
  }


  async function addToExistingCart(
    cartId
  ) {

    const data =
      await shopify(
        CART_ADD,
        {
          cartId,

          lines: [

            {
              merchandiseId:
                selectedVariant.id,

              quantity:
                quantity

            }

          ]

        }
      );


    const payload =
      data?.cartLinesAdd;


    if (
      payload?.userErrors?.length
    ) {

      const message =
        payload.userErrors
          .map(
            error =>
              error.message
          )
          .join("; ");


      if (
        /cart.*not exist|invalid.*cart|expired/i
          .test(message)
      ) {

        localStorage.removeItem(
          CART_KEY
        );

        return createCart();

      }


      throw new Error(
        message
      );

    }


    if (!payload?.cart) {

      throw new Error(
        "Shopify did not return the updated cart."
      );

    }


    return payload.cart;
  }


  async function addToBag() {

    if (
      !selectedVariant ||
      !selectedVariant.availableForSale
    ) {

      showToast(
        "Select an available size."
      );

      return;

    }


    const button =
      $("#addToBag");


    if (button) {

      button.disabled = true;

      button.textContent =
        "ADDING…";

    }


    try {

      const existingCart =
        localStorage.getItem(
          CART_KEY
        );


      let cart;


      if (existingCart) {

        try {

          cart =
            await addToExistingCart(
              existingCart
            );

        } catch {

          localStorage.removeItem(
            CART_KEY
          );

          cart =
            await createCart();

        }

      } else {

        cart =
          await createCart();

      }


      updateBagCount(
        cart?.totalQuantity
      );


      showToast(
        `${humanTitle(product.title)} added to bag.`
      );


      setTimeout(
        () => {

          window.location.href =
            "/bag.html";

        },
        450
      );


    } catch (error) {

      console.error(
        "FRRIDAY cart error:",
        error
      );


      showToast(
        error?.message ||
        "Could not add this item to your bag."
      );


      updatePurchaseState();

    }

  }


  /* -------------------------------------------------------
     BAG COUNT
     ------------------------------------------------------- */

  function updateBagCount(count) {

    const value =
      Number(count || 0);


    const bagCount =
      $("#bagCount");


    if (bagCount) {

      bagCount.textContent =
        String(value);

    }

  }


  /* -------------------------------------------------------
     CART QUERY
     ------------------------------------------------------- */

  const CART_QUERY = `

    query Cart(
      $cartId: ID!
    ) {

      cart(
        id: $cartId
      ) {

        id

        totalQuantity

        checkoutUrl

      }

    }

  `;


  async function refreshBagCount() {

    const cartId =
      localStorage.getItem(
        CART_KEY
      );


    if (!cartId) {

      updateBagCount(0);

      return;

    }


    try {

      const data =
        await shopify(
          CART_QUERY,
          { cartId }
        );


      const cart =
        data?.cart;


      if (!cart) {

        localStorage.removeItem(
          CART_KEY
        );

        updateBagCount(0);

        return;

      }


      updateBagCount(
        cart.totalQuantity
      );


    } catch {

      /* Do not break product page if cart lookup fails. */

    }

  }


  /* -------------------------------------------------------
     TOAST
     ------------------------------------------------------- */

  function showToast(message) {

    const toast =
      $("#toast");


    if (!toast) {

      return;

    }


    toast.textContent =
      message;


    toast.classList.add(
      "show"
    );


    clearTimeout(
      showToast.timer
    );


    showToast.timer =
      setTimeout(
        () => {

          toast.classList.remove(
            "show"
          );

        },
        2600
      );

  }


  /* -------------------------------------------------------
     SIZE GUIDE
     ------------------------------------------------------- */

  function buildSizeGuide() {

    const table =
      $("#sizeTable");


    if (!table) {
      return;
    }


    table.innerHTML = `

      <table>

        <thead>

          <tr>
            <th>SIZE</th>
            <th>CHEST</th>
            <th>LENGTH</th>
          </tr>

        </thead>

        <tbody>

          <tr>
            <td>XS</td>
            <td>26 ¼</td>
            <td>23</td>
          </tr>

          <tr>
            <td>S</td>
            <td>28</td>
            <td>23 ¾</td>
          </tr>

          <tr>
            <td>M</td>
            <td>28 ½</td>
            <td>25 ¾</td>
          </tr>

          <tr>
            <td>L</td>
            <td>29 ½</td>
            <td>27 ¾</td>
          </tr>

          <tr>
            <td>XL</td>
            <td>30</td>
            <td>29 ¾</td>
          </tr>

          <tr>
            <td>2XL</td>
            <td>30 ½</td>
            <td>31 ¾</td>
          </tr>

          <tr>
            <td>3XL</td>
            <td>31</td>
            <td>33 ¾</td>
          </tr>

        </tbody>

      </table>

    `;

  }


  function setupSizeModal() {

    const modal =
      $("#sizeModal");

    const open =
      $("#sizeGuideBtn");

    const close =
      $("#sizeModalClose");

    const backdrop =
      modal?.querySelector(
        ".modal-backdrop"
      );


    if (!modal) {
      return;
    }


    if (open) {

      open.addEventListener(
        "click",
        () => {

          modal.hidden =
            false;

        }
      );

    }


    if (close) {

      close.addEventListener(
        "click",
        () => {

          modal.hidden =
            true;

        }
      );

    }


    if (backdrop) {

      backdrop.addEventListener(
        "click",
        () => {

          modal.hidden =
            true;

        }
      );

    }


    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape"
        ) {

          modal.hidden =
            true;

        }

      }
    );

  }


  /* -------------------------------------------------------
     ERROR HANDLING
     ------------------------------------------------------- */

  function showError(error) {

    console.error(
      "FRRIDAY product error:",
      error
    );


    hide(
      "#productLoading"
    );


    hide(
      "#productView"
    );


    show(
      "#productError"
    );


    const message =
      error?.message ||
      "Unknown error";


    setText(
      "#productErrorMessage",
      message
    );

  }


  /* -------------------------------------------------------
     INITIALIZE
     ------------------------------------------------------- */

  async function init() {

    try {

      hide(
        "#productError"
      );


      show(
        "#productLoading"
      );


      hide(
        "#productView"
      );


      await loadProduct();


      renderProduct();

      renderGallery();

      setupQuantity();

      buildSizeGuide();

      setupSizeModal();


      const addButton =
        $("#addToBag");


      if (addButton) {

        addButton.addEventListener(
          "click",
          addToBag
        );

      }


      await refreshBagCount();


      hide(
        "#productLoading"
      );


      show(
        "#productView"
      );


    } catch (error) {

      showError(error);

    }

  }


  /* -------------------------------------------------------
     START
     ------------------------------------------------------- */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }

})();
