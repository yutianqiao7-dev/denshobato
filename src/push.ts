import { Platform } from 'react-native';
import { VAPID_PUBLIC_KEY } from './relayConfig';

/**
 * ブラウザ版の通知。
 *
 * ページは閉じているあいだ動けないので、端末に置いた「受け係」
 * （public/sw.js）に外から押し出してもらう。押し出す側は
 * .github/workflows/push.yml が10分おきに走って面倒を見る。
 *
 * iPhone では、ホーム画面に置いたときだけ使えます（iOS 16.4 以降）。
 */

export type PushSub = { endpoint: string; p256dh: string; auth: string };

/** この端末に押し出せる見込みがあるか */
export function pushSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

/** ホーム画面に置いた状態で開いているか */
export function isInstalled(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const standalone = (navigator as { standalone?: boolean }).standalone;
  return (
    standalone === true ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches)
  );
}

/** iPhone は、ホーム画面に置くまで押し出せない */
export function isIos(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function urlBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function toBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function shape(sub: PushSubscription | null): PushSub | null {
  if (!sub) return null;
  const p256dh = toBase64(sub.getKey('p256dh'));
  const auth = toBase64(sub.getKey('auth'));
  if (!p256dh || !auth) return null;
  return { endpoint: sub.endpoint, p256dh, auth };
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  try {
    return await navigator.serviceWorker.register('sw.js');
  } catch {
    return null;
  }
}

/** いま押し出せる宛先。許しをもらっていなければ null */
export async function currentPush(): Promise<PushSub | null> {
  if (!pushSupported() || Notification.permission !== 'granted') return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return shape(await reg.pushManager.getSubscription());
  } catch {
    return null;
  }
}

export type EnableResult =
  | { ok: true; sub: PushSub }
  | { ok: false; reason: string };

/**
 * 通知の許しをもらって、押し出し先を作る。
 * 端末の画面をさわった流れの中からしか呼べない（ブラウザの決まり）。
 */
export async function enablePush(): Promise<EnableResult> {
  if (Platform.OS !== 'web') return { ok: false, reason: 'この端末では使いません。' };
  if (!pushSupported()) {
    return {
      ok: false,
      reason: isIos() && !isInstalled()
        ? 'iPhone では、先にホーム画面に追加してください。共有 → ホーム画面に追加。そのアイコンから開くと通知を入れられます。'
        : 'このブラウザは通知を扱えません。',
    };
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        ok: false,
        reason:
          '通知が許されませんでした。端末の設定でこのアプリの通知を許してください。',
      };
    }
    const reg = await registration();
    if (!reg) return { ok: false, reason: '受け係を置けませんでした。' };
    await navigator.serviceWorker.ready;

    const existing = shape(await reg.pushManager.getSubscription());
    if (existing) return { ok: true, sub: existing };

    const fresh = shape(
      await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(VAPID_PUBLIC_KEY),
      })
    );
    if (!fresh) return { ok: false, reason: '押し出し先を作れませんでした。' };
    return { ok: true, sub: fresh };
  } catch (e) {
    return {
      ok: false,
      reason: 'この端末では通知を入れられませんでした。',
    };
  }
}

/** 押し出し先をたたむ。預けてある予定は、送り手が空振りして消す */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    // すでに無いだけ
  }
}
