import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, DEFAULT_SETTINGS, Letter, Pigeon, Place } from './types';

const KEY = 'denshobato:state:v1';

export const emptyState: AppState = {
  version: 2,
  myName: '',
  home: null,
  pigeons: [],
  contacts: [],
  letters: [],
  settings: DEFAULT_SETTINGS,
};

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const now = Date.now();
    return {
      ...emptyState,
      ...parsed,
      version: 2,
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
  if (pigeon.custody && pigeon.loft) return pigeon;
  return {
    ...pigeon,
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
