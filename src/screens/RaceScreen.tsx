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
  TextInput,
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
  makeSeed,
  placed,
  placeLabel,
  pigeonToRacer,
  Racer,
  raceReadyAt,
  Result,
  runDuel,
  runRace,
} from '../race';
import { giftOf } from '../gift';
import { GradeBadge } from '../components/GiftPanel';
import { PigeonFlyer, PigeonMark } from '../pigeonArt';
import { radius, theme } from '../theme';
import { Button, Muted } from '../components/ui';
import { formatDuration } from '../geo';
import { QrView } from '../components/QrView';
import { copyOrShare } from '../clip';
import {
  Challenge,
  codeKind,
  decodeChallenge,
  encodeChallenge,
  RacePig,
} from '../pigeonCode';

const NATIVE = Platform.OS !== 'web';

type Phase = 'mode' | 'pick' | 'setup' | 'run' | 'done' | 'invite' | 'paste';

const courseById = (id: string): Course =>
  COURSES.find((c) => c.id === id) ?? COURSES[1];

/** 持ち運ぶ姿 → 走者（友達戦は天分だけで競う。なつきは乗せない） */
function racePigToRacer(pig: RacePig): Racer {
  return { id: pig.id, name: pig.name, variant: pig.variant, gift: pig.gift, bond: 0, mine: false };
}
function pigeonToRacePig(p: Pigeon): RacePig {
  return { id: p.id, name: p.name, variant: p.variant, gift: giftOf(p) };
}

