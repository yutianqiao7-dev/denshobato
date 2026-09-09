import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

/**
 * 鳩の羽色。カワラバトに実際にいる色変わりから。
 * body=胴 wing=翼 dark=風切と翼帯 head=頭 neck=首の光沢 foot=脚
 */
export type Plumage = {
  id: string;
  label: string;
  body: string;
  wing: string;
  dark: string;
  head: string;
  neck: string;
  foot: string;
};

export const PLUMAGES: Plumage[] = [
  {
    id: 'blue',
    label: '青',
    body: '#97A3B2',
    wing: '#84909F',
    dark: '#3E4653',
    head: '#7F8C9C',
    neck: '#5FA98A',
    foot: '#C4756A',
  },
  {
    id: 'checker',
    label: '斑',
    body: '#8A93A0',
    wing: '#6E7885',
    dark: '#2F3742',
    head: '#69737F',
    neck: '#7E7BB0',
    foot: '#C4756A',
  },
  {
    id: 'white',
    label: '白',
    body: '#F0EDE6',
    wing: '#E2DED4',
    dark: '#C3BCAE',
    head: '#F4F1EB',
    neck: '#DCD6C8',
    foot: '#D08A7C',
  },
  {
    id: 'red',
    label: '赤',
    body: '#B08265',
    wing: '#96684D',
    dark: '#5E3D2B',
    head: '#9C7057',
    neck: '#B08A5E',
    foot: '#C4756A',
  },
  {
    id: 'black',
    label: '黒',
    body: '#5A5D66',
    wing: '#4A4C55',
    dark: '#26282F',
    head: '#4E5059',
    neck: '#5C8F79',
    foot: '#B96A60',
  },
  {
    id: 'mealy',
    label: '淡',
    body: '#CDBBA3',
    wing: '#BCA88E',
    dark: '#8C6A4E',
    head: '#C2AF95',
    neck: '#A9B58E',
    foot: '#D08A7C',
  },
];

const beakColor = '#5C5148';
const cereColor = '#EDE6DC';

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

/** 止まっている鳩。横向きで、右を向いている */
export function PigeonMark({
  variant,
  size = 34,
  flip = false,
}: {
  variant?: string;
  size?: number;
  flip?: boolean;
}) {
  const p = plumage(variant);
  return (
    <Svg width={size} height={size * 0.85} viewBox="0 0 40 34">
      <G transform={flip ? 'translate(40,0) scale(-1,1)' : undefined}>
        {/* 尾羽 */}
        <Path d="M 10 16 L 0.5 12 L 1.5 22.5 L 11 23 Z" fill={p.wing} />
        <Path d="M 1.2 20 L 10.8 21.4 L 10.8 23 L 1.5 22.5 Z" fill={p.dark} />

        {/* 胴 */}
        <Ellipse cx="19" cy="19" rx="11" ry="8.4" fill={p.body} />

        {/* 首から頭 */}
        <Path
          d="M 24.5 13 Q 26.5 7.5 30 7 Q 33.4 7.6 32.8 13.2 Q 30 17.4 24.5 17 Z"
          fill={p.head}
        />
        <Circle cx="30" cy="10.6" r="4.7" fill={p.head} />
        {/* 首の光沢 */}
        <Path
          d="M 25.6 14 Q 28.8 12.9 31.6 14.2 Q 29.6 17.6 26 17.2 Z"
          fill={p.neck}
          opacity={0.85}
        />

        {/* くちばしと鼻瘤 */}
        <Path d="M 34.4 10.4 L 38.4 11.6 L 34.4 12.9 Z" fill={beakColor} />
        <Ellipse cx="34.1" cy="9.6" rx="1.7" ry="1.05" fill={cereColor} />

        {/* 目。虹彩は橙 */}
        <Circle cx="31.3" cy="9.5" r="1.55" fill="#E0913F" />
        <Circle cx="31.3" cy="9.5" r="0.8" fill="#241C16" />

        {/* たたんだ翼 */}
        <Path
          d="M 11.5 15.2 Q 19.5 10.8 27 15 Q 24.5 23.4 15 23.4 Q 10.6 20.4 11.5 15.2 Z"
          fill={p.wing}
        />
        {/* 翼帯。カワラバトの二本線 */}
        <Path
          d="M 13.6 18.4 Q 19.6 17.4 25 18.2"
          stroke={p.dark}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 13.6 21 Q 19.4 20.2 24.4 21"
          stroke={p.dark}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* 脚 */}
        <Path d="M 17.8 26.8 L 17.2 30" stroke={p.foot} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M 21.8 26.8 L 22.4 30" stroke={p.foot} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M 15.4 30.4 L 19 30.4" stroke={p.foot} strokeWidth="1.4" strokeLinecap="round" />
        <Path d="M 20.8 30.4 L 24.4 30.4" stroke={p.foot} strokeWidth="1.4" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

/** 飛んでいる鳩。翼を上げた形と下げた形を切り替えて羽ばたかせる */
export function PigeonFlyer({
  variant,
  size = 30,
  wingsUp = true,
  flip = false,
}: {
  variant?: string;
  size?: number;
  wingsUp?: boolean;
  flip?: boolean;
}) {
  const p = plumage(variant);
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 40 32">
      <G transform={flip ? 'translate(40,0) scale(-1,1)' : undefined}>
        {/* 尾 */}
        <Path d="M 8 17 L 0.5 14 L 1 20 L 9 20.5 Z" fill={p.wing} />
        {/* 胴 */}
        <Ellipse cx="19" cy="17.5" rx="10" ry="5.4" fill={p.body} />
        {/* 頭 */}
        <Circle cx="29.5" cy="14.6" r="4.2" fill={p.head} />
        <Path d="M 33.4 14.4 L 37.4 15.4 L 33.4 16.6 Z" fill={beakColor} />
        <Circle cx="30.6" cy="13.6" r="1.3" fill="#E0913F" />
        <Circle cx="30.6" cy="13.6" r="0.65" fill="#241C16" />
        {/* 翼 */}
        {wingsUp ? (
          <>
            <Path
              d="M 20 14 Q 15 2 6.5 1.5 Q 12 9 15.5 15 Z"
              fill={p.wing}
            />
            <Path d="M 20 14 Q 24 4 31 3" stroke={p.dark} strokeWidth="1.2" fill="none" opacity={0.5} />
          </>
        ) : (
          <>
            <Path
              d="M 20 20 Q 15 30 6 31 Q 12 24 15.5 19.5 Z"
              fill={p.wing}
            />
            <Path d="M 20 20 Q 24 28 30 30" stroke={p.dark} strokeWidth="1.2" fill="none" opacity={0.5} />
          </>
        )}
      </G>
    </Svg>
  );
}
