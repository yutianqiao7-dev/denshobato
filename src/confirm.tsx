import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { radius, theme } from './theme';
import { Button, Muted } from './components/ui';

type Request = {
  title: string;
  message: string;
  label: string;
  onConfirm: () => void;
};

let show: ((request: Request) => void) | null = null;

/**
 * 取り返しのつかない操作の前に一度たずねる。
 * react-native-web の Alert は何もしない空実装で、ブラウザの confirm も
 * 埋め込み先によっては塞がれるので、自前で描く。
 */
export function confirmDestructive(
  title: string,
  message: string,
  label: string,
  onConfirm: () => void
): void {
  if (show) show({ title, message, label, onConfirm });
  else onConfirm();
}

/** アプリのどこかに一つ置いておく */
export function ConfirmHost() {
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    show = setRequest;
    return () => {
      show = null;
    };
  }, []);

  if (!request) return null;

  const close = () => setRequest(null);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{request.title}</Text>
          <Muted style={{ textAlign: 'center', marginTop: 8 }}>
            {request.message}
          </Muted>
          <Button
            label={request.label}
            tone="danger"
            onPress={() => {
              close();
              request.onConfirm();
            }}
            style={{ marginTop: 22, alignSelf: 'stretch' }}
          />
          <Button
            label="やめる"
            tone="quiet"
            onPress={close}
            style={{ marginTop: 10, alignSelf: 'stretch' }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,26,22,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  dialog: {
    backgroundColor: theme.paper,
    borderRadius: radius.lg,
    padding: 26,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.ink,
    textAlign: 'center',
  },
});
