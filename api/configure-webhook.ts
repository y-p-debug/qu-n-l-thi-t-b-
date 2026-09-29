import { getDb } from './_shared.js';
import { doc, setDoc } from 'firebase/firestore';

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
    const { url, secret } = req.body || {};
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ ok: false, error: 'URL không hợp lệ. Phải bắt đầu bằng https://script.google.com/...' });
    }

    process.env.APPS_SCRIPT_URL = url.trim();
    if (secret) process.env.APPS_SCRIPT_SECRET = secret.trim();

    try {
      const db = getDb();
      await setDoc(doc(db, 'system_settings', 'apps_script'), {
        url: url.trim(),
        secret: (secret || '').trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Could not persist to Firestore system_settings:', e);
    }

    return res.json({ 
      ok: true, 
      message: 'Đã lưu cấu hình Google Apps Script Webhook thành công!' 
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
}
