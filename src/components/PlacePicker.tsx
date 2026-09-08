import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CITIES } from '../cities';
import { Place } from '../types';
import { radius, theme } from '../theme';
import { Button, Muted, SectionTitle } from './ui';

type Props = {
  visible: boolean;
  title: string;
  onSelect: (place: Place) => void;
  onClose: () => void;
};

export function PlacePicker({ visible, title, onSelect, onClose }: Props) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState('');

  const useCustom = () => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!name.trim()) return setError('場所の名前を入れてください。');
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90)
      return setError('緯度は -90〜90 の数字で。');
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180)
      return setError('経度は -180〜180 の数字で。');
    setError('');
    setName('');
    setLat('');
    setLng('');
    onSelect({ name: name.trim(), lat: latNum, lng: lngNum });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>閉じる</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          {CITIES.map((group) => (
            <View key={group.group} style={{ marginBottom: 18 }}>
              <SectionTitle>{group.group}</SectionTitle>
              <View style={styles.chips}>
                {group.places.map((place) => (
                  <Pressable
                    key={place.name}
                    onPress={() => onSelect(place)}
                    style={({ pressed }) => [
                      styles.chip,
                      pressed && { backgroundColor: theme.paperDeep },
                    ]}
                  >
                    <Text style={styles.chipText}>{place.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <SectionTitle>座標を直接入れる</SectionTitle>
          <Muted style={{ marginBottom: 10 }}>
            一覧にない場所は、地図アプリで調べた緯度・経度を入れてください。
          </Muted>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="場所の名前（例: 祖母の家）"
            placeholderTextColor={theme.inkFaint}
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={lat}
              onChangeText={setLat}
              placeholder="緯度 35.68"
              placeholderTextColor={theme.inkFaint}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={lng}
              onChangeText={setLng}
              placeholder="経度 139.76"
              placeholderTextColor={theme.inkFaint}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button label="この場所にする" onPress={useCustom} style={{ marginTop: 8 }} />
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.paper },
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
  chipText: { color: theme.ink, fontSize: 15 },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.ink,
    marginBottom: 10,
  },
  error: { color: '#A03E5B', fontSize: 13, marginBottom: 6 },
});
