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
  /**
   * 誰かに預けてある。世話をするのは相手。
   * QR を読んでもらって渡したときは、相手が誰かは分からないままでもよい。
   */
  | { kind: 'lent'; contactId?: string; contactName?: string; at: number };

export type Pigeon = {
  id: string;
  name: string;
  emoji: string;
  /** 羽色 (src/pigeonArt.tsx の PLUMAGES) */
  variant: string;
  takenInAt: number;
  /** 自分が育てた鳩か。false なら誰かから預かっている鳩 */
  mine: boolean;
  /** 飼い主の名前（表示用） */
  ownerName: string;
  /** 帰る場所 */
  loft: Place;
  custody: Custody;
  /**
   * この鳩の飼い主の巣穴の住所。鳩コードで渡ってくる。
   * これがあると、放った手紙は中継所を通って飼い主に自動で届く。
   */
  mailbox?: string;
  /** 最後に世話をした時刻。手元にいる間だけ意味を持つ */
  fedAt: number;
  /** 世話が絶えて死んだ時刻 */
  diedAt?: number;
  /** 誰の手元で死んだか。預かった鳩を看取った人の名前 */
  diedUnder?: string;
  /** 預かった鳩の訃報を、飼い主の巣穴に置き終えたか */
  deathReported?: boolean;
  /**
   * 卵が孵る時刻。迎えた鳩や預かった鳩には入っていない（最初から成鳥）。
   * これがある鳩は、卵 → 雛 → 成鳥 と育つ。
   */
  hatchesAt?: number;
  /** 雛が巣立つ時刻。ここを過ぎると手紙を運べる */
  fledgesAt?: number;
  /** 親の名前。血筋を辿るため */
  parents?: [string, string];
  /** 最後に卵を持った時刻。続けては産めない */
  bredAt?: number;
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
  /** 運んでいる鳩の羽色 */
  pigeonVariant?: string;
  /** 放った場所 */
  from: Place;
  /** 鳩が帰る場所 */
  to: Place;
  body: string;
  distanceKm: number;
  /** 放った時刻 (epoch ms) */
  sentAt: number;
  /** 到着予定時刻 (epoch ms)。夜の休みも織り込んだ実時刻 */
  arrivesAt: number;
  /** 実際に飛ぶ時間の総量。夜を挟むぶん、到着までの実時間はこれより長い */
  flyMs?: number;
  /** その旅の空模様 */
  weather?: string;
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
  /**
   * 放った手紙の QR を、相手に読んでもらったか。
   * これを渡すまで、相手の端末にはこの手紙が存在しない。
   */
  handedOver?: boolean;
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
  /** 自分の巣穴の住所。鳩を渡すときに相手へ伝わる */
  mailbox: string;
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
