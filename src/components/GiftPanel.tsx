import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pigeon } from '../types';
import {
  bondLabel,
  bondOf,
  Gift,
  giftOf,
  giftRatio,
  GIFT_LABEL,
  GIFT_NOTE,
  grade,
  stars,
} from '../gift';
import { radius, theme } from '../theme';

/** 格の札。血統の良し悪しをひと目で */
export function GradeBadge({ gift }: { gift: Gift }) {
  const g = grade(gift);
  const tint = GRADE_TINT[g.tier];
  return (
    <View style={[styles.badge, { backgroundColor: tint.bg }]}>
      <Text style={[styles.badgeText, { color: tint.ink }]}>{g.label}</Text>
    </View>
  );
}

const GRADE_TINT = [
  { bg: '#E7DFCE', ink: '#7A6F5C' }, // 凡
  { bg: '#DCE6D4', ink: '#4A6B3C' }, // 並
  { bg: '#CFE0E8', ink: '#2F6378' }, // 良
  { bg: '#E6DAF0', ink: '#6A4A8C' }, // 秀
  { bg: '#F3DFC4', ink: '#A9671B' }, // 逸
];

function GiftRow({ k, value }: { k: keyof Gift; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.key}>{GIFT_LABEL[k]}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${giftRatio(value) * 100}%` }]} />
      </View>
      <Text style={styles.stars}>{stars(value)}</Text>
    </View>
  );
}

/** 鳩一羽の天分となつき。詳しい札 */
export function GiftPanel({ pigeon }: { pigeon: Pigeon }) {
  const gift = giftOf(pigeon);
  const bond = bondLabel(pigeon);
  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>天分</Text>
        <GradeBadge gift={gift} />
      </View>
      <GiftRow k="wing" value={gift.wing} />
      <GiftRow k="homing" value={gift.homing} />
      <GiftRow k="grit" value={gift.grit} />
      <Text style={styles.note}>
        {GIFT_LABEL.wing}={GIFT_NOTE.wing.split('。')[0]}／
        {GIFT_LABEL.homing}={GIFT_NOTE.homing.split('。')[0]}／
        {GIFT_LABEL.grit}={GIFT_NOTE.grit.split('。')[0]}
      </Text>
      {bond && (
        <Text style={styles.bond}>
          なつき：{bond}
          {bondOf(pigeon) >= 30 ? '（もう離れない）' : ''}
        </Text>
      )}
      {(pigeon.ribbons ?? 0) > 0 && (
        <Text style={styles.ribbonLine}>
          レース入賞 {pigeon.ribbons}回 {'🎗️'.repeat(Math.min(5, pigeon.ribbons ?? 0))}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.paperDeep,
    borderRadius: radius.sm,
    padding: 12,
    marginTop: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 13, color: theme.inkSoft, letterSpacing: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  key: { width: 22, fontSize: 14, color: theme.ink, fontWeight: '600' },
  track: {
    flex: 1,
    height: 7,
    backgroundColor: theme.line,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  fill: { height: 7, backgroundColor: theme.accent, borderRadius: 4 },
  stars: { fontSize: 12, color: theme.accent, width: 64, textAlign: 'right' },
  note: { fontSize: 11, color: theme.inkFaint, marginTop: 8, lineHeight: 16 },
  bond: { fontSize: 13, color: theme.good, marginTop: 8, fontWeight: '600' },
  ribbonLine: { fontSize: 13, color: theme.accent, marginTop: 6 },
});
