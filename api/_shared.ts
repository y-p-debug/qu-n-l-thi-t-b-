import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  Firestore 
} from 'firebase/firestore';

// Read config from environment variables or fallback to JSON
let firebaseConfig: Record<string, any> = {};

try {
  if (process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY) {
    firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
      firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID
    };
  } else {
    // Dynamically require or import json fallback
    const configModule = await import('../firebase-applet-config.json', { with: { type: 'json' } }).catch(() => null);
    if (configModule && configModule.default) {
      firebaseConfig = configModule.default;
    }
  }
} catch {
  // Ignore fallback error
}

export function getDb(): Firestore {
  const fbApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return firebaseConfig.firestoreDatabaseId
    ? initializeFirestore(fbApp, {}, firebaseConfig.firestoreDatabaseId)
    : getFirestore(fbApp);
}

export function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export async function getWebhookConfig(): Promise<{ url: string; secret: string }> {
  const url = process.env.APPS_SCRIPT_URL?.trim() || '';
  const secret = process.env.APPS_SCRIPT_SECRET?.trim() || '';
  return { url, secret };
}

export async function sendViaGoogleAppsScript(payload: {
  to: string[];
  subject: string;
  html: string;
  photoBase64?: string;
}): Promise<{ ok: boolean; error?: string; status?: number; responseText?: string }> {
  const { url: scriptUrl, secret: scriptSecret } = await getWebhookConfig();

  if (!scriptUrl) {
    const errorMsg = 'APPS_SCRIPT_URL chưa được cấu hình trong Environment Variables của Vercel.';
    console.warn('[GAS WEBHOOK]', errorMsg);
    return { ok: false, error: errorMsg };
  }

  try {
    const postBody = JSON.stringify({
      secret: scriptSecret,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.photoBase64 ? { photoBase64: payload.photoBase64 } : {})
    });

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: postBody,
      redirect: 'follow'
    });

    const responseText = await response.text();
    let parsedBody: any = null;
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      // Non-JSON response
    }

    if (parsedBody && parsedBody.ok === false) {
      const detailError = parsedBody.error || responseText;
      return { 
        ok: false, 
        status: response.status, 
        error: detailError === 'Unauthorized' || detailError === 'unauthorized'
          ? 'Mã bí mật (Secret Key) không khớp giữa ứng dụng và Apps Script.'
          : detailError,
        responseText 
      };
    }

    if (response.ok) {
      return { ok: true, status: response.status, responseText };
    } else {
      return { ok: false, status: response.status, error: `HTTP ${response.status}: ${responseText}` };
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[GAS WEBHOOK ERROR]:', errMsg);
    return { ok: false, error: errMsg };
  }
}
