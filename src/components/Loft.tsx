import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Pigeon } from '../types';
import { Health, healthOf, LOFT_CAPACITY } from '../flock';
import { PigeonFlyer, PigeonMark, Pose } from '../pigeonArt';
import { theme } from '../theme';

const NATIVE = Platform.OS !== 'web';

/** 絵の基準サイズ。実寸はこの比率で伸び縮みする */
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

const cellX = (col: number) => PAD + BOARD + col * (CELL_W + BOARD);
const cellY = (row: number) => PAD + BOARD + row * ROW_PITCH;

/** 巣箱 10 個ぶんの立ち位置。足元は箱の床 */
const SLOTS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  return {
    col,
    row,
    centerX: cellX(col) + CELL_W / 2,
    floorY: cellY(row) + CELL_H,
  };
});

/** 合板の鳩舎 */
const wood = {
  frame: '#C9A87B',
  frameLit: '#DCC094',
  frameEdge: '#A8854F',
  inner: '#9A7549',
  innerShade: '#7E5C36',
  floor: '#D3B183',
};

/** 調子ごとの、鳩の動きかた */
const MOTION: Record<Health, { bob: number; period: number; opacity: number }> = {
  fine: { bob: 3.5, period: 1700, opacity: 1 },
  hungry: { bob: 2, period: 2500, opacity: 0.95 },
  weak: { bob: 0.8, period: 3800, opacity: 0.8 },
  dead: { bob: 0, period: 4000, opacity: 0.4 },
};

export function Loft({
  pigeons,
  flying,
  now,
  onSelect,
}: {
  /** 巣箱にいる鳩 */
  pigeons: Pigeon[];
  /** 空を飛んでいる鳩 */
  flying: Pigeon[];
  now: number;
  onSelect: (pigeon: Pigeon) => void;
}) {
  const housed = useMemo(() => pigeons.slice(0, LOFT_CAPACITY), [pigeons]);
  // 実寸を測って、鳩の大きさを巣箱に合わせる
  const [width, setWidth] = useState(0);
  const scale = width > 0 ? width / W : 0;
  const birdWidth = 54 * scale;

  return (
    <View style={styles.wrap}>
      <View
        style={styles.scene}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
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
        {scale > 0 &&
          housed.map((pigeon, i) => (
            <PerchedBird
              key={pigeon.id}
              pigeon={pigeon}
              now={now}
              slot={SLOTS[i]}
              scale={scale}
              birdWidth={birdWidth}
              onPress={() => onSelect(pigeon)}
            />
          ))}

        {/* 鳩舎の前を横切っていく鳩 */}
        {scale > 0 &&
          flying.map((pigeon, i) => (
            <FlyingBird key={pigeon.id} pigeon={pigeon} index={i} scale={scale} />
          ))}
      </View>

      <Text style={styles.count}>
        巣箱 {housed.length} / {LOFT_CAPACITY}
      </Text>
    </View>
  );
}

/** 巣箱の床で体を揺らしている鳩 */
function PerchedBird({
  pigeon,
  now,
  slot,
  scale,
  birdWidth,
  onPress,
}: {
  pigeon: Pigeon;
  now: number;
  slot: (typeof SLOTS)[number];
  scale: number;
  birdWidth: number;
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
    bob.interpolate({ inputRange: [0, 1], outputRange: [0, -motion.bob * scale] }),
    hop.interpolate({ inputRange: [0, 1], outputRange: [0, -11 * scale] })
  );

  // 弱った鳩は羽をふくらませてうずくまる
  const pose: Pose =
    health === 'weak' || health === 'dead'
      ? 'fluff'
      : stretching
        ? 'wings'
        : 'stand';

  const birdHeight = (birdWidth * 40) / 48;
  // 絵の中では足が y=36/40 の高さにある
  const feetOffset = birdHeight * (36 / 40);

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={pigeon.name}
      style={[
        styles.perch,
        {
          left: slot.centerX * scale,
          top: slot.floorY * scale - feetOffset,
          width: birdWidth,
          height: birdHeight,
          marginLeft: -birdWidth / 2,
        },
      ]}
    >
      <Animated.View
        style={{ transform: [{ translateY }], opacity: motion.opacity }}
      >
        <PigeonMark
          variant={pigeon.variant}
          size={birdWidth}
          flip={flip}
          pose={pose}
        />
      </Animated.View>
    </Pressable>
  );
}

/** 鳩舎の前を横切っていく鳩 */
function FlyingBird({
  pigeon,
  index,
  scale,
}: {
  pigeon: Pigeon;
  index: number;
  scale: number;
}) {
  const cross = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;
  const size = 46 * scale;

  useEffect(() => {
    cross.setValue(0);
    const loop = Animated.loop(
      Animated.timing(cross, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: NATIVE,
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

  const translateX = cross.interpolate({
    inputRange: [0, 1],
    outputRange: [-size, W * scale + size],
  });
  const translateY = cross.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -10 * scale, 4 * scale, -8 * scale, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flyer,
        {
          top: (16 + (index % 3) * ROW_PITCH * 0.45) * scale,
          width: size,
          height: (size * 30) / 48,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      <Animated.View style={{ opacity: flap }}>
        <PigeonFlyer variant={pigeon.variant} size={size} wingsUp />
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
        <PigeonFlyer variant={pigeon.variant} size={size} wingsUp={false} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  scene: { width: '100%', aspectRatio: W / H, position: 'relative' },
  perch: { position: 'absolute' },
  flyer: { position: 'absolute', left: 0 },
  count: {
    textAlign: 'center',
    color: theme.inkFaint,
    fontSize: 12,
    marginTop: 8,
    letterSpacing: 1,
  },
});
