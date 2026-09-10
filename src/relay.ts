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
