import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Contact, Letter, Pigeon, Place } from './types';
import { emptyState, loadState, saveState } from './storage';
import {
  distanceKm,
  flightDurationMs,
  lossChance,
  rollCondition,
  rollLostAt,
} from './geo';
import {
  CARE,
  healthOf,
  letterStatus,
  LOFT_CAPACITY,
  pigeonsInMyCare,
  releasablePigeons,
  RISK_BY_HEALTH,
  SPEED_BY_HEALTH,
} from './flock';
import { PLUMAGES } from './pigeonArt';
import { PIGEON_EMOJI, PIGEON_NAMES, RING_COLORS } from './cities';
import { cancelArrival, scheduleArrival } from './notify';
import { codeKind, decodeLetter, decodePigeon } from './pigeonCode';

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export type SendResult =
  | { ok: true; letter: Letter }
  | { ok: false; reason: 'no-pigeon' | 'gone' };

export type ReceiveResult =
  | { ok: true; kind: 'letter'; letter: Letter }
  | { ok: true; kind: 'pigeon'; pigeon: Pigeon }
  | { ok: false; reason: string };

type Store = {
  state: AppState;
  loaded: boolean;
  setMyName: (name: string) => void;
  setHome: (place: Place) => void;
  /** 新しい鳩を迎える。自分の鳩舎に帰る鳩になる */
  takeInPigeon: (
    name?: string,
    seed?: { ownerName?: string; loft?: Place }
  ) => Pigeon | null;
  /** 巣箱の空き数 */
  nestsFree: number;
  /** 相手の鳩を預かったことにする（手渡しの記録） */
  borrowPigeon: (
    contactId: string,
    name: string,
    variant?: string
  ) => Pigeon | null;
  /**
   * 自分の鳩を誰かに預ける。
   * QR を読んでもらって渡す場合、相手が誰かは後から記録してもよい。
   */
  givePigeon: (
    pigeonId: string,
    contact?: { id: string; name: string }
  ) => void;
  /** 世話をする */
  feedPigeon: (pigeonId: string) => void;
  feedAll: () => void;
  addContact: (input: { name: string; emoji: string; place: Place }) => Contact;
  removeContact: (id: string) => void;
  /** 預かっている鳩に手紙を持たせて放つ */
  releaseLetter: (pigeonId: string, body: string) => Promise<SendResult>;
  receiveCode: (code: string) => Promise<ReceiveResult>;
  markRead: (letterId: string) => void;
  removeLetter: (letterId: string) => void;
  removePigeon: (pigeonId: string) => void;
  setSpeed: (kmh: number) => void;
  setNotify: (on: boolean) => void;
  previewFlight: (
    pigeon: Pigeon
  ) => { km: number; ms: number; loss: number } | null;
};

/** 巣箱の空き。手元にいる鳩だけが箱をふさぐ */
function freeNests(state: AppState, now: number): number {
  return LOFT_CAPACITY - pigeonsInMyCare(state.pigeons, state.letters, now).length;
}

const StoreContext = createContext<Store | null>(null);

/**
 * 時間が経ったぶんの帳尻を合わせる。
 * 世話が絶えた鳩は死に、預けた鳩は手紙とともに帰ってくる。
 */
