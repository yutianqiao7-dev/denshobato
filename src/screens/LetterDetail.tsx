import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useStore } from '../store';
import { useNow } from '../useNow';
import { Letter } from '../types';
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  progressOf,
} from '../geo';
import { lastSeenAt, letterStatus } from '../flock';
import { radius, theme } from '../theme';
import { Button, Muted } from '../components/ui';
import { PigeonProgress } from '../components/PigeonProgress';
import { PigeonMark, variantFor } from '../pigeonArt';
import { encodeLetter } from '../pigeonCode';
import { confirmDestructive } from '../confirm';

export function LetterDetail({
  letter,
  onClose,
  onRewrite,
}: {
  letter: Letter | null;
  onClose: () => void;
  onRewrite: (letter: Letter) => void;
}) {
  const { state, markRead, removeLetter } = useStore();
  const now = useNow(1000);
  const [showCode, setShowCode] = useState(false);

  const live = letter
    ? state.letters.find((l) => l.id === letter.id) ?? letter
    : null;
  const status = live ? letterStatus(live, now) : 'flying';

  useEffect(() => {
    if (live && status === 'arrived' && !live.read) markRead(live.id);
  }, [live, status, markRead]);

  useEffect(() => {
    if (!letter) setShowCode(false);
  }, [letter]);

  if (!live) return null;

  const outbound = live.direction === 'outbound';
  const variant = live.pigeonVariant ?? variantFor(live.pigeonId);
  const code = encodeLetter(live, state.myName);
  const readable = outbound || status === 'arrived';

  const handoff = async () => {
    try {
      await Share.share({
        message: `${live.pigeonName}を放ちました。そちらの鳩舎へ向かっています。\nこの手紙コードを「伝書鳩」アプリで受け取ってください。\n\n${code}`,
      });
    } catch {
      setShowCode(true);
    }
  };

  const discard = () => {
    const flying = status === 'flying';
    confirmDestructive(
      flying ? '鳩を呼び戻しますか' : 'この記録を消しますか',
      'この手紙は消えます。取り消せません。',
      flying ? '呼び戻す' : '消す',
      () => {
        removeLetter(live.id);
        onClose();
      }
    );
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.paper }}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {outbound ? `${live.peerName} へ` : `${live.peerName} から`}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>閉じる</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.meta}>
            <Text style={styles.metaMain}>
              {live.from.name} → {live.to.name}
            </Text>
            <Muted>
              {formatDistance(live.distanceKm)}・{formatDateTime(live.sentAt)}発
            </Muted>
            <View style={styles.pigeonLine}>
              <PigeonMark variant={variant} size={26} />
              <Muted>
                {live.pigeonName}（
                {outbound ? `${live.peerName}さんの鳩` : 'あなたの鳩'}）
              </Muted>
            </View>
          </View>

          {status === 'flying' && (
            <View style={styles.flightBox}>
              <PigeonProgress
                progress={progressOf(live, now)}
                variant={variant}
                ring={live.ring}
                fromName={live.from.name}
                toName={live.to.name}
              />
              <Text style={styles.eta}>
                あと {formatDuration(live.arrivesAt - now)}
              </Text>
              <Muted>{formatDateTime(live.arrivesAt)} 着の予定</Muted>
            </View>
          )}

          {status === 'lost' && (
            <View style={styles.lostBox}>
              <PigeonProgress
                progress={progressOf(live, lastSeenAt(live, now))}
                variant={variant}
                ring={live.ring}
                fromName={live.from.name}
                toName={live.to.name}
                lost
              />
              <Text style={styles.lostTitle}>
                {live.pigeonName}は戻りませんでした
              </Text>
              <Muted>
                {formatDateTime(live.lostAt ?? live.sentAt)}、
                {live.to.name}まであと
                {Math.round(
                  (1 - progressOf(live, lastSeenAt(live, now))) *
                    live.distanceKm
                ).toLocaleString('ja-JP')}
                km のところで消息を絶ちました。
              </Muted>
            </View>
          )}

          {status === 'arrived' && (
            <Text style={styles.arrivedNote}>
              {formatDateTime(live.arrivesAt)} に着きました
            </Text>
          )}

          {readable ? (
            <View style={styles.paper}>
              <Text style={styles.letterBody}>{live.body}</Text>
              <Text style={styles.sign}>
                — {outbound ? state.myName || 'あなた' : live.peerName}
              </Text>
            </View>
          ) : (
            <View style={[styles.paper, styles.sealed]}>
              <Text style={styles.sealEmoji}>
                {status === 'lost' ? '🍃' : '✉️'}
              </Text>
              <Muted style={{ textAlign: 'center' }}>
                {status === 'lost'
                  ? 'この手紙に何が書いてあったのかは、\nもうわかりません。'
                  : '封は、鳩が着いてから開きます。'}
              </Muted>
            </View>
          )}

          {outbound && status === 'lost' && (
            <Button
              label="同じ文面で書き直す"
              tone="quiet"
              onPress={() => onRewrite(live)}
              style={{ marginTop: 24 }}
            />
          )}

          {outbound && status !== 'lost' && (
            <View style={{ marginTop: 24 }}>
              <Button
                label="手紙コードを相手に送る"
                tone="quiet"
                onPress={handoff}
              />
              <Muted style={{ marginTop: 10 }}>
                {live.pigeonName}は{live.peerName}さんの鳩なので、
                このコードを送ると相手の鳩舎へ帰り着きます。
                コード自体は今すぐ渡してかまいません。中身は到着まで開きません。
              </Muted>
              <Pressable onPress={() => setShowCode((v) => !v)}>
                <Text style={styles.link}>
                  {showCode ? 'コードを隠す' : 'コードを表示してコピーする'}
                </Text>
              </Pressable>
              {showCode && (
                <Text selectable style={styles.code}>
                  {code}
                </Text>
              )}
            </View>
          )}

          <Button
            label={
              status === 'flying' ? '鳩を呼び戻す' : 'この手紙を文箱から消す'
            }
            tone="danger"
            onPress={discard}
            style={{ marginTop: 28 }}
          />
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.ink, flex: 1 },
  close: { color: theme.accent, fontSize: 15 },
  body: { padding: 20 },
  meta: { marginBottom: 16 },
  metaMain: { fontSize: 15, color: theme.ink, marginBottom: 4 },
  pigeonLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  flightBox: {
    backgroundColor: theme.paperDeep,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 20,
  },
  lostBox: {
    backgroundColor: theme.paperDeep,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 20,
  },
  lostTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.ink,
    marginTop: 10,
    marginBottom: 4,
  },
  eta: { fontSize: 18, fontWeight: '600', color: theme.ink, marginTop: 8 },
  arrivedNote: { color: theme.good, fontSize: 14, marginBottom: 16 },
  paper: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.md,
    padding: 20,
    minHeight: 180,
  },
  sealed: { alignItems: 'center', justifyContent: 'center' },
  sealEmoji: { fontSize: 34, marginBottom: 12 },
  letterBody: { fontSize: 16, lineHeight: 28, color: theme.ink },
  sign: {
    marginTop: 24,
    textAlign: 'right',
    color: theme.inkSoft,
    fontSize: 14,
  },
  link: { color: theme.accent, fontSize: 14, marginTop: 14 },
  code: {
    marginTop: 10,
    padding: 12,
    backgroundColor: theme.paperDeep,
    borderRadius: radius.sm,
    fontSize: 11,
    color: theme.inkSoft,
  },
});
