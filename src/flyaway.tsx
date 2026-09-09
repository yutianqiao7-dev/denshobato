import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { PigeonFlyer } from './pigeonArt';

const NATIVE = Platform.OS !== 'web';

type Request = { variant?: string; onDone?: () => void };

let show: ((request: Request) => void) | null = null;

/**
 * 鳩が飛び立つところを見せる。
 * 手放したことが取り消せないので、一度きちんと飛ばしてから次の画面に移る。
 */
export function flyAway(variant?: string, onDone?: () => void): void {
  if (show) show({ variant, onDone });
  else onDone?.();
}

/** アプリのどこかに一つ置いておく */
export function FlyAwayHost() {
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    show = setRequest;
    return () => {
      show = null;
    };
  }, []);

  if (!request) return null;

  // 渡す画面や手紙の画面より前に出したいので、いちばん上に重ねる
  return (
    <Modal visible transparent animationType="none">
      <Flight
        variant={request.variant}
        onDone={() => {
          setRequest(null);
          request.onDone?.();
        }}
      />
    </Modal>
  );
}

const DURATION = 1500;

function Flight({
  variant,
  onDone,
}: {
  variant?: string;
  onDone: () => void;
}) {
  const { width, height } = Dimensions.get('window');
  const progress = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      onDone();
    };

    const wings = Animated.loop(
      Animated.sequence([
        Animated.timing(flap, {
          toValue: 1,
          duration: 130,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(flap, {
          toValue: 0,
          duration: 130,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
      ])
    );
    wings.start();

    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.in(Easing.quad),
      useNativeDriver: NATIVE,
    }).start(({ finished }) => {
      wings.stop();
      if (finished) finish();
    });

    // 画面が裏に回るなどして描画が止まると、アニメーションは進まない。
    // 演出のために手が止まったままにはしないよう、時間で必ず先へ進める。
    const guard = setTimeout(finish, DURATION + 900);

    return () => {
      clearTimeout(guard);
      wings.stop();
      progress.stopAnimation();
    };
    // 一度きりの演出なので、開始後は何があっても最後まで飛ばす
  }, []);

  // 手前から飛び立って、羽ばたきながら遠ざかっていく
  const translateY = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [height * 0.34, height * 0.06, -height * 0.28],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, width * 0.1, width * 0.36],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1.35, 0.28],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [1, 1, 0],
  });

  const size = Math.min(width * 0.34, 150);

  return (
    <View pointerEvents="none" style={styles.sky}>
      <Animated.View
        style={{
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        }}
      >
        <View style={{ width: size, height: (size * 30) / 48 }}>
          <Animated.View style={{ opacity: flap }}>
            <PigeonFlyer variant={variant} size={size} wingsUp />
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
            <PigeonFlyer variant={variant} size={size} wingsUp={false} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
});
