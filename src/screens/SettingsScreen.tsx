import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore } from '../store';
import { Place } from '../types';
import { AVATAR_EMOJI } from '../cities';
import { distanceKm, formatDistance } from '../geo';
import { radius, theme } from '../theme';
import { Button, Card, Muted, SectionTitle } from '../components/ui';
import { PlacePicker } from '../components/PlacePicker';
import { confirmDestructive } from '../confirm';

const SPEEDS = [40, 60, 80, 100, 120];

export function SettingsScreen() {
  const {
    state,
    setMyName,
    setHome,
    addContact,
    removeContact,
    setSpeed,
    setNotify,
  } = useStore();

  const [pickingHome, setPickingHome] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title}>設定</Text>
      <Text style={styles.sub}>あなたと、鳩を交わす相手のこと</Text>

      <SectionTitle>あなた</SectionTitle>
      <Card>
        <Text style={styles.label}>名前</Text>
        <TextInput
          value={state.myName}
          onChangeText={setMyName}
          placeholder="差出人の名前"
          placeholderTextColor={theme.inkFaint}
          style={styles.input}
          maxLength={24}
        />
        <Text style={[styles.label, { marginTop: 14 }]}>あなたの鳩舎</Text>
        <Pressable onPress={() => setPickingHome(true)} style={styles.rowPress}>
          <Text style={styles.rowValue}>{state.home?.name ?? '未設定'}</Text>
          <Text style={styles.rowArrow}>変える</Text>
        </Pressable>
        <Muted>あなたの鳩は、どこで放たれてもここへ帰ってきます。</Muted>
      </Card>

      <SectionTitle>鳩を交わす相手</SectionTitle>
      {state.contacts.map((c) => {
        const km = state.home ? distanceKm(state.home, c.place) : null;
        return (
          <Card key={c.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{c.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Muted>
                  鳩舎は{c.place.name}
                  {km !== null ? `・${formatDistance(km)}` : ''}
                </Muted>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  confirmDestructive(
                    '相手を消しますか',
                    `${c.name} を一覧から消します。預かっている鳩は残ります。`,
                    '消す',
                    () => removeContact(c.id)
                  )
                }
              >
                <Text style={styles.remove}>消す</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}
      <Button label="相手を足す" tone="quiet" onPress={() => setAdding(true)} />
      <Muted style={{ marginTop: 10 }}>
        相手の鳩舎の場所が、その人の鳩が帰る先になります。距離ぶんだけ時間がかかります。
      </Muted>

      <SectionTitle>飛び方</SectionTitle>
      <Card>
        <Text style={styles.label}>巡航速度</Text>
        <View style={styles.chips}>
          {SPEEDS.map((s) => {
            const on = state.settings.speedKmh === s;
            return (
              <Pressable
                key={s}
                onPress={() => setSpeed(s)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {s} km/h
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Muted style={{ marginTop: 10 }}>
          本物の伝書鳩はおよそ 80 km/h で飛びます。東京から大阪までなら 5 時間ほど。
          弱った鳩はもっと遅くなります。
        </Muted>
      </Card>
      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactName}>知らせる</Text>
            <Muted>鳩の到着と、餌が要るときに通知します。</Muted>
          </View>
          <Switch
            value={state.settings.notify}
            onValueChange={setNotify}
            trackColor={{ true: theme.accent }}
          />
        </View>
      </Card>

      <View style={{ height: 80 }} />

      <PlacePicker
        visible={pickingHome}
        title="あなたの鳩舎"
        onSelect={(p) => {
          setHome(p);
          setPickingHome(false);
        }}
        onClose={() => setPickingHome(false)}
      />
      <AddContact
        visible={adding}
        onClose={() => setAdding(false)}
        onAdd={(input) => {
          addContact(input);
          setAdding(false);
        }}
      />
    </ScrollView>
  );
}

function AddContact({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (input: { name: string; emoji: string; place: Place }) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(AVATAR_EMOJI[0]);
  const [place, setPlace] = useState<Place | null>(null);
  const [picking, setPicking] = useState(false);

  const submit = () => {
    if (!name.trim() || !place) return;
    onAdd({ name: name.trim(), emoji, place });
    setName('');
    setPlace(null);
    setEmoji(AVATAR_EMOJI[0]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.paper }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>相手を足す</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>やめる</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>名前</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="相手の名前"
            placeholderTextColor={theme.inkFaint}
            style={styles.input}
            maxLength={24}
          />
          <Text style={[styles.label, { marginTop: 18 }]}>目印</Text>
          <View style={styles.chips}>
            {AVATAR_EMOJI.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.chip, emoji === e && styles.chipOn]}
              >
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 18 }]}>相手の鳩舎</Text>
          <Button
            label={place ? place.name : '場所を選ぶ'}
            tone="quiet"
            onPress={() => setPicking(true)}
          />
          <Button
            label="この相手を足す"
            onPress={submit}
            disabled={!name.trim() || !place}
            style={{ marginTop: 26 }}
          />
        </ScrollView>
        <PlacePicker
          visible={picking}
          title="相手の鳩舎"
          onSelect={(p) => {
            setPlace(p);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingTop: 70 },
  title: { fontSize: 26, fontWeight: '700', color: theme.ink, letterSpacing: 4 },
  sub: { color: theme.inkFaint, fontSize: 13, marginTop: 6, marginBottom: 12 },
  label: {
    fontSize: 12,
    color: theme.inkSoft,
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.paper,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.ink,
  },
  rowPress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowValue: { fontSize: 16, color: theme.ink },
  rowArrow: { fontSize: 14, color: theme.accent },
  contactName: { fontSize: 16, color: theme.ink, fontWeight: '600' },
  remove: { color: '#A03E5B', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: theme.paper,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
  },
  chipOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  chipText: { color: theme.ink, fontSize: 14 },
  chipTextOn: { color: theme.paper },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
});
