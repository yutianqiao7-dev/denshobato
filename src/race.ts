import { Pigeon } from './types';
import { Gift, giftOf, GIFT_MAX, rollGift } from './gift';
import { PIGEON_NAMES } from './cities';
import { PLUMAGES } from './pigeonArt';

/**
 * 鳩レース。
 *
 * 実在の競技のように、放った鳩が巣へ帰るまでの時間を競う。
 * 速さ（翼）がまず効き、長い距離ほど帰巣本能（心）と粘り（体）がものを言う。
 * その日の調子で番狂わせも起きる——強い鳩が必ず勝つわけではない。
 */

export type Course = {
  id: string;
  name: string;
  /** 距離感。見せ方（持ち時間の長さ）に使う */
  legs: number;
  /** どの天分がどれだけ効くか。合わせて 1 */
  weight: { wing: number; homing: number; grit: number };
  note: string;
};

export const COURSES: Course[] = [
  {
    id: 'sprint',
    name: '短距離（町まわり）',
    legs: 3,
    weight: { wing: 0.7, homing: 0.2, grit: 0.1 },
    note: '翼がものを言う',
  },
  {
    id: 'middle',
    name: '中距離（山越え）',
    legs: 6,
    weight: { wing: 0.45, homing: 0.35, grit: 0.2 },
    note: '翼と心が半々',
  },
  {
    id: 'long',
    name: '長距離（海わたり）',
    legs: 10,
    weight: { wing: 0.25, homing: 0.4, grit: 0.35 },
    note: '心と体がものを言う',
  },
];

export type Field = {
  id: string;
  name: string;
  /** 1 位が easy、数が大きいほど強敵ぞろい */
  center: number;
  ribbon: string;
};

export const FIELDS: Field[] = [
  { id: 'village', name: '村の寄り合い', center: 12, ribbon: '木の葉章' },
  { id: 'town', name: '町の大会', center: 18, ribbon: '銅の羽根章' },
  { id: 'grand', name: '本大会', center: 24, ribbon: '金の羽根章' },
];

export type Racer = {
  id: string;
  name: string;
  variant: string;
  gift: Gift;
  bond: number;
  mine: boolean;
};

export type Result = Racer & {
  /** 帰るまでにかかった持ち時間。小さいほど速い */
  time: number;
  place: number;
};

/** 一度出たら、次に出られるまで。続けては走らせない */
export const RACE_REST = 3 * 60 * 60 * 1000;

/** いまレースに出せるか。自分の成鳥で、元気で、休み明けの鳩だけ */
export function raceReadyAt(pigeon: Pigeon): number {
  return (pigeon.racedAt ?? 0) + RACE_REST;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * 一羽の、このレースでの持ち時間。小さいほど速い。
 *
 * コースごとの重みで、効く天分が変わる。短距離は翼、長距離は心と体。
 * その日の調子で ±、低い心はまれに大きく道を外す——番狂わせの余地。
 */
function runTime(r: Racer, course: Course): number {
  const g = r.gift;
  const n = (v: number) => v / GIFT_MAX; // 0〜1
  const w = course.weight;
  // 天分を重みで混ぜた、このコースでの地力。0〜1
  const perf =
    w.wing * n(g.wing) + w.homing * n(g.homing) + w.grit * n(g.grit);
  // なつきは、ほんの少しの後押し（自分の鳩だけ）
  const bond = r.mine ? Math.min(0.06, (r.bond ?? 0) * 0.0015) : 0;

  // 地力が高いほど持ち時間は短い。60（最速）〜100（最遅）あたり
  let time = 100 - (perf + bond) * 40;
  // その日の調子。ここが番狂わせのもと。強い鳩でも四度に一度は取りこぼす
  time += rand(-13, 13);
  // 心が低く、距離が長いほど、大きく道を外すことがある
  const strayChance = (1 - n(g.homing)) * (course.legs / 10) * 0.45;
  if (Math.random() < strayChance) time += rand(10, 26);

  return time;
}

/** 出走表を作って走らせ、着順をつけて返す */
export function runRace(
  entrant: Racer,
  course: Course,
  field: Field,
  rivalCount = 5
): Result[] {
  const used = new Set([entrant.name]);
  const rivals: Racer[] = [];
  for (let i = 0; i < rivalCount; i++) {
    const name =
      PIGEON_NAMES.filter((n) => !used.has(n))[
        Math.floor(Math.random() * Math.max(1, PIGEON_NAMES.length - used.size))
      ] ?? `${i + 1}号`;
    used.add(name);
    rivals.push({
      id: `rival-${i}`,
      name,
      variant: PLUMAGES[Math.floor(Math.random() * PLUMAGES.length)].id,
      gift: rollRivalGift(field.center),
      bond: 0,
      mine: false,
    });
  }

  const field_ = [entrant, ...rivals];
  const timed = field_
    .map((r) => ({ ...r, time: runTime(r, course) }))
    .sort((a, b) => a.time - b.time)
    .map((r, i) => ({ ...r, place: i + 1 }));
  return timed;
}

/** 相手の鳩の天分。大会の格に合わせて中心を上げる */
function rollRivalGift(center: number): Gift {
  const near = () => {
    const v = center + (Math.random() - 0.5) * 16;
    return Math.max(0, Math.min(GIFT_MAX, Math.round(v)));
  };
  // たまにまったくの野良も混じる
  if (Math.random() < 0.15) return rollGift();
  return { wing: near(), homing: near(), grit: near() };
}

/** 入賞は三着まで */
export function placed(place: number): boolean {
  return place <= 3;
}

export function placeLabel(place: number): string {
  return place === 1 ? '一着' : place === 2 ? '二着' : place === 3 ? '三着' : `${place}着`;
}

export function pigeonToRacer(p: Pigeon): Racer {
  return {
    id: p.id,
    name: p.name,
    variant: p.variant,
    gift: giftOf(p),
    bond: p.bond ?? 0,
    mine: true,
  };
}
