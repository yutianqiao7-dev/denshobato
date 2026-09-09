import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { Pigeon } from '../types';
import { fullnessOf, Health, healthOf, LOFT_CAPACITY } from '../flock';
import { PigeonFlyer, PigeonMark, Pose } from '../pigeonArt';
import { HUNGER_COLOR } from './HungerGauge';
import { RING_COLORS } from '../cities';
import { theme } from '../theme';

const NATIVE = Platform.OS !== 'web';

/**
 * 絵はすべてこの座標系で組み立てて、画面には割合で置く。
 * 実寸を測らずに済むので、幅がいくつでも巣箱と鳩の比率が崩れない。
 */
const W = 320;

/** 巣箱は 5 列 2 段の 10 個 */
const COLS = 5;
const ROWS = 2;
const PAD = 7;
/** 仕切り板の厚み */
const BOARD = 7;
const CELL_W = (W - PAD * 2 - BOARD * (COLS + 1)) / COLS;
const CELL_H = 58;
const ROW_PITCH = CELL_H + BOARD;
const H = PAD * 2 + BOARD * (ROWS + 1) + CELL_H * ROWS;

/** 鳩の大きさ（この座標系での幅）。絵の中で足は y=36/40 の高さ */
const BIRD_W = 54;
const BIRD_H = (BIRD_W * 40) / 48;
const BIRD_FEET = BIRD_H * (36 / 40);

const cellX = (col: number) => PAD + BOARD + col * (CELL_W + BOARD);
const cellY = (row: number) => PAD + BOARD + row * ROW_PITCH;

/** 巣箱 10 個ぶんの立ち位置。足元は箱の床 */
const SLOTS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  const centerX = cellX(col) + CELL_W / 2;
  const floorY = cellY(row) + CELL_H;
  return {
    col,
    row,
    centerX,
    floorY,
    // 鳩が占める枠。餌を落とせる範囲でもある
    left: centerX - BIRD_W / 2,
    right: centerX + BIRD_W / 2,
    top: floorY - BIRD_FEET,
    bottom: floorY + 4,
  };
});

const pct = (value: number, total: number) =>
  `${(value / total) * 100}%` as `${number}%`;

/** 合板の鳩舎 */
const wood = {
  frame: '#C9A87B',
  frameLit: '#DCC094',
  frameEdge: '#A8854F',
  inner: '#9A7549',
  innerShade: '#7E5C36',
  floor: '#D3B183',
};

const grainColors = ['#C99A4E', '#A87B3C', '#E0BE7A', '#8E6530'];

/** 預かった鳩の足環。飼い主ごとに色が決まる */
function bandFor(pigeon: Pigeon): string | undefined {
  if (pigeon.mine) return undefined;
  let hash = 0;
  for (let i = 0; i < pigeon.ownerName.length; i++) {
    hash = (hash * 31 + pigeon.ownerName.charCodeAt(i)) >>> 0;
  }
  return RING_COLORS[hash % RING_COLORS.length];
}

/** 調子ごとの、鳩の動きかた */
const MOTION: Record<Health, { bob: number; period: number; opacity: number }> = {
  fine: { bob: 4, period: 1700, opacity: 1 },
  hungry: { bob: 2.5, period: 2500, opacity: 0.95 },
  weak: { bob: 1, period: 3800, opacity: 0.8 },
  dead: { bob: 0, period: 4000, opacity: 0.4 },
};

