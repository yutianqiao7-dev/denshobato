import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { theme } from '../theme';

/** QR 一枚に詰め込める量には限りがある。長い手紙はここを超える */
const MAX_LENGTH = 2600;

/**
 * 鳩コード・手紙コードを QR にして見せる。
 * 相手はこれをカメラで読むだけでよく、長い文字列を貼り付けなくてすむ。
 */
export function QrView({ value, size = 220 }: { value: string; size?: number }) {
  if (value.length > MAX_LENGTH) {
    return (
      <View style={[styles.frame, styles.tooLong, { width: size + 28 }]}>
        <Text style={styles.tooLongText}>
          この手紙は長すぎて QR に入りません。{'\n'}
          下のボタンで、コードを文字のまま送ってください。
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.frame, { width: size + 28, height: size + 28 }]}>
      <QRCode
        value={value}
        size={size}
        color={theme.ink}
        backgroundColor="#FFFFFF"
        ecl="L"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
  },
  tooLong: {
    backgroundColor: theme.paperDeep,
    paddingVertical: 24,
    paddingHorizontal: 18,
  },
  tooLongText: {
    color: theme.inkSoft,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
});
