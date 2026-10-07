import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useStore } from '../store';
import { useNow } from '../useNow';
import { Pigeon } from '../types';
import { healthOf, pigeonsInMyCare, stageOf } from '../flock';
import {
  Course,
  COURSES,
  Field,
  FIELDS,
  placed,
  placeLabel,
  pigeonToRacer,
  raceReadyAt,
  Result,
  runRace,
} from '../race';
import { giftOf } from '../gift';
import { GradeBadge } from '../components/GiftPanel';
import { PigeonFlyer, PigeonMark } from '../pigeonArt';
import { radius, theme } from '../theme';
import { Button, Muted } from '../components/ui';
import { formatDuration } from '../geo';

const NATIVE = Platform.OS !== 'web';

type Phase = 'pick' | 'setup' | 'run' | 'done';

export function RaceScreen({ onClose }: { onClose: () => void }) {
  const { state, recordRace } = useStore();
  const now = useNow(1000);

  const [phase, setPhase] = useState<Phase>('pick');
  const [entrantId, setEntrantId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course>(COURSES[1]);
  const [field, setField] = useState<Field>(FIELDS[0]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [recorded, setRecorded] = useState(false);

  // 出せるのは、自分の成鳥で、元気で、休み明けの鳩だけ
  const entrants = useMemo(
    () =>
      pigeonsInMyCare(state.pigeons, state.letters, now).filter(
        (p) =>
          p.mine &&
          stageOf(p, now) === 'adult' &&
          healthOf(p, now) === 'fine'
      ),
    [state.pigeons, state.letters, now]
  );

  const entrant = entrants.find((p) => p.id === entrantId) ?? null;

  const start = () => {
    if (!entrant) return;
    setResults(runRace(pigeonToRacer(entrant), course, field));
    setRecorded(false);
    setPhase('run');
  };

  // 走り終えたら一度だけ書き留める
  useEffect(() => {
    if (phase === 'done' && results && entrant && !recorded) {
      const me = results.find((r) => r.id === entrant.id);
      if (me) recordRace(entrant.id, me.place);
      setRecorded(true);
    }
  }, [phase, results, entrant, recorded, recordRace]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.paper }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>鳩レース</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>とじる</Text>
          </Pressable>
        </View>

        {phase === 'pick' && (
          <PickBird
            entrants={entrants}
            now={now}
            selectedId={entrantId}
            onSelect={setEntrantId}
            onNext={() => setPhase('setup')}
          />
        )}

        {phase === 'setup' && entrant && (
          <Setup
            entrant={entrant}
            course={course}
            field={field}
            onCourse={setCourse}
            onField={setField}
            onBack={() => setPhase('pick')}
            onStart={start}
          />
        )}

        {phase === 'run' && entrant && results && (
          <RunTrack
            results={results}
            entrantId={entrant.id}
            onDone={() => setPhase('done')}
          />
        )}

        {phase === 'done' && entrant && results && (
          <Results
            results={results}
            entrantId={entrant.id}
            field={field}
            onAgain={() => {
              setResults(null);
              setPhase('pick');
            }}
            onClose={onClose}
          />
        )}
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------- 鳩を選ぶ

function PickBird({
  entrants,
  now,
  selectedId,
  onSelect,
  onNext,
}: {
  entrants: Pigeon[];
  now: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Muted style={{ marginBottom: 14 }}>
        あなたの鳩を一羽、レースに出します。放った鳩が鳩舎へ帰るまでの
        速さを競う、昔ながらの競技です。元気な成鳥だけが出られます。
      </Muted>

      {entrants.length === 0 ? (
        <Muted>
          いま出せる鳩がいません。腹を空かせた鳩や、卵・雛、預かっている鳩、
          さっき走ったばかりの鳩は出られません。
        </Muted>
      ) : (
        entrants.map((p) => {
          const ready = raceReadyAt(p);
          const resting = ready > now;
          const on = selectedId === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => !resting && onSelect(p.id)}
              style={[
                styles.pick,
                on && styles.pickOn,
                resting && { opacity: 0.5 },
              ]}
            >
              <PigeonMark variant={p.variant} size={32} />
              <View style={{ flex: 1 }}>
                <View style={styles.pickName}>
                  <Text style={styles.name}>{p.name}</Text>
                  <GradeBadge gift={giftOf(p)} />
                  {(p.ribbons ?? 0) > 0 && (
                    <Text style={styles.ribbons}>
                      {'🎗️'.repeat(Math.min(5, p.ribbons ?? 0))}
                    </Text>
                  )}
                </View>
                <Muted>
                  {resting
                    ? `休養中。あと ${formatDuration(ready - now)} で出られます`
                    : `翼 ${giftOf(p).wing}・心 ${giftOf(p).homing}・体 ${giftOf(p).grit}`}
                </Muted>
              </View>
            </Pressable>
          );
        })
      )}

      <Button
        label="コースを選ぶ"
        onPress={onNext}
        disabled={!selectedId}
        style={{ marginTop: 20 }}
      />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------- コース・大会

function Setup({
  entrant,
  course,
  field,
  onCourse,
  onField,
  onBack,
  onStart,
}: {
  entrant: Pigeon;
  course: Course;
  field: Field;
  onCourse: (c: Course) => void;
  onField: (f: Field) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.entrantCard}>
        <PigeonMark variant={entrant.variant} size={40} />
        <View style={{ flex: 1 }}>
          <View style={styles.pickName}>
            <Text style={styles.name}>{entrant.name}</Text>
            <GradeBadge gift={giftOf(entrant)} />
          </View>
          <Muted>
            翼 {giftOf(entrant).wing}・心 {giftOf(entrant).homing}・体{' '}
            {giftOf(entrant).grit}
          </Muted>
        </View>
      </View>

      <Text style={styles.label}>コース</Text>
      {COURSES.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => onCourse(c)}
          style={[styles.option, course.id === c.id && styles.optionOn]}
        >
          <Text style={styles.optionName}>{c.name}</Text>
          <Muted>{c.note}</Muted>
        </Pressable>
      ))}

      <Text style={styles.label}>大会</Text>
      {FIELDS.map((f) => (
        <Pressable
          key={f.id}
          onPress={() => onField(f)}
          style={[styles.option, field.id === f.id && styles.optionOn]}
        >
          <Text style={styles.optionName}>{f.name}</Text>
          <Muted>入賞すると「{f.ribbon}」。強い大会ほど相手も手強い</Muted>
        </Pressable>
      ))}

      <Button label="出走する" onPress={onStart} style={{ marginTop: 22 }} />
      <Button
        label="鳩を選びなおす"
        tone="quiet"
        onPress={onBack}
        style={{ marginTop: 10 }}
      />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------- 走る

const RUN_MS = 3800;

function RunTrack({
  results,
  entrantId,
  onDone,
}: {
  results: Result[];
  entrantId: string;
  onDone: () => void;
}) {
  // 1 位を基準に、持ち時間の比で着順どおりに差がつくようにする
  const times = results.map((r) => r.time);
  const min = Math.min(...times);
  const max = Math.max(...times);

  const progresses = useRef(results.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      onDone();
    };

    const anims = results.map((r, i) => {
      // 速い鳩ほど短い時間でゴールに着く。最下位でも RUN_MS 内には収める
      const span = max - min || 1;
      const dur = RUN_MS * (0.72 + 0.28 * ((r.time - min) / span));
      return Animated.timing(progresses[i], {
        toValue: 1,
        duration: dur,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: NATIVE,
      });
    });
    anims.forEach((a) => a.start());

    // 画面が裏に回って描画が止まっても、結果へ進む
    const guard = setTimeout(finish, RUN_MS + 900);
    const timer = setTimeout(finish, RUN_MS + 300);
    return () => {
      clearTimeout(guard);
      clearTimeout(timer);
      progresses.forEach((p) => p.stopAnimation());
    };
  }, []);

  const lanes = results
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.name.localeCompare(b.r.name));

  return (
    <View style={styles.trackWrap}>
      <Text style={styles.runTitle}>放ちました</Text>
      <View style={styles.sky}>
        {lanes.map(({ r, i }) => {
          const mine = r.id === entrantId;
          const x = progresses[i].interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '86%'],
          });
          return (
            <View key={r.id} style={[styles.lane, mine && styles.laneMine]}>
              <Animated.View style={[styles.runner, { left: x }]}>
                <PigeonFlyer variant={r.variant} size={30} />
              </Animated.View>
              <View style={styles.goal} />
              {mine && <Text style={styles.youTag}>あなた</Text>}
            </View>
          );
        })}
      </View>
      <Muted style={{ textAlign: 'center', marginTop: 16 }}>
        鳩舎へ急いでいます…
      </Muted>
    </View>
  );
}

