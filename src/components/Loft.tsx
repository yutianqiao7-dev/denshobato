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
import { Letter, Pigeon } from '../types';
import { Health, healthOf } from '../flock';
import { theme } from '../theme';

const NATIVE = Platform.OS !== 'web';

/** 小屋の絵の基準サイズ。実寸はこの比率で伸び縮みする */
const W = 320;
const H = 210;
/** 止まり木の高さと、その左右の余白 */
const BOARD_Y = 168;
const BOARD_INSET = 34;

const wood = {
  roof: '#8C5A3C',
  roofShade: '#7A4B30',
  wall: '#C89A6B',
  wallShade: '#B4855A',
  plank: '#A87A50',
  hole: '#4A3524',
  board: '#9C6F49',
  post: '#7A4B30',
};

/** 調子ごとの、鳩の動きかた */
const MOTION: Record<Health, { bob: number; period: number; opacity: number }> = {
  fine: { bob: 5, period: 1500, opacity: 1 },
  hungry: { bob: 3, period: 2300, opacity: 0.9 },
  weak: { bob: 1.5, period: 3400, opacity: 0.6 },
  dead: { bob: 0, period: 4000, opacity: 0.3 },
};

export function Loft({
  pigeons,
  flying,
  letters,
  now,
  onSelect,
}: {
  /** 止まり木にいる鳩 */
  pigeons: Pigeon[];
  /** 空を飛んでいる鳩 */
  flying: Pigeon[];
  letters: Letter[];
  now: number;
  onSelect: (pigeon: Pigeon) => void;
}) {
  // 止まり木の上に等間隔で並べる
  const slots = useMemo(() => {
    const n = pigeons.length;
    if (n === 0) return [];
    const usable = W - BOARD_INSET * 2;
    return pigeons.map((_, i) => BOARD_INSET + (usable * (i + 0.5)) / n);
  }, [pigeons]);

  return (
    <View style={styles.wrap}>
      <View style={styles.scene}>
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          {/* 空 */}
          <Rect x="0" y="0" width={W} height={H} fill="none" />

          {/* 屋根 */}
          <Path
            d={`M ${W / 2} 14 L ${W - 26} 74 L 26 74 Z`}
            fill={wood.roof}
          />
          <Path
            d={`M ${W / 2} 14 L ${W - 26} 74 L ${W / 2} 74 Z`}
            fill={wood.roofShade}
          />
          {/* 屋根のふち */}
          <Rect x="20" y="72" width={W - 40} height="8" rx="3" fill={wood.roofShade} />

          {/* 壁 */}
          <Rect x="44" y="78" width={W - 88} height="86" rx="4" fill={wood.wall} />
          {/* 板の継ぎ目 */}
          {[0, 1, 2, 3].map((i) => (
            <Rect
              key={i}
              x="44"
              y={92 + i * 20}
              width={W - 88}
              height="1.5"
              fill={wood.plank}
              opacity={0.55}
            />
          ))}
          <Rect x={W - 62} y="78" width="18" height="86" fill={wood.wallShade} opacity={0.5} />

          {/* 出入り口。鳩はここから小屋に入る */}
          {[0, 1, 2].map((i) => {
            const x = 74 + i * 58;
            return (
              <G key={i}>
                <Path
                  d={`M ${x} 138 L ${x} 112 A 15 15 0 0 1 ${x + 30} 112 L ${x + 30} 138 Z`}
                  fill={wood.hole}
                />
                <Ellipse cx={x + 15} cy="120" rx="9" ry="7" fill="#000" opacity={0.25} />
              </G>
            );
          })}

          {/* 止まり木 */}
          <Rect
            x={BOARD_INSET - 6}
            y={BOARD_Y}
            width={W - (BOARD_INSET - 6) * 2}
            height="9"
            rx="4"
            fill={wood.board}
          />
          {/* 支柱 */}
          <Rect x={W / 2 - 7} y={BOARD_Y + 9} width="14" height="28" fill={wood.post} />
          <Rect x={W / 2 - 26} y={H - 12} width="52" height="9" rx="4" fill={wood.post} />
        </Svg>

        {/* 空を横切る鳩 */}
        {flying.map((pigeon, i) => (
          <FlyingBird key={pigeon.id} pigeon={pigeon} index={i} />
        ))}

        {/* 止まり木の鳩 */}
        {pigeons.map((pigeon, i) => (
          <PerchedBird
            key={pigeon.id}
            pigeon={pigeon}
            now={now}
            leftPercent={(slots[i] / W) * 100}
            showName={pigeons.length <= 4}
            onPress={() => onSelect(pigeon)}
          />
        ))}
      </View>

      {pigeons.length === 0 && flying.length === 0 && (
        <Text style={styles.empty}>小屋は空っぽです</Text>
      )}
    </View>
  );
}

