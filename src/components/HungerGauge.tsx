import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pigeon } from '../types';
import {
  fullnessOf,
  Health,
  healthOf,
  HEALTH_LABEL,
  starvesAt,
} from '../flock';
import { formatDuration } from '../geo';
import { theme } from '../theme';

/** 満腹から空腹へ向かうにつれて、色も変わる */
export const HUNGER_COLOR: Record<Health, string> = {
  fine: '#5A8A44',
  hungry: '#C08A2E',
  weak: '#A8443F',
  dead: '#9C9081',
};

const pct = (v: number) => `${Math.round(v * 1000) / 10}%` as `${number}%`;

/**
 * 腹の減り具合。餌をやると満ち、放っておくと減っていく。
 * 空になった鳩は死ぬ。
 */
export function HungerGauge({
  pigeon,
  now,
  compact = false,
}: {
  pigeon: Pigeon;
  now: number;
  compact?: boolean;
}) {
  const health = healthOf(pigeon, now);
  const value = fullnessOf(pigeon, now);
  const left = starvesAt(pigeon) - now;
  const color = HUNGER_COLOR[health];

  return (
    <View style={compact ? styles.compact : styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.label, { color }]}>{HEALTH_LABEL[health]}</Text>
        {health !== 'dead' && (
          <Text style={styles.remain}>
            空になるまで {formatDuration(left)}
          </Text>
        )}
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: pct(value), backgroundColor: color }]}
        />
        {/* 腹が減りはじめる線と、弱りはじめる線 */}
        <View style={[styles.mark, { left: pct(0.75) }]} />
        <View style={[styles.mark, { left: pct(0.5) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  compact: { marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 5,
    gap: 8,
  },
  label: { fontSize: 13, fontWeight: '600' },
  remain: { fontSize: 11, color: theme.inkFaint },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.paperDeep,
    borderWidth: 1,
    borderColor: theme.line,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: { height: '100%', borderRadius: 3 },
  mark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
});
