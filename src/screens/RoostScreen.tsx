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

import { formatDateTime, formatDistance, formatDuration, distanceKm } from '../geo';
import {
  canBreed,
  givablePigeons,
  GROWTH,
  growthLeft,
  healthOf,
  letterStatus,
  LOFT_CAPACITY,
  pigeonStatus,
  PigeonStatus,
  pigeonTrips,
  releasablePigeons,
  stageOf,
  STAGE_LABEL,
  STATUS_LABEL,
} from '../flock';
import { EggMark, PigeonMark, PLUMAGES, SquabMark } from '../pigeonArt';
import { RING_COLORS } from '../cities';
import { useNow } from '../useNow';
import { radius, theme } from '../theme';
import { Button, Card, Empty, Muted, SectionTitle } from '../components/ui';
import { Loft } from '../components/Loft';
import { HungerGauge } from '../components/HungerGauge';
import { QrView } from '../components/QrView';
import { QrScanner } from '../components/QrScanner';
import { Notice } from './ReceiveScreen';
import { flyAway } from '../flyaway';
import { encodePigeon } from '../pigeonCode';
import { confirmDestructive } from '../confirm';

/** 預かった鳩の足環。飼い主ごとに色が決まる（鳩舎の絵と同じ規則） */
function bandFor(pigeon: Pigeon): string | undefined {
  if (pigeon.mine) return undefined;
  let hash = 0;
  for (let i = 0; i < pigeon.ownerName.length; i++) {
    hash = (hash * 31 + pigeon.ownerName.charCodeAt(i)) >>> 0;
  }
  return RING_COLORS[hash % RING_COLORS.length];
}

/** その鳩を消したとき、何が起きるか */
function removalNote(pigeon: Pigeon, status: PigeonStatus): string {
  if (status === 'lent') {
    return `${pigeon.name}を記録から消します。その鳩が持って帰る手紙は届きますが、鳩は鳩舎に戻りません。`;
  }
  if (status === 'flying') {
    return `${pigeon.name}を記録から消します。運んでいる手紙はそのまま届きます。`;
  }
  if (!pigeon.mine) {
    return `${pigeon.name}を記録から消します。預かっている鳩なので、飼い主のもとには戻せません。`;
  }
  return `${pigeon.name}を記録から消します。取り消せません。`;
}

/** 一覧の右肩に出す、小さな削除の口 */
function RemoveLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable hitSlop={10} onPress={onPress}>
      <Text style={styles.remove}>消す</Text>
    </Pressable>
  );
}