/** 止まり木の上でゆれている鳩。調子が悪いほど動かない */
function PerchedBird({
  pigeon,
  now,
  leftPercent,
  showName,
  onPress,
}: {
  pigeon: Pigeon;
  now: number;
  leftPercent: number;
  showName: boolean;
  onPress: () => void;
}) {
  const health = healthOf(pigeon, now);
  const motion = MOTION[health];
  const bob = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;

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
    const jump = () => {
      if (!alive) return;
      Animated.sequence([
        Animated.timing(hop, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(hop, {
          toValue: 0,
          duration: 220,
          easing: Easing.bounce,
          useNativeDriver: NATIVE,
        }),
      ]).start(() => {
        timer = setTimeout(jump, 3000 + Math.random() * 7000);
      });
    };
    let timer = setTimeout(jump, 2000 + Math.random() * 6000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [hop, health]);

  const translateY = Animated.add(
    bob.interpolate({ inputRange: [0, 1], outputRange: [0, -motion.bob] }),
    hop.interpolate({ inputRange: [0, 1], outputRange: [0, -14] })
  );

  return (
    <Pressable
      onPress={onPress}
      style={[styles.perch, { left: `${leftPercent}%` }]}
      accessibilityLabel={`${pigeon.name}`}
    >
      <Animated.View
        style={{
          transform: [{ translateY }, { rotate: health === 'weak' ? '8deg' : '0deg' }],
          opacity: motion.opacity,
        }}
      >
        <Text style={styles.bird}>{pigeon.emoji}</Text>
      </Animated.View>
      {showName && (
        <Text style={styles.tag} numberOfLines={1}>
          {pigeon.name}
        </Text>
      )}
    </Pressable>
  );
}

/** 空を横切っていく鳩 */
function FlyingBird({ pigeon, index }: { pigeon: Pigeon; index: number }) {
  const cross = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cross.setValue(0);
    const loop = Animated.loop(
      Animated.timing(cross, {
        toValue: 1,
        duration: 11000,
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

  const translateX = cross.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 360],
  });
  const translateY = cross.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -8, 2, -6, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flyer,
        { top: 8 + (index % 2) * 22, transform: [{ translateX }, { translateY }] },
      ]}
    >
      <Text style={styles.flyerBird}>{pigeon.emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  scene: {
    width: '100%',
    aspectRatio: W / H,
    position: 'relative',
  },
  perch: {
    position: 'absolute',
    // 止まり木の板の上に立たせる
    top: `${((BOARD_Y - 29) / H) * 100}%`,
    width: 46,
    marginLeft: -23,
    alignItems: 'center',
  },
  bird: { fontSize: 24 },
  tag: {
    fontSize: 10,
    color: theme.inkSoft,
    marginTop: 20,
    maxWidth: 60,
  },
  flyer: { position: 'absolute', left: 0 },
  flyerBird: { fontSize: 16, opacity: 0.8 },
  empty: {
    textAlign: 'center',
    color: theme.inkFaint,
    fontSize: 13,
    marginTop: -8,
  },
});
