import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { ALL_CITIES } from './cities';
import { distanceKm } from './geo';
import { Place } from './types';

/**
 * いまいる場所を鳩舎にする。
 *
 * 座標は端末から取れるが、地名にするのは Android と iOS だけ
 * （expo-location の reverseGeocodeAsync は web 非対応）。
 * ブラウザでは、いちばん近い町の名前を仮に置く。名前はあとから直せる。
 */
export type LocateResult =
  | { ok: true; place: Place }
  | { ok: false; reason: string };

/** 手持ちの町のうち、いちばん近いものの名前 */
function nearestCityName(lat: number, lng: number): string {
  let best = ALL_CITIES[0];
  let bestKm = Infinity;
  for (const city of ALL_CITIES) {
    const km = distanceKm({ name: '', lat, lng }, city);
    if (km < bestKm) {
      bestKm = km;
      best = city;
    }
  }
  // 遠すぎるなら、町の名前を借りるのはやめる
  return bestKm <= 120 ? best.name : '現在地';
}

export async function locateHere(): Promise<LocateResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return {
        ok: false,
        reason: '位置情報が許可されていません。町から選んでください。',
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const { latitude, longitude } = position.coords;

    let name = nearestCityName(latitude, longitude);
    if (Platform.OS !== 'web') {
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        name =
          address?.district ||
          address?.city ||
          address?.subregion ||
          address?.region ||
          name;
      } catch {
        // 地名が引けなくても、座標は取れている
      }
    }

    return { ok: true, place: { name, lat: latitude, lng: longitude } };
  } catch {
    return {
      ok: false,
      reason: '位置情報を取れませんでした。町から選んでください。',
    };
  }
}
