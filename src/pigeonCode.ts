import { AppState, Letter, Pigeon, Place } from './types';
import { variantFor } from './pigeonArt';

/**
 * 手渡しの代わりになる文字列。サーバーを介さずに
 *  - 自分の鳩を相手に預ける（鳩コード）
 *  - その鳩に持たせた手紙を、飼い主に返す（手紙コード）
 * の二つを運ぶ。
 */
const LETTER_PREFIX = 'DENSHOBATO1.';
const PIGEON_PREFIX = 'DENSHOBATO1H.';
const OBITUARY_PREFIX = 'DENSHOBATO1D.';
const BACKUP_PREFIX = 'DENSHOBATO1B.';

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8Bytes(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        c = ((c - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i++;
      }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000)
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else
      out.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f)
      );
  }
  return out;
}

function utf8String(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let cp: number;
    if (b < 0x80) {
      cp = b;
      i += 1;
    } else if (b < 0xe0) {
      cp = ((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      i += 2;
    } else if (b < 0xf0) {
      cp =
        ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
      i += 3;
    } else {
      cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      i += 4;
    }
    if (cp > 0xffff) {
      cp -= 0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    } else {
      out += String.fromCharCode(cp);
    }
  }
  return out;
}

function toBase64(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
}

function fromBase64(str: string): number[] {
  const clean = str.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n0 = B64.indexOf(clean[i]);
    const n1 = B64.indexOf(clean[i + 1]);
    const n2 = B64.indexOf(clean[i + 2]);
    const n3 = B64.indexOf(clean[i + 3]);
    if (n0 < 0 || n1 < 0) break;
    out.push((n0 << 2) | (n1 >> 4));
    if (n2 >= 0) out.push(((n1 & 15) << 4) | (n2 >> 2));
    if (n3 >= 0) out.push(((n2 & 3) << 6) | n3);
  }
  return out;
}

function pack(prefix: string, payload: unknown): string {
  return prefix + toBase64(utf8Bytes(JSON.stringify(payload)));
}

function unpack<T>(code: string, prefix: string): T | null {
  const trimmed = code.trim();
  const idx = trimmed.indexOf(prefix);
  if (idx < 0) return null;
  try {
    return JSON.parse(
      utf8String(fromBase64(trimmed.slice(idx + prefix.length).trim()))
    ) as T;
  } catch {
    return null;
  }
}

/** どの便りか。長い接頭辞から先に見る */
export function codeKind(
  code: string
): 'pigeon' | 'obituary' | 'backup' | 'letter' | null {
  const trimmed = code.trim();
  if (trimmed.includes(PIGEON_PREFIX)) return 'pigeon';
  if (trimmed.includes(OBITUARY_PREFIX)) return 'obituary';
  if (trimmed.includes(BACKUP_PREFIX)) return 'backup';
  if (trimmed.includes(LETTER_PREFIX)) return 'letter';
  return null;
}

// ---------------------------------------------------------------- 鳩を預ける

type PigeonPayload = {
  v: 1;
  id: string;
  name: string;
  emoji: string;
  variant?: string;
  owner: string;
  loft: Place;
  /** 飼い主の巣穴の住所 */
  mb?: string;
};

/** 自分の鳩を相手に預けるためのコード */
export function encodePigeon(
  pigeon: Pigeon,
  ownerName: string,
  mailbox?: string
): string {
  const payload: PigeonPayload = {
    v: 1,
    id: pigeon.id,
    name: pigeon.name,
    emoji: pigeon.emoji,
    variant: pigeon.variant,
    owner: ownerName || '名もなき飼い主',
    loft: pigeon.loft,
    mb: mailbox,
  };
  return pack(PIGEON_PREFIX, payload);
}

/** 預かった鳩。世話は預かった側の仕事になる */
export function decodePigeon(code: string, now: number): Pigeon | null {
  const payload = unpack<PigeonPayload>(code, PIGEON_PREFIX);
  if (!payload || payload.v !== 1 || !payload.loft) return null;
  return {
    id: payload.id,
    name: payload.name || '名のない鳩',
    emoji: payload.emoji || '🕊️',
    variant: payload.variant || variantFor(payload.id),
    takenInAt: now,
    mine: false,
    ownerName: payload.owner || '名もなき飼い主',
    loft: payload.loft,
    custody: { kind: 'here' },
    mailbox: payload.mb,
    fedAt: now,
  };
}

// -------------------------------------------------------------- 手紙を持たせる

type LetterPayload = {
  v: 1;
  id: string;
  from: Place;
  to: Place;
  sender: string;
  emoji: string;
  pid: string;
  pname: string;
  pemoji: string;
  pvar?: string;
  body: string;
  sentAt: number;
  arrivesAt: number;
  /** 飛ぶ時間の総量。相手の端末でも同じように進ませるため */
  fms?: number;
  /** 空模様 */
  wx?: string;
  /** 鳩が力尽きる時刻。無事に着く鳩には入っていない */
  lostAt?: number;
  km: number;
  cond: number;
  ring: string;
};

