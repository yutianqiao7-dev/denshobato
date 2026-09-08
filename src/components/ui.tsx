import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { radius, theme } from '../theme';

export function Button({
  label,
  onPress,
  tone = 'primary',
  disabled,
  busy,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'quiet' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
}) {
  const off = disabled || busy;
  const bg =
    tone === 'primary' ? theme.accent : tone === 'danger' ? '#00000000' : '#00000000';
  const fg =
    tone === 'primary' ? '#FFF9EF' : tone === 'danger' ? '#A03E5B' : theme.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: off ? 0.45 : pressed ? 0.8 : 1 },
        tone !== 'primary' && styles.buttonOutline,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.75 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Muted({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonOutline: { borderWidth: 1, borderColor: theme.line },
  buttonLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 1 },
  card: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.line,
    marginBottom: 12,
  },
  section: {
    fontSize: 13,
    color: theme.inkSoft,
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 8,
  },
  muted: { color: theme.inkSoft, fontSize: 13, lineHeight: 20 },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: {
    color: theme.inkFaint,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
