import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore } from '../store';
import { radius, theme } from '../theme';
import { Button, Muted } from '../components/ui';
import { copyOrShare } from '../clip';
import { peekBackup } from '../pigeonCode';
import { Notice } from './ReceiveScreen';
import { confirmDestructive } from '../confirm';

/** 鳩舎まるごとの控えを書き出す */
export function KeepBackup({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { state, backupCode } = useStore();
  const [code, setCode] = useState('');
  const [told, setTold] = useState('');

  useEffect(() => {
    if (visible) {
      setCode(backupCode());
      setTold('');
    }
  }, [visible, backupCode]);

  const alive = state.pigeons.filter((p) => p.diedAt === undefined).length;

  const hand = async () => {
    const how = await copyOrShare(code, '伝書鳩の控え');
    setTold(
      how === 'copied'
        ? 'コピーしました。メモなどに貼り付けて取っておいてください。'
        : how === 'shared'
        ? '送りました。自分宛てのメモに残しておいてください。'
        : 'この端末では渡せませんでした。下の文字を選んでコピーしてください。'
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.paper }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>鳩舎の控え</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>閉じる</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Muted>
            鳩{alive}羽・手紙{state.letters.length}通・相手
            {state.contacts.length}人が入っています。
            巣穴の住所も一緒なので、すでに渡してある鳩もそのまま帰ってきます。
          </Muted>
          <Button label="コピーする" onPress={hand} style={{ marginTop: 18 }} />
          {!!told && <Text style={styles.told}>{told}</Text>}
          <Text selectable style={styles.code}>
            {code}
          </Text>
          <Muted style={{ marginTop: 14 }}>
            この文字列には、あなたの鳩舎の座標も入っています。人に見せないでください。
          </Muted>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** 控えを入れ直す */
export function RestoreBackup({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { restoreBackup } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ pigeons: number; letters: number } | null>(
    null
  );

  useEffect(() => {
    if (visible) {
      setCode('');
      setError('');
      setDone(null);
    }
  }, [visible]);

  const peek = code.trim() ? peekBackup(code) : null;

  const submit = () => {
    const found = peekBackup(code);
    if (!found) {
      setError('この控えは読み取れませんでした。全部貼り付いているか確かめてください。');
      return;
    }
    confirmDestructive(
      'いまの鳩舎と入れ替えますか',
      `いまいる鳩も手紙も消えて、控えの中身（鳩${found.pigeons}羽・手紙${found.letters}通）になります。取り消せません。`,
      '入れ替える',
      () => {
        const result = restoreBackup(code);
        if (!result.ok) {
          setError(result.reason);
          return;
        }
        setDone({ pigeons: result.pigeons, letters: result.letters });
      }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.paper }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>控えから戻す</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>やめる</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Muted>
            書き出しておいた控えを貼り付けてください。
            いまの鳩舎は、控えの中身にまるごと入れ替わります。
          </Muted>
          <TextInput
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setError('');
            }}
            placeholder="DENSHOBATO1B...."
            placeholderTextColor={theme.inkFaint}
            style={[styles.input, styles.paste]}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="top"
          />
          {peek && (
            <Muted>
              {peek.myName || '名前なし'}さんの鳩舎（{peek.home ?? '場所なし'}）・鳩
              {peek.pigeons}羽・手紙{peek.letters}通
            </Muted>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button
            label="入れ替える"
            tone="danger"
            onPress={submit}
            disabled={code.trim().length === 0}
            style={{ marginTop: 16 }}
          />
        </ScrollView>
      </View>

      {done && (
        <Notice
          mark={<Text style={{ fontSize: 44 }}>🏠</Text>}
          title="鳩舎が戻りました"
          detail={`鳩${done.pigeons}羽と手紙${done.letters}通が入りました。`}
          onClose={onClose}
        />
      )}
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.ink },
  close: { color: theme.accent, fontSize: 15 },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.ink,
  },
  code: {
    marginTop: 14,
    padding: 12,
    backgroundColor: theme.paperDeep,
    borderRadius: radius.sm,
    fontSize: 11,
    lineHeight: 16,
    color: theme.inkSoft,
  },
  told: { marginTop: 12, fontSize: 13, color: theme.good },
  paste: { minHeight: 140, marginTop: 14, marginBottom: 10, fontSize: 12 },
  error: { marginTop: 10, fontSize: 13, color: theme.accent },
});
