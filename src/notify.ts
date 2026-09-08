import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let ready = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** 通知が使えるなら準備する。使えなくてもアプリは動く */
export async function prepareNotifications(): Promise<boolean> {
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
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // 予定が既に無いだけ
  }
}