// ---------------------------------------------------------------- 結果

function Results({
  results,
  entrantId,
  field,
  onAgain,
  onClose,
}: {
  results: Result[];
  entrantId: string;
  field: Field;
  onAgain: () => void;
  onClose: () => void;
}) {
  const me = results.find((r) => r.id === entrantId);
  const won = me ? placed(me.place) : false;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {me && (
        <View style={styles.verdict}>
          <Text style={styles.verdictPlace}>
            {placeLabel(me.place)}
            {me.place === 1 ? '　🏆' : won ? '　🎗️' : ''}
          </Text>
          <Muted style={{ textAlign: 'center' }}>
            {me.place === 1
              ? `堂々の一着。${field.ribbon}を持ち帰りました。`
              : won
                ? `入賞。${field.ribbon}を持ち帰りました。`
                : '今回は届きませんでした。走ったぶん、少しなつきました。'}
          </Muted>
        </View>
      )}

      {results.map((r) => {
        const mine = r.id === entrantId;
        return (
          <View
            key={r.id}
            style={[styles.rankRow, mine && styles.rankRowMine]}
          >
            <Text style={[styles.rankPlace, r.place === 1 && styles.gold]}>
              {r.place}
            </Text>
            <PigeonMark variant={r.variant} size={24} />
            <Text style={[styles.rankName, mine && { fontWeight: '700' }]}>
              {r.name}
              {mine ? '（あなた）' : ''}
            </Text>
            {r.place <= 3 && <Text style={styles.rankRibbon}>🎗️</Text>}
          </View>
        );
      })}

      <Button label="もう一度" onPress={onAgain} style={{ marginTop: 22 }} />
      <Button
        label="鳩舎へ戻る"
        tone="quiet"
        onPress={onClose}
        style={{ marginTop: 10 }}
      />
      <View style={{ height: 40 }} />
    </ScrollView>
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
  body: { padding: 20 },
  name: { fontSize: 16, color: theme.ink, fontWeight: '600' },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.line,
    marginBottom: 10,
  },
  pickOn: { borderColor: theme.accent, backgroundColor: theme.paperDeep },
  pickName: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ribbons: { fontSize: 13 },
  entrantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: theme.paperDeep,
    borderRadius: radius.md,
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    color: theme.inkSoft,
    letterSpacing: 2,
    marginTop: 18,
    marginBottom: 8,
  },
  option: {
    padding: 14,
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.line,
    marginBottom: 8,
  },
  optionOn: { borderColor: theme.accent, backgroundColor: theme.paperDeep },
  optionName: { fontSize: 15, color: theme.ink, fontWeight: '600', marginBottom: 2 },

  trackWrap: { flex: 1, padding: 20, justifyContent: 'center' },
  runTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.ink,
    textAlign: 'center',
    marginBottom: 18,
  },
  sky: {
    backgroundColor: '#DCE8F0',
    borderRadius: radius.lg,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  lane: {
    height: 40,
    justifyContent: 'center',
    marginVertical: 2,
    marginHorizontal: 10,
  },
  laneMine: {
    backgroundColor: 'rgba(180,85,45,0.10)',
    borderRadius: 8,
  },
  runner: { position: 'absolute' },
  goal: {
    position: 'absolute',
    right: '12%',
    top: 2,
    bottom: 2,
    width: 2,
    backgroundColor: theme.accent,
    opacity: 0.5,
  },
  youTag: {
    position: 'absolute',
    right: 6,
    fontSize: 10,
    color: theme.accent,
  },

  verdict: { alignItems: 'center', marginBottom: 18 },
  verdictPlace: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.ink,
    marginBottom: 6,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
  },
  rankRowMine: { backgroundColor: theme.paperDeep, borderRadius: radius.sm },
  rankPlace: {
    width: 22,
    fontSize: 16,
    fontWeight: '700',
    color: theme.inkSoft,
    textAlign: 'center',
  },
  gold: { color: '#A9671B' },
  rankName: { flex: 1, fontSize: 15, color: theme.ink },
  rankRibbon: { fontSize: 14 },
});
