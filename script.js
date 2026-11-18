'use strict';

const books = [
  { id: 'gatsby', title: 'Великий Гэтсби', author: 'Фрэнсис Скотт Фицджеральд', price: 690, motif: '✧' },
  { id: 'dostoevsky', title: 'Преступление и наказание', author: 'Фёдор Достоевский', price: 890, motif: '†' },
  { id: 'orwell', title: '1984', author: 'Джордж Оруэлл', price: 740, motif: '◉' },
  { id: 'bulgakov', title: 'Мастер и Маргарита', author: 'Михаил Булгаков', price: 920, motif: '☾' },
  { id: 'austen', title: 'Гордость и предубеждение', author: 'Джейн Остин', price: 790, motif: '❦' },
  { id: 'prince', title: 'Маленький принц', author: 'Антуан де Сент-Экзюпери', price: 650, motif: '★' },
  { id: 'remarque', title: 'Три товарища', author: 'Эрих Мария Ремарк', price: 850, motif: 'Ⅲ' },
  { id: 'bronte', title: 'Джейн Эйр', author: 'Шарлотта Бронте', price: 820, motif: '♜' },
  { id: 'marquez', title: 'Сто лет одиночества', author: 'Габриэль Гарсиа Маркес', price: 990, motif: '❋' },
  { id: 'tolstoy', title: 'Анна Каренина', author: 'Лев Толстой', price: 950, motif: '♞' },
  { id: 'bradbury', title: '451 градус по Фаренгейту', author: 'Рэй Брэдбери', price: 720, motif: '✹' },
  { id: 'hugo', title: 'Собор Парижской Богоматери', author: 'Виктор Гюго', price: 870, motif: '♱' },
];

const booksById = new Map(books.map((book) => [book.id, book]));
const storageKey = 'relar-books.cart.v1';
const maxQuantity = 99;
const rubles = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
});
const plural = new Intl.PluralRules('ru-RU');
const bookWords = { one: 'книга', few: 'книги', many: 'книг', other: 'книги' };

const grid = document.querySelector('#book-grid');
const bookTemplate = document.querySelector('#book-template');
const search = document.querySelector('#book-search');
const clearSearch = document.querySelector('#clear-search');
const resultCount = document.querySelector('#result-count');
const emptyCatalog = document.querySelector('#empty-catalog');
const cartDialog = document.querySelector('#cart');
const openCart = document.querySelector('#open-cart');
const closeCart = document.querySelector('#close-cart');
const cartCount = document.querySelector('#cart-count');
const cartItems = document.querySelector('#cart-items');
const cartItemTemplate = document.querySelector('#cart-item-template');
const cartEmpty = document.querySelector('#cart-empty');
const cartSummary = document.querySelector('#cart-summary');
const cartTotal = document.querySelector('#cart-total');
const continueShopping = document.querySelector('#continue-shopping');
const toast = document.querySelector('#toast');

const cart = readCart();
let toastTimer;

function readCart() {
  const items = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return items;

    for (const [id, quantity] of Object.entries(saved)) {
      if (booksById.has(id) && Number.isInteger(quantity) && quantity > 0) {
        items.set(id, Math.min(quantity, maxQuantity));
      }
    }
  } catch {
    // The cart can still be used when storage is unavailable or damaged.
  }
  return items;
}

function saveCart() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(cart)));
  } catch {
    // Keep the cart in memory when storage is unavailable.
  }
}

function normalizeTitle(value) {
  return value.trim().toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').replace(/\s+/g, ' ');
}

function renderCatalog() {
  const query = normalizeTitle(search.value);
  const matches = books.filter((book) => normalizeTitle(book.title).includes(query));
  const cards = matches.map((book) => {
    const card = bookTemplate.content.firstElementChild.cloneNode(true);
    card.classList.add(book.id);
    card.querySelector('h3').textContent = book.title;
    card.querySelector('.book-author').textContent = book.author;
    card.querySelector('.book-price').textContent = rubles.format(book.price);
    card.querySelector('.cover-author').textContent = book.author;
    card.querySelector('.cover-motif').textContent = book.motif;
    card.querySelector('.cover-title').textContent = book.title;
    const addButton = card.querySelector('.add-book');
    addButton.dataset.bookId = book.id;
    addButton.setAttribute('aria-label', `В корзину: ${book.title}`);
    return card;
  });

  grid.replaceChildren(...cards);
  resultCount.textContent = `${matches.length} ${bookWords[plural.select(matches.length)]}`;
  emptyCatalog.hidden = matches.length > 0;
  clearSearch.hidden = search.value.length === 0;
}

