import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { currentPush, pushSupported } from './push';
import { deleteWake, postWake, relayEnabled } from './relay';

let ready = false;

/**
 * この端末に通知を出せるか。
 *
 * expo-notifications が面倒を見るのは Android と iOS だけ
 * （https://docs.expo.dev/versions/v57.0.0/sdk/notifications/）。
 * ブラウザでは代わりに、押し出し（Web Push）で端末を起こす。
 * src/push.ts と .github/workflows/push.yml が組になっている。
 */
export const CAN_NOTIFY = Platform.OS === 'ios' || Platform.OS === 'android';

/** ブラウザ版で、押し出しの支度が整っているか */
export function webPushReady(): boolean {
  return pushSupported() && relayEnabled();
}

/** この端末で通知を出せる見込みがあるか */
export function canNotifyHere(): boolean {
  return CAN_NOTIFY || webPushReady();
}

/** ブラウザ版の予約。中継所の棚に置いてくるだけ */
const WEB_PREFIX = 'w:';

if (CAN_NOTIFY) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** 通知が使えるなら準備する。使えなくてもアプリは動く */
export async function prepareNotifications(): Promise<boolean> {
  if (!CAN_NOTIFY) return false;
  if (ready) return true;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('arrival', {
        name: '鳩の到着',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    // iOS は granted だけでは足りず、仮許可(PROVISIONAL)も通知を出せる
    const allows = (s: Notifications.NotificationPermissionsStatus) =>
      s.granted ||
      s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    const current = await Notifications.getPermissionsAsync();
    let granted = allows(current);
    if (!granted && current.canAskAgain) {
      granted = allows(await Notifications.requestPermissionsAsync());
    }
    ready = granted;
    return granted;
  } catch {
    return false;
  }
}

export async function scheduleArrival(
  title: string,
  body: string,
  at: number
): Promise<string | undefined> {
  if (at <= Date.now() + 2000) return undefined;

  if (!CAN_NOTIFY) {
    // ブラウザ版。閉じていても届くように、押し出しの棚に置く
    if (!webPushReady()) return undefined;
    const sub = await currentPush();
    if (!sub) return undefined;
    const id = await postWake({ at, title, body, ...sub });
    return id ? WEB_PREFIX + id : undefined;
  }

  try {
    const ok = await prepareNotifications();
    if (!ok) return undefined;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(at),
        channelId: 'arrival',
      },
    });
  } catch {
    return undefined;
  }
}

export async function cancelArrival(id?: string): Promise<void> {
  if (!id) return;
  if (id.startsWith(WEB_PREFIX)) {
    await deleteWake(id.slice(WEB_PREFIX.length));
    return;
  }
  if (!CAN_NOTIFY) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // 予定が既に無いだけ
  }
}
