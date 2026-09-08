import { Place } from './types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** 2 地点間の大圏距離 (km) */
export function distanceKm(a: Place, b: Place): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 鳩は毎回わずかに調子が違う。0.85〜1.15 倍 */
export function rollCondition(): number {
  return 0.85 + Math.random() * 0.3;
}

/** どんなに近くても鳩は飛ぶ支度が要る */
const MINIMUM_FLIGHT_MS = 5 * 60 * 1000;

export function flightDurationMs(
  km: number,
  speedKmh: number,
  condition: number
): number {
  const hours = km / Math.max(1, speedKmh * condition);
  return Math.max(MINIMUM_FLIGHT_MS, Math.round(hours * 3600 * 1000));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('ja-JP')} km`;
}

/** 残り時間を「2日と4時間」のように */
export function formatDuration(ms: number): string {
  if (ms <= 0) return 'まもなく';
  const min = Math.floor(ms / 60000);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);
  if (day > 0) {
    const h = hour % 24;
    return h > 0 ? `${day}日と${h}時間` : `${day}日`;
  }
  if (hour > 0) {
    const m = min % 60;
    return m > 0 ? `${hour}時間${m}分` : `${hour}時間`;
  }
  if (min > 0) return `${min}分`;
  return `${Math.max(1, Math.floor(ms / 1000))}秒`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]}) ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function progressOf(letter: { sentAt: number; arrivesAt: number }, now: number): number {
  const span = letter.arrivesAt - letter.sentAt;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (now - letter.sentAt) / span));
}

/**
 * その距離を飛ばせたとき、鳩が戻らない確率。
 * 遠いほど高くなる。弱った鳩を放てば risk が上がる。
 */
export function lossChance(km: number, risk = 1): number {
  return Math.min(0.6, (1 - Math.exp(-km / 40000)) * risk);
}

/** 何羽に1羽が帰らない計算になるか（表示用） */
export function lossOdds(km: number, risk = 1): number {
  const p = lossChance(km, risk);
  return p <= 0 ? Infinity : Math.max(2, Math.round(1 / p));
}

/**
 * 放つ瞬間に、その鳩が力尽きるかどうかを決める。
 * 戻らない鳩には、旅の途中のどこかで途切れる時刻を返す。
 */
export function rollLostAt(
  km: number,
  sentAt: number,
  arrivesAt: number,
  risk = 1
): number | undefined {
  if (Math.random() >= lossChance(km, risk)) return undefined;
  const span = arrivesAt - sentAt;
  return Math.round(sentAt + span * (0.15 + Math.random() * 0.7));
}
