FRRIDAY COMPLETE STORE BUILD

Architecture:
- Static frontend on Vercel
- Shopify Storefront API through /api/shopify
- Private Storefront API token stored only in Vercel environment variables
- /shop.html = dynamic Shopify catalog with search, category and sort
- /products/<handle> = dynamic product detail
- /bag.html = Shopify cart
- Homepage retains FRRIDAY editorial brand + Friday Drop section

Required Vercel environment variables:
SHOPIFY_STORE_DOMAIN=pxhdjy-sj.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=<private Storefront API token>

Shopify permissions required by this build:
- unauthenticated_read_product_listings
- unauthenticated_read_product_inventory
- unauthenticated_read_checkouts
- unauthenticated_write_checkouts
