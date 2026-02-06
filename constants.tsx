
import { LotteryConfig } from './types.ts';

export const LOTTERY_CONFIGS: LotteryConfig[] = [
  { 
    id: 'new_macau', 
    name: '新澳门六合'
  },
  { 
    id: 'hk_jc', 
    name: '香港六合彩'
  },
  { 
    id: 'old_macau', 
    name: '老澳门六合'
  }
];

export interface NumberInfo {
  zodiac: string;
  color: 'red' | 'blue' | 'green';
  wuxing: string;
  isEven: boolean;
}

// 生肖关系配置
// 三合：明合，大吉
// 六合：暗合，贵人
// 相冲：对立，相克
export const ZODIAC_RELATIONS: Record<string, { friends: string[], clash: string }> = {
  '鼠': { friends: ['龙', '猴', '牛'], clash: '马' },
  '牛': { friends: ['蛇', '鸡', '鼠'], clash: '羊' },
  '虎': { friends: ['马', '狗', '猪'], clash: '猴' },
  '兔': { friends: ['羊', '猪', '狗'], clash: '鸡' },
  '龙': { friends: ['鼠', '猴', '鸡'], clash: '狗' },
  '蛇': { friends: ['牛', '鸡', '猴'], clash: '猪' },
  '马': { friends: ['虎', '狗', '羊'], clash: '鼠' },
  '羊': { friends: ['兔', '猪', '马'], clash: '牛' },
  '猴': { friends: ['鼠', '龙', '蛇'], clash: '虎' },
  '鸡': { friends: ['牛', '蛇', '龙'], clash: '兔' },
  '狗': { friends: ['虎', '马', '兔'], clash: '龙' },
  '猪': { friends: ['兔', '羊', '虎'], clash: '蛇' }
};

// 2025 蛇年映射数据 (包含五行)
export const NUMBER_MAP: Record<number, NumberInfo> = {
  1: { zodiac: '蛇', color: 'red', wuxing: '金', isEven: false },
  2: { zodiac: '龙', color: 'red', wuxing: '金', isEven: true },
  3: { zodiac: '兔', color: 'blue', wuxing: '火', isEven: false },
  4: { zodiac: '虎', color: 'blue', wuxing: '火', isEven: true },
  5: { zodiac: '牛', color: 'green', wuxing: '木', isEven: false },
  6: { zodiac: '鼠', color: 'green', wuxing: '木', isEven: true },
  7: { zodiac: '猪', color: 'red', wuxing: '土', isEven: false },
  8: { zodiac: '狗', color: 'red', wuxing: '土', isEven: true },
  9: { zodiac: '鸡', color: 'blue', wuxing: '金', isEven: false },
  10: { zodiac: '猴', color: 'blue', wuxing: '金', isEven: true },
  11: { zodiac: '羊', color: 'green', wuxing: '水', isEven: false },
  12: { zodiac: '马', color: 'red', wuxing: '水', isEven: true },
  13: { zodiac: '蛇', color: 'red', wuxing: '木', isEven: false },
  14: { zodiac: '龙', color: 'blue', wuxing: '木', isEven: true },
  15: { zodiac: '兔', color: 'blue', wuxing: '土', isEven: false },
  16: { zodiac: '虎', color: 'green', wuxing: '土', isEven: true },
  17: { zodiac: '牛', color: 'green', wuxing: '火', isEven: false },
  18: { zodiac: '鼠', color: 'red', wuxing: '火', isEven: true },
  19: { zodiac: '猪', color: 'red', wuxing: '水', isEven: false },
  20: { zodiac: '狗', color: 'blue', wuxing: '水', isEven: true },
  21: { zodiac: '鸡', color: 'green', wuxing: '木', isEven: false },
  22: { zodiac: '猴', color: 'green', wuxing: '木', isEven: true },
  23: { zodiac: '羊', color: 'red', wuxing: '金', isEven: false },
  24: { zodiac: '马', color: 'red', wuxing: '金', isEven: true },
  25: { zodiac: '蛇', color: 'blue', wuxing: '火', isEven: false },
  26: { zodiac: '龙', color: 'blue', wuxing: '火', isEven: true },
  27: { zodiac: '兔', color: 'green', wuxing: '水', isEven: false },
  28: { zodiac: '虎', color: 'green', wuxing: '水', isEven: true },
  29: { zodiac: '牛', color: 'red', wuxing: '土', isEven: false },
  30: { zodiac: '鼠', color: 'red', wuxing: '土', isEven: true },
  31: { zodiac: '猪', color: 'blue', wuxing: '金', isEven: false },
  32: { zodiac: '狗', color: 'green', wuxing: '金', isEven: true },
  33: { zodiac: '鸡', color: 'green', wuxing: '火', isEven: false },
  34: { zodiac: '猴', color: 'red', wuxing: '火', isEven: true },
  35: { zodiac: '羊', color: 'red', wuxing: '木', isEven: false },
  36: { zodiac: '马', color: 'blue', wuxing: '木', isEven: true },
  37: { zodiac: '蛇', color: 'blue', wuxing: '土', isEven: false },
  38: { zodiac: '龙', color: 'green', wuxing: '土', isEven: true },
  39: { zodiac: '兔', color: 'green', wuxing: '金', isEven: false },
  40: { zodiac: '虎', color: 'red', wuxing: '金', isEven: true },
  41: { zodiac: '牛', color: 'blue', wuxing: '水', isEven: false },
  42: { zodiac: '鼠', color: 'blue', wuxing: '水', isEven: true },
  43: { zodiac: '猪', color: 'green', wuxing: '木', isEven: false },
  44: { zodiac: '狗', color: 'green', wuxing: '木', isEven: true },
  45: { zodiac: '鸡', color: 'red', wuxing: '土', isEven: false },
  46: { zodiac: '猴', color: 'red', wuxing: '土', isEven: true },
  47: { zodiac: '羊', color: 'blue', wuxing: '火', isEven: false },
  48: { zodiac: '马', color: 'blue', wuxing: '火', isEven: true },
  49: { zodiac: '蛇', color: 'green', wuxing: '水', isEven: false }
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
