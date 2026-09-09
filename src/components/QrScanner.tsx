import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { radius, theme } from '../theme';
import { Button, Muted } from './ui';

/**
 * カメラで QR を読む（iOS / Android）。
 * Web ではバーコード読み取りが使えないので、同名の .web.tsx が使われる。
 */
export function QrScanner({
  onRead,
  onCancel,
}: {
  onRead: (value: string) => void;
  onCancel: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [done, setDone] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Muted>カメラを確かめています…</Muted>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Muted style={{ textAlign: 'center', marginBottom: 16 }}>
          QR を読み取るのにカメラを使います。
        </Muted>
        <Button label="カメラを許可する" onPress={requestPermission} />
        <Button
          label="やめる"
          tone="quiet"
          onPress={onCancel}
          style={{ marginTop: 10 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.viewport}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            if (done) return;
            setDone(true);
            onRead(data);
          }}
        />
        <View pointerEvents="none" style={styles.reticle} />
      </View>
      <Text style={styles.hint}>相手の画面の QR を枠に入れてください</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  center: { alignItems: 'center', paddingVertical: 24 },
  viewport: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#1B1712',
  },
  reticle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: '14%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.sm,
  },
  hint: { color: theme.inkSoft, fontSize: 13, marginTop: 12 },
});
