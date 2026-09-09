import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

/**
 * 鳩の羽色。カワラバトに実際にいる色変わりから。
 * back=背 breast=胸 wing=翼 dark=翼帯と尾羽の帯 head=頭
 * neck/neck2=首の光沢（緑と紫）
 */
export type Plumage = {
  id: string;
  label: string;
  back: string;
  breast: string;
  wing: string;
  dark: string;
  head: string;
  neck: string;
  neck2: string;
};

/** 脚とくちばしは色変わりを問わずだいたい同じ */
const FOOT = '#C0645C';
const BEAK = '#4E4A46';
const CERE = '#EFE9E0';
const EYE = '#D8862F';
const PUPIL = '#1C1712';

export const PLUMAGES: Plumage[] = [
  {
    id: 'blue',
    label: '青',
    back: '#9AA4B1',
    breast: '#8E97A4',
    wing: '#8B95A2',
    dark: '#3A414C',
    head: '#767F8D',
    neck: '#4E9C7A',
    neck2: '#8B6FA6',
  },
  {
    id: 'checker',
    label: '斑',
    back: '#8B94A0',
    breast: '#828A96',
    wing: '#6F7885',
    dark: '#2C323B',
    head: '#666F7C',
    neck: '#4A9370',
    neck2: '#7D63A0',
  },
  {
    id: 'white',
    label: '白',
    back: '#EFEBE3',
    breast: '#F4F1EA',
    wing: '#E4DFD5',
    dark: '#BDB4A5',
    head: '#EDE9E1',
    neck: '#D7CFBE',
    neck2: '#C9BFC9',
  },
  {
    id: 'red',
    label: '赤',
    back: '#AE8264',
    breast: '#A67C5E',
    wing: '#96694C',
    dark: '#5A3A28',
    head: '#8E6349',
    neck: '#9C8A55',
    neck2: '#8C6A7A',
  },
  {
    id: 'black',
    label: '黒',
    back: '#5F626B',
    breast: '#585B63',
    wing: '#4C4F57',
    dark: '#24262C',
    head: '#4A4D55',
    neck: '#4A8168',
    neck2: '#6B5B84',
  },
  {
    id: 'mealy',
    label: '淡',
    back: '#CFBEA6',
    breast: '#C8B69D',
    wing: '#BCA88C',
    dark: '#8A684B',
    head: '#BCAA90',
    neck: '#9AA87F',
    neck2: '#A98F92',
  },
];

/** 名前や id から、いつも同じ羽色を引く */
export function variantFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PLUMAGES[hash % PLUMAGES.length].id;
}

export function plumage(id?: string): Plumage {
  return PLUMAGES.find((p) => p.id === id) ?? PLUMAGES[0];
}

export type Pose =
  /** ふつうに立っている */
  | 'stand'
  /** 羽を伸ばしている */
  | 'wings'
  /** 羽をふくらませてうずくまっている */
  | 'fluff';

/**
 * 止まっている鳩。右を向いている。
 * viewBox は 48×40 で、足が y=36 に来る。
 */
export function PigeonMark({
  variant,
  size,
  flip = false,
  pose = 'stand',
}: {
  variant?: string;
  /** 省略すると親の大きさいっぱいに描く */
  size?: number;
  flip?: boolean;
  pose?: Pose;
}) {
  const p = plumage(variant);
  const w = size === undefined ? '100%' : size;
  const h = size === undefined ? '100%' : (size * 40) / 48;
  return (
    <Svg width={w} height={h} viewBox="0 0 48 40">
      <G transform={flip ? 'translate(48,0) scale(-1,1)' : undefined}>
        {pose === 'fluff' ? <Fluffed p={p} /> : <Upright p={p} pose={pose} />}
      </G>
    </Svg>
  );
}

