import { getWebhookConfig } from './_shared.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const config = await getWebhookConfig();
  return res.json({
    configured: Boolean(config.url),
    urlMasked: config.url ? `${config.url.slice(0, 35)}...` : null,
    hasSecret: Boolean(config.secret)
  });
}
