const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const SHOPIFY = window.FRRIDAY_SHOPIFY;

const PRODUCT_QUERY = `
query ProductPage($handle: String!) {
  product(handle: $handle) {
    id title handle description descriptionHtml vendor productType
    featuredImage { url altText width height }
    images(first: 20) { nodes { id url altText width height } }
    options { name values }
    priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
    variants(first: 100) {
      nodes {
        id title availableForSale quantityAvailable
        selectedOptions { name value }
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        image { url altText width height }
      }
    }
    metafields(identifiers: [
      {namespace:"custom", key:"fabric"},
      {namespace:"custom", key:"fit"},
      {namespace:"custom", key:"care"},
      {namespace:"custom", key:"story"}
    ]) { namespace key value type }
  }
}`;

let product = null;
let selectedVariant = null;
let quantity = 1;
let galleryImages = [];

async function request(query, variables={}) {
  if (!SHOPIFY?.endpoint) throw new Error('Shopify configuration missing.');
  const response = await fetch(SHOPIFY.endpoint, {
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({query,variables})
  });
  if (!response.ok) throw new Error(`Shopify returned ${response.status}.`);
  const json = await response.json();
  if (json.errors?.length) throw new Error(json.errors.map(e=>e.message).join('; '));
  return json.data;
}

function getHandle() {
  const path = location.pathname.replace(/\/+$/,'');
  const match = path.match(/^\/products\/([^/]+)$/);
  return match?.[1] || new URLSearchParams(location.search).get('handle');
}

function money(m) {
  if (!m) return '';
  return new Intl.NumberFormat('en-US',{style:'currency',currency:m.currencyCode,maximumFractionDigits:0}).format(Number(m.amount));
}

function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function humanTitle(title) { return title.replace(/^Unisex\s+/i,''); }

function setMeta() {
  document.title = `FRRIDAY® | ${humanTitle(product.title)}`;
  const desc = $('meta[name="description"]');
  if (desc) desc.setAttribute('content', product.description.slice(0,155));
}

function renderGallery() {
  galleryImages = product.images?.nodes?.length ? product.images.nodes : [product.featuredImage].filter(Boolean);
  const main = $('#mainImage'), thumbs = $('#thumbs');
  thumbs.innerHTML = '';
  galleryImages.forEach((image,index) => {
    const button = document.createElement('button');
    button.type='button'; button.className = `gallery-thumb${index===0?' active':''}`;
    button.setAttribute('aria-label',`View product image ${index+1}`);
    button.innerHTML = `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.altText || product.title)}">`;
    button.addEventListener('click',()=>setGallery(index));
    thumbs.appendChild(button);
  });
  setGallery(0);
}

function setGallery(index) {
  if (!galleryImages[index]) return;
  const image=galleryImages[index];
  $('#mainImage').src=image.url;
  $('#mainImage').alt=image.altText || humanTitle(product.title);
  $$('.gallery-thumb').forEach((el,i)=>el.classList.toggle('active',i===index));
  $('#galleryIndex').textContent=`${String(index+1).padStart(2,'0')} / ${String(galleryImages.length).padStart(2,'0')}`;
}

function renderProduct() {
  setMeta();
  $('#productTitle').textContent=humanTitle(product.title);
  $('#productPrice').textContent=money(product.priceRange.minVariantPrice);
  $('#productDescription').textContent=product.description.split('•')[0].trim();
  $('#detailsDescription').innerHTML=product.descriptionHtml || `<p>${escapeHtml(product.description)}</p>`;
  const details=[];
  const lower=product.description.toLowerCase();
  const add=(label, value)=>{if(value) details.push(`<div class="detail-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`)};
  const metafields=Object.fromEntries((product.metafields||[]).filter(Boolean).map(m=>[m.key,m.value]));
  add('FABRIC',metafields.fabric || inferFabric(product.description));
  add('FIT',metafields.fit || inferFit(product.description));
  add('CONSTRUCTION',inferConstruction(product.description));
  add('SOURCE',inferSource(product.description));
  if (metafields.care) add('CARE',metafields.care);
  $('#detailsList').innerHTML=details.length?details.join(''):'<p>Product details are maintained in Shopify and will appear here as they are added.</p>';
  $('#productType').textContent=(product.productType || 'CORE').toUpperCase();
  $('#productAvailability').textContent=product.variants.nodes.some(v=>v.availableForSale)?'AVAILABLE':'SOLD OUT';
  renderGallery();
  renderSizes();
}

function inferFabric(text){ const m=text.match(/\d+%[^•]+polyester[^•]*/i); return m ? m[0].replace(/\s+/g,' ').trim() : ''; }
function inferFit(text){ const m=text.match(/relaxed (?:unisex )?fit/i); return m ? m[0] : ''; }
function inferConstruction(text){ const parts=[]; if(/half-zip/i.test(text)) parts.push('Half-zip neckline'); if(/full-zip/i.test(text)) parts.push('Full front zipper'); if(/brushed fleece/i.test(text)) parts.push('Brushed fleece interior'); if(/ribbed cuffs/i.test(text)) parts.push('Ribbed cuffs / waistband'); return parts.join(' · '); }
function inferSource(text){ const m=text.match(/blank product sourced from ([^.•]+)/i); return m ? m[1].trim() : ''; }

