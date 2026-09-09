import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';
import { Pigeon } from '../types';
import { Health, healthOf, LOFT_CAPACITY } from '../flock';
import { PigeonFlyer, PigeonMark } from '../pigeonArt';
import { theme } from '../theme';

const NATIVE = Platform.OS !== 'web';

/** 絵の基準サイズ。実寸はこの比率で伸び縮みする */
const W = 320;
const H = 300;

/** 巣箱は 5 列 2 段の 10 個 */
const COLS = 5;
const ROWS = 2;
const BODY_X = 26;
const BODY_W = W - BODY_X * 2;
const NEST_W = 40;
const NEST_H = 44;
const NEST_MARGIN = 12;
const NEST_GAP =
  (BODY_W - NEST_MARGIN * 2 - NEST_W * COLS) / (COLS - 1);
const ROW_TOP = [96, 176];
/** 各段の止まり板の上端 */
const LEDGE_Y = [ROW_TOP[0] + NEST_H, ROW_TOP[1] + NEST_H];
const LEDGE_H = 8;

const nestX = (col: number) =>
  BODY_X + NEST_MARGIN + col * (NEST_W + NEST_GAP);

/** 巣箱 10 個ぶんの立ち位置 */
const SLOTS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  return { x: nestX(col) + NEST_W / 2, y: LEDGE_Y[row], row, col };
});

const wood = {
  roof: '#8C5A3C',
  roofShade: '#74462C',
  wall: '#C89A6B',
  wallShade: '#B4855A',
  plank: '#A87A50',
  nest: '#5E4632',
  ledge: '#9C6F49',
  post: '#7A4B30',
};

/** 調子ごとの、鳩の動きかた */
const MOTION: Record<Health, { bob: number; period: number; opacity: number }> = {
  fine: { bob: 4, period: 1600, opacity: 1 },
  hungry: { bob: 2.5, period: 2400, opacity: 0.92 },
  weak: { bob: 1, period: 3600, opacity: 0.7 },
  dead: { bob: 0, period: 4000, opacity: 0.35 },
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
  const housed = useMemo(
    () => pigeons.slice(0, LOFT_CAPACITY),
    [pigeons]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.scene}>
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          {/* 屋根 */}
          <Path d={`M ${W / 2} 8 L ${W - 14} 66 L 14 66 Z`} fill={wood.roof} />
          <Path
            d={`M ${W / 2} 8 L ${W - 14} 66 L ${W / 2} 66 Z`}
            fill={wood.roofShade}
          />
          <Rect x="8" y="64" width={W - 16} height="9" rx="4" fill={wood.roofShade} />
          {/* 妻壁の通気口 */}
          <Ellipse cx={W / 2} cy="46" rx="9" ry="7" fill={wood.nest} opacity={0.75} />

          {/* 壁 */}
          <Rect x={BODY_X} y="72" width={BODY_W} height="176" rx="5" fill={wood.wall} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Rect
              key={i}
              x={BODY_X}
              y={82 + i * 21}
              width={BODY_W}
              height="1.5"
              fill={wood.plank}
              opacity={0.5}
            />
          ))}
          <Rect
            x={W - BODY_X - 16}
            y="72"
            width="16"
            height="176"
            fill={wood.wallShade}
            opacity={0.45}
          />

          {/* 巣箱 10 個 */}
          {SLOTS.map((slot, i) => {
            const x = nestX(slot.col);
            const y = ROW_TOP[slot.row];
            const r = NEST_W / 2;
            return (
              <G key={i}>
                <Path
                  d={`M ${x} ${y + NEST_H} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${
                    x + NEST_W
                  } ${y + r} L ${x + NEST_W} ${y + NEST_H} Z`}
                  fill={wood.nest}
                />
                {/* 奥行き */}
                <Path
                  d={`M ${x + 5} ${y + NEST_H} L ${x + 5} ${y + r} A ${r - 5} ${
                    r - 5
                  } 0 0 1 ${x + NEST_W - 5} ${y + r} L ${x + NEST_W - 5} ${
                    y + NEST_H
                  } Z`}
                  fill="#382719"
                  opacity={0.5}
                />
              </G>
            );
          })}

          {/* 各段の止まり板 */}
          {LEDGE_Y.map((y, i) => (
            <Rect
              key={i}
              x={BODY_X - 8}
              y={y}
              width={BODY_W + 16}
              height={LEDGE_H}
              rx="3"
              fill={wood.ledge}
            />
          ))}

          {/* 支柱 */}
          <Rect x={W / 2 - 8} y="248" width="16" height="40" fill={wood.post} />
          <Rect x={W / 2 - 30} y="286" width="60" height="10" rx="4" fill={wood.post} />
        </Svg>

        {/* 空を横切る鳩 */}
        {flying.map((pigeon, i) => (
          <FlyingBird key={pigeon.id} pigeon={pigeon} index={i} />
        ))}

        {/* 巣箱の前に立つ鳩 */}
        {housed.map((pigeon, i) => (
          <PerchedBird
            key={pigeon.id}
            pigeon={pigeon}
            now={now}
            slot={SLOTS[i]}
            onPress={() => onSelect(pigeon)}
          />
        ))}
      </View>

      <Text style={styles.count}>
        巣箱 {housed.length} / {LOFT_CAPACITY}
      </Text>
    </View>
  );
}

