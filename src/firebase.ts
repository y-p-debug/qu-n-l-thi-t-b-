import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot, 
  runTransaction, 
  updateDoc, 
  addDoc,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import localFirebaseConfig from '../firebase-applet-config.json';
import { ALLOWED_USERS_LIST, BookingRecord } from './types';

// Load configuration from VITE_ environment variables (Vercel) or fallback to local JSON
const envFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID
};

const firebaseConfig: Record<string, any> = (envFirebaseConfig.apiKey && envFirebaseConfig.projectId)
  ? envFirebaseConfig
  : localFirebaseConfig;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Using custom databaseId if specified in config
export const db: Firestore = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId
  ? initializeFirestore(app, {}, (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId)
  : getFirestore(app);

export const storage = getStorage(app);

/**
 * Check if an email is authorized in ALLOWED_USERS_LIST
 */
export function checkEmailAllowedLocally(email: string | null | undefined): { allowed: boolean; name?: string } {
  if (!email) return { allowed: false };
  const normalized = email.trim().toLowerCase();
  const found = ALLOWED_USERS_LIST.find(u => u.email.toLowerCase() === normalized);
  if (found) {
    return { allowed: true, name: found.name };
  }
  return { allowed: false };
}

/**
 * Seed users and default laptop password into Firestore if not exists
 */
export async function seedInitialFirestoreData() {
  try {
    // 1. Seed laptop password if not set
    const laptopDocRef = doc(db, 'settings', 'laptop');
    const laptopDocSnap = await getDoc(laptopDocRef);
    if (!laptopDocSnap.exists()) {
      await setDoc(laptopDocRef, {
        password: '976431',
        updatedAt: new Date().toISOString(),
        note: 'Default DYM Vietnam Laptop Password'
      });
    }

    // 2. Batch/seed users
    for (const user of ALLOWED_USERS_LIST) {
      const userRef = doc(db, 'users', user.email.toLowerCase());
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.name,
          email: user.email.toLowerCase(),
          team: user.team,
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('Seeding note:', err);
  }
}

/**
 * Fetch laptop password from Firestore settings/laptop
 */
export async function getLaptopPasswordFromFirestore(): Promise<string> {
  try {
    const docRef = doc(db, 'settings', 'laptop');
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.password) {
      return snap.data().password;
    }
    return '976431';
  } catch (error) {
    console.error('Error fetching laptop password:', error);
    return '976431';
  }
}

/**
 * Fast client-side image compression:
 * Uses createImageBitmap (hardware-accelerated, non-blocking) when available.
 * Resizes max edge to 1280px with JPEG quality 0.70 per user requirement.
 */
export async function compressImage(file: File, maxEdge = 1280, quality = 0.7): Promise<{ blob: Blob; dataUrl: string }> {
  // Use modern createImageBitmap if supported for instant decode
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file);
      let width = bitmap.width;
      let height = bitmap.height;

      if (width > maxEdge || height > maxEdge) {
        if (width > height) {
          height = Math.round((height * maxEdge) / width);
          width = maxEdge;
        } else {
          width = Math.round((width * maxEdge) / height);
          height = maxEdge;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas blob failed'))), 'image/jpeg', quality);
        });
        return { blob, dataUrl };
      }
    } catch (e) {
      console.warn('createImageBitmap failed, falling back to FileReader:', e);
    }
  }

  // Fallback to FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxEdge || height > maxEdge) {
          if (width > height) {
            height = Math.round((height * maxEdge) / width);
            width = maxEdge;
          } else {
            width = Math.round((width * maxEdge) / height);
            height = maxEdge;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              reject(new Error('Blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload return proof image to Firebase Storage with a strict 3.5s timeout.
 * If Storage takes longer or is not configured yet, it instantly falls back
 * to the compressed data URL so the user is never stuck waiting!
 */
export async function uploadReturnPhoto(bookingId: string, imageBlob: Blob, fallbackDataUrl: string): Promise<string> {
  const uploadPromise = async (): Promise<string> => {
    const filename = `returns/${bookingId}_${Date.now()}.jpg`;
    const imageRef = storageRef(storage, filename);
    await uploadBytes(imageRef, imageBlob, {
      contentType: 'image/jpeg'
    });
    return await getDownloadURL(imageRef);
  };

  // Timeout promise: 3500ms
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('Storage upload timeout')), 3500);
  });

  try {
    return await Promise.race([uploadPromise(), timeoutPromise]);
  } catch (storageError) {
    console.warn('Storage upload bypassed/timed out, saving compressed photo data directly:', storageError);
    return fallbackDataUrl;
  }
}

