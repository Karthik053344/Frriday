export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-07';

  if (!domain || !token) {
    return res.status(500).json({ error: 'Shopify server configuration is missing.' });
  }

  const body = req.body || {};
  if (typeof body.query !== 'string' || !body.query.trim()) {
    return res.status(400).json({ error: 'A GraphQL query is required.' });
  }

  const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Shopify-Storefront-Access-Token': token
      },
      body: JSON.stringify({
        query: body.query,
        variables: body.variables || {}
      })
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: 'Shopify returned an invalid response.' };
    }

    if (!response.ok) {
      return res.status(response.status).json(json);
    }

    return res.status(200).json(json);
  } catch (error) {
    console.error('FRRIDAY Shopify proxy error:', error);
    return res.status(502).json({ error: 'Unable to reach Shopify right now.' });
  }
}