export function RoostScreen({
  onWrite,
  onReceive,
}: {
  onWrite: (pigeonId: string) => void;
  onReceive: () => void;
}) {
  const {
    state,
    takeInPigeon,
    breed,
    canTakeStray,
    feedPigeon,
    removePigeon,
    nestsFree,
    obituaryCode,
    markDeathReported,
    relay,
  } = useStore();
  const now = useNow(15000);
  const [giving, setGiving] = useState<Pigeon | null>(null);
  const [borrowing, setBorrowing] = useState(false);
  const [acting, setActing] = useState<Pigeon | null>(null);
  const [taken, setTaken] = useState<Pigeon | null>(null);
  const [pairing, setPairing] = useState(false);
  const [mourning, setMourning] = useState<Pigeon | null>(null);

  const askRemove = (pigeon: Pigeon) => {
    confirmDestructive(
      `${pigeon.name}を消しますか`,
      removalNote(pigeon, pigeonStatus(pigeon, state.letters, Date.now())),
      '消す',
      () => removePigeon(pigeon.id)
    );
  };

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

  const mine = groups.here.filter((p) => p.mine);
  const borrowed = groups.here.filter((p) => !p.mine);

  const breeders = groups.here.filter((p) => canBreed(p, now));

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
        {needsCare > 0 ? `・${needsCare}羽が腹を空かせています` : ''}
        {nestsFree <= 0 ? '・巣箱に空きがありません' : ''}
      </Text>

      <Loft
        pigeons={groups.here}
        flying={groups.flying}
        now={now}
        onSelect={setActing}
        onFeed={(p) => feedPigeon(p.id)}
      />

      {groups.here.length === 0 && (
        <>
          <SectionTitle>手元の鳩</SectionTitle>
          <Empty
            emoji="🪹"
            text={'鳩舎は空です。\n新しい鳩を迎えるか、誰かの鳩を預かってください。'}
          />
        </>
      )}

      {mine.length > 0 && (
        <>
          <SectionTitle>自分の鳩</SectionTitle>
          <Muted style={{ marginTop: -4, marginBottom: 10 }}>
            渡した相手が放つと、手紙を持って帰ってきます。
          </Muted>
          {mine.map((p) => (
            <HerePigeon
              key={p.id}
              pigeon={p}
              now={now}
              homeName={state.home?.name}
              onGive={() => setGiving(p)}
              onWrite={() => onWrite(p.id)}
              onRemove={() => askRemove(p)}
            />
          ))}
        </>
      )}

      {borrowed.length > 0 && (
        <>
          <SectionTitle>預かっている鳩</SectionTitle>
          <Muted style={{ marginTop: -4, marginBottom: 10 }}>
            手紙を持たせて放つと、飼い主の鳩舎へ帰ります。足環が付いています。
          </Muted>
          {borrowed.map((p) => (
            <HerePigeon
              key={p.id}
              pigeon={p}
              now={now}
              homeName={state.home?.name}
              onGive={() => setGiving(p)}
              onWrite={() => onWrite(p.id)}
              onRemove={() => askRemove(p)}
            />
          ))}
        </>
      )}

      <View style={styles.actions}>
        <Button
          label="つがいにする"
          tone="quiet"
          disabled={nestsFree <= 0 || breeders.length < 2}
          onPress={() => setPairing(true)}
          style={{ flex: 1 }}
        />
        <Button
          label="鳩を預かる"
          tone="quiet"
          disabled={nestsFree <= 0}
          onPress={() => setBorrowing(true)}
          style={{ flex: 1 }}
        />
      </View>
      {canTakeStray && (
        <Button
          label="野良鳩を迎える"
          onPress={() => takeInPigeon()}
          style={{ marginTop: 10 }}
        />
      )}
      <Muted style={{ marginTop: 10 }}>
        {canTakeStray
          ? 'つがいを組める鳩がいません。野良鳩が一羽、迷い込んできています。'
          : breeders.length >= 2
            ? '鳩は卵からしか増えません。元気な成鳥を二羽えらぶと、卵をひとつ持ちます。'
            : '卵を持てるのは、元気な成鳥が二羽そろっているときだけです。'}
      </Muted>
      <Muted style={{ marginTop: 8 }}>
        {nestsFree > 0
          ? `巣箱は${LOFT_CAPACITY}個。あと${nestsFree}羽まで置けます。`
          : `巣箱は${LOFT_CAPACITY}個で埋まっています。誰かに渡すか、放つと空きます。`}
      </Muted>
      <Muted style={{ marginTop: 8 }}>
        鳩は自分の鳩舎にしか帰れません。だから手紙を送るには、相手の鳩を預かって、
        それを放ちます。自分の鳩は相手に渡しておけば、いつか手紙を持って帰ってきます。
      </Muted>

      {groups.lent.length > 0 && (
        <>
          <SectionTitle>預けている鳩</SectionTitle>
          {groups.lent.map((p) => (
            <Card key={p.id}>
              <View style={styles.row}>
                <View style={styles.mark}>
                  <PigeonMark variant={p.variant} size={30} band={bandFor(p)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Muted>
                    {p.custody.kind === 'lent' && p.custody.contactName
                      ? `${p.custody.contactName}さんのところ`
                      : '渡したまま'}
                    ・手紙を持って帰るのを待っています
                  </Muted>
                </View>
                <RemoveLink onPress={() => askRemove(p)} />
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
                  <View style={styles.mark}>
                    <PigeonMark variant={p.variant} size={30} band={bandFor(p)} />
                  </View>
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
                  <RemoveLink onPress={() => askRemove(p)} />
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
                  <View style={[styles.mark, styles.faded]}>
                    <PigeonMark variant={p.variant} size={30} band={bandFor(p)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.name}</Text>
                    <Muted>
                      {STATUS_LABEL[status]}
                      {p.diedAt !== undefined
                        ? `・${formatDateTime(p.diedAt)}`
                        : ''}
                      ・{pigeonTrips(p, state.letters, now)}回運びました
                    </Muted>
                    {p.mine && p.diedUnder && (
                      <Muted style={{ marginTop: 4 }}>
                        {p.diedUnder}さんの手元で死にました
                      </Muted>
                    )}
                    {!p.mine && p.diedAt !== undefined && (
                      <Muted style={{ marginTop: 4 }}>
                        {p.deathReported
                          ? `${p.ownerName}さんに知らせました`
                          : `${p.ownerName}さんの鳩でした`}
                      </Muted>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {!p.mine &&
                      p.diedAt !== undefined &&
                      !p.deathReported &&
                      (!relay || !p.mailbox) && (
                        <Pressable onPress={() => setMourning(p)} hitSlop={8}>
                          <Text style={styles.tellLink}>訃報を伝える</Text>
                        </Pressable>
                      )}
                    <RemoveLink onPress={() => askRemove(p)} />
                  </View>
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
        預けた鳩の訃報コードも、同じところに貼り付けてください。
      </Muted>

      <View style={{ height: 80 }} />

      <TellDeath
        pigeon={mourning}
        code={mourning ? obituaryCode(mourning.id) : null}
        onClose={() => setMourning(null)}
        onTold={() => {
          if (mourning) markDeathReported(mourning.id);
          setMourning(null);
        }}
      />

      <PigeonActions
        pigeon={acting}
        now={now}
        canGive={
          acting !== null &&
          givablePigeons(state.pigeons, state.letters, now).some(
            (p) => p.id === acting.id
          )
        }
        canRelease={
          acting !== null &&
          releasablePigeons(state.pigeons, state.letters, now).some(
            (p) => p.id === acting.id
          )
        }
        onClose={() => setActing(null)}
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
        onRemove={() => {
          const target = acting;
          setActing(null);
          if (target) askRemove(target);
        }}
      />
      <GivePigeon
        pigeon={giving}
        onClose={() => setGiving(null)}
      />
      <PairUp
        visible={pairing}
        breeders={breeders}
        onClose={() => setPairing(false)}
        onPair={(a, b) => {
          const egg = breed(a, b);
          setPairing(false);
          if (egg) setTaken(egg);
        }}
      />
      <BorrowPigeon
        visible={borrowing}
        onClose={() => setBorrowing(false)}
        onReceived={setTaken}
      />
      {taken && (
        <Notice
          mark={<PigeonMark variant={taken.variant} size={54} />}
          title={`${taken.name}を預かりました`}
          detail={`${taken.ownerName}さんの鳩です。餌をやるのはあなた。放てば${taken.loft.name}へ帰ります。`}
          onClose={() => setTaken(null)}
        />
      )}
    </ScrollView>
  );
}

function HerePigeon({
  pigeon,
  now,
  homeName,
  onGive,
  onWrite,
  onRemove,
}: {
  pigeon: Pigeon;
  now: number;
  homeName?: string;
  onGive: () => void;
  onWrite: () => void;
  onRemove: () => void;
}) {
  const health = healthOf(pigeon, now);
  const stage = stageOf(pigeon, now);

  return (
    <Card style={health === 'weak' ? styles.weakCard : undefined}>
      <View style={styles.row}>
        <View style={styles.mark}>
          {stage === 'egg' ? (
            <EggMark size={30} />
          ) : stage === 'squab' ? (
            <SquabMark variant={pigeon.variant} size={30} />
          ) : (
            <PigeonMark
              variant={pigeon.variant}
              size={30}
              band={bandFor(pigeon)}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {pigeon.name}
            {stage !== 'adult' ? `（${STAGE_LABEL[stage]}）` : ''}
          </Text>
          <Muted>
            {pigeon.parents
              ? `${pigeon.parents[0]}と${pigeon.parents[1]}の子`
              : pigeon.mine
                ? `あなたの鳩・${homeName ?? '鳩舎'}へ帰ります`
                : `${pigeon.ownerName}さんの鳩・${pigeon.loft.name}へ帰ります`}
          </Muted>
        </View>
        <RemoveLink onPress={onRemove} />
      </View>

      {stage === 'egg' ? (
        <Text style={styles.growth}>
          あと {formatDuration(growthLeft(pigeon, now))} で孵ります
        </Text>
      ) : (
        <HungerGauge pigeon={pigeon} now={now} />
      )}

      {stage === 'squab' && (
        <Text style={styles.growth}>
          あと {formatDuration(growthLeft(pigeon, now))} で巣立ちます。
          それまでは飛べません
        </Text>
      )}

      {stage === 'adult' && (
      <View style={styles.actions}>
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
      )}
    </Card>
  );
}

/** 小屋の鳩をつついたときに開く、その一羽の手当て */
function PigeonActions({
  pigeon,
  now,
  canGive,
  canRelease,
  onClose,
  onGive,
  onWrite,
  onRemove,
}: {
  pigeon: Pigeon | null;
  now: number;
  /** 渡せる鳩か。卵と雛は渡せない */
  canGive: boolean;
  /** 手紙を持たせて放てる鳩か */
  canRelease: boolean;
  onClose: () => void;
  onGive: () => void;
  onWrite: () => void;
  onRemove: () => void;
}) {
  if (!pigeon) return null;

  const stage = stageOf(pigeon, now);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {stage === 'egg' ? (
            <EggMark size={62} />
          ) : stage === 'squab' ? (
            <SquabMark variant={pigeon.variant} size={62} />
          ) : (
            <PigeonMark
              variant={pigeon.variant}
              size={62}
              band={bandFor(pigeon)}
            />
          )}
          <Text style={styles.sheetName}>
            {pigeon.name}
            {stage !== 'adult' ? `（${STAGE_LABEL[stage]}）` : ''}
          </Text>
          <Muted style={{ textAlign: 'center', marginTop: 4 }}>
            {pigeon.mine
              ? 'あなたの鳩'
              : `${pigeon.ownerName}さんの鳩・${pigeon.loft.name}へ帰ります`}
          </Muted>
          {/* 卵は腹を空かせない。育つのを待つだけ */}
          {stage !== 'egg' && (
            <View style={{ alignSelf: 'stretch' }}>
              <HungerGauge pigeon={pigeon} now={now} />
            </View>
          )}
          {stage !== 'adult' && (
            <Text style={styles.sheetGrowth}>
              あと {formatDuration(growthLeft(pigeon, now))}
              {stage === 'egg' ? ' で孵ります' : ' で巣立ちます'}
            </Text>
          )}

          {canGive || canRelease ? (
            <Button
              label={pigeon.mine ? '誰かに渡す' : '手紙を持たせる'}
              onPress={pigeon.mine ? onGive : onWrite}
              style={{ marginTop: 20, alignSelf: 'stretch' }}
            />
          ) : (
            <Muted style={{ textAlign: 'center', marginTop: 18 }}>
              {stage === 'adult'
                ? 'いまは渡せません。'
                : pigeon.mine
                  ? '巣立つまでは渡せません。鳩舎で育ててください。'
                  : '巣立つまでは飛べません。'}
            </Muted>
          )}
          <Button
            label="閉じる"
            tone="quiet"
            onPress={onClose}
            style={{ marginTop: 10, alignSelf: 'stretch' }}
          />
          <Button
            label="この鳩を消す"
            tone="danger"
            onPress={onRemove}
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
  const { state, givePigeon, relay } = useStore();
  /** QR を見せている段階か、渡し終えて相手を書き留める段階か */
  const [step, setStep] = useState<'qr' | 'who'>('qr');
  const [showCode, setShowCode] = useState(false);

  if (!pigeon) return null;

  const alreadyLent = pigeon.custody.kind === 'lent';
  const code = encodePigeon(pigeon, state.myName, state.mailbox);

  const close = () => {
    setStep('qr');
    setShowCode(false);
    onClose();
  };

  // 読み取ってもらえたかどうかはこちらでは分からないので、渡した本人が決める
  const handed = () => {
    givePigeon(pigeon.id);
    flyAway(pigeon.variant, () => setStep('who'));
  };

  const remember = (contact?: { id: string; name: string }) => {
    if (contact) givePigeon(pigeon.id, contact);
    close();
  };

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
          {step === 'qr' ? (
            <>
              <Text style={styles.handTitle}>この QR を読んでもらう</Text>
              <Muted style={{ marginBottom: 16 }}>
                相手に「鳩舎 → コードを貼り付ける」を開いてもらって、
                これをカメラで読んでもらってください。それで{pigeon.name}が
                相手の手元に移ります。世話をするのも相手になります。
              </Muted>

              <QrView value={code} />

              <Muted style={{ marginTop: 16 }}>
                {pigeon.name}は{state.home?.name ?? 'あなたの鳩舎'}
                へ帰る鳩です。相手がこの鳩を放つと、手紙を持ってあなたのところへ帰ってきます。
                この QR には鳩舎の座標が入ります（帰る先なので）。
                {relay
                  ? 'この QR にはあなたの巣穴の住所も入っているので、以降は読み取りなしで届きます。'
                  : ''}
              </Muted>

              {!alreadyLent && (
                <Button
                  label="読んでもらった"
                  onPress={handed}
                  style={{ marginTop: 20 }}
                />
              )}

              <Button
                label="離れているので、コードを送る"
                tone="quiet"
                onPress={() =>
                  Share.share({
                    message: `${pigeon.name}を預けます。「伝書鳩」アプリで受け取ってください。\n\n${code}`,
                  }).catch(() => setShowCode(true))
                }
                style={{ marginTop: 10 }}
              />
              <Pressable onPress={() => setShowCode((v) => !v)}>
                <Text style={styles.link}>
                  {showCode ? 'コードを隠す' : 'コードを文字で表示する'}
                </Text>
              </Pressable>
              {showCode && (
                <Text selectable style={styles.code}>
                  {code}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.handTitle}>
                {pigeon.name}は誰のところへ？
              </Text>
              <Muted style={{ marginBottom: 16 }}>
                書き留めておくと、鳩舎で「誰のところにいるか」が分かります。
                分からなければ、そのままで大丈夫です。
              </Muted>
              {state.contacts.length > 0 && (
                <View style={styles.chips}>
                  {state.contacts.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => remember({ id: c.id, name: c.name })}
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
              <Button
                label="書き留めない"
                tone="quiet"
                onPress={() => remember()}
                style={{ marginTop: 20 }}
              />
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/** 二羽をつがいにして、卵を持たせる */
function PairUp({
  visible,
  breeders,
  onClose,
  onPair,
}: {
  visible: boolean;
  breeders: Pigeon[];
  onClose: () => void;
  onPair: (aId: string, bId: string) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);

  const toggle = (id: string) => {
    setChosen((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 2
          ? [prev[1], id]
          : [...prev, id]
    );
  };

  const close = () => {
    setChosen([]);
    onClose();
  };

  const hours = Math.round((GROWTH.egg + GROWTH.squab) / 3600000);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: theme.paper }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>つがいにする</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Text style={styles.close}>やめる</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Muted style={{ marginBottom: 16 }}>
            二羽えらぶと、巣箱にひとつ卵を持ちます。孵って巣立つまで
            {hours}時間。羽色は親のどちらかを継ぎ、たまに先祖返りします。
            親はしばらく次の卵を持てません。
          </Muted>

          {breeders.length < 2 ? (
            <Muted>
              元気な成鳥が二羽そろっていません。卵と雛、腹を空かせた鳩、
              預かっている鳩は親になれません。
            </Muted>
          ) : (
            <View style={styles.chips}>
              {breeders.map((p) => {
                const on = chosen.includes(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => toggle(p.id)}
                    style={[styles.pairChip, on && styles.chipOn]}
                  >
                    <PigeonMark variant={p.variant} size={34} />
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Button
            label={
              chosen.length === 2
                ? '巣を作らせる'
                : `あと${2 - chosen.length}羽えらぶ`
            }
            onPress={() => chosen.length === 2 && onPair(chosen[0], chosen[1])}
            disabled={chosen.length !== 2}
            style={{ marginTop: 26 }}
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * 相手の鳩を預かる。
 * ふつうは相手の QR を読む。読めないときのために、手で書き留める道もある。
 */
function BorrowPigeon({
  visible,
  onClose,
  onReceived,
}: {
  visible: boolean;
  onClose: () => void;
  onReceived: (pigeon: Pigeon) => void;
}) {
  const { state, borrowPigeon, receiveCode } = useStore();
  const [byHand, setByHand] = useState(false);
  const [error, setError] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [variant, setVariant] = useState(PLUMAGES[0].id);

  const contact = state.contacts.find((c) => c.id === contactId);

  const close = () => {
    setByHand(false);
    setError('');
    setContactId(null);
    setName('');
    onClose();
  };

  const scanned = async (value: string) => {
    const result = await receiveCode(value);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    if (result.kind === 'pigeon') {
      close();
      onReceived(result.pigeon);
      return;
    }
    // 手紙の QR だった。受け取れてはいるので、そのまま知らせる
    setError('いまのは手紙の QR でした。文箱で受け取っています。');
  };

  const submit = () => {
    if (!contactId) return;
    borrowPigeon(contactId, name, variant);
    close();
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
          {!byHand ? (
            <>
              <Muted style={{ marginBottom: 16 }}>
                相手に「誰かに渡す」を開いてもらって、出てきた QR を読み取ります。
                送ってもらった QR の画像からも読めます。
              </Muted>
              <QrScanner onRead={scanned} onCancel={close} />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Button
                label="QR がないので手で書き留める"
                tone="quiet"
                onPress={() => {
                  setError('');
                  setByHand(true);
                }}
                style={{ marginTop: 16 }}
              />
              <View style={{ height: 40 }} />
            </>
          ) : (
            <>
          <Muted style={{ marginBottom: 16 }}>
            直接手渡しで受け取って、QR もないときは、ここに書き留めます。
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

          <Text style={styles.label}>羽の色</Text>
          <View style={styles.chips}>
            {PLUMAGES.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setVariant(p.id)}
                style={[styles.plumage, variant === p.id && styles.chipOn]}
              >
                <PigeonMark variant={p.id} size={34} />
              </Pressable>
            ))}
          </View>

          <Button
            label="この鳩を預かる"
            onPress={submit}
            disabled={!contactId}
            style={{ marginTop: 26 }}
          />
          <Button
            label="QR を読み取る"
            tone="quiet"
            onPress={() => setByHand(false)}
            style={{ marginTop: 10 }}
          />
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/** 預かった鳩が死んだことを、飼い主に手渡しで伝える */
function TellDeath({
  pigeon,
  code,
  onClose,
  onTold,
}: {
  pigeon: Pigeon | null;
  code: string | null;
  onClose: () => void;
  onTold: () => void;
}) {
  if (!pigeon || !code) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.tellWrap}>
        <Text style={styles.handTitle}>{pigeon.name}のことを伝える</Text>
        <Muted style={{ marginBottom: 18 }}>
          この鳩は{pigeon.ownerName}さんの鳩です。中継所を通っていないので、
          死んだことは自動では伝わりません。
          この QR を{pigeon.ownerName}さんに読んでもらってください。
        </Muted>
        <QrView value={code} size={220} />
        <Button
          label="コードを送る"
          tone="quiet"
          onPress={() =>
            Share.share({
              message: `${pigeon.name}は、わたしの手元で死んでしまいました。
この訃報コードを「伝書鳩」アプリで読んでください。

${code}`,
            }).catch(() => undefined)
          }
          style={{ marginTop: 20 }}
        />
        <Text selectable style={styles.code}>
          {code}
        </Text>
        <Button label="伝えた" onPress={onTold} style={{ marginTop: 20 }} />
        <Button label="あとにする" tone="quiet" onPress={onClose} style={{ marginTop: 10 }} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tellLink: { color: theme.accent, fontSize: 13, marginBottom: 6 },
  tellWrap: {
    padding: 26,
    paddingTop: 70,
    backgroundColor: theme.paper,
    flexGrow: 1,
  },
  body: { padding: 20, paddingTop: 70 },
  title: { fontSize: 26, fontWeight: '700', color: theme.ink, letterSpacing: 4 },
  sub: { color: theme.inkFaint, fontSize: 13, marginTop: 6, marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  mark: { width: 34, marginRight: 12, alignItems: 'center' },
  faded: { opacity: 0.35 },
  name: { fontSize: 16, color: theme.ink, fontWeight: '600' },
  weakCard: { borderColor: '#A03E5B' },
  goneCard: { backgroundColor: theme.paperDeep, borderStyle: 'dashed' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  remove: { color: '#A03E5B', fontSize: 13 },
  growth: { fontSize: 13, color: theme.inkSoft, marginTop: 12, lineHeight: 20 },
  error: { color: '#A03E5B', fontSize: 13, marginTop: 12, textAlign: 'center' },
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
  pairChip: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
  },
  plumage: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: theme.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
  },
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
  sheetGrowth: {
    marginTop: 10,
    fontSize: 13,
    color: theme.inkSoft,
    textAlign: 'center',
  },
  sheetName: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.ink,
    marginTop: 6,
  },
  link: { color: theme.accent, fontSize: 14, marginTop: 14, textAlign: 'center' },
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