export function Loft({
  pigeons,
  flying,
  now,
  onSelect,
  onFeed,
}: {
  /** 巣箱にいる鳩 */
  pigeons: Pigeon[];
  /** 空を飛んでいる鳩 */
  flying: Pigeon[];
  now: number;
  onSelect: (pigeon: Pigeon) => void;
  onFeed: (pigeon: Pigeon) => void;
}) {
  const housed = useMemo(() => pigeons.slice(0, LOFT_CAPACITY), [pigeons]);

  const sceneRef = useRef<View>(null);
  /** 掴んだ瞬間に測った、鳩舎の画面上の位置と大きさ */
  const frame = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const [grain, setGrain] = useState<{ x: number; y: number } | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [crumbs, setCrumbs] = useState<{ slot: number; key: number } | null>(
    null
  );

  /** 画面上の座標が、どの鳩の上か */
  const hitTest = (pageX: number, pageY: number) => {
    const { x, y, w, h } = frame.current;
    if (w <= 0 || h <= 0) return null;
    const lx = ((pageX - x) / w) * W;
    const ly = ((pageY - y) / h) * H;
    for (let i = 0; i < housed.length; i++) {
      const s = SLOTS[i];
      if (lx >= s.left - 4 && lx <= s.right + 4 && ly >= s.top - 8 && ly <= s.bottom) {
        return i;
      }
    }
    return null;
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (_e, g) => {
          sceneRef.current?.measureInWindow((x, y, w, h) => {
            frame.current = { x, y, w, h };
          });
          setGrain({ x: g.x0, y: g.y0 });
        },
        onPanResponderMove: (_e, g) => {
          setGrain({ x: g.moveX, y: g.moveY });
          setTarget(hitTest(g.moveX, g.moveY));
        },
        onPanResponderRelease: (_e, g) => {
          const hit = hitTest(g.moveX, g.moveY);
          setGrain(null);
          setTarget(null);
          if (hit !== null && housed[hit]) {
            onFeed(housed[hit]);
            setCrumbs({ slot: hit, key: Date.now() });
          }
        },
        onPanResponderTerminate: () => {
          setGrain(null);
          setTarget(null);
        },
      }),
    [housed, onFeed]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.scene} ref={sceneRef} collapsable={false}>
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          {/* 合板の壁 */}
          <Rect x="0" y="0" width={W} height={H} rx="3" fill={wood.frame} />

          {/* 巣箱の中。奥ほど暗い */}
          {SLOTS.map((slot, i) => {
            const x = cellX(slot.col);
            const y = cellY(slot.row);
            return (
              <React.Fragment key={i}>
                <Rect x={x} y={y} width={CELL_W} height={CELL_H} fill={wood.inner} />
                {/* 仕切りが落とす斜めの影 */}
                <Path
                  d={`M ${x} ${y} L ${x + CELL_W} ${y} L ${x} ${y + CELL_H} Z`}
                  fill={wood.innerShade}
                  opacity={0.55}
                />
                {/* 箱の床。ここに鳩が立つ */}
                <Rect
                  x={x}
                  y={y + CELL_H - 5}
                  width={CELL_W}
                  height="5"
                  fill={wood.floor}
                />
              </React.Fragment>
            );
          })}

          {/* 縦の仕切り */}
          {Array.from({ length: COLS + 1 }, (_, i) => (
            <React.Fragment key={`v${i}`}>
              <Rect
                x={PAD + i * (CELL_W + BOARD)}
                y={PAD}
                width={BOARD}
                height={H - PAD * 2}
                fill={wood.frame}
              />
              <Rect
                x={PAD + i * (CELL_W + BOARD)}
                y={PAD}
                width="2"
                height={H - PAD * 2}
                fill={wood.frameLit}
              />
            </React.Fragment>
          ))}

          {/* 横の棚板 */}
          {Array.from({ length: ROWS + 1 }, (_, i) => {
            const y = PAD + i * ROW_PITCH;
            return (
              <React.Fragment key={`h${i}`}>
                <Rect x={PAD} y={y} width={W - PAD * 2} height={BOARD} fill={wood.frame} />
                <Rect x={PAD} y={y} width={W - PAD * 2} height="2" fill={wood.frameLit} />
                <Rect
                  x={PAD}
                  y={y + BOARD - 1.5}
                  width={W - PAD * 2}
                  height="1.5"
                  fill={wood.frameEdge}
                  opacity={0.6}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* 巣箱に立つ鳩 */}
        {housed.map((pigeon, i) => (
          <PerchedBird
            key={pigeon.id}
            pigeon={pigeon}
            now={now}
            slot={SLOTS[i]}
            targeted={target === i}
            onPress={() => onSelect(pigeon)}
          />
        ))}

        {/* よその鳩の巣箱には、飼い主の名札を掛けておく */}
        {housed.map((pigeon, i) =>
          pigeon.mine ? null : (
            <View
              key={`n-${pigeon.id}`}
              pointerEvents="none"
              style={[
                styles.plate,
                {
                  left: pct(cellX(SLOTS[i].col) + 2, W),
                  top: pct(cellY(SLOTS[i].row) + 2, H),
                  maxWidth: pct(CELL_W - 4, W),
                  borderColor: bandFor(pigeon),
                },
              ]}
            >
              <Text style={styles.plateText} numberOfLines={1}>
                {pigeon.ownerName}
              </Text>
            </View>
          )
        )}

        {/* 巣箱の縁に出す、その一羽の腹の減り具合 */}
        {housed.map((pigeon, i) => (
          <NestGauge key={`g-${pigeon.id}`} pigeon={pigeon} now={now} slot={SLOTS[i]} />
        ))}

        {/* 撒かれた餌 */}
        {crumbs && SLOTS[crumbs.slot] && (
          <Crumbs
            key={crumbs.key}
            slot={SLOTS[crumbs.slot]}
            onDone={() => setCrumbs(null)}
          />
        )}

        {/* 鳩舎の前を横切っていく鳩 */}
        {flying.map((pigeon, i) => (
          <FlyingBird key={pigeon.id} pigeon={pigeon} index={i} />
        ))}
      </View>

      <View style={styles.trayRow}>
        <View style={styles.tray} {...pan.panHandlers}>
          <FeedBowl size={54} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.trayTitle}>餌</Text>
          <Text style={styles.trayHint}>
            つまんで、鳩の上まで持っていくと食べます
          </Text>
          <Text style={styles.count}>
            巣箱 {housed.length} / {LOFT_CAPACITY}
          </Text>
        </View>
      </View>

      {/* 指についてくる餌 */}
      {grain && (
        <View
          pointerEvents="none"
          style={[
            styles.heldGrain,
            {
              left: grain.x - frame.current.x - 22,
              top: grain.y - frame.current.y - 22,
            },
          ]}
        >
          <GrainPinch size={44} />
        </View>
      )}
    </View>
  );
}