function renderCart() {
  let total = 0;
  let count = 0;
  const rows = [];

  for (const [id, quantity] of cart) {
    const book = booksById.get(id);
    const linePrice = book.price * quantity;
    count += quantity;
    total += linePrice;

    const row = cartItemTemplate.content.firstElementChild.cloneNode(true);
    row.classList.add(id);
    row.dataset.bookId = id;
    row.querySelector('.cart-cover').textContent = book.motif;
    row.querySelector('h3').textContent = book.title;
    row.querySelector('.cart-line-price').textContent = rubles.format(linePrice);
    row.querySelector('.quantity-value').textContent = quantity;

    const decrease = row.querySelector('[data-action="decrease"]');
    const increase = row.querySelector('[data-action="increase"]');
    const remove = row.querySelector('[data-action="remove"]');
    decrease.setAttribute('aria-label', `Уменьшить количество: ${book.title}`);
    increase.setAttribute('aria-label', `Увеличить количество: ${book.title}`);
    remove.setAttribute('aria-label', `Удалить: ${book.title}`);
    decrease.disabled = quantity === 1;
    increase.disabled = quantity === maxQuantity;
    rows.push(row);
  }

  cartItems.replaceChildren(...rows);
  cartCount.textContent = count;
  openCart.setAttribute('aria-label', `Корзина, ${count} ${bookWords[plural.select(count)]}`);
  cartEmpty.hidden = count > 0;
  cartSummary.hidden = count === 0;
  cartTotal.textContent = rubles.format(total);
}

function notify(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('visible');
    toast.textContent = '';
  }, 2600);
}

search.addEventListener('input', renderCatalog);
clearSearch.addEventListener('click', () => {
  search.value = '';
  renderCatalog();
  search.focus();
});

grid.addEventListener('click', (event) => {
  const button = event.target.closest('.add-book');
  if (!button) return;

  const book = booksById.get(button.dataset.bookId);
  const quantity = cart.get(book.id) ?? 0;
  if (quantity >= maxQuantity) {
    notify(`В корзине уже ${maxQuantity} экз. этой книги`);
    return;
  }

  cart.set(book.id, quantity + 1);
  saveCart();
  renderCart();
  notify(`«${book.title}» в корзине`);
});

openCart.addEventListener('click', () => cartDialog.showModal());
closeCart.addEventListener('click', () => cartDialog.close());
cartDialog.addEventListener('click', (event) => {
  if (event.target === cartDialog) cartDialog.close();
});
continueShopping.addEventListener('click', () => {
  cartDialog.close();
  search.focus({ preventScroll: true });
  document.querySelector('#catalog').scrollIntoView();
});

cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const row = button.closest('.cart-item');
  const { bookId } = row.dataset;
  const { action } = button.dataset;
  const quantity = cart.get(bookId);
  const neighbor = row.nextElementSibling ?? row.previousElementSibling;

  if (action === 'remove') {
    cart.delete(bookId);
  } else if (action === 'increase') {
    cart.set(bookId, Math.min(quantity + 1, maxQuantity));
  } else {
    cart.set(bookId, Math.max(quantity - 1, 1));
  }

  saveCart();
  renderCart();

  const focusId = action === 'remove' ? neighbor?.dataset.bookId : bookId;
  const updatedRow = cartItems.querySelector(`[data-book-id="${focusId}"]`);
  const sameAction = updatedRow?.querySelector(`[data-action="${action}"]:enabled`);
  const availableButton = sameAction ?? updatedRow?.querySelector('.quantity button:enabled');
  (availableButton ?? continueShopping).focus({ preventScroll: true });
});

renderCatalog();
renderCart();