function reconcile(state: AppState, now: number): AppState {
  let changed = false;

  const returning = new Map<string, number>();
  for (const letter of state.letters) {
    if (letter.direction !== 'inbound') continue;
    if (letterStatus(letter, now) !== 'arrived') continue;
    returning.set(letter.pigeonId, letter.arrivesAt);
  }

  const pigeons = state.pigeons.map((pigeon) => {
    let next = pigeon;

    // 預けていた自分の鳩が、手紙を持って帰ってきた
    const arrivedAt = returning.get(pigeon.id);
    if (arrivedAt !== undefined && next.mine && next.custody.kind === 'lent') {
      next = {
        ...next,
        custody: { kind: 'here' },
        // 長旅のあとなので、帰ってきた時点で腹を空かせている
        fedAt: Math.max(arrivedAt, now - CARE.hungry),
      };
      changed = true;
    }

    // 手元にいるのに世話が絶えた鳩
    if (
      next.diedAt === undefined &&
      next.custody.kind === 'here' &&
      now - next.fedAt >= CARE.death
    ) {
      next = { ...next, diedAt: next.fedAt + CARE.death };
      changed = true;
    }

    return next;
  });

  return changed ? { ...state, pigeons } : state;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    loadState().then((s) => {
      setState(reconcile(s, Date.now()));
      setLoaded(true);
    });
  }, []);

  // 起きているあいだも時間は進む
  useEffect(() => {
    if (!loaded) return;
    const timer = setInterval(() => {
      setState((s) => reconcile(s, Date.now()));
    }, 30000);
    return () => clearInterval(timer);
  }, [loaded]);

  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  const setMyName = useCallback((myName: string) => {
    setState((s) => ({
      ...s,
      myName,
      pigeons: s.pigeons.map((p) =>
        p.mine ? { ...p, ownerName: myName } : p
      ),
    }));
  }, []);

  const setHome = useCallback((home: Place) => {
    setState((s) => ({
      ...s,
      home,
      pigeons: s.pigeons.map((p) => (p.mine ? { ...p, loft: home } : p)),
    }));
  }, []);

  const scheduleCare = useCallback(
    async (pigeon: Pigeon): Promise<string | undefined> => {
      if (!stateRef.current.settings.notify) return undefined;
      return scheduleArrival(
        `${pigeon.name}が腹を空かせています`,
        '鳩舎をのぞいて、餌をやってください。',
        pigeon.fedAt + CARE.weak
      );
    },
    []
  );

  const takeInPigeon = useCallback((
    name?: string,
    seed?: { ownerName?: string; loft?: Place }
  ) => {
    const s = stateRef.current;
    const now = Date.now();
    if (freeNests(s, now) <= 0) return null;
    const taken = s.pigeons.map((p) => p.name);
    const fresh = PIGEON_NAMES.filter((n) => !taken.includes(n));
    const pigeon: Pigeon = {
      id: newId(),
      name: name?.trim() || pick(fresh.length > 0 ? fresh : PIGEON_NAMES),
      emoji: pick(PIGEON_EMOJI),
      variant: pick(PLUMAGES).id,
      takenInAt: now,
      mine: true,
      ownerName: seed?.ownerName ?? s.myName,
      loft: seed?.loft ?? s.home ?? { name: '鳩舎', lat: 0, lng: 0 },
      custody: { kind: 'here' },
      fedAt: now,
    };
    setState((prev) => ({ ...prev, pigeons: [...prev.pigeons, pigeon] }));
    scheduleCare(pigeon).then((id) => {
      if (!id) return;
      setState((prev) => ({
        ...prev,
        pigeons: prev.pigeons.map((p) =>
          p.id === pigeon.id ? { ...p, careNotificationId: id } : p
        ),
      }));
    });
    return pigeon;
  }, [scheduleCare]);

  const borrowPigeon = useCallback(
    (contactId: string, name: string, variant?: string) => {
      const s = stateRef.current;
      const contact = s.contacts.find((c) => c.id === contactId);
      const now = Date.now();
      if (!contact || freeNests(s, now) <= 0) return null;
      const pigeon: Pigeon = {
        id: newId(),
        name: name.trim() || '名のない鳩',
        emoji: pick(PIGEON_EMOJI),
        variant: variant || pick(PLUMAGES).id,
        takenInAt: now,
        mine: false,
        ownerName: contact.name,
        loft: contact.place,
        custody: { kind: 'here' },
        fedAt: now,
      };
      setState((prev) => ({ ...prev, pigeons: [...prev.pigeons, pigeon] }));
      return pigeon;
    },
    []
  );

  const givePigeon = useCallback(
    (pigeonId: string, contact?: { id: string; name: string }) => {
      const target = stateRef.current.pigeons.find((p) => p.id === pigeonId);
      cancelArrival(target?.careNotificationId);
      // すでに渡してある鳩に名前だけ付けるときは、渡した時刻を動かさない
      const at =
        target?.custody.kind === 'lent' ? target.custody.at : Date.now();
      setState((prev) => ({
        ...prev,
        pigeons: prev.pigeons.map((p) =>
          p.id === pigeonId
            ? {
                ...p,
                custody: {
                  kind: 'lent',
                  contactId: contact?.id,
                  contactName: contact?.name,
                  at,
                },
                careNotificationId: undefined,
              }
            : p
        ),
      }));
    },
    []
  );

  /** 世話をしたあとの通知を組み直す */
  const rescheduleCare = useCallback(
    (pigeons: Pigeon[]) => {
      for (const pigeon of pigeons) {
        cancelArrival(pigeon.careNotificationId);
        scheduleCare(pigeon).then((id) => {
          if (!id) return;
          setState((prev) => ({
            ...prev,
            pigeons: prev.pigeons.map((p) =>
              p.id === pigeon.id ? { ...p, careNotificationId: id } : p
            ),
          }));
        });
      }
    },
    [scheduleCare]
  );

  const feed = useCallback(
    (ids: string[]) => {
      const now = Date.now();
      const fed = stateRef.current.pigeons
        .filter(
          (p) =>
            ids.includes(p.id) &&
            p.diedAt === undefined &&
            p.custody.kind === 'here'
        )
        .map((p) => ({ ...p, fedAt: now, careNotificationId: undefined }));
      if (fed.length === 0) return;
      const byId = new Map(fed.map((p) => [p.id, p]));
      setState((s) => ({
        ...s,
        pigeons: s.pigeons.map((p) => byId.get(p.id) ?? p),
      }));
      rescheduleCare(fed);
    },
    [rescheduleCare]
  );

  const feedPigeon = useCallback((pigeonId: string) => feed([pigeonId]), [feed]);

  const feedAll = useCallback(() => {
    feed(
      stateRef.current.pigeons
        .filter((p) => p.custody.kind === 'here' && p.diedAt === undefined)
        .map((p) => p.id)
    );
  }, [feed]);

  const addContact = useCallback(
    (input: { name: string; emoji: string; place: Place }) => {
      const contact: Contact = { id: newId(), ...input };
      setState((s) => ({ ...s, contacts: [...s.contacts, contact] }));
      return contact;
    },
    []
  );

  const removeContact = useCallback((id: string) => {
    setState((s) => ({ ...s, contacts: s.contacts.filter((c) => c.id !== id) }));
  }, []);

  const previewFlight = useCallback((pigeon: Pigeon) => {
    const s = stateRef.current;
    if (!s.home) return null;
    const now = Date.now();
    const health = healthOf(pigeon, now);
    const km = distanceKm(s.home, pigeon.loft);
    return {
      km,
      ms: flightDurationMs(
        km,
        s.settings.speedKmh * SPEED_BY_HEALTH[health],
        1
      ),
      loss: lossChance(km, RISK_BY_HEALTH[health]),
    };
  }, []);

  const releaseLetter = useCallback(
    async (pigeonId: string, body: string): Promise<SendResult> => {
      const s = stateRef.current;
      const now = Date.now();
      const pigeon = releasablePigeons(s.pigeons, s.letters, now).find(
        (p) => p.id === pigeonId
      );
      if (!pigeon || !s.home) return { ok: false, reason: 'no-pigeon' };

      const health = healthOf(pigeon, now);
      const km = distanceKm(s.home, pigeon.loft);
      const condition = rollCondition() * SPEED_BY_HEALTH[health];
      const sentAt = now;
      const arrivesAt =
        sentAt + flightDurationMs(km, s.settings.speedKmh, condition);
      // 結末はここで決まる。あとから覆らない。
      const lostAt = rollLostAt(km, sentAt, arrivesAt, RISK_BY_HEALTH[health]);

      const contact = s.contacts.find((c) => c.name === pigeon.ownerName);

      const letter: Letter = {
        id: newId(),
        direction: 'outbound',
        peerName: pigeon.ownerName,
        peerEmoji: contact?.emoji ?? '🏡',
        pigeonId: pigeon.id,
        pigeonName: pigeon.name,
        pigeonEmoji: pigeon.emoji,
        pigeonVariant: pigeon.variant,
        from: s.home,
        to: pigeon.loft,
        body,
        distanceKm: km,
        sentAt,
        arrivesAt,
        lostAt,
        condition,
        ring: pick(RING_COLORS),
        read: true,
      };

      cancelArrival(pigeon.careNotificationId);

      let notificationId: string | undefined;
      if (s.settings.notify) {
        notificationId =
          lostAt === undefined
            ? await scheduleArrival(
                `${pigeon.name}が着きました`,
                `${pigeon.ownerName}さんの鳩舎に手紙が届きました。`,
                arrivesAt
              )
            : await scheduleArrival(
                `${pigeon.name}が戻りません`,
                `${pigeon.ownerName}さんへの手紙は届きませんでした。`,
                lostAt
              );
      }

      const stored = { ...letter, notificationId };
      setState((prev) => ({
        ...prev,
        letters: [stored, ...prev.letters],
        pigeons: prev.pigeons.map((p) =>
          p.id === pigeon.id ? { ...p, careNotificationId: undefined } : p
        ),
      }));
      return { ok: true, letter: stored };
    },
    []
  );

  const receiveCode = useCallback(
    async (code: string): Promise<ReceiveResult> => {
      const kind = codeKind(code);
      const s = stateRef.current;
      const now = Date.now();

      if (kind === 'pigeon') {
        const pigeon = decodePigeon(code, now);
        if (!pigeon) {
          return { ok: false, reason: 'この鳩コードは読み取れませんでした。' };
        }
        if (s.pigeons.some((p) => p.id === pigeon.id)) {
          return { ok: false, reason: 'この鳩はもう預かっています。' };
        }
        if (freeNests(s, now) <= 0) {
          return {
            ok: false,
            reason: `鳩舎の巣箱は${LOFT_CAPACITY}個です。空きがありません。`,
          };
        }
        setState((prev) => ({ ...prev, pigeons: [...prev.pigeons, pigeon] }));
        return { ok: true, kind: 'pigeon', pigeon };
      }

      if (kind === 'letter') {
        const decoded = decodeLetter(code);
        if (!decoded) {
          return { ok: false, reason: 'この手紙コードは読み取れませんでした。' };
        }
        if (s.letters.some((l) => l.id === decoded.id)) {
          return { ok: false, reason: 'この鳩はもう受け取っています。' };
        }
        let notificationId: string | undefined;
        if (s.settings.notify && decoded.lostAt === undefined) {
          notificationId = await scheduleArrival(
            `${decoded.pigeonName}が帰ってきます`,
            `${decoded.peerName}さんからの手紙が届きました。`,
            decoded.arrivesAt
          );
        }
        const letter = { ...decoded, notificationId };
        setState((prev) => ({ ...prev, letters: [letter, ...prev.letters] }));
        return { ok: true, kind: 'letter', letter };
      }

      return {
        ok: false,
        reason: 'DENSHOBATO で始まる文字列を貼り付けてください。',
      };
    },
    []
  );

  const markRead = useCallback((letterId: string) => {
    setState((s) => ({
      ...s,
      letters: s.letters.map((l) =>
        l.id === letterId ? { ...l, read: true } : l
      ),
    }));
  }, []);

  const removeLetter = useCallback((letterId: string) => {
    const target = stateRef.current.letters.find((l) => l.id === letterId);
    cancelArrival(target?.notificationId);
    setState((s) => ({
      ...s,
      letters: s.letters.filter((l) => l.id !== letterId),
    }));
  }, []);

  const removePigeon = useCallback((pigeonId: string) => {
    const target = stateRef.current.pigeons.find((p) => p.id === pigeonId);
    cancelArrival(target?.careNotificationId);
    setState((s) => ({
      ...s,
      pigeons: s.pigeons.filter((p) => p.id !== pigeonId),
    }));
  }, []);

  const setSpeed = useCallback((speedKmh: number) => {
    setState((s) => ({ ...s, settings: { ...s.settings, speedKmh } }));
  }, []);

  const setNotify = useCallback((notify: boolean) => {
    setState((s) => ({ ...s, settings: { ...s.settings, notify } }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      state,
      loaded,
      setMyName,
      setHome,
      takeInPigeon,
      borrowPigeon,
      givePigeon,
      feedPigeon,
      feedAll,
      addContact,
      removeContact,
      releaseLetter,
      receiveCode,
      markRead,
      removeLetter,
      removePigeon,
      setSpeed,
      setNotify,
      previewFlight,
      nestsFree: freeNests(state, Date.now()),
    }),
    [
      state,
      loaded,
      setMyName,
      setHome,
      takeInPigeon,
      borrowPigeon,
      givePigeon,
      feedPigeon,
      feedAll,
      addContact,
      removeContact,
      releaseLetter,
      receiveCode,
      markRead,
      removeLetter,
      removePigeon,
      setSpeed,
      setNotify,
      previewFlight,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('StoreProvider の中で使ってください');
  return ctx;
}
