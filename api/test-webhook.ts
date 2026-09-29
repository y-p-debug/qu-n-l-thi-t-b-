import { sendViaGoogleAppsScript } from './_shared.js';

export default async function handler(req: any, res: any) {
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
    const { targetEmail, url, secret } = req.body || {};
    const toRaw = targetEmail ? [targetEmail, 'y-p@dymvietnam.net'] : ['y-p@dymvietnam.net'];
    const to = Array.from(new Set(toRaw.map(e => e.trim().toLowerCase())));

    if (url) process.env.APPS_SCRIPT_URL = url.trim();
    if (secret) process.env.APPS_SCRIPT_SECRET = secret.trim();

    const testHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">[THỬ NGHIỆM THÀNH CÔNG] Google Apps Script Webhook</h2>
        <p>Hệ thống Quản lý mượn thiết bị DYM Vietnam đã kết nối thành công với Google Apps Script của bạn.</p>
        <p>Thời điểm gửi thử: <strong>${new Date().toLocaleString('vi-VN')}</strong></p>
      </div>
    `;

    const result = await sendViaGoogleAppsScript({
      to,
      subject: '[DYM TEST] Kiểm tra kết nối gửi email qua Google Apps Script',
      html: testHtml,
      webhookUrl: url,
      webhookSecret: secret
    });

    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
}
