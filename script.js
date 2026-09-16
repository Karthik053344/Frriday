const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

// Premium front-end: Shopify remains the commerce engine.
const shopify = {
  halfzip: 'https://pxhdjy-sj.myshopify.com/products/unisex-half-zip-pullover',
  fullzip: 'https://pxhdjy-sj.myshopify.com/products/unisex-full-zip-hoodie'
};

const loader = $('.page-loader');
window.addEventListener('load', () => setTimeout(() => loader?.classList.add('done'), 350));

// Reveal sections only when they enter the viewport.
const reveal = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      reveal.unobserve(entry.target);
    }
  });
}, {threshold:.12, rootMargin:'0px 0px -8% 0px'});
$$('.statement, .shop-head, .product-card, .drop-content, .archive, .manifesto, .newsletter').forEach(el => reveal.observe(el));

// Product front/back viewer. The button sits inside a product link, so stop it from navigating.
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

// Friday Drop countdown in Eastern Time, matching the U.S.-first storefront.
function getETParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, weekday:'short'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
function getNextFridayET() {
  const now = new Date();
  const p = getETParts(now);
  const weekdays = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
  const day = weekdays[p.weekday];
  let days = (5 - day + 7) % 7;
  const passedMidnight = day === 5 && Number(p.hour) >= 0;
  if (passedMidnight) days = 7;
  const y = Number(p.year), m = Number(p.month), d = Number(p.day) + days;
  // Create a UTC probe, then correct it to Eastern time through Intl.
  const probe = new Date(Date.UTC(y, m-1, d, 0, 0, 0));
  for (let i=0;i<48;i++) {
    const q = getETParts(probe);
    if (Number(q.hour) === 0 && Number(q.minute) === 0 && Number(q.second) === 0 && q.weekday === 'Fri') return probe;
    probe.setMinutes(probe.getMinutes()+30);
  }
  return new Date(Date.now()+7*864e5);
}
let dropTarget = getNextFridayET();
function tick() {
  if (dropTarget - Date.now() <= 0) dropTarget = getNextFridayET();
  const total = Math.max(0, dropTarget - Date.now());
  const s = Math.floor(total/1000);
  $('#days').textContent = String(Math.floor(s/86400)).padStart(2,'0');
  $('#hours').textContent = String(Math.floor(s%86400/3600)).padStart(2,'0');
  $('#mins').textContent = String(Math.floor(s%3600/60)).padStart(2,'0');
  $('#secs').textContent = String(s%60).padStart(2,'0');
}
setInterval(tick,1000); tick();

// Private list: local demo storage until a real email provider is connected.
$('#emailForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const input = $('#email');
  const status = $('#formStatus');
  if (!input.checkValidity()) {
    status.textContent = 'Enter a valid email.';
    input.focus();
    return;
  }
  localStorage.setItem('frriday-email', input.value.trim());
  input.value = '';
  status.textContent = "You're on the private list.";
  toast('PRIVATE LIST / CONFIRMED');
});

function toast(message) {
  const t = $('#toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => t.classList.remove('show'), 2400);
}

// Desktop cursor only. Disabled for touch/pointer-coarse devices.
const finePointer = matchMedia('(pointer:fine)').matches;
if (finePointer) {
  const dot = $('.cursor-dot'), ring = $('.cursor-ring');
  window.addEventListener('pointermove', e => {
    dot.style.left = `${e.clientX}px`; dot.style.top = `${e.clientY}px`;
    ring.animate({left:`${e.clientX}px`, top:`${e.clientY}px`}, {duration:380, fill:'forwards'});
  }, {passive:true});
  $$('a,button,input').forEach(el => {
    el.addEventListener('pointerenter', () => ring.classList.add('hover'));
    el.addEventListener('pointerleave', () => ring.classList.remove('hover'));
  });
}

// Slightly compact navigation after scrolling.
const nav = $('#nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 30), {passive:true});

// Prevent accidental form jumps and keep keyboard focus visible.
$$('a[href^="#"]').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
