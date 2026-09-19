/*
 * Public frontend Shopify configuration.
 * The Storefront API token is intentionally NOT stored in the browser.
 * Requests are proxied through /api/shopify using Vercel environment variables.
 */
window.FRRIDAY_SHOPIFY = Object.freeze({
  store: 'pxhdjy-sj.myshopify.com',
  apiVersion: '2026-07',
  endpoint: '/api/shopify'
});
