import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { useNow } from '../useNow';
import { Letter } from '../types';
import { letterStatus, releasablePigeons } from '../flock';
import { theme } from '../theme';
import { Button, Empty } from '../components/ui';
import { LetterCard } from '../components/LetterCard';

export function SkyScreen({
  onCompose,
  onOpen,
}: {
  onCompose: () => void;
  onOpen: (letter: Letter) => void;
}) {
  const { state } = useStore();
  const now = useNow(1000);

  const flying = useMemo(
    () =>
      state.letters
        .filter((l) => letterStatus(l, now) === 'flying')
        .sort((a, b) => a.arrivesAt - b.arrivesAt),
    [state.letters, now]
  );

  const notHanded = useMemo(
    () =>
      state.letters.filter(
        (l) =>
          l.direction === 'outbound' &&
          !l.handedOver &&
          letterStatus(l, now) !== 'lost'
      ).length,
    [state.letters, now]
  );

  const releasable = useMemo(
    () => releasablePigeons(state.pigeons, state.letters, now),
    [state.pigeons, state.letters, now]
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>空</Text>
        <Text style={styles.sub}>
          {flying.length > 0
            ? `${flying.length}羽が飛んでいます`
            : '飛んでいる鳩はいません'}
          {releasable.length > 0
            ? `・預かった鳩が${releasable.length}羽`
            : '・放てる鳩がいません'}
        </Text>
        {notHanded > 0 && (
          <Text style={styles.todo}>
            {notHanded}通、まだ相手に渡していません。手紙を開いて QR
            を読んでもらってください。
          </Text>
        )}

        {flying.length === 0 ? (
          <Empty
            emoji="☁️"
            text={
              '預かった鳩を放つと、その鳩は飼い主の鳩舎へ帰ります。\n遠い相手ほど、届くまでに時間がかかります。'
            }
          />
        ) : (
          flying.map((letter) => (
            <LetterCard
              key={letter.id}
              letter={letter}
              now={now}
              onPress={() => onOpen(letter)}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.fabWrap}>
        <Button label="手紙を書く" onPress={onCompose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingTop: 70 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.ink,
    letterSpacing: 4,
  },
  sub: { color: theme.inkFaint, fontSize: 13, marginTop: 6, marginBottom: 10 },
  todo: {
    color: theme.accent,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  fabWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
  },
});
