import React, { useState } from 'react';
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
import { useStore, ReceiveResult } from '../store';
import { radius, theme } from '../theme';
import { Button, Muted } from '../components/ui';

export type Received = Extract<ReceiveResult, { ok: true }>;

export function ReceiveScreen({
  visible,
  onClose,
  onReceived,
}: {
  visible: boolean;
  onClose: () => void;
  onReceived: (received: Received) => void;
}) {
  const { receiveCode } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setCode('');
    setError('');
    onClose();
  };

  const receive = async () => {
    setBusy(true);
    const result = await receiveCode(code);
    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setCode('');
    setError('');
    onReceived(result);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.paper }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>コードを受け取る</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Text style={styles.close}>閉じる</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <Muted style={{ marginBottom: 16 }}>
            相手から届いた文字列を、そのまま貼り付けてください。{'\n'}
            ・鳩コード … 相手の鳩を預かります。世話はあなたの仕事になります{'\n'}
            ・手紙コード … あなたの鳩が手紙を持って帰ってきます
          </Muted>
          <TextInput
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setError('');
            }}
            placeholder="DENSHOBATO1...."
            placeholderTextColor={theme.inkFaint}
            style={styles.input}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="top"
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button
            label="受け取る"
            onPress={receive}
            disabled={code.trim().length === 0 || busy}
            busy={busy}
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** 何かが起きたことを一言で伝える */
export function Notice({
  emoji,
  title,
  detail,
  onClose,
}: {
  emoji: string;
  title: string;
  detail: string;
  onClose: () => void;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.notice}>
          <Text style={styles.noticeEmoji}>{emoji}</Text>
          <Text style={styles.noticeTitle}>{title}</Text>
          <Muted style={{ textAlign: 'center', marginTop: 8 }}>{detail}</Muted>
          <Button label="わかった" onPress={onClose} style={{ marginTop: 22 }} />
        </View>
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
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.ink },
  close: { color: theme.accent, fontSize: 15 },
  body: { padding: 20 },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.sm,
    padding: 14,
    minHeight: 140,
    fontSize: 13,
    color: theme.ink,
    marginBottom: 12,
  },
  error: { color: '#A03E5B', fontSize: 13, marginBottom: 12 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,26,22,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  notice: {
    backgroundColor: theme.paper,
    borderRadius: radius.lg,
    padding: 26,
    width: '100%',
    alignItems: 'center',
  },
  noticeEmoji: { fontSize: 40, marginBottom: 10 },
  noticeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.ink,
    textAlign: 'center',
  },
});