function Upright({ p, pose }: { p: Plumage; pose: Pose }) {
  return (
    <>
      {/* 尾羽 */}
      <Path d="M 13 22.5 L 1 27.4 L 2.2 31.2 L 14.5 28.2 Z" fill={p.wing} />
      <Path d="M 1.6 29.3 L 13.6 26.4 L 14.1 28 L 2.2 31.2 Z" fill={p.dark} />

      {/* 胴と胸 */}
      <Ellipse cx="24" cy="23" rx="12.4" ry="9.4" fill={p.back} />
      <Ellipse cx="31.5" cy="24.4" rx="6.6" ry="7.1" fill={p.breast} />

      {/* 首から頭 */}
      <Path
        d="M 30 19.5 Q 30.4 12.6 35 10.4 Q 40.8 10 41 15 Q 39 21 32 22 Z"
        fill={p.head}
      />
      <Circle cx="37.4" cy="13" r="5.8" fill={p.head} />

      {/* 首の光沢。緑に紫が重なる */}
      <Path d="M 31.6 17 Q 35.6 15.4 39.4 17.6 Q 36.6 22.6 32 22.2 Z" fill={p.neck} />
      <Path d="M 32.4 20 Q 35.6 19 38.2 20.4 Q 36 23 32.6 22.6 Z" fill={p.neck2} opacity={0.85} />

      {/* くちばしと鼻瘤 */}
      <Path d="M 42.4 12.4 L 47.2 13.7 L 42.4 15.3 Z" fill={BEAK} />
      <Ellipse cx="42" cy="10.6" rx="2.4" ry="1.6" fill={CERE} />

      {/* 目 */}
      <Circle cx="38.9" cy="11.5" r="2.1" fill={EYE} />
      <Circle cx="38.9" cy="11.5" r="1.0" fill={PUPIL} />

      {pose === 'wings' ? (
        <>
          {/* 伸ばした翼 */}
          <Path d="M 22 19 Q 14.5 6 4.5 2.6 Q 10.6 11.6 17 20 Z" fill={p.dark} opacity={0.75} />
          <Path d="M 25 18.4 Q 20.6 4.6 10.6 1 Q 16.6 8.8 21 19.4 Z" fill={p.wing} />
        </>
      ) : (
        <>
          {/* たたんだ翼 */}
          <Path
            d="M 13.2 18.2 Q 24 12.4 32.8 18.6 Q 30.8 28 21 29.2 Q 13.6 27.2 13.2 18.2 Z"
            fill={p.wing}
          />
          {/* 翼帯 */}
          <Path
            d="M 16 22.6 Q 24 21 30.4 22.4"
            stroke={p.dark}
            strokeWidth="1.9"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M 15.6 25.8 Q 23.6 24.6 29.4 25.8"
            stroke={p.dark}
            strokeWidth="1.9"
            strokeLinecap="round"
            fill="none"
          />
          {/* 風切羽の先。尾に重なる */}
          <Path d="M 14 26.4 L 3.4 29.6 L 4 31.2 L 15 28.4 Z" fill={p.dark} opacity={0.85} />
        </>
      )}

      {/* 脚 */}
      <Path d="M 23 31.4 L 22 35.4" stroke={FOOT} strokeWidth="1.7" strokeLinecap="round" />
      <Path d="M 27.4 31.4 L 28.4 35.4" stroke={FOOT} strokeWidth="1.7" strokeLinecap="round" />
      <Path d="M 19.8 36 L 24.2 36" stroke={FOOT} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M 26.2 36 L 30.6 36" stroke={FOOT} strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

/** 羽をふくらませて、脚を隠してうずくまった姿 */
function Fluffed({ p }: { p: Plumage }) {
  return (
    <>
      <Path d="M 12 24 L 1.5 28.6 L 3 32.4 L 14 29.6 Z" fill={p.wing} />
      <Path d="M 2.2 30.6 L 13 27.8 L 13.6 29.4 L 3 32.4 Z" fill={p.dark} />

      {/* まるく膨らんだ胴 */}
      <Ellipse cx="24" cy="25" rx="13.4" ry="10.8" fill={p.back} />
      <Ellipse cx="31" cy="26.5" rx="7" ry="8.4" fill={p.breast} />

      {/* 首をひっこめた頭 */}
      <Circle cx="35.4" cy="16.6" r="6.2" fill={p.head} />
      <Path d="M 30 20.6 Q 33.6 18.8 37.4 21 Q 34.6 25.6 30.4 25 Z" fill={p.neck} opacity={0.9} />

      <Path d="M 40.6 16.2 L 45.2 17.4 L 40.6 19 Z" fill={BEAK} />
      <Ellipse cx="40.2" cy="14.4" rx="2.4" ry="1.6" fill={CERE} />
      <Circle cx="37" cy="15.2" r="2.0" fill={EYE} />
      <Circle cx="37" cy="15.2" r="0.95" fill={PUPIL} />

      {/* たたんだ翼 */}
      <Path
        d="M 12.6 20.6 Q 24 14.6 32.4 21 Q 30.4 31.4 20.6 32.6 Q 13 30.4 12.6 20.6 Z"
        fill={p.wing}
      />
      <Path
        d="M 15.4 25.4 Q 23.6 23.8 30 25.2"
        stroke={p.dark}
        strokeWidth="1.9"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M 15 28.8 Q 23.2 27.6 29 28.8"
        stroke={p.dark}
        strokeWidth="1.9"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

/** 飛んでいる鳩。翼を上げた形と下げた形を切り替えて羽ばたかせる */
export function PigeonFlyer({
  variant,
  size,
  wingsUp = true,
  flip = false,
}: {
  variant?: string;
  /** 省略すると親の大きさいっぱいに描く */
  size?: number;
  wingsUp?: boolean;
  flip?: boolean;
}) {
  const p = plumage(variant);
  const w = size === undefined ? '100%' : size;
  const h = size === undefined ? '100%' : (size * 30) / 48;
  return (
    <Svg width={w} height={h} viewBox="0 0 48 30">
      <G transform={flip ? 'translate(48,0) scale(-1,1)' : undefined}>
        {/* 尾 */}
        <Path d="M 12 15 L 1 12.6 L 1.4 19 L 12.6 18.6 Z" fill={p.wing} />
        <Path d="M 1.2 16.4 L 12.4 16.4 L 12.6 18.2 L 1.4 19 Z" fill={p.dark} opacity={0.9} />

        {/* 胴 */}
        <Ellipse cx="24" cy="16" rx="11.6" ry="5.6" fill={p.back} />
        <Ellipse cx="31" cy="16.6" rx="5.2" ry="4.6" fill={p.breast} />

        {/* 頭 */}
        <Circle cx="37" cy="13.4" r="4.6" fill={p.head} />
        <Path d="M 41.4 13 L 46 14 L 41.4 15.4 Z" fill={BEAK} />
        <Ellipse cx="41" cy="11.6" rx="2" ry="1.3" fill={CERE} />
        <Circle cx="38.4" cy="12.2" r="1.7" fill={EYE} />
        <Circle cx="38.4" cy="12.2" r="0.8" fill={PUPIL} />

        {/* 翼 */}
        {wingsUp ? (
          <>
            <Path d="M 22 12.4 Q 17 1.4 6 0.6 Q 13 7 18 13.4 Z" fill={p.dark} opacity={0.7} />
            <Path d="M 26 12 Q 22 0.8 11 0 Q 18 6.4 22 13 Z" fill={p.wing} />
          </>
        ) : (
          <>
            <Path d="M 22 19 Q 17 28.6 6 29.4 Q 13 23 18 18 Z" fill={p.dark} opacity={0.7} />
            <Path d="M 26 19.4 Q 22 29.2 11 30 Q 18 24 22 18.6 Z" fill={p.wing} />
          </>
        )}
      </G>
    </Svg>
  );
}
