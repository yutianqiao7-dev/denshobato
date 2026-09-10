import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore } from '../store';
import { Place } from '../types';
import { PIGEON_NAMES } from '../cities';
import { radius, theme } from '../theme';
import { Button, Muted } from '../components/ui';
import { PlacePicker } from '../components/PlacePicker';

export function Onboarding() {
  const { setMyName, setHome, takeInPigeon } = useStore();
  const [name, setName] = useState('');
  const [pigeonName, setPigeonName] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [picking, setPicking] = useState(false);
  const [suggestion] = useState(
    () => PIGEON_NAMES[Math.floor(Math.random() * PIGEON_NAMES.length)]
  );
  // つがいの相手。名前がぶつからないように選んでおく
  const [mateName] = useState(() => {
    const others = PIGEON_NAMES.filter((n) => n !== suggestion);
    return others[Math.floor(Math.random() * others.length)];
  });

  const done = name.trim().length > 0 && place !== null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.bird}>🕊️</Text>
        <Text style={styles.title}>伝書鳩</Text>
        <Muted style={styles.lead}>
          ここで書いた手紙は、すぐには届きません。{'\n'}
          鳩が飛んだぶんの時間をかけて、相手のもとへ向かいます。{'\n'}
          鳩は自分の鳩舎にしか帰りません。世話を怠れば死に、増やすには卵から育てます。
        </Muted>

        <Text style={styles.label}>あなたの名前</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="手紙の差出人として書かれます"
          placeholderTextColor={theme.inkFaint}
          style={styles.input}
          maxLength={24}
        />

        <Text style={styles.label}>はじめの一羽</Text>
        <TextInput
          value={pigeonName}
          onChangeText={setPigeonName}
          placeholder={`名前をつけてください（例: ${suggestion}）`}
          placeholderTextColor={theme.inkFaint}
          style={styles.input}
          maxLength={12}
        />

        <Text style={styles.label}>あなたの鳩舎</Text>
        <Button
          label={place ? `${place.name} に構える` : '場所を選ぶ'}
          tone="quiet"
          onPress={() => setPicking(true)}
        />

        <Button
          label="はじめる"
          onPress={() => {
            if (!place) return;
            setMyName(name.trim());
            // 鳩は卵からしか増えないので、はじめから二羽渡す
            takeInPigeon(pigeonName || suggestion, {
              ownerName: name.trim(),
              loft: place,
            });
            takeInPigeon(mateName === (pigeonName || suggestion) ? undefined : mateName, {
              ownerName: name.trim(),
              loft: place,
            });
            setHome(place);
          }}
          disabled={!done}
          style={{ marginTop: 28 }}
        />

        <PlacePicker
          visible={picking}
          title="あなたの鳩舎"
          onSelect={(p) => {
            setPlace(p);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 28, paddingTop: 90, flexGrow: 1, paddingBottom: 60 },
  bird: { fontSize: 52, textAlign: 'center' },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: theme.ink,
    textAlign: 'center',
    letterSpacing: 8,
    marginTop: 10,
  },
  lead: { textAlign: 'center', marginTop: 16, marginBottom: 30 },
  label: {
    fontSize: 13,
    color: theme.inkSoft,
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.ink,
  },
});
