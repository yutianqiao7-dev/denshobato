export type Place = {
  name: string;
  lat: number;
  lng: number;
};

export type Contact = {
  id: string;
  name: string;
  emoji: string;
  /** その人の鳩舎。預かった鳩はここへ帰る */
  place: Place;
};

/**
 * 鳩がいまどこにいるか。
 * 鳩は自分の鳩舎にしか帰れないので、手紙を送るには
 * 「相手の鳩を預かって、それを放つ」しかない。
 */
export type Custody =
  /** 手元にいる。世話をするのは自分 */
  | { kind: 'here' }
  /** 誰かに預けてある。世話をするのは相手 */
  | { kind: 'lent'; contactId: string; contactName: string; at: number };

export type Pigeon = {
  id: string;
  name: string;
  emoji: string;
  takenInAt: number;
  /** 自分が育てた鳩か。false なら誰かから預かっている鳩 */
  mine: boolean;
  /** 飼い主の名前（表示用） */
  ownerName: string;
  /** 帰る場所 */
  loft: Place;
  custody: Custody;
  /** 最後に世話をした時刻。手元にいる間だけ意味を持つ */
  fedAt: number;
  /** 世話が絶えて死んだ時刻 */
  diedAt?: number;
  /** 世話を促す通知の id */
  careNotificationId?: string;
};

export type LetterDirection = 'outbound' | 'inbound';

export type Letter = {
  id: string;
  direction: LetterDirection;
  /** 宛先(outbound) または 差出人(inbound) の名前 */
  peerName: string;
  peerEmoji: string;
  /** 運んでいる鳩。outbound なら相手の鳩、inbound なら自分の鳩 */
  pigeonId: string;
  pigeonName: string;
  pigeonEmoji: string;
  /** 放った場所 */
  from: Place;
  /** 鳩が帰る場所 */
  to: Place;
  body: string;
  distanceKm: number;
  /** 放った時刻 (epoch ms) */
  sentAt: number;
  /** 到着予定時刻 (epoch ms) */
  arrivesAt: number;
  /**
   * この鳩が力尽きる時刻。放った瞬間に決まっていて、あとから変わらない。
   * 無事に着く鳩には入っていない。
   */
  lostAt?: number;
  /** 放ったときの調子。1.0 で平常、小さいほど遅い */
  condition: number;
  /** 足環の色 */
  ring: string;
  read: boolean;
  notificationId?: string;
};

export type Settings = {
  /** 鳩の巡航速度 (km/h) */
  speedKmh: number;
  notify: boolean;
};

export type AppState = {
  version: number;
  /** 差出人としての自分の名前 */
  myName: string;
  /** 自分の鳩舎。自分の鳩はここへ帰ってくる */
  home: Place | null;
  pigeons: Pigeon[];
  contacts: Contact[];
  letters: Letter[];
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  speedKmh: 80,
  notify: true,
};
