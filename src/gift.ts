import { Pigeon } from './types';

/**
 * 鳩の個体値「天分」と、後天の「なつき」。
 *
 * 天分は生まれたとき決まって一生変わらない。飛びと世話に効く。
 * なつきは餌と旅で育つ。長く連れ添った鳩だけが持つ。
 *
 * 羽色（pigeonArt の variant）が見た目の個性なら、こちらは中身の個性。
 */

export type Gift = {
  /** 翼。速さ。飛ぶ時間が縮む */
  wing: number;
  /** 心。帰巣本能。帰り着かない確率が下がる */
  homing: number;
  /** 体。粘り。腹が減るのが遅くなる */
  grit: number;
};

/** 個体値のとりうる幅。0〜MAX の整数 */
export const GIFT_MAX = 31;

export const GIFT_LABEL: Record<keyof Gift, string> = {
  wing: '翼',
  homing: '心',
  grit: '体',
};

export const GIFT_NOTE: Record<keyof Gift, string> = {
  wing: '速さ。高いほど飛ぶ時間が縮む',
  homing: '帰巣本能。高いほど迷わず帰り着く',
  grit: '粘り。高いほど腹が減りにくい',
};

const clamp = (v: number) => Math.max(0, Math.min(GIFT_MAX, Math.round(v)));

/** まったくの野良。どこにでもいる鳩の天分 */
export function rollGift(): Gift {
  // 中央が出やすいように、二度振って均す
  const roll = () => Math.round((Math.random() + Math.random()) * GIFT_MAX / 2);
  return { wing: roll(), homing: roll(), grit: roll() };
}

/**
 * 子の天分。両親の中くらいに、ばらつきを乗せる。
 * まれに、両親のどちらより高い値が出る（突然変異）。
 */
export function inheritGift(a: Gift, b: Gift): Gift {
  const pass = (x: number, y: number) => {
    const mid = (x + y) / 2;
    // ふだんは ±5 ほど揺れる
    let v = mid + (Math.random() - 0.5) * 10;
    // 12 回に 1 回、血を超える跳ねが出る
    if (Math.random() < 1 / 12) v = Math.max(x, y) + 2 + Math.random() * 6;
    return clamp(v);
  };
  return {
    wing: pass(a.wing, b.wing),
    homing: pass(a.homing, b.homing),
    grit: pass(a.grit, b.grit),
  };
}

/** 天分を持たない鳩（古い記録・卵のない預かり鳩）の、無難な既定値 */
export const PLAIN_GIFT: Gift = { wing: 15, homing: 15, grit: 15 };

export function giftOf(pigeon: Pigeon): Gift {
  return pigeon.gift ?? PLAIN_GIFT;
}

// ---------------------------------------------------------------- 見せ方

/** 0〜MAX を ★5 つで表す。近いほうに丸める（どの端末でも出る字だけ使う） */
export function stars(v: number): string {
  const full = Math.max(0, Math.min(5, Math.round((v / GIFT_MAX) * 5)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

/** 0〜1。棒グラフ用 */
export function giftRatio(v: number): number {
  return Math.max(0, Math.min(1, v / GIFT_MAX));
}

/** 三つ合わせた格。血統の良し悪しをひと目で */
export function grade(gift: Gift): { label: string; tier: number } {
  const total = gift.wing + gift.homing + gift.grit;
  const ratio = total / (GIFT_MAX * 3);
  // 下から 凡 → 並 → 良 → 秀 → 逸
  const tiers = ['凡', '並', '良', '秀', '逸'];
  const tier = Math.min(4, Math.floor(ratio * 5));
  return { label: tiers[tier], tier };
}

// ---------------------------------------------------------------- 飛びへの効き

/**
 * 翼ぶんの速さの倍率。0.85〜1.15。
 * 健康の倍率（SPEED_BY_HEALTH）に掛け合わさる。
 */
export function wingSpeed(gift: Gift): number {
  return 0.85 + (gift.wing / GIFT_MAX) * 0.3;
}

/**
 * 心ぶんの危うさの倍率。1.3〜0.7。
 * 健康の倍率（RISK_BY_HEALTH）に掛け合わさる。高い心ほど安全。
 */
export function homingRisk(gift: Gift): number {
  return 1.3 - (gift.homing / GIFT_MAX) * 0.6;
}

/**
 * 体ぶんの、世話の猶予の倍率。0.8〜1.4。
 * CARE の各しきい値に掛かる。高い体ほど、腹が減るのが遅い。
 */
export function gritCare(gift: Gift): number {
  return 0.8 + (gift.grit / GIFT_MAX) * 0.6;
}

// ---------------------------------------------------------------- なつき

/** なつきの、ひと区切りごとの名前。閾値は小さいほうから */
const BONDS: { at: number; label: string }[] = [
  { at: 30, label: '相棒' },
  { at: 15, label: 'なついている' },
  { at: 6, label: '気を許している' },
  { at: 1, label: '顔を覚えた' },
];

export function bondOf(pigeon: Pigeon): number {
  return pigeon.bond ?? 0;
}

export function bondLabel(pigeon: Pigeon): string | undefined {
  const b = bondOf(pigeon);
  return BONDS.find((x) => b >= x.at)?.label;
}

/**
 * なつきぶんの、ささやかな速さの上乗せ。1.0〜1.08。
 * 長く連れ添った鳩が、ほんの少しだけ速く帰る。
 */
export function bondSpeed(pigeon: Pigeon): number {
  return 1 + Math.min(0.08, bondOf(pigeon) * 0.002);
}
