import { Place } from './types';

export const CITIES: { group: string; places: Place[] }[] = [
  {
    group: '日本',
    places: [
      { name: '札幌', lat: 43.0618, lng: 141.3545 },
      { name: '仙台', lat: 38.2682, lng: 140.8694 },
      { name: '東京', lat: 35.6812, lng: 139.7671 },
      { name: '横浜', lat: 35.4437, lng: 139.638 },
      { name: '金沢', lat: 36.5613, lng: 136.6562 },
      { name: '名古屋', lat: 35.1709, lng: 136.8815 },
      { name: '京都', lat: 35.0116, lng: 135.7681 },
      { name: '大阪', lat: 34.7025, lng: 135.4959 },
      { name: '広島', lat: 34.3853, lng: 132.4553 },
      { name: '松山', lat: 33.8416, lng: 132.7657 },
      { name: '福岡', lat: 33.5904, lng: 130.4017 },
      { name: '那覇', lat: 26.2124, lng: 127.6809 },
    ],
  },
  {
    group: 'アジア',
    places: [
      { name: 'ソウル', lat: 37.5665, lng: 126.978 },
      { name: '台北', lat: 25.033, lng: 121.5654 },
      { name: '上海', lat: 31.2304, lng: 121.4737 },
      { name: '香港', lat: 22.3193, lng: 114.1694 },
      { name: 'シンガポール', lat: 1.3521, lng: 103.8198 },
      { name: 'バンコク', lat: 13.7563, lng: 100.5018 },
      { name: 'デリー', lat: 28.6139, lng: 77.209 },
    ],
  },
  {
    group: '世界',
    places: [
      { name: 'シドニー', lat: -33.8688, lng: 151.2093 },
      { name: 'ホノルル', lat: 21.3069, lng: -157.8583 },
      { name: 'サンフランシスコ', lat: 37.7749, lng: -122.4194 },
      { name: 'ニューヨーク', lat: 40.7128, lng: -74.006 },
      { name: 'サンパウロ', lat: -23.5505, lng: -46.6333 },
      { name: 'ロンドン', lat: 51.5074, lng: -0.1278 },
      { name: 'パリ', lat: 48.8566, lng: 2.3522 },
      { name: 'ベルリン', lat: 52.52, lng: 13.405 },
      { name: 'カイロ', lat: 30.0444, lng: 31.2357 },
      { name: 'ケープタウン', lat: -33.9249, lng: 18.4241 },
    ],
  },
];

export const ALL_CITIES = CITIES.flatMap((g) => g.places);

export const RING_COLORS = [
  '#B4552D',
  '#3C6E71',
  '#7A5C9E',
  '#C08A2E',
  '#4A7A3C',
  '#A03E5B',
];

export const PIGEON_EMOJI = ['🕊️', '🐦', '🦜', '🐧', '🦉', '🐤'];

/** 宛先につける目印 */
export const AVATAR_EMOJI = [
  '🏡',
  '🌊',
  '🌾',
  '🏔️',
  '🌸',
  '📚',
  '🍵',
  '🌙',
];

/** 鳩を迎えるときの名前の候補 */
export const PIGEON_NAMES = [
  'ぽっぽ',
  'ゆき',
  'すみ',
  'あおば',
  'こはく',
  'てつ',
  'なぎ',
  'ひばり',
  'くるみ',
  'みなも',
];
