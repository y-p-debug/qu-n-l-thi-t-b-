/**
 * Tiện ích phát hiện trình duyệt trong app (In-App Browser / WebView)
 * như Messenger, Facebook, Zalo, Instagram, Line, TikTok, v.v.
 * Google OAuth chặn đăng nhập trên các trình duyệt này (lỗi disallowed_useragent).
 */

export interface InAppBrowserInfo {
  isInApp: boolean;
  appName: string;
  isIOS: boolean;
  isAndroid: boolean;
}

export function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof window === 'undefined' || !navigator || !navigator.userAgent) {
    return { isInApp: false, appName: '', isIOS: false, isAndroid: false };
  }

  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  const isZalo = /Zalo/i.test(ua);
  const isFB = /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Messenger/i.test(ua);
  const isInstagram = /Instagram/i.test(ua);
  const isLine = /Line\//i.test(ua);
  const isTikTok = /musical_ly|ByteLocale|TikTok/i.test(ua);
  const isWeChat = /MicroMessenger/i.test(ua);

  // WebView tổng quát (iOS webview không có Safari, Android webview có dấu hiệu wv)
  const isGeneralWebView =
    (isIOS && !/Safari/i.test(ua) && !/CriOS/i.test(ua) && !/FxiOS/i.test(ua)) ||
    (isAndroid && /; wv\)|Version\/[0-9.]+/i.test(ua) && !/Chrome\/[.0-9]+ Mobile/i.test(ua));

  let appName = '';
  if (isZalo) appName = 'Zalo';
  else if (isFB) appName = 'Facebook / Messenger';
  else if (isInstagram) appName = 'Instagram';
  else if (isLine) appName = 'Line';
  else if (isTikTok) appName = 'TikTok';
  else if (isWeChat) appName = 'WeChat';
  else if (isGeneralWebView) appName = 'Trình duyệt ứng dụng';

  const isInApp = Boolean(
    appName || isZalo || isFB || isInstagram || isLine || isTikTok || isWeChat || isGeneralWebView
  );

  return {
    isInApp,
    appName: appName || 'Trình duyệt trong app',
    isIOS,
    isAndroid
  };
}
