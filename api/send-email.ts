import { sendViaGoogleAppsScript } from './_shared.js';

export default async function handler(req: any, res: any) {
  // Enable CORS if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, photoBase64 } = req.body || {};

    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ ok: false, error: 'Danh sách email người nhận "to" là bắt buộc.' });
    }

    if (!subject || !html) {
      return res.status(400).json({ ok: false, error: 'subject và html là bắt buộc.' });
    }

    const result = await sendViaGoogleAppsScript({
      to,
      subject,
      html,
      photoBase64
    });

    return res.status(result.ok ? 200 : 500).json(result);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error in /api/send-email:', errMsg);
    return res.status(500).json({ ok: false, error: errMsg });
  }
}
