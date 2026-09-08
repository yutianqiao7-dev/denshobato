import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

type Props = {
  progress: number;
  emoji: string;
  ring: string;
  fromName: string;
  toName: string;
  /** 戻らなかった鳩。進んだところで止まったまま */
  lost?: boolean;
};

/** 空の上を鳩が進んでいく帯 */
export function PigeonProgress({
  progress,
  emoji,
  ring,
  fromName,
  toName,
  lost,
}: Props) {
  const pct = Math.min(1, Math.max(0, progress));
  return (
    <View>
      <View style={styles.track}>
        <View
          style={[
            styles.flown,
            { width: `${pct * 100}%`, backgroundColor: lost ? theme.inkFaint : ring },
          ]}
        />
        <View style={[styles.bird, { left: `${pct * 100}%` }]}>
          <Text style={[styles.birdText, lost && styles.birdLost]}>
            {lost ? '·' : emoji}
          </Text>
        </View>
      </View>
      <View style={styles.labels}>
        <Text style={styles.label} numberOfLines={1}>
          {fromName}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {toName}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: theme.line,
    borderRadius: 2,
    marginTop: 18,
    marginBottom: 6,
    justifyContent: 'center',
  },
  flown: { height: 3, borderRadius: 2 },
  bird: {
    position: 'absolute',
    width: 28,
    marginLeft: -14,
    alignItems: 'center',
  },
  birdText: { fontSize: 18 },
  birdLost: { fontSize: 26, color: theme.inkFaint, lineHeight: 20 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: theme.inkFaint, fontSize: 12, maxWidth: '45%' },
});