function renderSizes() {
  const option=product.options?.find(o=>/size/i.test(o.name));
  const values=option?.values || product.variants.nodes.map(v=>v.title).filter(Boolean);
  const wrap=$('#sizeOptions'); wrap.innerHTML='';
  values.forEach(value=>{
    const variant=product.variants.nodes.find(v=>v.selectedOptions?.some(o=>/size/i.test(o.name)&&o.value===value));
    const button=document.createElement('button'); button.type='button'; button.textContent=value;
    button.disabled=!variant?.availableForSale;
    button.className='size-option';
    if(!button.disabled && !selectedVariant) selectedVariant=variant;
    button.addEventListener('click',()=>selectVariant(variant,value));
    wrap.appendChild(button);
  });
  if(selectedVariant){
    const selectedValue=selectedVariant.selectedOptions?.find(o=>/size/i.test(o.name))?.value;
    $$('.size-option').forEach(b=>b.classList.toggle('selected',b.textContent===selectedValue));
    updatePurchase();
  }
}

function selectVariant(variant,value){
  if(!variant) return;
  selectedVariant=variant;
  $$('.size-option').forEach(b=>b.classList.toggle('selected',b.textContent===value));
  const variantImage=variant.image;
  if(variantImage){ const idx=galleryImages.findIndex(i=>i.url===variantImage.url); if(idx>=0)setGallery(idx); }
  updatePurchase();
}

function updatePurchase(){
  const btn=$('#addToBag');
  btn.disabled=!selectedVariant || !selectedVariant.availableForSale;
  btn.textContent=selectedVariant?.availableForSale ? 'ADD TO BAG ↗' : 'SOLD OUT';
  $('#productPrice').textContent=selectedVariant ? money(selectedVariant.price) : money(product.priceRange.minVariantPrice);
  $('#selectionNote').textContent=selectedVariant ? `${selectedVariant.title} selected` : 'Select a size to continue.';
}

async function addToBag(){
  if(!selectedVariant) return;
  const btn=$('#addToBag'); btn.disabled=true; btn.textContent='ADDING…';
  try {
    const existingId=localStorage.getItem('frriday-cart-id');
    if(existingId){
      try {
        const result=await request(`mutation AddLines($cartId:ID!,$lines:[CartLineInput!]!){cartLinesAdd(cartId:$cartId,lines:$lines){cart{id checkoutUrl totalQuantity}userErrors{field message}}}`,{cartId:existingId,lines:[{merchandiseId:selectedVariant.id,quantity}]});
        const payload=result.cartLinesAdd;
        if(payload.userErrors?.length) throw new Error(payload.userErrors.map(e=>e.message).join('; '));
        if(payload.cart?.checkoutUrl){ localStorage.setItem('frriday-cart-id',payload.cart.id); location.href=payload.cart.checkoutUrl; return; }
      } catch (existingCartError) {
        // A Shopify cart can expire or become invalid. Remove the stale ID and create a fresh cart below.
        localStorage.removeItem('frriday-cart-id');
        console.warn('FRRIDAY existing cart could not be reused; creating a fresh cart.', existingCartError);
      }
    }
    const result=await request(`mutation CreateCart($input:CartInput){cartCreate(input:$input){cart{id checkoutUrl totalQuantity}userErrors{field message}}}`,{input:{lines:[{merchandiseId:selectedVariant.id,quantity}]}});
    const payload=result.cartCreate;
    if(payload.userErrors?.length) throw new Error(payload.userErrors.map(e=>e.message).join('; '));
    localStorage.setItem('frriday-cart-id',payload.cart.id);
    location.href=payload.cart.checkoutUrl;
  } catch(error){
    console.error(error);
    $('#purchaseStatus').textContent='Unable to add right now. Please try again.';
    btn.disabled=false; btn.textContent='ADD TO BAG ↗';
  }
}

function showError(){ $('#productLoading').hidden=true; $('#productError').hidden=false; }

$('#sizeGuide').addEventListener('click',()=>$('#sizeModal').hidden=false);
$$('[data-close-size]').forEach(el=>el.addEventListener('click',()=>$('#sizeModal').hidden=true));
window.addEventListener('keydown',e=>{if(e.key==='Escape')$('#sizeModal').hidden=true});
$$('[data-qty]').forEach(btn=>btn.addEventListener('click',()=>{
  quantity=Math.max(1,Math.min(10,quantity+Number(btn.dataset.qty)));
  $('#quantity').textContent=quantity;
}));
$('#addToBag').addEventListener('click',addToBag);

(async()=>{
  try{
    const handle=getHandle();
    if(!handle) throw new Error('Missing product handle.');
    const data=await request(PRODUCT_QUERY,{handle});
    product=data.product;
    if(!product) throw new Error('Product not found.');
    renderProduct();
    $('#productLoading').hidden=true;
    $('#productView').hidden=false;
  }catch(error){ console.error(error); showError(); }
})();
