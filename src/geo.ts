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

/**
 * どこまで来たか。飛べた時間で測るので、夜のあいだは進まない。
 * 飛行時間を持たない古い手紙は、素直に時計で測る。
 */
export function progressOf(
  letter: {
    sentAt: number;
    arrivesAt: number;
    flyMs?: number;
    from?: { lng: number };
  },
  now: number
): number {
  if (letter.flyMs && letter.flyMs > 0 && letter.from) {
    return Math.min(
      1,
      Math.max(0, flownMs(letter.sentAt, letter.from.lng, now) / letter.flyMs)
    );
  }
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
 * 戻らない鳩には、旅のどのあたりで途切れるかを割合で返す。
 */
export function rollLossPoint(km: number, risk = 1): number | undefined {
  if (Math.random() >= lossChance(km, risk)) return undefined;
  return 0.15 + Math.random() * 0.7;
}

// ---------------------------------------------------------------- 夜と天気

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** 鳩が飛ぶ時間帯。夜は飛ばずに休む */
export const DAY_START_H = 5;
export const DAY_END_H = 19;

/**
 * その土地の「だいたいの太陽時」で、飛べる時間帯の境目を出す。
 * 端末の時計まかせにすると人によって答えが変わるので、経度から決める。
 */
function dayBounds(at: number, lng: number) {
  const offset = (lng / 15) * HOUR_MS;
  const shifted = at + offset;
  const day = Math.floor(shifted / DAY_MS) * DAY_MS;
  const start = day + DAY_START_H * HOUR_MS - offset;
  const end = day + DAY_END_H * HOUR_MS - offset;
  return { start, end, nextStart: start + DAY_MS };
}

/** いま飛べる時間帯か */
export function isFlyingHour(at: number, lng: number): boolean {
  const { start, end } = dayBounds(at, lng);
  return at >= start && at < end;
}

/** 飛ぶ時間を積み上げていって、使いきる時刻を返す（夜は進まない） */
export function arriveAfterFlying(
  sentAt: number,
  lng: number,
  flyMs: number
): number {
  let cursor = sentAt;
  let left = flyMs;
  for (let guard = 0; guard < 2000 && left > 0; guard++) {
    const { start, end, nextStart } = dayBounds(cursor, lng);
    if (cursor < start) {
      cursor = start;
      continue;
    }
    if (cursor >= end) {
      cursor = nextStart;
      continue;
    }
    const fly = Math.min(left, end - cursor);
    cursor += fly;
    left -= fly;
  }
  return cursor;
}

/** 出発から今までに、実際に飛べた時間 */
export function flownMs(sentAt: number, lng: number, now: number): number {
  if (now <= sentAt) return 0;
  let cursor = sentAt;
  let flown = 0;
  for (let guard = 0; guard < 2000 && cursor < now; guard++) {
    const { start, end, nextStart } = dayBounds(cursor, lng);
    if (cursor < start) {
      cursor = Math.min(start, now);
      continue;
    }
    if (cursor >= end) {
      cursor = Math.min(nextStart, now);
      continue;
    }
    const until = Math.min(end, now);
    flown += until - cursor;
    cursor = until;
  }
  return flown;
}

/** その日の空模様。放つ瞬間に決まって、あとから変わらない */
export type Weather = { label: string; extraMs: number };

const SKIES: { label: string; weight: number; extra: number }[] = [
  { label: '晴れ', weight: 58, extra: 0 },
  { label: '追い風', weight: 8, extra: -0.15 },
  { label: '向かい風', weight: 14, extra: 0.35 },
  { label: '雨', weight: 13, extra: 0.6 },
  { label: '嵐', weight: 7, extra: 1.4 },
];

/** 空模様を引く。長い旅ほど、悪天に当たる目が増える */
export function rollWeather(flyMs: number): Weather {
  const total = SKIES.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * total;
  let sky = SKIES[0];
  for (const s of SKIES) {
    roll -= s.weight;
    if (roll <= 0) {
      sky = s;
      break;
    }
  }
  return { label: sky.label, extraMs: Math.round(flyMs * sky.extra) };
}
