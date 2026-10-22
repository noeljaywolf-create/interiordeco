const searchInput = document.querySelector("#product-search");
const productCards = [...document.querySelectorAll(".product-card")];
const categoryButtons = [...document.querySelectorAll(".category-button")];
const cartCount = document.querySelector("#cart-count");
const cartButton = document.querySelector("#cart-button");
const cartDrawer = document.querySelector("#cart-drawer");
const drawerBackdrop = document.querySelector("#drawer-backdrop");
const cartItemsContainer = document.querySelector("#cart-items");
const toast = document.querySelector("#toast");
const cart = new Map();
let activeCategory = "All";
let toastTimer;
let previousFocus;

function updateCategory(category) {
  activeCategory = category;
  categoryButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.category === category));
  });
  filterProducts();
}

function filterProducts() {
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  productCards.forEach((card) => {
    const matchesCategory = activeCategory === "All" || card.dataset.category === activeCategory;
    const matchesSearch = card.dataset.name.toLowerCase().includes(query);
    const isVisible = matchesCategory && matchesSearch;
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  let emptyState = document.querySelector(".empty-state");
  if (visibleCount === 0 && !emptyState) {
    emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "Nothing in this little corner yet. Try another search or category.";
    document.querySelector("#product-grid").append(emptyState);
  } else if (visibleCount > 0 && emptyState) {
    emptyState.remove();
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function formatPrice(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getItemCount() {
  return [...cart.values()].reduce((count, item) => count + item.quantity, 0);
}

function renderCart() {
  const itemCount = getItemCount();
  const subtotal = [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
  const freeShippingThreshold = 75;
  const remaining = Math.max(freeShippingThreshold - subtotal, 0);

  cartCount.textContent = String(itemCount);
  cartButton.setAttribute("aria-label", `Open shopping bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`);
  document.querySelector("#drawer-count").textContent = `(${itemCount})`;
  document.querySelector("#cart-subtotal").textContent = formatPrice(subtotal);
  document.querySelector("#shipping-message").textContent = remaining === 0
    ? "Lovely. Complimentary shipping is on us."
    : `You’re ${formatPrice(remaining)} away from complimentary shipping.`;
  document.querySelector("#shipping-progress").style.width = `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%`;
  cartDrawer.classList.toggle("is-empty", itemCount === 0);
  cartItemsContainer.replaceChildren();

  cart.forEach((item, id) => {
    const row = document.createElement("article");
    row.className = "cart-item";

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = "";
    image.loading = "lazy";

    const info = document.createElement("div");
    info.className = "cart-item-info";
    const category = document.createElement("small");
    category.textContent = item.category.toUpperCase();
    const name = document.createElement("strong");
    name.textContent = item.name;

    const quantity = document.createElement("div");
    quantity.className = "quantity-control";
    quantity.setAttribute("aria-label", `Quantity for ${item.name}`);
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.dataset.action = "decrease";
    decrease.dataset.id = id;
    decrease.setAttribute("aria-label", `Remove one ${item.name}`);
    decrease.textContent = "−";
    const quantityValue = document.createElement("span");
    quantityValue.textContent = String(item.quantity);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.dataset.action = "increase";
    increase.dataset.id = id;
    increase.setAttribute("aria-label", `Add one ${item.name}`);
    increase.textContent = "+";
    quantity.append(decrease, quantityValue, increase);
    info.append(category, name, quantity);

    const end = document.createElement("div");
    end.className = "cart-item-end";
    const price = document.createElement("strong");
    price.textContent = formatPrice(item.price * item.quantity);
    const remove = document.createElement("button");
    remove.className = "remove-item";
    remove.type = "button";
    remove.dataset.action = "remove";
    remove.dataset.id = id;
    remove.textContent = "Remove";
    end.append(price, remove);

    row.append(image, info, end);
    cartItemsContainer.append(row);
  });
}

function addToCart(button) {
  const card = button.closest(".product-card");
  const id = card.dataset.name;
  const existingItem = cart.get(id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.set(id, {
      name: button.dataset.product,
      category: card.dataset.category,
      price: Number(card.dataset.price),
      image: card.querySelector("img").src,
      quantity: 1,
    });
  }

  renderCart();
  showToast(`${button.dataset.product} added to your bag`);
}

function openCart() {
  previousFocus = document.activeElement;
  cartDrawer.removeAttribute("inert");
  drawerBackdrop.hidden = false;
  requestAnimationFrame(() => drawerBackdrop.classList.add("is-visible"));
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  cartButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("drawer-open");
  document.querySelector("#cart-close").focus();
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  cartDrawer.setAttribute("inert", "");
  drawerBackdrop.classList.remove("is-visible");
  cartButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("drawer-open");
  window.setTimeout(() => {
    if (!cartDrawer.classList.contains("is-open")) drawerBackdrop.hidden = true;
  }, 300);
  if (previousFocus instanceof HTMLElement) previousFocus.focus();
}

searchInput.addEventListener("input", filterProducts);

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => updateCategory(button.dataset.category));
});

document.querySelectorAll(".add-button").forEach((button) => {
  button.addEventListener("click", () => addToCart(button));
});

document.querySelectorAll("[data-nav-category], [data-collection]").forEach((link) => {
  link.addEventListener("click", () => {
    const category = link.dataset.navCategory || link.dataset.collection;
    searchInput.value = "";
    updateCategory(category);
  });
});

document.querySelector("#view-all").addEventListener("click", () => {
  searchInput.value = "";
  updateCategory("All");
});

cartButton.addEventListener("click", openCart);
document.querySelector("#cart-close").addEventListener("click", closeCart);
document.querySelector("#drawer-shop").addEventListener("click", () => {
  closeCart();
  document.querySelector("#shop").scrollIntoView({ behavior: "smooth" });
});
drawerBackdrop.addEventListener("click", closeCart);

cartItemsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = cart.get(button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "increase") item.quantity += 1;
  if (button.dataset.action === "decrease") item.quantity -= 1;
  if (button.dataset.action === "remove" || item.quantity <= 0) cart.delete(button.dataset.id);
  renderCart();
  document.querySelector("#drawer-live").textContent = "Shopping bag updated.";
});

document.querySelector("#checkout-button").addEventListener("click", () => {
  showToast("Checkout is getting ready for its grand entrance.");
});

document.addEventListener("keydown", (event) => {
  if (!cartDrawer.classList.contains("is-open")) return;
  if (event.key === "Escape") closeCart();
  if (event.key === "Tab") {
    const focusable = [...cartDrawer.querySelectorAll("button:not(:disabled)")]
      .filter((button) => button.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

document.querySelector("#newsletter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#email");
  if (!email.checkValidity()) {
    email.reportValidity();
    return;
  }
  document.querySelector("#form-message").textContent = "You’re in. Keep an eye on your inbox for a little welcome treat.";
  event.currentTarget.reset();
});

document.querySelector("#year").textContent = String(new Date().getFullYear());
renderCart();
