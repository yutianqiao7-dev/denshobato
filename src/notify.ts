import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let ready = false;

/**
 * この端末に通知を出せるか。
 *
 * expo-notifications が面倒を見るのは Android と iOS だけで、
 * ブラウザは対象外（https://docs.expo.dev/versions/v57.0.0/sdk/notifications/）。
 * 閉じているあいだに端末を起こすには押し出す側のサーバが要るので、
 * web 版では約束しない。
 */
export const CAN_NOTIFY = Platform.OS === 'ios' || Platform.OS === 'android';

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
  if (!id || !CAN_NOTIFY) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // 予定が既に無いだけ
  }
}
