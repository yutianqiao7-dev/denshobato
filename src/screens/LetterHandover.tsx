import React from 'react';
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
import { Letter } from '../types';
import { formatDateTime, formatDuration } from '../geo';
import { radius, theme } from '../theme';
import { Button, Muted } from '../components/ui';
import { QrView } from '../components/QrView';
import { encodeLetter } from '../pigeonCode';

/**
 * 放ったあとに、その手紙を相手へ渡すところ。
 * このアプリはサーバーを持たないので、ここで QR を読んでもらうまでは
 * 相手の端末にその手紙は存在しない。放ったら必ずここを通る。
 */
export function LetterHandover({
  letter,
  onClose,
}: {
  letter: Letter | null;
  onClose: () => void;
}) {
  const { state, markHandedOver } = useStore();
  if (!letter) return null;

  const code = encodeLetter(letter, state.myName);
  const remaining = letter.arrivesAt - Date.now();

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.paper }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {letter.pigeonName}が飛び立ちました
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>閉じる</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.lead}>この QR を相手に読んでもらう</Text>
          <Text style={styles.warn}>
            渡さないと、{letter.peerName}さんの端末には何も届きません。
          </Text>

          <QrView value={code} size={210} />

          <Muted style={{ marginTop: 16 }}>
            相手に「鳩舎 → 鳩を預かる」を開いてもらって、これを読んでもらってください。
            いま読んでもらってかまいません。中身は
            {remaining > 0
              ? `${formatDateTime(letter.arrivesAt)}（あと${formatDuration(
                  remaining
                )}）`
              : '到着時刻'}
            まで開きません。
          </Muted>

          <Button
            label="読んでもらった"
            onPress={() => {
              markHandedOver(letter.id);
              onClose();
            }}
            style={{ marginTop: 20 }}
          />
          <Button
            label="離れているので、コードを送る"
            tone="quiet"
            onPress={() =>
              Share.share({
                message: `${letter.pigeonName}がそちらへ向かっています。「伝書鳩」アプリで受け取ってください。\n\n${code}`,
              })
                .then(() => markHandedOver(letter.id))
                .catch(() => undefined)
            }
            style={{ marginTop: 10 }}
          />
          <Button
            label="あとで渡す"
            tone="quiet"
            onPress={onClose}
            style={{ marginTop: 10 }}
          />
          <Muted style={{ marginTop: 10 }}>
            あとから「空」や「文箱」でこの手紙を開けば、同じ QR を出せます。
          </Muted>
          <View style={{ height: 40 }} />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.ink,
    flex: 1,
  },
  close: { color: theme.accent, fontSize: 15 },
  lead: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.ink,
    marginBottom: 6,
  },
  warn: {
    fontSize: 14,
    color: theme.accent,
    marginBottom: 16,
    lineHeight: 21,
  },
  radius: { borderRadius: radius.sm },
});
