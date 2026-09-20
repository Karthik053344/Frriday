FRRIDAY Phase 1 - Shopify Proxy Fix

This build preserves the original FRRIDAY assets and frontend while routing Storefront API requests through /api/shopify to avoid browser CORS/preflight issues.

Vercel Environment Variables required:
- SHOPIFY_STORE_DOMAIN = pxhdjy-sj.myshopify.com
- SHOPIFY_STOREFRONT_ACCESS_TOKEN = existing Storefront API token

Do not put the Storefront token into frontend code.

Repository root must contain:
index.html
style.css
script.js
product.html
product.css
product.js
shopify-config.js
vercel.json
api/shopify.js
assets/...
