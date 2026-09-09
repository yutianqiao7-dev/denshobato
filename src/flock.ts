import { Letter, Pigeon } from './types';

export type LetterStatus = 'flying' | 'arrived' | 'lost';

/**
 * 手紙の今。放った時点で結末は決まっているので、時刻から引くだけで求まる。
 */
export function letterStatus(letter: Letter, now: number): LetterStatus {
  if (letter.lostAt !== undefined && now >= letter.lostAt) return 'lost';
  return now >= letter.arrivesAt ? 'arrived' : 'flying';
}

/** 消息を絶った鳩の、最後に確認できた時刻 */
export function lastSeenAt(letter: Letter, now: number): number {
  return letter.lostAt !== undefined ? Math.min(now, letter.lostAt) : now;
}

/** 巣箱の数。手元に置ける鳩の上限 */
export const LOFT_CAPACITY = 10;

const HOUR = 3600 * 1000;

/** 世話をしないとこうなる、の目安 */
export const CARE = {
  /** これを過ぎると腹をすかせる */
  hungry: 24 * HOUR,
  /** これを過ぎると弱る */
  weak: 48 * HOUR,
  /** これを過ぎると死ぬ */
  death: 96 * HOUR,
};

export type Health = 'fine' | 'hungry' | 'weak' | 'dead';

export const HEALTH_LABEL: Record<Health, string> = {
  fine: '元気',
  hungry: 'おなかを空かせている',
  weak: '弱っている',
  dead: '死んでしまった',
};

/** 手元にいる鳩の、いまの調子 */
export function healthOf(pigeon: Pigeon, now: number): Health {
  if (pigeon.diedAt !== undefined) return 'dead';
  const since = now - pigeon.fedAt;
  if (since >= CARE.death) return 'dead';
  if (since >= CARE.weak) return 'weak';
  if (since >= CARE.hungry) return 'hungry';
  return 'fine';
}

/** 世話が絶えて死ぬ時刻 */
export function starvesAt(pigeon: Pigeon): number {
  return pigeon.fedAt + CARE.death;
}

/** 弱った鳩は遅い */
export const SPEED_BY_HEALTH: Record<Health, number> = {
  fine: 1,
  hungry: 0.9,
  weak: 0.7,
  dead: 0,
};

/** 弱った鳩は帰ってこない */
export const RISK_BY_HEALTH: Record<Health, number> = {
  fine: 1,
  hungry: 1.6,
  weak: 2.5,
  dead: 0,
};

export type PigeonStatus =
  /** 手元にいる。放てる（借りている鳩なら） */
  | 'here'
  /** 空の上 */
  | 'flying'
  /** 誰かに預けてある */
  | 'lent'
  /** 相手のもとへ帰った。もう手元にはいない */
  | 'delivered'
  /** 旅の途中で戻らなかった */
  | 'lost'
  /** 世話が絶えて死んだ */
  | 'dead';

export function pigeonStatus(
  pigeon: Pigeon,
  letters: Letter[],
  now: number
): PigeonStatus {
  for (const letter of letters) {
    if (letter.pigeonId !== pigeon.id) continue;
    const status = letterStatus(letter, now);
    if (status === 'lost') return 'lost';
    if (status === 'flying') return 'flying';
    // 借りていた鳩は、届けたら飼い主のもとに残る
    if (status === 'arrived' && !pigeon.mine) return 'delivered';
  }
  if (pigeon.diedAt !== undefined) return 'dead';
  // 預けている鳩の世話は相手の仕事。こちらで飢えさせようがない
  if (pigeon.custody.kind === 'lent') return 'lent';
  return healthOf(pigeon, now) === 'dead' ? 'dead' : 'here';
}

export const STATUS_LABEL: Record<PigeonStatus, string> = {
  here: '鳩舎にいます',
  flying: '空の上',
  lent: '預けています',
  delivered: '飼い主のもとへ帰りました',
  lost: '戻りませんでした',
  dead: '死んでしまいました',
};

/** 無事に届けた回数 */
export function pigeonTrips(
  pigeon: Pigeon,
  letters: Letter[],
  now: number
): number {
  return letters.filter(
    (l) => l.pigeonId === pigeon.id && letterStatus(l, now) === 'arrived'
  ).length;
}

/** 世話をしなければならない鳩（手元にいて、生きている） */
export function pigeonsInMyCare(
  pigeons: Pigeon[],
  letters: Letter[],
  now: number
): Pigeon[] {
  return pigeons.filter((p) => pigeonStatus(p, letters, now) === 'here');
}

/**
 * いま放てる鳩。
 * 鳩は自分の鳩舎にしか帰らないので、放てるのは「預かっている他人の鳩」だけ。
 */
export function releasablePigeons(
  pigeons: Pigeon[],
  letters: Letter[],
  now: number
): Pigeon[] {
  return pigeonsInMyCare(pigeons, letters, now).filter((p) => !p.mine);
}

/** 誰かに渡せる鳩。自分の鳩で、手元にいるもの */
export function givablePigeons(
  pigeons: Pigeon[],
  letters: Letter[],
  now: number
): Pigeon[] {
  return pigeonsInMyCare(pigeons, letters, now).filter((p) => p.mine);
}
