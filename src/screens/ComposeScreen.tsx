import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore } from '../store';
import { Letter } from '../types';
import {
  DAY_END_H,
  DAY_START_H,
  formatDistance,
  formatDuration,
  lossOdds,
} from '../geo';
import {
  healthOf,
  HEALTH_LABEL,
  releasablePigeons,
  RISK_BY_HEALTH,
} from '../flock';
import { radius, theme } from '../theme';
import { Button, Empty, Muted, SectionTitle } from '../components/ui';

export type Draft = { body: string; pigeonId?: string };

export function ComposeScreen({
  visible,
  draft,
  onClose,
  onSent,
  onNeedPigeon,
}: {
  visible: boolean;
  draft: Draft | null;
  onClose: () => void;
  onSent: (letter: Letter) => void;
  onNeedPigeon: () => void;
}) {
  const { state, releaseLetter, previewFlight } = useStore();
  const [pigeonId, setPigeonId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const flock = useMemo(
    () => releasablePigeons(state.pigeons, state.letters, Date.now()),
    [state.pigeons, state.letters]
  );

  useEffect(() => {
    if (!visible) return;
    if (draft) {
      setBody(draft.body);
      if (draft.pigeonId) setPigeonId(draft.pigeonId);
    }
  }, [visible, draft]);

  useEffect(() => {
    if (visible && !pigeonId && flock.length === 1) setPigeonId(flock[0].id);
  }, [visible, pigeonId, flock]);

  const pigeon = flock.find((p) => p.id === pigeonId);
  const health = pigeon ? healthOf(pigeon, Date.now()) : null;
  const preview = pigeon ? previewFlight(pigeon) : null;
  const canSend = !!pigeon && body.trim().length > 0 && !busy;

  const close = () => {
    setBody('');
    setPigeonId(null);
    onClose();
  };

  const send = async () => {
    if (!pigeon) return;
    setBusy(true);
    const result = await releaseLetter(pigeon.id, body.trim());
    setBusy(false);
    if (result.ok) {
      setBody('');
      setPigeonId(null);
      onSent(result.letter);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.paper }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>手紙を書く</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Text style={styles.close}>やめる</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {flock.length === 0 ? (
            <View>
              <Empty
                emoji="🪹"
                text={
                  '放てる鳩がいません。\n鳩は自分の鳩舎にしか帰れないので、\n手紙を送るには相手の鳩を預かる必要があります。'
                }
              />
              <Button
                label="鳩舎へ"
                tone="quiet"
                onPress={() => {
                  close();
                  onNeedPigeon();
                }}
              />
            </View>
          ) : (
            <>
              <SectionTitle>どの鳩に持たせる</SectionTitle>
              <View style={styles.chips}>
                {flock.map((p) => {
                  const on = p.id === pigeonId;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setPigeonId(p.id)}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {p.emoji} {p.name}
                      </Text>
                      <Text style={[styles.chipPlace, on && styles.chipTextOn]}>
                        {p.ownerName}さんの鳩・{p.loft.name}へ
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {pigeon && preview && health && (
                <View style={styles.preview}>
                  <Text style={styles.previewMain}>
                    {formatDistance(preview.km)} · およそ{' '}
                    {formatDuration(preview.ms)}
                  </Text>
                  <Muted>
                    {state.home?.name} で放つと、{pigeon.name}は
                    {pigeon.ownerName}さんの鳩舎（{pigeon.loft.name}）へ帰ります。
                  </Muted>
                  <Muted style={{ marginTop: 6 }}>
                    羽ばたくのは {formatDuration(preview.flyMs)} ぶん。
                    {DAY_START_H}時から{DAY_END_H}時までしか飛ばず、
                    夜は止まり木で休みます。空模様しだいで、これより遅れることもあります。
                  </Muted>
                  <Text style={styles.risk}>
                    この距離だと、{lossOdds(preview.km, RISK_BY_HEALTH[health])}
                    羽に1羽は帰り着きません。
                  </Text>
                  {health !== 'fine' && (
                    <Text style={styles.warn}>
                      {pigeon.name}は{HEALTH_LABEL[health]}。
                      このまま放つと遅くなり、帰れない見込みも上がります。
                    </Text>
                  )}
                </View>
              )}

              <SectionTitle>なにを</SectionTitle>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="いま書いたことが、着くころにはもう昔になっています。"
                placeholderTextColor={theme.inkFaint}
                style={styles.paper}
                multiline
                textAlignVertical="top"
              />

              <Button
                label={pigeon ? `${pigeon.name}を放つ` : '鳩を選んでください'}
                onPress={send}
                disabled={!canSend}
                busy={busy}
                style={{ marginTop: 20 }}
              />
            </>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.ink },
  close: { color: theme.accent, fontSize: 15 },
  body: { padding: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
  },
  chipOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  chipText: { color: theme.ink, fontSize: 15 },
  chipPlace: { color: theme.inkFaint, fontSize: 11, marginTop: 2 },
  chipTextOn: { color: theme.paper },
  preview: {
    marginTop: 16,
    padding: 14,
    borderRadius: radius.sm,
    backgroundColor: theme.paperDeep,
  },
  previewMain: {
    fontSize: 16,
    color: theme.ink,
    fontWeight: '600',
    marginBottom: 6,
  },
  risk: { marginTop: 8, fontSize: 13, color: theme.accent },
  warn: { marginTop: 8, fontSize: 13, color: '#A03E5B', lineHeight: 20 },
  paper: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.sm,
    padding: 16,
    minHeight: 200,
    fontSize: 16,
    lineHeight: 26,
    color: theme.ink,
  },
});
