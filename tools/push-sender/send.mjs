/**
 * 時刻の来た知らせを押し出す。
 *
 * 中継所の wakes/ に「この時刻に、この端末を起こして」が置いてあるので、
 * 過ぎたものを拾って押し出し、片付ける。GitHub Actions から10分おきに走る。
 *
 *   RELAY_URL=... VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... node send.mjs
 *
 * --dry を付けると、押し出さずに何を送るつもりかだけ言う。
 */

import webpush from 'web-push';

const RELAY = (process.env.RELAY_URL || '').replace(/\/+$/, '');
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const DRY = process.argv.includes('--dry');

/** 送り先が消えていても、いつまでも残さない */
const STALE = 7 * 24 * 60 * 60 * 1000;

if (!RELAY || !PUBLIC_KEY || (!PRIVATE_KEY && !DRY)) {
  console.error('RELAY_URL と VAPID の鍵が要ります');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:denshobato@example.invalid',
  PUBLIC_KEY,
  PRIVATE_KEY || 'x'.repeat(43)
);

const now = Date.now();

async function shelf(path, init) {
  const res = await fetch(`${RELAY}/wakes${path}`, init);
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      '中継所が断りました。firebase-rules.json の wakes を、' +
        'Firebase コンソールの Realtime Database → ルール に貼ってください。'
    );
  }
  if (!res.ok) throw new Error(`中継所が ${res.status} を返しました`);
  return res;
}

/** 時刻の来たものだけ引く。at に索引を張ってある */
let due;
try {
  due = await (
    await shelf(`.json?orderBy=${encodeURIComponent('"at"')}&endAt=${now}`)
  ).json();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const rows = Object.entries(due ?? {});
if (rows.length === 0) {
  console.log('起こす相手はいません');
  process.exit(0);
}

let sent = 0;
let dropped = 0;

for (const [id, row] of rows) {
  if (!row || !row.endpoint || !row.p256dh || !row.auth) {
    if (!DRY) await shelf(`/${id}.json`, { method: 'DELETE' });
    dropped++;
    continue;
  }

  const label = `${row.title || '伝書鳩'} / ${row.body || ''}`;
  if (DRY) {
    console.log(`送るつもり: ${label}`);
    sent++;
    continue;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      JSON.stringify({
        title: row.title || '伝書鳩',
        body: row.body || '',
        tag: row.title || 'denshobato',
      })
    );
    await shelf(`/${id}.json`, { method: 'DELETE' });
    sent++;
    console.log(`押し出しました: ${label}`);
  } catch (e) {
    const code = e?.statusCode;
    // 404/410 はその端末がもういない。それ以外は次の回に持ち越す
    const gone = code === 404 || code === 410;
    const old = typeof row.at === 'number' && now - row.at > STALE;
    if (gone || old) {
      await shelf(`/${id}.json`, { method: 'DELETE' });
      dropped++;
      console.log(`宛先が消えていました(${code ?? '?'}): ${label}`);
    } else {
      console.log(`あとで出し直します(${code ?? e?.message}): ${label}`);
    }
  }
}

console.log(`押し出し ${sent} 件、片付け ${dropped} 件`);
