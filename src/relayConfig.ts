/**
 * 鳩の中継所（Firebase Realtime Database）の住所。
 *
 * 空のままだと中継所を使わず、手紙は QR で手渡しになる。
 * 住所を入れると、放った手紙が相手の巣穴へ自動で届くようになる。
 *
 * 例: 'https://denshobato-default-rtdb.asia-southeast1.firebasedatabase.app'
 */
export const RELAY_URL = 'https://hato-d4898-default-rtdb.firebaseio.com';

/**
 * 押し出す側の公開鍵（VAPID）。
 *
 * これと対になる秘密鍵は、この置き場（GitHub）の Secrets に
 * VAPID_PRIVATE_KEY として預けてある。公開鍵のほうは、端末が
 * 「この送り手からの知らせだけ受ける」と決めるために使うので、
 * 人に見えてかまわない。
 *
 * 作り直すときは tools/push-sender で
 *   npx web-push generate-vapid-keys --json
 * を走らせて、公開鍵をここに、秘密鍵を Secrets に入れ直す。
 * 入れ替えると、いまの端末は登録し直しになる。
 */
export const VAPID_PUBLIC_KEY =
  'BLopaZx17kMljKWQ24O-PCZarN2c8D3YUM2PZsznTLz0Yc0M4A5Z6YFBa74mBBUTH1Wav9oXbozZRn2ToJXumKQ';
