import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, DEFAULT_SETTINGS, Letter, Pigeon, Place } from './types';
import { variantFor } from './pigeonArt';
import { newMailbox } from './relay';

const KEY = 'denshobato:state:v1';

export const emptyState: AppState = {
  version: 2,
  myName: '',
  mailbox: '',
  home: null,
  pigeons: [],
  contacts: [],
  letters: [],
  settings: DEFAULT_SETTINGS,
};

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    // はじめて開いた人にも巣穴の住所を発番する
    if (!raw) return { ...emptyState, mailbox: newMailbox() };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const now = Date.now();
    return {
      ...emptyState,
      ...parsed,
      version: 2,
      // 巣穴の住所は一度決めたら変えない。変えると渡した鳩が帰れなくなる
      mailbox: parsed.mailbox || newMailbox(),
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      pigeons: (parsed.pigeons ?? []).map((p) =>
        migratePigeon(p, parsed.myName ?? '', parsed.home ?? null, now)
      ),
      contacts: parsed.contacts ?? [],
      letters: (parsed.letters ?? []).map(migrateLetter),
    };
  } catch {
    return emptyState;
  }
}

/** 鳩舎を持たなかったころの手紙にも、運び手の欄だけは埋めておく */
function migrateLetter(letter: Letter): Letter {
  if (letter.pigeonName) return letter;
  return {
    ...letter,
    pigeonId: letter.pigeonId ?? 'unknown',
    pigeonName: '名のない鳩',
    pigeonEmoji: letter.pigeonEmoji ?? '🕊️',
  };
}

/** 帰巣先も世話も持たなかったころの鳩を、いまの形に直す */
function migratePigeon(
  pigeon: Pigeon,
  myName: string,
  home: Place | null,
  now: number
): Pigeon {
  if (pigeon.custody && pigeon.loft && pigeon.variant) return pigeon;
  return {
    ...pigeon,
    variant: pigeon.variant ?? variantFor(pigeon.id),
    mine: pigeon.mine ?? true,
    ownerName: pigeon.ownerName ?? myName,
    loft: pigeon.loft ?? home ?? { name: '鳩舎', lat: 0, lng: 0 },
    custody: pigeon.custody ?? { kind: 'here' },
    fedAt: pigeon.fedAt ?? now,
  };
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 保存できなくてもアプリは動かす
  }
}
