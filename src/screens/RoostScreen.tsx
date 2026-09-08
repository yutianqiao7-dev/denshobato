import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore } from '../store';
import { Pigeon } from '../types';
import { PIGEON_EMOJI } from '../cities';
import { formatDateTime, formatDistance, formatDuration, distanceKm } from '../geo';
import {
  healthOf,
  HEALTH_LABEL,
  letterStatus,
  pigeonStatus,
  pigeonTrips,
  starvesAt,
  STATUS_LABEL,
} from '../flock';
import { useNow } from '../useNow';
import { radius, theme } from '../theme';
import { Button, Card, Empty, Muted, SectionTitle } from '../components/ui';
import { Loft } from '../components/Loft';
import { encodePigeon } from '../pigeonCode';
import { confirmDestructive } from '../confirm';

export function RoostScreen({
  onWrite,
  onReceive,
}: {
  onWrite: (pigeonId: string) => void;
  onReceive: () => void;
}) {
  const { state, takeInPigeon, feedPigeon, feedAll, removePigeon } = useStore();
  const now = useNow(15000);
  const [giving, setGiving] = useState<Pigeon | null>(null);
  const [borrowing, setBorrowing] = useState(false);
  const [acting, setActing] = useState<Pigeon | null>(null);

  const groups = useMemo(() => {
    const here: Pigeon[] = [];
    const lent: Pigeon[] = [];
    const flying: Pigeon[] = [];
    const gone: Pigeon[] = [];
    for (const p of state.pigeons) {
      const status = pigeonStatus(p, state.letters, now);
      if (status === 'here') here.push(p);
      else if (status === 'lent') lent.push(p);
      else if (status === 'flying') flying.push(p);
      else gone.push(p);
    }
    return { here, lent, flying, gone };
  }, [state.pigeons, state.letters, now]);

  const needsCare = groups.here.filter(
    (p) => healthOf(p, now) !== 'fine'
  ).length;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title}>鳩舎</Text>
      <Text style={styles.sub}>
        {groups.here.length > 0
          ? `${groups.here.length}羽が手元にいます`
          : '手元に鳩がいません'}
        {needsCare > 0 ? `・${needsCare}羽が世話を待っています` : ''}
      </Text>

      <Loft
        pigeons={groups.here}
        flying={groups.flying}
        letters={state.letters}
        now={now}
        onSelect={setActing}
      />

      {needsCare > 0 && (
        <Button
          label="みんなに世話をする"
          onPress={feedAll}
          style={{ marginBottom: 16 }}
        />
      )}

      <SectionTitle>手元の鳩</SectionTitle>
      {groups.here.length === 0 ? (
        <Empty
          emoji="🪹"
          text={'鳩舎は空です。\n新しい鳩を迎えるか、誰かの鳩を預かってください。'}
        />
      ) : (
        groups.here.map((p) => (
          <HerePigeon
            key={p.id}
            pigeon={p}
            now={now}
            homeName={state.home?.name}
            onFeed={() => feedPigeon(p.id)}
            onGive={() => setGiving(p)}
            onWrite={() => onWrite(p.id)}
          />
        ))
      )}

      <View style={styles.actions}>
        <Button
          label="新しい鳩を迎える"
          tone="quiet"
          onPress={() => takeInPigeon()}
          style={{ flex: 1 }}
        />
        <Button
          label="鳩を預かる"
          tone="quiet"
          onPress={() => setBorrowing(true)}
          style={{ flex: 1 }}
        />
      </View>
      <Muted style={{ marginTop: 10 }}>
        鳩は自分の鳩舎にしか帰れません。だから手紙を送るには、相手の鳩を預かって、
        それを放ちます。自分の鳩は相手に渡しておけば、いつか手紙を持って帰ってきます。
      </Muted>

      {groups.lent.length > 0 && (
        <>
          <SectionTitle>預けている鳩</SectionTitle>
          {groups.lent.map((p) => (
            <Card key={p.id}>
              <View style={styles.row}>
                <Text style={styles.emoji}>{p.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Muted>
                    {p.custody.kind === 'lent' ? p.custody.contactName : ''}
                    さんのところ・手紙を持って帰るのを待っています
                  </Muted>
                </View>
              </View>
              <Button
                label="鳩コードをもう一度渡す"
                tone="quiet"
                onPress={() => setGiving(p)}
                style={{ marginTop: 12 }}
              />
            </Card>
          ))}
        </>
      )}

      {groups.flying.length > 0 && (
        <>
          <SectionTitle>空の上</SectionTitle>
          {groups.flying.map((p) => {
            const letter = state.letters.find(
              (l) => l.pigeonId === p.id && letterStatus(l, now) === 'flying'
            );
            return (
              <Card key={p.id}>
                <View style={styles.row}>
                  <Text style={styles.emoji}>{p.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.name}</Text>
                    <Muted>
                      {letter
                        ? `${letter.to.name}へ・あと${formatDuration(
                            letter.arrivesAt - now
                          )}`
                        : '空の上'}
                    </Muted>
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      )}

      {groups.gone.length > 0 && (
        <>
          <SectionTitle>もういない鳩</SectionTitle>
          {groups.gone.map((p) => {
            const status = pigeonStatus(p, state.letters, now);
            return (
              <Card key={p.id} style={styles.goneCard}>
                <View style={styles.row}>
                  <Text style={[styles.emoji, styles.faded]}>{p.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.name}</Text>
                    <Muted>
                      {STATUS_LABEL[status]}
                      {p.diedAt !== undefined
                        ? `・${formatDateTime(p.diedAt)}`
                        : ''}
                      ・{pigeonTrips(p, state.letters, now)}回運びました
                    </Muted>
                  </View>
                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      confirmDestructive(
                        '記録から消しますか',
                        `${p.name}の記録が消えます。`,
                        '消す',
                        () => removePigeon(p.id)
                      )
                    }
                  >
                    <Text style={styles.remove}>消す</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </>
      )}

      <SectionTitle>受け取る</SectionTitle>
      <Button label="コードを貼り付ける" tone="quiet" onPress={onReceive} />
      <Muted style={{ marginTop: 10 }}>
        相手が渡してきた鳩コード（鳩を預かる）も、放たれた鳩の手紙コードも、
        同じところに貼り付けてください。
      </Muted>

      <View style={{ height: 80 }} />

      <PigeonActions
        pigeon={acting}
        now={now}
        onClose={() => setActing(null)}
        onFeed={() => {
          if (acting) feedPigeon(acting.id);
          setActing(null);
        }}
        onGive={() => {
          const target = acting;
          setActing(null);
          setGiving(target);
        }}
        onWrite={() => {
          const target = acting;
          setActing(null);
          if (target) onWrite(target.id);
        }}
      />
      <GivePigeon
        pigeon={giving}
        onClose={() => setGiving(null)}
      />
      <BorrowPigeon visible={borrowing} onClose={() => setBorrowing(false)} />
    </ScrollView>
  );
}

function HerePigeon({
  pigeon,
  now,
  homeName,
  onFeed,
  onGive,
  onWrite,
}: {
  pigeon: Pigeon;
  now: number;
  homeName?: string;
  onFeed: () => void;
  onGive: () => void;
  onWrite: () => void;
}) {
  const health = healthOf(pigeon, now);
  const left = starvesAt(pigeon) - now;

  return (
    <Card style={health === 'weak' ? styles.weakCard : undefined}>
      <View style={styles.row}>
        <Text style={styles.emoji}>{pigeon.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{pigeon.name}</Text>
          <Muted>
            {pigeon.mine
              ? `あなたの鳩・${homeName ?? '鳩舎'}へ帰ります`
              : `${pigeon.ownerName}さんの鳩・${pigeon.loft.name}へ帰ります`}
          </Muted>
        </View>
      </View>

      <Text
        style={[
          styles.health,
          health === 'fine' ? styles.healthFine : styles.healthBad,
        ]}
      >
        {HEALTH_LABEL[health]}
        {health === 'fine'
          ? now - pigeon.fedAt < 60000
            ? '・世話をしたところ'
            : `・最後の世話から${formatDuration(now - pigeon.fedAt)}`
          : `・あと${formatDuration(left)}で死んでしまいます`}
      </Text>

      <View style={styles.actions}>
        <Button label="世話をする" tone="quiet" onPress={onFeed} style={{ flex: 1 }} />
        {pigeon.mine ? (
          <Button label="誰かに渡す" tone="quiet" onPress={onGive} style={{ flex: 1 }} />
        ) : (
          <Button
            label="手紙を持たせる"
            tone="quiet"
            onPress={onWrite}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </Card>
  );
}

/** 小屋の鳩をつついたときに開く、その一羽の手当て */
function PigeonActions({
  pigeon,
  now,
  onClose,
  onFeed,
  onGive,
  onWrite,
}: {
  pigeon: Pigeon | null;
  now: number;
  onClose: () => void;
  onFeed: () => void;
  onGive: () => void;
  onWrite: () => void;
}) {
  if (!pigeon) return null;
  const health = healthOf(pigeon, now);
  const left = starvesAt(pigeon) - now;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetEmoji}>{pigeon.emoji}</Text>
          <Text style={styles.sheetName}>{pigeon.name}</Text>
          <Muted style={{ textAlign: 'center', marginTop: 4 }}>
            {pigeon.mine
              ? 'あなたの鳩'
              : `${pigeon.ownerName}さんの鳩・${pigeon.loft.name}へ帰ります`}
          </Muted>
          <Text
            style={[
              styles.health,
              health === 'fine' ? styles.healthFine : styles.healthBad,
              { textAlign: 'center' },
            ]}
          >
            {HEALTH_LABEL[health]}
            {health === 'fine'
              ? ''
              : `・あと${formatDuration(left)}で死んでしまいます`}
          </Text>

          <Button
            label="世話をする"
            onPress={onFeed}
            style={{ marginTop: 20, alignSelf: 'stretch' }}
          />
          <Button
            label={pigeon.mine ? '誰かに渡す' : '手紙を持たせる'}
            tone="quiet"
            onPress={pigeon.mine ? onGive : onWrite}
            style={{ marginTop: 10, alignSelf: 'stretch' }}
          />
          <Button
            label="閉じる"
            tone="quiet"
            onPress={onClose}
            style={{ marginTop: 10, alignSelf: 'stretch' }}
          />
        </View>
      </View>
    </Modal>
  );
}

/** 自分の鳩を誰かに渡す */
function GivePigeon({
  pigeon,
  onClose,
}: {
  pigeon: Pigeon | null;
  onClose: () => void;
}) {
  const { state, givePigeon } = useStore();
  const [code, setCode] = useState<string | null>(null);

  if (!pigeon) return null;

  const alreadyLent = pigeon.custody.kind === 'lent';

  const give = (contactId: string) => {
    givePigeon(pigeon.id, contactId);
    setCode(encodePigeon(pigeon, state.myName));
  };

  const close = () => {
    setCode(null);
    onClose();
  };

  const shown = code ?? (alreadyLent ? encodePigeon(pigeon, state.myName) : null);

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: theme.paper }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{pigeon.name}を渡す</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Text style={styles.close}>閉じる</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {shown === null ? (
            <>
              <Muted style={{ marginBottom: 16 }}>
                渡した鳩は相手の手元で暮らします。世話をするのも相手です。
                相手がこの鳩を放つと、手紙を持ってあなたの鳩舎へ帰ってきます。
              </Muted>
              <SectionTitle>誰に渡す</SectionTitle>
              {state.contacts.length === 0 ? (
                <Muted>
                  先に「設定」で相手を登録してください。
                </Muted>
              ) : (
                <View style={styles.chips}>
                  {state.contacts.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => give(c.id)}
                      style={styles.chip}
                    >
                      <Text style={styles.chipText}>
                        {c.emoji} {c.name}
                      </Text>
                      <Text style={styles.chipPlace}>{c.place.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.handTitle}>
                {pigeon.name}を手渡してください
              </Text>
              <Muted style={{ marginBottom: 16 }}>
                この鳩コードを相手に送ると、相手のアプリに{pigeon.name}が移ります。
                実際に会って渡すつもりで。
              </Muted>
              <Button
                label="鳩コードを送る"
                onPress={() =>
                  Share.share({
                    message: `${pigeon.name}を預けます。「伝書鳩」アプリで受け取ってください。\n\n${shown}`,
                  }).catch(() => undefined)
                }
              />
              <Text selectable style={styles.code}>
                {shown}
              </Text>
              <Button label="閉じる" tone="quiet" onPress={close} />
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/** 相手の鳩を預かったことにする（手渡しの記録） */
function BorrowPigeon({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { state, borrowPigeon } = useStore();
  const [contactId, setContactId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(PIGEON_EMOJI[0]);

  const contact = state.contacts.find((c) => c.id === contactId);

  const submit = () => {
    if (!contactId) return;
    borrowPigeon(contactId, name, emoji);
    setContactId(null);
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.paper }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>鳩を預かる</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>やめる</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Muted style={{ marginBottom: 16 }}>
            相手から鳩コードをもらっているなら「受け取る」から貼り付けてください。
            直接手渡しで受け取ったときは、ここに書き留めます。
          </Muted>

          <SectionTitle>誰の鳩</SectionTitle>
          {state.contacts.length === 0 ? (
            <Muted>先に「設定」で相手を登録してください。</Muted>
          ) : (
            <View style={styles.chips}>
              {state.contacts.map((c) => {
                const on = c.id === contactId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setContactId(c.id)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {c.emoji} {c.name}
                    </Text>
                    <Text style={[styles.chipPlace, on && styles.chipTextOn]}>
                      {c.place.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {contact && (
            <Muted style={{ marginTop: 12 }}>
              この鳩は{contact.place.name}へ帰ります。
              {state.home
                ? `ここから ${formatDistance(
                    distanceKm(state.home, contact.place)
                  )}。`
                : ''}
            </Muted>
          )}

          <Text style={styles.label}>鳩の名前</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="相手がつけた名前"
            placeholderTextColor={theme.inkFaint}
            style={styles.input}
            maxLength={12}
          />

          <Text style={styles.label}>見た目</Text>
          <View style={styles.chips}>
            {PIGEON_EMOJI.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.chip, emoji === e && styles.chipOn]}
              >
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Button
            label="この鳩を預かる"
            onPress={submit}
            disabled={!contactId}
            style={{ marginTop: 26 }}
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingTop: 70 },
  title: { fontSize: 26, fontWeight: '700', color: theme.ink, letterSpacing: 4 },
  sub: { color: theme.inkFaint, fontSize: 13, marginTop: 6, marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 24, marginRight: 12 },
  faded: { opacity: 0.35 },
  name: { fontSize: 16, color: theme.ink, fontWeight: '600' },
  health: { fontSize: 13, marginTop: 12 },
  healthFine: { color: theme.good },
  healthBad: { color: '#A03E5B' },
  weakCard: { borderColor: '#A03E5B' },
  goneCard: { backgroundColor: theme.paperDeep, borderStyle: 'dashed' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  remove: { color: '#A03E5B', fontSize: 13 },
  label: {
    fontSize: 12,
    color: theme.inkSoft,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 18,
  },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
  },
  chipOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  chipText: { color: theme.ink, fontSize: 15 },
  chipPlace: { color: theme.inkFaint, fontSize: 11, marginTop: 2 },
  chipTextOn: { color: theme.paper },
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
  handTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.ink,
    marginBottom: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,26,22,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  sheet: {
    backgroundColor: theme.paper,
    borderRadius: radius.lg,
    padding: 26,
    width: '100%',
    alignItems: 'center',
  },
  sheetEmoji: { fontSize: 40 },
  sheetName: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.ink,
    marginTop: 6,
  },
  code: {
    marginTop: 14,
    marginBottom: 14,
    padding: 12,
    backgroundColor: theme.paperDeep,
    borderRadius: radius.sm,
    fontSize: 11,
    color: theme.inkSoft,
  },
});
