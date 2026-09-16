import { RELAY_URL } from './relayConfig';

/**
 * 鳩の中継所。
 *
 * 手紙そのものはここを通るが、置き場所は「巣穴の住所」（32桁の乱数）で、
 * その住所は鳩を手渡すときの QR にしか入っていない。住所を知らない者は
 * どこを見ればいいか分からない。
 *
 * Firebase Realtime Database の REST をそのまま叩くだけなので、
 * SDK も API キーも要らない。
 */

const base = RELAY_URL.replace(/\/+$/, '');

export function relayEnabled(): boolean {
  return base.length > 0;
}

/** 巣穴の住所。推測できない長さの乱数 */
export function newMailbox(): string {
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

/** 巣穴。ここに手紙が置かれる（firebase-rules.json のパスと合わせてある） */
const nest = (mailbox: string) => `${base}/mailboxes/${mailbox}`;

/** 相手の巣穴に手紙を置く */
export async function postLetter(
  mailbox: string,
  letterId: string,
  code: string
): Promise<boolean> {
  if (!relayEnabled() || !mailbox) return false;
  try {
    const res = await fetch(`${nest(mailbox)}/${letterId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, at: Date.now() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type Delivery = { id: string; code: string };

/** 自分の巣穴に届いているものを取る */
export async function fetchLetters(mailbox: string): Promise<Delivery[]> {
  if (!relayEnabled() || !mailbox) return [];
  try {
    const res = await fetch(`${nest(mailbox)}.json`);
    if (!res.ok) return [];
    const body = (await res.json()) as Record<
      string,
      { code?: string }
    > | null;
    if (!body) return [];
    return Object.entries(body)
      .filter(([, v]) => typeof v?.code === 'string')
      .map(([id, v]) => ({ id, code: v.code as string }));
  } catch {
    return [];
  }
}

/** 受け取ったものは巣穴から下げる */
export async function clearLetter(
  mailbox: string,
  id: string
): Promise<void> {
  if (!relayEnabled() || !mailbox) return;
  try {
    await fetch(`${nest(mailbox)}/${id}.json`, { method: 'DELETE' });
  } catch {
    // 消せなくても、同じ手紙は二度取り込まないので害はない
  }
}

// ------------------------------------------------ 時刻が来たら押し出す予定

/**
 * 「この時刻に、この端末を起こしてほしい」の控え。
 *
 * ここに置いておくと、10分おきに走る送り手（.github/workflows/push.yml）が
 * 時刻の来たものを押し出して、消していく。
 *
 * 巣穴と違って、この棚は誰でも見られる（送り手が端末の許しを持たずに
 * 読みに来るため）。だから中身は、起こす宛先と一行の文だけにしてある。
 * 宛先だけ知っても、対になる秘密鍵がなければ誰も押し出せない。
 */
export type Wake = {
  at: number;
  title: string;
  body: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const shelf = `${base}/wakes`;

/** 予定を置く。置けたら、あとで取り消すための番号が返る */
export async function postWake(wake: Wake): Promise<string | undefined> {
  if (!relayEnabled()) return undefined;
  try {
    const res = await fetch(`${shelf}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wake),
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { name?: string };
    return body?.name;
  } catch {
    return undefined;
  }
}

/** 予定を下げる（鳩を呼び戻したときなど） */
export async function deleteWake(id: string): Promise<void> {
  if (!relayEnabled() || !id) return;
  try {
    await fetch(`${shelf}/${id}.json`, { method: 'DELETE' });
  } catch {
    // 消せなくても、送り手は空振りして自分で片付ける
  }
}
