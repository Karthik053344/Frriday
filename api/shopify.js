export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const apiVersion = '2026-07';

  if (!domain || !token) {
    return res.status(500).json({ error: 'Shopify environment variables are not configured.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  if (!body || typeof body.query !== 'string') {
    return res.status(400).json({ error: 'A GraphQL query is required.' });
  }

  try {
    const response = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
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
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || 'Shopify returned a non-JSON response.' };
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('FRRIDAY Shopify proxy error:', error);
    res.status(502).json({ error: 'Unable to reach Shopify.' });
  }
}
