import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider, useStore } from './src/store';
import { Letter } from './src/types';
import { letterStatus } from './src/flock';
import { formatDateTime, formatDuration } from './src/geo';
import { theme } from './src/theme';
import { Onboarding } from './src/screens/Onboarding';
import { SkyScreen } from './src/screens/SkyScreen';
import { BoxScreen } from './src/screens/BoxScreen';
import { RoostScreen } from './src/screens/RoostScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ComposeScreen, Draft } from './src/screens/ComposeScreen';
import { LetterDetail } from './src/screens/LetterDetail';
import { Notice, Received, ReceiveScreen } from './src/screens/ReceiveScreen';
import { ConfirmHost } from './src/confirm';
import { flyAway, FlyAwayHost } from './src/flyaway';
import { PigeonMark, variantFor } from './src/pigeonArt';

type Tab = 'sky' | 'box' | 'roost' | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'sky', label: '空', icon: '🕊️' },
  { key: 'box', label: '文箱', icon: '📮' },
  { key: 'roost', label: '鳩舎', icon: '🏠' },
  { key: 'settings', label: '設定', icon: '⚙️' },
];

type NoticeState = { variant: string; title: string; detail: string };

function noticeForLetter(letter: Letter): NoticeState {
  const remaining = letter.arrivesAt - Date.now();
  const when =
    remaining > 0
      ? `あと ${formatDuration(remaining)}・${formatDateTime(
          letter.arrivesAt
        )} 着の予定`
      : 'まもなく着きます';
  return {
    variant: letter.pigeonVariant ?? variantFor(letter.pigeonId),
    title:
      letter.direction === 'inbound'
        ? `${letter.pigeonName}が帰ってきます`
        : `${letter.pigeonName}が飛び立ちました`,
    detail:
      letter.direction === 'inbound'
        ? `${letter.peerName}さんが放った、あなたの鳩です。${when}`
        : `${letter.peerName}さんの鳩舎へ向かっています。${when}`,
  };
}

function Main() {
  const { state, loaded } = useStore();
  const [tab, setTab] = useState<Tab>('sky');
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [open, setOpen] = useState<Letter | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const unread = useMemo(
    () =>
      state.letters.filter(
        (l) =>
          l.direction === 'inbound' &&
          letterStatus(l, Date.now()) === 'arrived' &&
          !l.read
      ).length,
    [state.letters]
  );

  if (!loaded) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!state.home) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <Onboarding />
      </View>
    );
  }

  const compose = (next: Draft | null) => {
    setDraft(next);
    setComposing(true);
  };

  const received = (result: Received) => {
    setReceiving(false);
    if (result.kind === 'letter') {
      setTab('sky');
      setNotice(noticeForLetter(result.letter));
    } else {
      setTab('roost');
      setNotice({
        variant: result.pigeon.variant,
        title: `${result.pigeon.name}を預かりました`,
        detail: `${result.pigeon.ownerName}さんの鳩です。世話をするのはあなた。放てば${result.pigeon.loft.name}へ帰ります。`,
      });
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        {tab === 'sky' && (
          <SkyScreen onCompose={() => compose(null)} onOpen={setOpen} />
        )}
        {tab === 'box' && <BoxScreen onOpen={setOpen} />}
        {tab === 'roost' && (
          <RoostScreen
            onWrite={(pigeonId) => compose({ body: '', pigeonId })}
            onReceive={() => setReceiving(true)}
          />
        )}
        {tab === 'settings' && <SettingsScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tab}>
              <View>
                <Text style={[styles.tabIcon, !on && styles.tabOff]}>
                  {t.icon}
                </Text>
                {t.key === 'box' && unread > 0 && <View style={styles.badge} />}
              </View>
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ComposeScreen
        visible={composing}
        draft={draft}
        onClose={() => {
          setComposing(false);
          setDraft(null);
        }}
        onSent={(letter) => {
          setComposing(false);
          setDraft(null);
          setTab('sky');
          // 放った鳩が飛び去るのを見せてから、行き先を知らせる
          flyAway(letter.pigeonVariant ?? variantFor(letter.pigeonId), () =>
            setNotice(noticeForLetter(letter))
          );
        }}
        onNeedPigeon={() => setTab('roost')}
      />

      <ReceiveScreen
        visible={receiving}
        onClose={() => setReceiving(false)}
        onReceived={received}
      />

      {open && (
        <LetterDetail
          letter={open}
          onClose={() => setOpen(null)}
          onRewrite={(letter) => {
            setOpen(null);
            compose({ body: letter.body });
          }}
        />
      )}

      <ConfirmHost />
      <FlyAwayHost />

      {notice && (
        <Notice
          mark={<PigeonMark variant={notice.variant} size={54} />}
          title={notice.title}
          detail={notice.detail}
          onClose={() => setNotice(null)}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Main />
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.line,
    backgroundColor: theme.card,
    paddingBottom: 22,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 20 },
  tabOff: { opacity: 0.45 },
  tabLabel: { fontSize: 11, color: theme.inkFaint },
  tabLabelOn: { color: theme.ink, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.accent,
  },
});
