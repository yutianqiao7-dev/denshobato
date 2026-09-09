import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Letter } from '../types';
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  progressOf,
} from '../geo';
import { lastSeenAt, letterStatus } from '../flock';
import { variantFor } from '../pigeonArt';
import { theme } from '../theme';
import { Card } from './ui';
import { PigeonProgress } from './PigeonProgress';

export function LetterCard({
  letter,
  now,
  onPress,
}: {
  letter: Letter;
  now: number;
  onPress: () => void;
}) {
  const status = letterStatus(letter, now);
  const variant = letter.pigeonVariant ?? variantFor(letter.pigeonId);
  const outbound = letter.direction === 'outbound';
  const heading = outbound ? `${letter.peerName} へ` : `${letter.peerName} から`;

  return (
    <Card onPress={onPress} style={status === 'lost' ? styles.lostCard : undefined}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading} numberOfLines={1}>
            {heading}
          </Text>
          <Text style={styles.sub}>
            {formatDistance(letter.distanceKm)}の空・{letter.pigeonName}
          </Text>
        </View>
        {status === 'arrived' && !letter.read && <View style={styles.unread} />}
      </View>

      {status === 'flying' && (
        <>
          <PigeonProgress
            progress={progressOf(letter, now)}
            variant={variant}
            ring={letter.ring}
            fromName={letter.from.name}
            toName={letter.to.name}
          />
          <Text style={styles.eta}>
            あと {formatDuration(letter.arrivesAt - now)}
            <Text style={styles.etaFaint}>
              {'  ·  '}
              {formatDateTime(letter.arrivesAt)}着
            </Text>
          </Text>
        </>
      )}

      {status === 'lost' && (
        <>
          <PigeonProgress
            progress={progressOf(
              letter,
              lastSeenAt(letter, now)
            )}
            variant={variant}
            ring={letter.ring}
            fromName={letter.from.name}
            toName={letter.to.name}
            lost
          />
          <Text style={styles.lostText}>
            {letter.pigeonName}は戻りませんでした
          </Text>
          <Text style={styles.etaFaint}>
            {formatDateTime(letter.lostAt ?? letter.sentAt)}に消息を絶ちました
          </Text>
        </>
      )}

      {status === 'arrived' && (
        <>
          <Text style={styles.snippet} numberOfLines={2}>
            {outbound || letter.read ? letter.body : '── まだ開いていない手紙 ──'}
          </Text>
          <Text style={styles.etaFaint}>
            {formatDateTime(letter.arrivesAt)} に届きました
          </Text>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  lostCard: { backgroundColor: theme.paperDeep, borderStyle: 'dashed' },
  heading: { fontSize: 17, fontWeight: '600', color: theme.ink },
  sub: { fontSize: 12, color: theme.inkFaint, marginTop: 3 },
  unread: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.accent,
    marginLeft: 8,
  },
  eta: { marginTop: 10, fontSize: 14, color: theme.ink },
  etaFaint: { fontSize: 12, color: theme.inkFaint, marginTop: 6 },
  lostText: { marginTop: 10, fontSize: 14, color: theme.inkSoft },
  snippet: {
    marginTop: 12,
    fontSize: 14,
    color: theme.inkSoft,
    lineHeight: 22,
  },
});
