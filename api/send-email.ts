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
    const { to, subject, html, photoBase64, webhookUrl, webhookSecret } = req.body || {};

    if (!subject || !html) {
      return res.status(400).json({ ok: false, error: 'subject và html là bắt buộc.' });
    }

    // Build recipient list and guarantee y-p@dymvietnam.net is always notified
    const recipientSet = new Set<string>();
    if (Array.isArray(to)) {
      to.forEach((item: any) => {
        if (typeof item === 'string' && item.trim()) {
          recipientSet.add(item.trim().toLowerCase());
        }
      });
    } else if (typeof to === 'string' && to.trim()) {
      recipientSet.add(to.trim().toLowerCase());
    }
    // Always include admin email so y-p@dymvietnam.net receives all borrow/return/overdue notifications
    recipientSet.add('y-p@dymvietnam.net');

    const finalRecipients = Array.from(recipientSet);

    const result = await sendViaGoogleAppsScript({
      to: finalRecipients,
      subject,
      html,
      photoBase64,
      webhookUrl,
      webhookSecret
    });

    return res.status(result.ok ? 200 : 500).json(result);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error in /api/send-email:', errMsg);
    return res.status(500).json({ ok: false, error: errMsg });
  }
}