/** 放った鳩を、飼い主の端末に引き渡すためのコード */
export function encodeLetter(letter: Letter, senderName: string): string {
  const payload: LetterPayload = {
    v: 1,
    id: letter.id,
    from: letter.from,
    to: letter.to,
    sender: senderName || '名もなき差出人',
    emoji: letter.peerEmoji,
    pid: letter.pigeonId,
    pname: letter.pigeonName,
    pemoji: letter.pigeonEmoji,
    pvar: letter.pigeonVariant,
    body: letter.body,
    sentAt: letter.sentAt,
    arrivesAt: letter.arrivesAt,
    fms: letter.flyMs,
    wx: letter.weather,
    lostAt: letter.lostAt,
    km: letter.distanceKm,
    cond: letter.condition,
    ring: letter.ring,
  };
  return pack(LETTER_PREFIX, payload);
}

/** 受け取った手紙コードを、飛んでいる自分の鳩に戻す */
export function decodeLetter(code: string): Letter | null {
  const payload = unpack<LetterPayload>(code, LETTER_PREFIX);
  if (!payload || payload.v !== 1 || typeof payload.body !== 'string') {
    return null;
  }
  return {
    id: payload.id,
    direction: 'inbound',
    peerName: payload.sender,
    peerEmoji: payload.emoji || '🏡',
    pigeonId: payload.pid || 'unknown',
    pigeonName: payload.pname || '名のない鳩',
    pigeonEmoji: payload.pemoji || '🕊️',
    pigeonVariant: payload.pvar || variantFor(payload.pid || payload.id),
    from: payload.from,
    to: payload.to,
    body: payload.body,
    distanceKm: payload.km,
    sentAt: payload.sentAt,
    arrivesAt: payload.arrivesAt,
    flyMs: payload.fms,
    weather: payload.wx,
    lostAt: payload.lostAt,
    condition: payload.cond,
    ring: payload.ring,
    read: false,
  };
}

// ------------------------------------------------------------ 訃報を飼い主へ

export type Obituary = {
  /** 死んだ鳩の id。飼い主の手元では「預けてある鳩」として残っている */
  pigeonId: string;
  pigeonName: string;
  /** 看取った人の名前 */
  keeper: string;
  diedAt: number;
};

type ObituaryPayload = {
  v: 1;
  pid: string;
  pname: string;
  keeper: string;
  at: number;
};

/** 預かった鳩が死んだことを、飼い主の巣穴に置きに行くためのコード */
export function encodeObituary(o: Obituary): string {
  const payload: ObituaryPayload = {
    v: 1,
    pid: o.pigeonId,
    pname: o.pigeonName,
    keeper: o.keeper || '預かった人',
    at: o.diedAt,
  };
  return pack(OBITUARY_PREFIX, payload);
}

export function decodeObituary(code: string): Obituary | null {
  const payload = unpack<ObituaryPayload>(code, OBITUARY_PREFIX);
  if (!payload || payload.v !== 1 || !payload.pid) return null;
  return {
    pigeonId: payload.pid,
    pigeonName: payload.pname || '名のない鳩',
    keeper: payload.keeper || '預かった人',
    diedAt: typeof payload.at === 'number' ? payload.at : Date.now(),
  };
}

// -------------------------------------------------------- 鳩舎ごとの控え

type BackupPayload = {
  v: 1;
  /** 控えを取った時刻 */
  at: number;
  state: AppState;
};

/**
 * 鳩舎まるごとの控え。端末を変えるときに持っていくためのもの。
 *
 * 通知の予約番号だけは、その端末でしか意味を持たないので落とす。
 */
export function encodeBackup(state: AppState): string {
  const payload: BackupPayload = {
    v: 1,
    at: Date.now(),
    state: {
      ...state,
      pigeons: state.pigeons.map((p) => ({
        ...p,
        careNotificationId: undefined,
      })),
      letters: state.letters.map((l) => ({ ...l, notificationId: undefined })),
    },
  };
  return pack(BACKUP_PREFIX, payload);
}

export function decodeBackup(code: string): AppState | null {
  const payload = unpack<BackupPayload>(code, BACKUP_PREFIX);
  const state = payload?.state;
  if (
    !payload ||
    payload.v !== 1 ||
    !state ||
    !Array.isArray(state.pigeons) ||
    !Array.isArray(state.letters) ||
    !Array.isArray(state.contacts)
  ) {
    return null;
  }
  return state;
}

/** 控えの中身を、入れる前に数えて見せる */
export function peekBackup(code: string) {
  const state = decodeBackup(code);
  if (!state) return null;
  return {
    myName: state.myName,
    home: state.home?.name ?? null,
    pigeons: state.pigeons.filter((p) => p.diedAt === undefined).length,
    letters: state.letters.length,
    contacts: state.contacts.length,
  };
}
