
import { LotteryConfig } from './types';

export const LOTTERY_CONFIGS: LotteryConfig[] = [
  { 
    id: 'new_macau', 
    name: '新澳门六合', 
    apiUrl: 'https://api.example.com/lottery/new' 
  },
  { 
    id: 'hk_jc', 
    name: '香港六合彩', 
    apiUrl: 'https://api.example.com/lottery/hk' 
  },
  { 
    id: 'old_macau', 
    name: '老澳门六合', 
    apiUrl: 'https://api.example.com/lottery/macau' 
  }
];

export interface NumberInfo {
  zodiac: string;
  color: 'red' | 'blue' | 'green';
  isEven: boolean;
}

// 2025 蛇年映射数据
export const NUMBER_MAP: Record<number, NumberInfo> = {
  1: { zodiac: '蛇', color: 'red', isEven: false },
  2: { zodiac: '龙', color: 'red', isEven: true },
  3: { zodiac: '兔', color: 'blue', isEven: false },
  4: { zodiac: '虎', color: 'blue', isEven: true },
  5: { zodiac: '牛', color: 'green', isEven: false },
  6: { zodiac: '鼠', color: 'green', isEven: true },
  7: { zodiac: '猪', color: 'red', isEven: false },
  8: { zodiac: '狗', color: 'red', isEven: true },
  9: { zodiac: '鸡', color: 'blue', isEven: false },
  10: { zodiac: '猴', color: 'blue', isEven: true },
  11: { zodiac: '羊', color: 'green', isEven: false },
  12: { zodiac: '马', color: 'red', isEven: true },
  13: { zodiac: '蛇', color: 'red', isEven: false },
  14: { zodiac: '龙', color: 'blue', isEven: true },
  15: { zodiac: '兔', color: 'blue', isEven: false },
  16: { zodiac: '虎', color: 'green', isEven: true },
  17: { zodiac: '牛', color: 'green', isEven: false },
  18: { zodiac: '鼠', color: 'red', isEven: true },
  19: { zodiac: '猪', color: 'red', isEven: false },
  20: { zodiac: '狗', color: 'blue', isEven: true },
  21: { zodiac: '鸡', color: 'green', isEven: false },
  22: { zodiac: '猴', color: 'green', isEven: true },
  23: { zodiac: '羊', color: 'red', isEven: false },
  24: { zodiac: '马', color: 'red', isEven: true },
  25: { zodiac: '蛇', color: 'blue', isEven: false },
  26: { zodiac: '龙', color: 'blue', isEven: true },
  27: { zodiac: '兔', color: 'green', isEven: false },
  28: { zodiac: '虎', color: 'green', isEven: true },
  29: { zodiac: '牛', color: 'red', isEven: false },
  30: { zodiac: '鼠', color: 'red', isEven: true },
  31: { zodiac: '猪', color: 'blue', isEven: false },
  32: { zodiac: '狗', color: 'green', isEven: true },
  33: { zodiac: '鸡', color: 'green', isEven: false },
  34: { zodiac: '猴', color: 'red', isEven: true },
  35: { zodiac: '羊', color: 'red', isEven: false },
  36: { zodiac: '马', color: 'blue', isEven: true },
  37: { zodiac: '蛇', color: 'blue', isEven: false },
  38: { zodiac: '龙', color: 'green', isEven: true },
  39: { zodiac: '兔', color: 'green', isEven: false },
  40: { zodiac: '虎', color: 'red', isEven: true },
  41: { zodiac: '牛', color: 'blue', isEven: false },
  42: { zodiac: '鼠', color: 'blue', isEven: true },
  43: { zodiac: '猪', color: 'green', isEven: false },
  44: { zodiac: '狗', color: 'green', isEven: true },
  45: { zodiac: '鸡', color: 'red', isEven: false },
  46: { zodiac: '猴', color: 'red', isEven: true },
  47: { zodiac: '羊', color: 'blue', isEven: false },
  48: { zodiac: '马', color: 'blue', isEven: true },
  49: { zodiac: '蛇', color: 'green', isEven: false }
};

export const COLORS = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  SPECIAL: 'bg-purple-600'
};

export const COLOR_NAMES = {
  red: '红',
  blue: '蓝',
  green: '绿'
};

export const getNumberColor = (num: number): string => {
  return COLORS[NUMBER_MAP[num]?.color] || 'bg-slate-500';
};