/** 止まり板の上でゆれている鳩。調子が悪いほど動かない */
function PerchedBird({
  pigeon,
  now,
  slot,
  onPress,
}: {
  pigeon: Pigeon;
  now: number;
  slot: { x: number; y: number; col: number };
  onPress: () => void;
}) {
  const health = healthOf(pigeon, now);
  const motion = MOTION[health];
  const bob = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  // 端の鳩は内側を向く
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

  // 元気な鳩はときどき跳ねる
  useEffect(() => {
    if (health !== 'fine') return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const jump = () => {
      if (!alive) return;
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
        timer = setTimeout(jump, 3500 + Math.random() * 8000);
      });
    };
    timer = setTimeout(jump, 2000 + Math.random() * 7000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [hop, health]);

  const translateY = Animated.add(
    bob.interpolate({ inputRange: [0, 1], outputRange: [0, -motion.bob] }),
    hop.interpolate({ inputRange: [0, 1], outputRange: [0, -12] })
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={pigeon.name}
      style={[
        styles.perch,
        {
          left: `${(slot.x / W) * 100}%`,
          // 足が板の上にくる高さ
          top: `${((slot.y - 27) / H) * 100}%`,
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [
            { translateY },
            { rotate: health === 'weak' ? '9deg' : '0deg' },
          ],
          opacity: motion.opacity,
        }}
      >
        <PigeonMark variant={pigeon.variant} size={34} flip={flip} />
      </Animated.View>
    </Pressable>
  );
}

/** 空を横切っていく鳩。翼を上下に打つ */
function FlyingBird({ pigeon, index }: { pigeon: Pigeon; index: number }) {
  const cross = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cross.setValue(0);
    const loop = Animated.loop(
      Animated.timing(cross, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: NATIVE,
      })
    );
    const delay = setTimeout(() => loop.start(), index * 2800);
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
          duration: 190,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(flap, {
          toValue: 0,
          duration: 190,
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
    outputRange: [-44, W + 20],
  });
  const translateY = cross.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -9, 3, -7, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flyer,
        { top: 4 + (index % 3) * 18, transform: [{ translateX }, { translateY }] },
      ]}
    >
      <Animated.View style={{ opacity: flap }}>
        <PigeonFlyer variant={pigeon.variant} size={30} wingsUp />
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: flap.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
        ]}
      >
        <PigeonFlyer variant={pigeon.variant} size={30} wingsUp={false} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  scene: { width: '100%', aspectRatio: W / H, position: 'relative' },
  perch: {
    position: 'absolute',
    width: 40,
    marginLeft: -20,
    alignItems: 'center',
  },
  flyer: { position: 'absolute', left: 0, width: 30, height: 24 },
  count: {
    textAlign: 'center',
    color: theme.inkFaint,
    fontSize: 12,
    marginTop: 8,
    letterSpacing: 1,
  },
});