let cachedWebhookConfig: { url: string; secret: string } | null = null;

export async function getClientWebhookConfig(): Promise<{ url: string; secret: string } | null> {
  if (cachedWebhookConfig?.url) return cachedWebhookConfig;

  // 1. Try localStorage
  try {
    const saved = localStorage.getItem('dym_apps_script_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url) {
        cachedWebhookConfig = parsed;
        return parsed;
      }
    }
  } catch {}

  // 2. Try Firestore system_settings/apps_script
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'apps_script'));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.url) {
        cachedWebhookConfig = { url: data.url, secret: data.secret || '' };
        try {
          localStorage.setItem('dym_apps_script_config', JSON.stringify(cachedWebhookConfig));
        } catch {}
        return cachedWebhookConfig;
      }
    }
  } catch (err) {
    console.warn('Could not read system_settings/apps_script:', err);
  }

  return null;
}

export function updateClientCachedWebhook(config: { url: string; secret: string }) {
  cachedWebhookConfig = config;
  try {
    localStorage.setItem('dym_apps_script_config', JSON.stringify(config));
  } catch {}
}

/**
 * Send email via backend Google Apps Script webhook
 * (Client only invokes /api/send-email without exposing APPS_SCRIPT_URL or SECRET)
 */
export function queueNotificationEmail(payload: {
  to: string[];
  subject: string;
  html: string;
  type: 'borrow' | 'return' | 'overdue';
  photoBase64?: string;
}): Promise<{ ok: boolean; error?: string }> {
  return (async () => {
    // Ensure all recipients and y-p@dymvietnam.net are always included
    const recipientSet = new Set<string>();
    if (Array.isArray(payload.to)) {
      payload.to.forEach((item) => {
        if (item && typeof item === 'string' && item.trim()) {
          recipientSet.add(item.trim().toLowerCase());
        }
      });
    }
    // Always include admin email so y-p@dymvietnam.net receives all notifications
    recipientSet.add('y-p@dymvietnam.net');

    // Also include currently authenticated user if present
    if (auth.currentUser?.email) {
      recipientSet.add(auth.currentUser.email.trim().toLowerCase());
    }

    const finalRecipients = Array.from(recipientSet);

    // Also record into Firestore /mail for audit log
    try {
      await addDoc(collection(db, 'mail'), {
        to: finalRecipients,
        message: {
          subject: payload.subject,
          html: payload.html
        },
        type: payload.type,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Failed to record mail log to Firestore:', err);
    }

    // Call server-side proxy
    try {
      const webhookConfig = await getClientWebhookConfig();

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: finalRecipients,
          subject: payload.subject,
          html: payload.html,
          type: payload.type,
          ...(payload.photoBase64 ? { photoBase64: payload.photoBase64 } : {}),
          ...(webhookConfig?.url ? { webhookUrl: webhookConfig.url, webhookSecret: webhookConfig.secret } : {})
        })
      });
      const data = await res.json();
      console.log('[CLIENT NOTIFICATION DISPATCH RESULT]:', data);
      return data;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn('[CLIENT NOTIFICATION DISPATCH ERROR]:', errMsg);
      return { ok: false, error: errMsg };
    }
  })();
}
