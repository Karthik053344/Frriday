const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const SHOPIFY=window.FRRIDAY_SHOPIFY;

const PRODUCT_QUERY=`query ProductPage($handle:String!){product(handle:$handle){id title handle description descriptionHtml vendor productType featuredImage{url altText width height} images(first:20){nodes{id url altText width height}} options{name values} priceRange{minVariantPrice{amount currencyCode} maxVariantPrice{amount currencyCode}} variants(first:100){nodes{id title availableForSale quantityAvailable selectedOptions{name value} price{amount currencyCode} compareAtPrice{amount currencyCode} image{url altText}}} metafields(identifiers:[{namespace:"custom",key:"fabric"},{namespace:"custom",key:"fit"},{namespace:"custom",key:"care"},{namespace:"custom",key:"story"}]){namespace key value type}}}`;

let product=null,selectedVariant=null,quantity=1,galleryImages=[];
async function request(query,variables={}){
 if(!SHOPIFY?.endpoint) throw new Error('Shopify configuration missing.');
 const r=await fetch(SHOPIFY.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables})});
 const json=await r.json().catch(()=>({error:'Invalid response from Shopify.'}));
 if(!r.ok) throw new Error(json?.errors?.map(e=>e.message).join('; ')||json?.error||`Shopify returned ${r.status}.`);
 if(json.errors?.length) throw new Error(json.errors.map(e=>e.message).join('; '));
 return json.data;
}
function getHandle(){const m=location.pathname.replace(/\/+$/,'').match(/^\/products\/([^/]+)$/);return m?.[1]||new URLSearchParams(location.search).get('handle');}
function money(m){return m?new Intl.NumberFormat('en-US',{style:'currency',currency:m.currencyCode,maximumFractionDigits:0}).format(Number(m.amount)):''}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function humanTitle(t){return t.replace(/^Unisex\s+/i,'');}
function localGallery(){
 const h=product?.handle||'';
 if(h==='unisex-half-zip-pullover') return [{id:'local-half-front',url:'/assets/halfzip-front.jpg',alt:'FRRIDAY CORE 01 Half-Zip Pullover front'},{id:'local-half-back',url:'/assets/halfzip-back.jpg',alt:'FRRIDAY CORE 01 Half-Zip Pullover back'}];
 if(h==='unisex-full-zip-hoodie') return [{id:'local-full-front',url:'/assets/fullzip-front.jpg',alt:'FRRIDAY CORE 02 Full-Zip Hoodie front'},{id:'local-full-back',url:'/assets/fullzip-back.jpg',alt:'FRRIDAY CORE 02 Full-Zip Hoodie back'}];
 return [];
}
function setGallery(i){
 const img=galleryImages[i]; if(!img)return;
 const main=$('#mainImage');
 const fallback=$('#galleryFallback');
 main.classList.remove('is-ready','is-error');
 fallback.hidden=true;
 main.onload=()=>main.classList.add('is-ready');
 main.onerror=()=>{main.classList.remove('is-ready');main.classList.add('is-error');fallback.hidden=false;};
 main.alt=img.alt||humanTitle(product.title);
 // Do not clear src first. Clearing it can fire an asynchronous error event
 // and incorrectly mark the next valid image as unavailable.
 if(main.src !== new URL(img.url, location.origin).href){
   main.src=img.url;
 } else if(main.complete && main.naturalWidth>0){
   main.classList.add('is-ready');
 }
 $$('.gallery-thumb').forEach((b,n)=>b.classList.toggle('active',n===i));
 $('#galleryIndex').textContent=`${String(i+1).padStart(2,'0')} / ${String(galleryImages.length).padStart(2,'0')}`;
}
function renderGallery(){
 galleryImages=localGallery();
 if(!galleryImages.length) galleryImages=product.images?.nodes?.length?product.images.nodes:[product.featuredImage].filter(Boolean);
 const thumbs=$('#thumbs'); thumbs.innerHTML='';
 galleryImages.forEach((im,i)=>{const b=document.createElement('button');b.type='button';b.className='gallery-thumb'+(i===0?' active':'');b.innerHTML=`<img src="${esc(im.url)}" alt="${esc(im.altText||product.title)}" loading="lazy">`;b.addEventListener('click',()=>setGallery(i));thumbs.appendChild(b);});
 setGallery(0);
}
function renderSizes(){
 const opt=product.options?.find(o=>/size/i.test(o.name)); const vals=opt?.values||product.variants.nodes.map(v=>v.title); const wrap=$('#sizeOptions');wrap.innerHTML='';selectedVariant=null;
 vals.forEach(value=>{const v=product.variants.nodes.find(x=>x.selectedOptions?.some(o=>/size/i.test(o.name)&&o.value===value));const b=document.createElement('button');b.type='button';b.className='size-option';b.textContent=value;b.disabled=!v?.availableForSale;if(v&&!selectedVariant&&v.availableForSale)selectedVariant=v;b.addEventListener('click',()=>selectVariant(v,value));wrap.appendChild(b);});
 if(selectedVariant) selectVariant(selectedVariant,selectedVariant.selectedOptions.find(o=>/size/i.test(o.name))?.value); else updatePurchase();
}
function selectVariant(v,value){if(!v)return;selectedVariant=v;$$('.size-option').forEach(b=>b.classList.toggle('selected',b.textContent===value));updatePurchase();}
function updatePurchase(){const b=$('#addToBag');b.disabled=!selectedVariant||!selectedVariant.availableForSale;b.textContent=selectedVariant?.availableForSale?'ADD TO BAG ↗':'SOLD OUT';$('#productPrice').textContent=selectedVariant?money(selectedVariant.price):money(product.priceRange.minVariantPrice);$('#selectionNote').textContent=selectedVariant?`${selectedVariant.title} selected`:'Select a size to continue.';}
function setBagCount(n){localStorage.setItem('frriday-cart-count',String(n));const e=$('#bagCount');if(e)e.textContent=n;}
async function addToBag(){
 if(!selectedVariant)return; const b=$('#addToBag');b.disabled=true;b.textContent='ADDING…';
 try{
  const id=localStorage.getItem('frriday-cart-id');
  if(id){
   const d=await request(`mutation Add($cartId:ID!,$lines:[CartLineInput!]!){cartLinesAdd(cartId:$cartId,lines:$lines){cart{id checkoutUrl totalQuantity}userErrors{message}}}`,{cartId:id,lines:[{merchandiseId:selectedVariant.id,quantity}]});
   const x=d.cartLinesAdd;if(x.userErrors?.length)throw new Error(x.userErrors.map(e=>e.message).join('; '));
   localStorage.setItem('frriday-cart-id',x.cart.id);setBagCount(x.cart.totalQuantity);showToast('ADDED TO BAG');b.disabled=false;b.textContent='ADD TO BAG ↗';return;
  }
  const d=await request(`mutation Create($input:CartInput){cartCreate(input:$input){cart{id checkoutUrl totalQuantity}userErrors{message}}}`,{input:{lines:[{merchandiseId:selectedVariant.id,quantity}]}});
  const x=d.cartCreate;if(x.userErrors?.length)throw new Error(x.userErrors.map(e=>e.message).join('; '));
  localStorage.setItem('frriday-cart-id',x.cart.id);setBagCount(x.cart.totalQuantity);showToast('ADDED TO BAG');b.disabled=false;b.textContent='ADD TO BAG ↗';
 }catch(e){console.error(e);localStorage.removeItem('frriday-cart-id');$('#purchaseStatus').textContent=e.message||'Unable to add right now.';b.disabled=false;b.textContent='ADD TO BAG ↗';}
}
function showToast(t){const e=$('#productToast');if(!e)return;e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800);}
function render(){document.title=`FRRIDAY® | ${humanTitle(product.title)}`;$('#productTitle').textContent=humanTitle(product.title);$('#productPrice').textContent=money(product.priceRange.minVariantPrice);$('#productDescription').textContent=product.description?.split('•')[0].trim()||'';$('#detailsDescription').innerHTML=product.descriptionHtml||`<p>${esc(product.description||'')}</p>`;$('#productType').textContent=(product.productType||'CORE').toUpperCase();$('#productAvailability').textContent=product.variants.nodes.some(v=>v.availableForSale)?'AVAILABLE':'SOLD OUT';renderGallery();renderSizes();}
function showError(e){console.error(e);$('#productLoading').hidden=true;$('#productView').hidden=true;$('#productError').hidden=false;const msg=$('#productErrorMessage');if(msg)msg.textContent=e?.message||'Please try again.';}
$('#sizeGuide')?.addEventListener('click',()=>$('#sizeModal').hidden=false);$$('[data-close-size]').forEach(e=>e.addEventListener('click',()=>$('#sizeModal').hidden=true));$$('[data-qty]').forEach(b=>b.addEventListener('click',()=>{quantity=Math.max(1,Math.min(10,quantity+Number(b.dataset.qty)));$('#quantity').textContent=quantity;}));$('#addToBag')?.addEventListener('click',addToBag);
(async()=>{try{const h=getHandle();if(!h)throw new Error('Missing product handle.');const d=await request(PRODUCT_QUERY,{handle:h});product=d.product;if(!product)throw new Error('Product not found in Shopify.');render();$('#productLoading').hidden=true;$('#productView').hidden=false;}catch(e){showError(e);}})();
