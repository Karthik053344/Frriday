const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const SHOPIFY = window.FRRIDAY_SHOPIFY;

async function shopifyRequest(query, variables = {}) {
  if (!SHOPIFY?.endpoint) throw new Error('Shopify configuration missing.');
  const response = await fetch(SHOPIFY.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) throw new Error(`Shopify request failed (${response.status}).`);
  const json = await response.json();
  if (json.errors?.length) throw new Error(json.errors.map(e => e.message).join('; '));
  return json.data;
}

const PRODUCT_QUERY = `
query ProductCard($handle: String!) {
  product(handle: $handle) {
    id
    title
    handle
    description
    featuredImage { url altText width height }
    images(first: 8) { nodes { id url altText width height } }
    options { name values }
    priceRange { minVariantPrice { amount currencyCode } }
    variants(first: 50) {
      nodes {
        id title availableForSale
        price { amount currencyCode }
      }
    }
  }
}`;

async function loadHomepageProducts() {
  const cards = $$('.product-card[data-shopify-handle]');
  await Promise.all(cards.map(async card => {
    const handle = card.dataset.shopifyHandle;
    try {
      const data = await shopifyRequest(PRODUCT_QUERY, { handle });
      const product = data.product;
      if (!product) return;
      const title = $('[data-product-title]', card);
      const price = $('[data-product-price]', card);
      const subtitle = $('[data-product-subtitle]', card);
      if (title) title.textContent = product.title.replace(/^Unisex\s+/i, '');
      if (price) price.textContent = money(product.priceRange.minVariantPrice);
      if (subtitle) subtitle.textContent = buildSubtitle(product);
      const imgs = product.images?.nodes || [];
      if (imgs[0]) {
        const front = $('[data-front]', card);
        front.src = imgs[0].url;
        front.alt = imgs[0].altText || `${product.title} front`;
      }
      if (imgs[1]) {
        const back = $('[data-back]', card);
        back.src = imgs[1].url;
        back.alt = imgs[1].altText || `${product.title} back`;
      }
    } catch (error) {
      console.warn('FRRIDAY Shopify product hydration failed:', error);
    }
  }));
}

function money(m) {
  if (!m) return '';
  try { return new Intl.NumberFormat('en-US', { style:'currency', currency:m.currencyCode, maximumFractionDigits:0 }).format(Number(m.amount)); }
  catch { return `$${Number(m.amount).toFixed(0)}`; }
}

function buildSubtitle(product) {
  const title = product.title.toLowerCase();
  const color = title.includes('half-zip') || title.includes('half zip') ? 'Obsidian' : title.includes('hoodie') ? 'Stone' : '';
  const sizeOption = product.options?.find(o => /size/i.test(o.name));
  const sizes = sizeOption?.values?.join('–') || 'XS–3XL';
  return color ? `${color} · ${sizes}` : sizes;
}

const loader = $('.page-loader');
window.addEventListener('load', () => setTimeout(() => loader?.classList.add('done'), 350));

const reveal = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      reveal.unobserve(entry.target);
    }
  });
}, {threshold:.12, rootMargin:'0px 0px -8% 0px'});
$$('.statement, .shop-head, .product-card, .drop-content, .archive, .manifesto, .newsletter').forEach(el => reveal.observe(el));

$$('[data-toggle]').forEach(btn => btn.addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  const media = btn.closest('.product-media');
  const front = $('[data-front]', media), back = $('[data-back]', media);
  const showBack = !back.classList.contains('active');
  front.classList.toggle('active', !showBack);
  back.classList.toggle('active', showBack);
  btn.textContent = showBack ? 'VIEW FRONT' : 'VIEW BACK';
  btn.setAttribute('aria-label', showBack ? 'View front' : 'View back');
}));

function getETParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, weekday:'short'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
function getNextFridayET() {
  const now = new Date(), p = getETParts(now);
  const weekdays = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
  const day = weekdays[p.weekday];
  let days = (5 - day + 7) % 7;
  if (day === 5) days = 7;
  const y = Number(p.year), m = Number(p.month), d = Number(p.day) + days;
  const probe = new Date(Date.UTC(y, m-1, d, 0, 0, 0));
  for (let i=0;i<48;i++) {
    const q = getETParts(probe);
    if (Number(q.hour) === 0 && Number(q.minute) === 0 && Number(q.second) === 0 && q.weekday === 'Fri') return probe;
    probe.setMinutes(probe.getMinutes()+30);
  }
  return new Date(Date.now()+7*864e5);
}
let dropTarget = getNextFridayET();
function updateDropLabel() {
  const label = $('#dropDate');
  if (!label) return;
  const parts = getETParts(dropTarget);
  label.textContent = `${parts.weekday.toUpperCase()} / 12:00 AM ET`;
}
function tick() {
  if (dropTarget - Date.now() <= 0) { dropTarget = getNextFridayET(); updateDropLabel(); }
  const total = Math.max(0, dropTarget - Date.now()), s = Math.floor(total/1000);
  $('#days').textContent = String(Math.floor(s/86400)).padStart(2,'0');
  $('#hours').textContent = String(Math.floor(s%86400/3600)).padStart(2,'0');
  $('#mins').textContent = String(Math.floor(s%3600/60)).padStart(2,'0');
  $('#secs').textContent = String(s%60).padStart(2,'0');
}
updateDropLabel();
setInterval(tick,1000); tick();

$('#emailForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const input = $('#email'), status = $('#formStatus');
  if (!input.checkValidity()) { status.textContent = 'Enter a valid email.'; input.focus(); return; }
  localStorage.setItem('frriday-email', input.value.trim());
  input.value = '';
  status.textContent = "You're on the private list.";
  toast('PRIVATE LIST / CONFIRMED');
});

function toast(message) {
  const t = $('#toast'); if (!t) return;
  t.textContent = message; t.classList.add('show');
  clearTimeout(window.__toast); window.__toast = setTimeout(() => t.classList.remove('show'), 2400);
}

const finePointer = matchMedia('(pointer:fine)').matches;
if (finePointer) {
  const dot = $('.cursor-dot'), ring = $('.cursor-ring');
  window.addEventListener('pointermove', e => {
    if (!dot || !ring) return;
    dot.style.left = `${e.clientX}px`; dot.style.top = `${e.clientY}px`;
    ring.animate({left:`${e.clientX}px`, top:`${e.clientY}px`}, {duration:380, fill:'forwards'});
  }, {passive:true});
  $$('a,button,input').forEach(el => {
    el.addEventListener('pointerenter', () => ring?.classList.add('hover'));
    el.addEventListener('pointerleave', () => ring?.classList.remove('hover'));
  });
}

const nav = $('#nav');
window.addEventListener('scroll', () => nav?.classList.toggle('scrolled', scrollY > 30), {passive:true});
$$('a[href^="#"]').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

loadHomepageProducts();