export function RaceScreen({ onClose }: { onClose: () => void }) {
  const { state, recordRace } = useStore();
  const now = useNow(1000);

  const [phase, setPhase] = useState<Phase>('mode');
  const [entrantId, setEntrantId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course>(COURSES[1]);
  const [field, setField] = useState<Field>(FIELDS[0]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [recorded, setRecorded] = useState(false);
  // 友達戦のとき、この着順の中でどれが自分の鳩か（記録と色分けに使う）
  const [myRacerId, setMyRacerId] = useState<string | null>(null);
  const [friend, setFriend] = useState(false);
  // 挑戦を受けた側が、相手に返す結果コード
  const [replyCode, setReplyCode] = useState<string | null>(null);

  const entrants = useMemo(
    () =>
      pigeonsInMyCare(state.pigeons, state.letters, now).filter(
        (p) => p.mine && stageOf(p, now) === 'adult' && healthOf(p, now) === 'fine'
      ),
    [state.pigeons, state.letters, now]
  );

  const entrant = entrants.find((p) => p.id === entrantId) ?? null;

  // ひとりで（相手は野良鳩）
  const startSolo = () => {
    if (!entrant) return;
    setResults(runRace(pigeonToRacer(entrant), course, field));
    setMyRacerId(entrant.id);
    setFriend(false);
    setReplyCode(null);
    setRecorded(false);
    setPhase('run');
  };

  // 走り終えたら、自分の鳩のぶんを一度だけ書き留める
  useEffect(() => {
    if (phase === 'done' && results && myRacerId && !recorded) {
      const me = results.find((r) => r.id === myRacerId);
      if (me) recordRace(myRacerId, me.place);
      setRecorded(true);
    }
  }, [phase, results, myRacerId, recorded, recordRace]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.paper }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>鳩レース</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>とじる</Text>
          </Pressable>
        </View>

        {phase === 'mode' && (
          <ModePick
            onSolo={() => setPhase('pick')}
            onInvite={() => setPhase('invite')}
            onPaste={() => setPhase('paste')}
          />
        )}

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
            onStart={startSolo}
          />
        )}

        {phase === 'invite' && (
          <FriendInvite
            entrants={entrants}
            now={now}
            myName={state.myName}
            onReadReply={() => setPhase('paste')}
            onBack={() => setPhase('mode')}
          />
        )}

        {phase === 'paste' && (
          <FriendPaste
            entrants={entrants}
            now={now}
            myName={state.myName}
            onBack={() => setPhase('mode')}
            onRun={(res, myId, reply) => {
              setResults(res);
              setMyRacerId(myId);
              setFriend(true);
              setReplyCode(reply);
              setRecorded(false);
              setPhase('run');
            }}
          />
        )}

        {phase === 'run' && results && myRacerId && (
          <RunTrack
            results={results}
            entrantId={myRacerId}
            onDone={() => setPhase('done')}
          />
        )}

        {phase === 'done' && results && myRacerId && (
          <Results
            results={results}
            entrantId={myRacerId}
            field={friend ? null : field}
            replyCode={replyCode}
            onAgain={() => {
              setResults(null);
              setReplyCode(null);
              setPhase('mode');
            }}
            onClose={onClose}
          />
        )}
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------- 入口

function ModePick({
  onSolo,
  onInvite,
  onPaste,
}: {
  onSolo: () => void;
  onInvite: () => void;
  onPaste: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Muted style={{ marginBottom: 18 }}>
        放った鳩が鳩舎へ帰るまでの速さを競う、昔ながらの競技です。
        育てた天分が、ここで活きます。
      </Muted>
      <Button label="ひとりで競う（相手は野良鳩）" onPress={onSolo} />
      <Button
        label="友達に挑戦する"
        tone="quiet"
        onPress={onInvite}
        style={{ marginTop: 12 }}
      />
      <Button
        label="コードで競う（招待・結果を読む）"
        tone="quiet"
        onPress={onPaste}
        style={{ marginTop: 10 }}
      />
      <Muted style={{ marginTop: 16 }}>
        友達戦は、招待コードを送り合うだけ。中継所も要りません。同じ種と
        同じ二羽から、どちらの端末でも同じ勝敗になります。なつきは乗らず、
        天分だけの勝負です。
      </Muted>
    </ScrollView>
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
  replyCode,
  onAgain,
  onClose,
}: {
  results: Result[];
  entrantId: string;
  /** ひとり戦のときだけ。友達戦では null */
  field: Field | null;
  /** 挑戦を受けた側が、相手に返す結果コード */
  replyCode: string | null;
  onAgain: () => void;
  onClose: () => void;
}) {
  const me = results.find((r) => r.id === entrantId);
  const won = me ? placed(me.place) : false;
  const duel = field === null; // 友達との一騎打ち
  const [sent, setSent] = useState('');

  const sendReply = async () => {
    if (!replyCode) return;
    const how = await copyOrShare(replyCode, '伝書鳩レースの結果');
    setSent(
      how === 'copied'
        ? 'コピーしました。相手に送ってください。'
        : how === 'shared'
          ? '送りました。'
          : '下の文字を選んでコピーしてください。'
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {me && (
        <View style={styles.verdict}>
          <Text style={styles.verdictPlace}>
            {duel
              ? me.place === 1
                ? '勝ち　🏆'
                : '負け'
              : placeLabel(me.place)}
            {!duel && me.place === 1 ? '　🏆' : !duel && won ? '　🎗️' : ''}
          </Text>
          <Muted style={{ textAlign: 'center' }}>
            {duel
              ? me.place === 1
                ? '相手の鳩に競り勝ちました。'
                : '今回は競り負けました。走ったぶん、少しなつきました。'
              : me.place === 1
                ? `堂々の一着。${field.ribbon}を持ち帰りました。`
                : won
                  ? `入賞。${field.ribbon}を持ち帰りました。`
                  : '今回は届きませんでした。走ったぶん、少しなつきました。'}
          </Muted>
        </View>
      )}

      {replyCode && (
        <View style={styles.replyBox}>
          <Muted style={{ textAlign: 'center', marginBottom: 10 }}>
            この結果コードを相手に送ると、相手も同じ勝敗を見られます。
          </Muted>
          <QrView value={replyCode} size={180} />
          <Button
            label="結果コードを送る"
            onPress={sendReply}
            style={{ marginTop: 14, alignSelf: 'stretch' }}
          />
          {!!sent && <Text style={styles.sent}>{sent}</Text>}
          <Text selectable style={styles.code}>
            {replyCode}
          </Text>
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

// ---------------------------------------------------------------- 友達に挑戦

/** 自分の鳩を一羽選ぶ、小さな一覧 */
function EntrantList({
  entrants,
  now,
  selectedId,
  onSelect,
}: {
  entrants: Pigeon[];
  now: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (entrants.length === 0) {
    return (
      <Muted>
        いま出せる鳩がいません。元気な成鳥で、さっき走っていない鳩だけが
        出られます。
      </Muted>
    );
  }
  return (
    <>
      {entrants.map((p) => {
        const resting = raceReadyAt(p) > now;
        const on = selectedId === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => !resting && onSelect(p.id)}
            style={[styles.pick, on && styles.pickOn, resting && { opacity: 0.5 }]}
          >
            <PigeonMark variant={p.variant} size={30} />
            <View style={{ flex: 1 }}>
              <View style={styles.pickName}>
                <Text style={styles.name}>{p.name}</Text>
                <GradeBadge gift={giftOf(p)} />
              </View>
              <Muted>
                {resting
                  ? `休養中。あと ${formatDuration(raceReadyAt(p) - now)}`
                  : `翼 ${giftOf(p).wing}・心 ${giftOf(p).homing}・体 ${giftOf(p).grit}`}
              </Muted>
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

function FriendInvite({
  entrants,
  now,
  myName,
  onReadReply,
  onBack,
}: {
  entrants: Pigeon[];
  now: number;
  myName: string;
  onReadReply: () => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course>(COURSES[1]);
  const [code, setCode] = useState<string | null>(null);
  const [sent, setSent] = useState('');

  const entrant = entrants.find((p) => p.id === selectedId) ?? null;

  const make = () => {
    if (!entrant) return;
    const invite: Challenge = {
      kind: 'inv',
      seed: makeSeed(),
      course: course.id,
      from: { name: myName, pig: pigeonToRacePig(entrant) },
    };
    setCode(encodeChallenge(invite));
    setSent('');
  };

  const share = async () => {
    if (!code) return;
    const how = await copyOrShare(code, '伝書鳩レースの招待');
    setSent(
      how === 'copied'
        ? 'コピーしました。相手に送ってください。'
        : how === 'shared'
          ? '送りました。'
          : '下の文字を選んでコピーしてください。'
    );
  };

  if (code && entrant) {
    return (
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sub}>
          {entrant.name}で、{course.name}に挑戦状を出しました。
        </Text>
        <Muted style={{ marginBottom: 14 }}>
          この招待コードを相手に送り、「コードで競う」から読んでもらって
          ください。相手が返してきた結果コードを、下の「結果コードを読む」で
          読むと、同じ勝敗が見られます。
        </Muted>
        <View style={{ alignItems: 'center' }}>
          <QrView value={code} size={200} />
        </View>
        <Button
          label="招待コードを送る"
          onPress={share}
          style={{ marginTop: 16 }}
        />
        {!!sent && <Text style={styles.sent}>{sent}</Text>}
        <Text selectable style={styles.code}>
          {code}
        </Text>
        <Button
          label="結果コードを読む"
          tone="quiet"
          onPress={onReadReply}
          style={{ marginTop: 18 }}
        />
        <Button
          label="挑戦をやめる"
          tone="quiet"
          onPress={onBack}
          style={{ marginTop: 10 }}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.label}>出す鳩</Text>
      <EntrantList
        entrants={entrants}
        now={now}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <Text style={styles.label}>コース</Text>
      {COURSES.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => setCourse(c)}
          style={[styles.option, course.id === c.id && styles.optionOn]}
        >
          <Text style={styles.optionName}>{c.name}</Text>
          <Muted>{c.note}</Muted>
        </Pressable>
      ))}
      <Button
        label="招待状を作る"
        onPress={make}
        disabled={!entrant}
        style={{ marginTop: 20 }}
      />
      <Button label="戻る" tone="quiet" onPress={onBack} style={{ marginTop: 10 }} />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function FriendPaste({
  entrants,
  now,
  myName,
  onBack,
  onRun,
}: {
  entrants: Pigeon[];
  now: number;
  myName: string;
  onBack: () => void;
  onRun: (results: Result[], myRacerId: string, replyCode: string | null) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<Challenge | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const read = () => {
    setError('');
    const trimmed = text.trim();
    if (codeKind(trimmed) !== 'race') {
      setError('これはレースのコードではありません。');
      return;
    }
    const c = decodeChallenge(trimmed);
    if (!c) {
      setError('このコードは読み取れませんでした。');
      return;
    }
    if (c.kind === 'res') {
      // 自分が出した挑戦の結果。両方の鳩が入っているので、そのまま再現する
      if (!c.foe) {
        setError('この結果コードは欠けています。');
        return;
      }
      const results = runDuel(
        racePigToRacer(c.from.pig),
        racePigToRacer(c.foe.pig),
        courseById(c.course),
        c.seed
      );
      // 挑んだ側にとって、自分の鳩は from
      onRun(results, c.from.pig.id, null);
      return;
    }
    // 挑戦状。自分の鳩を選んで受けて立つ
    setInvite(c);
  };

  const accept = () => {
    if (!invite) return;
    const mine = entrants.find((p) => p.id === selectedId);
    if (!mine) return;
    const course = courseById(invite.course);
    const results = runDuel(
      racePigToRacer(invite.from.pig),
      racePigToRacer(pigeonToRacePig(mine)),
      course,
      invite.seed
    );
    // 相手に返す結果コード（両方の鳩入り）
    const reply = encodeChallenge({
      kind: 'res',
      seed: invite.seed,
      course: invite.course,
      from: invite.from,
      foe: { name: myName, pig: pigeonToRacePig(mine) },
    });
    onRun(results, mine.id, reply);
  };

  if (invite) {
    return (
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sub}>
          {invite.from.name}さんの挑戦
        </Text>
        <View style={styles.foeCard}>
          <PigeonMark variant={invite.from.pig.variant} size={34} />
          <View style={{ flex: 1 }}>
            <View style={styles.pickName}>
              <Text style={styles.name}>{invite.from.pig.name}</Text>
              <GradeBadge gift={invite.from.pig.gift} />
            </View>
            <Muted>
              {courseById(invite.course).name}・翼 {invite.from.pig.gift.wing}
              ・心 {invite.from.pig.gift.homing}・体 {invite.from.pig.gift.grit}
            </Muted>
          </View>
        </View>
        <Text style={styles.label}>受けて立つ鳩</Text>
        <EntrantList
          entrants={entrants}
          now={now}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <Button
          label="受けて立つ"
          onPress={accept}
          disabled={!selectedId}
          style={{ marginTop: 20 }}
        />
        <Button
          label="やめる"
          tone="quiet"
          onPress={onBack}
          style={{ marginTop: 10 }}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Muted style={{ marginBottom: 14 }}>
        相手から届いた招待コード、または結果コードを貼り付けてください。
      </Muted>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError('');
        }}
        placeholder="DENSHOBATO1R...."
        placeholderTextColor={theme.inkFaint}
        style={styles.paste}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        textAlignVertical="top"
      />
      {!!error && <Text style={styles.err}>{error}</Text>}
      <Button
        label="読む"
        onPress={read}
        disabled={text.trim().length === 0}
        style={{ marginTop: 14 }}
      />
      <Button label="戻る" tone="quiet" onPress={onBack} style={{ marginTop: 10 }} />
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
  sub: { fontSize: 16, color: theme.ink, fontWeight: '600', marginBottom: 8 },
  foeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: theme.paperDeep,
    borderRadius: radius.md,
    marginVertical: 12,
  },
  paste: {
    minHeight: 120,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 12,
    color: theme.ink,
  },
  err: { marginTop: 10, fontSize: 13, color: theme.accent },
  replyBox: {
    alignItems: 'center',
    backgroundColor: theme.paperDeep,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 18,
  },
  sent: { marginTop: 10, fontSize: 13, color: theme.good },
  code: {
    marginTop: 12,
    padding: 10,
    backgroundColor: theme.paper,
    borderRadius: radius.sm,
    fontSize: 10,
    color: theme.inkSoft,
    alignSelf: 'stretch',
  },
  rankName: { flex: 1, fontSize: 15, color: theme.ink },
  rankRibbon: { fontSize: 14 },
});