/** 巣箱の縁の細いゲージ。誰が腹を空かせているか、鳩舎を見れば分かる */
function NestGauge({
  pigeon,
  now,
  slot,
}: {
  pigeon: Pigeon;
  now: number;
  slot: (typeof SLOTS)[number];
}) {
  const value = fullnessOf(pigeon, now);
  const health = healthOf(pigeon, now);
  const x = cellX(slot.col) + 4;
  const barW = CELL_W - 8;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: pct(x, W),
        top: pct(slot.floorY + 2, H),
        width: pct(barW, W),
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(60,40,20,0.28)',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.round(value * 1000) / 10}%` as `${number}%`,
          height: '100%',
          borderRadius: 2,
          backgroundColor: HUNGER_COLOR[health],
        }}
      />
    </View>
  );
}

/** 餌の入った器 */
function FeedBowl({ size }: { size: number }) {
  return (
    <Svg width={size} height={size * 0.78} viewBox="0 0 54 42">
      <Ellipse cx="27" cy="18" rx="22" ry="9" fill="#8E6530" />
      <Path d="M 5 18 Q 27 46 49 18 Z" fill="#A87B3C" />
      <Ellipse cx="27" cy="17" rx="19" ry="7" fill="#6E4E24" />
      {[
        [18, 15],
        [25, 13],
        [32, 15],
        [22, 18],
        [30, 18],
        [36, 17],
        [14, 17],
        [27, 20],
      ].map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r="2.4" fill={grainColors[i % 4]} />
      ))}
    </Svg>
  );
}

/** つまんだひとつまみの餌 */
function GrainPinch({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Circle cx="22" cy="22" r="15" fill="#EFE0C4" opacity={0.5} />
      {[
        [16, 18],
        [24, 15],
        [29, 22],
        [20, 25],
        [26, 29],
        [14, 25],
        [22, 21],
      ].map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r="2.8" fill={grainColors[i % 4]} />
      ))}
    </Svg>
  );
}

