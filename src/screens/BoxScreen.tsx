import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { useNow } from '../useNow';
import { Letter } from '../types';
import { letterStatus } from '../flock';
import { radius, theme } from '../theme';
import { Empty } from '../components/ui';
import { LetterCard } from '../components/LetterCard';

type Tab = 'inbound' | 'outbound' | 'lost';

const TABS: [Tab, string][] = [
  ['inbound', '受け取った'],
  ['outbound', '送った'],
  ['lost', '戻らなかった'],
];

const EMPTY_TEXT: Record<Tab, string> = {
  inbound:
    '受け取った手紙はまだありません。\n預けた鳩が誰かに放たれると、\n手紙を持ってここへ帰ってきます。',
  outbound: '放った鳩が飼い主の鳩舎に着くと、ここに残ります。',
  lost: 'いまのところ、みんな無事に帰っています。',
};

export function BoxScreen({ onOpen }: { onOpen: (letter: Letter) => void }) {
  const { state } = useStore();
  const now = useNow(30000);
  const [tab, setTab] = useState<Tab>('inbound');

  const letters = useMemo(() => {
    const match = (l: Letter) => {
      const status = letterStatus(l, now);
      if (tab === 'lost') return status === 'lost';
      return status === 'arrived' && l.direction === tab;
    };
    return state.letters
      .filter(match)
      .sort(
        (a, b) => (b.lostAt ?? b.arrivesAt) - (a.lostAt ?? a.arrivesAt)
      );
  }, [state.letters, now, tab]);

  const unread = state.letters.filter(
    (l) =>
      l.direction === 'inbound' && letterStatus(l, now) === 'arrived' && !l.read
  ).length;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title}>文箱</Text>
      <Text style={styles.sub}>
        {unread > 0 ? `未開封の手紙が${unread}通` : '届いた手紙'}
      </Text>

      <View style={styles.tabs}>
        {TABS.map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {letters.length === 0 ? (
        <Empty emoji={tab === 'lost' ? '🍃' : '📮'} text={EMPTY_TEXT[tab]} />
      ) : (
        letters.map((letter) => (
          <LetterCard
            key={letter.id}
            letter={letter}
            now={now}
            onPress={() => onOpen(letter)}
          />
        ))
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingTop: 70 },
  title: { fontSize: 26, fontWeight: '700', color: theme.ink, letterSpacing: 4 },
  sub: { color: theme.inkFaint, fontSize: 13, marginTop: 6, marginBottom: 18 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
  },
  tabOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  tabText: { color: theme.inkSoft, fontSize: 13 },
  tabTextOn: { color: theme.paper },
});