/** 食べたあとに床へこぼれた餌 */
function Crumbs({
  slot,
  onDone,
}: {
  slot: (typeof SLOTS)[number];
  onDone: () => void;
}) {
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.timing(fade, {
      toValue: 0,
      duration: 1600,
      delay: 700,
      easing: Easing.in(Easing.quad),
      useNativeDriver: NATIVE,
    });
    anim.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: pct(slot.centerX - 17, W),
        top: pct(slot.floorY - 4, H),
        width: pct(34, W),
        aspectRatio: 34 / 14,
        opacity: fade,
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 34 14">
        {[
          [6, 8],
          [12, 10],
          [18, 7],
          [24, 10],
          [29, 8],
        ].map(([cx, cy], i) => (
          <Circle key={i} cx={cx} cy={cy} r="2" fill={grainColors[i % 4]} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** 巣箱の床で体を揺らしている鳩 */
function PerchedBird({
  pigeon,
  now,
  slot,
  targeted,
  onPress,
}: {
  pigeon: Pigeon;
  now: number;
  slot: (typeof SLOTS)[number];
  targeted: boolean;
  onPress: () => void;
}) {
  const health = healthOf(pigeon, now);
  const motion = MOTION[health];
  const bob = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const [stretching, setStretching] = useState(false);
  // 右半分の鳩は左を向く
  const flip = slot.col >= COLS / 2;

  useEffect(() => {
    bob.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: motion.period,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: motion.period,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
      ])
    );
    // 一羽ずつ揺れをずらす
    const delay = setTimeout(() => loop.start(), Math.random() * motion.period);
    return () => {
      clearTimeout(delay);
      loop.stop();
    };
  }, [bob, motion.period]);

  // 元気な鳩は跳ねたり、羽を伸ばしたりする
  useEffect(() => {
    if (health !== 'fine') return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let back: ReturnType<typeof setTimeout>;

    const act = () => {
      if (!alive) return;
      if (Math.random() < 0.45) {
        setStretching(true);
        back = setTimeout(() => {
          if (alive) setStretching(false);
        }, 800);
        timer = setTimeout(act, 7000 + Math.random() * 9000);
        return;
      }
      Animated.sequence([
        Animated.timing(hop, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(hop, {
          toValue: 0,
          duration: 230,
          easing: Easing.bounce,
          useNativeDriver: NATIVE,
        }),
      ]).start(() => {
        timer = setTimeout(act, 5000 + Math.random() * 9000);
      });
    };

    timer = setTimeout(act, 2500 + Math.random() * 8000);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearTimeout(back);
    };
  }, [hop, health]);

  const translateY = Animated.add(
    bob.interpolate({ inputRange: [0, 1], outputRange: [0, -motion.bob] }),
    hop.interpolate({ inputRange: [0, 1], outputRange: [0, -10] })
  );

  // 弱った鳩は羽をふくらませてうずくまる
  const pose: Pose =
    health === 'weak' || health === 'dead'
      ? 'fluff'
      : stretching
        ? 'wings'
        : 'stand';

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={pigeon.name}
      style={[
        styles.perch,
        {
          left: pct(slot.left, W),
          top: pct(slot.top, H),
          width: pct(BIRD_W, W),
        },
        targeted && styles.targeted,
      ]}
    >
      <Animated.View
        style={{
          width: '100%',
          aspectRatio: 48 / 40,
          transform: [{ translateY }],
          opacity: motion.opacity,
        }}
      >
        <PigeonMark
          variant={pigeon.variant}
          flip={flip}
          pose={pose}
          band={bandFor(pigeon)}
        />
      </Animated.View>
    </Pressable>
  );
}

/** 鳩舎の前を横切っていく鳩 */
function FlyingBird({ pigeon, index }: { pigeon: Pigeon; index: number }) {
  const cross = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cross.setValue(0);
    const loop = Animated.loop(
      Animated.timing(cross, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        // 割合で動かすので、ここは JS 側で回す
        useNativeDriver: false,
      })
    );
    const delay = setTimeout(() => loop.start(), index * 2600);
    return () => {
      clearTimeout(delay);
      loop.stop();
    };
  }, [cross, index]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flap, {
          toValue: 1,
          duration: 170,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(flap, {
          toValue: 0,
          duration: 170,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [flap]);

  const left = cross.interpolate({
    inputRange: [0, 1],
    outputRange: ['-18%', '104%'],
  });
  const top = cross.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['10%', '2%', '14%', '4%', '10%'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.flyer, { left, top, width: pct(46, W) }]}
    >
      <Animated.View style={{ width: '100%', aspectRatio: 48 / 30, opacity: flap }}>
        <PigeonFlyer variant={pigeon.variant} wingsUp />
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: flap.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      >
        <View style={{ width: '100%', aspectRatio: 48 / 30 }}>
          <PigeonFlyer variant={pigeon.variant} wingsUp={false} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16, position: 'relative' },
  scene: { width: '100%', aspectRatio: W / H, position: 'relative' },
  perch: { position: 'absolute' },
  plate: {
    position: 'absolute',
    backgroundColor: 'rgba(250,244,232,0.92)',
    borderRadius: 2,
    borderLeftWidth: 3,
    paddingHorizontal: 2,
    alignSelf: 'flex-start',
  },
  plateText: { fontSize: 8, lineHeight: 12, color: theme.ink },
  targeted: { borderRadius: 999, backgroundColor: 'rgba(255,246,214,0.6)' },
  flyer: { position: 'absolute' },
  trayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  tray: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
  },
  trayTitle: {
    fontSize: 13,
    color: theme.ink,
    fontWeight: '600',
    letterSpacing: 2,
  },
  trayHint: { fontSize: 12, color: theme.inkSoft, marginTop: 2 },
  count: {
    color: theme.inkFaint,
    fontSize: 12,
    marginTop: 6,
    letterSpacing: 1,
  },
  heldGrain: { position: 'absolute', zIndex: 20 },
});
