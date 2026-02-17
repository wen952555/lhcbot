
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

// 2026 马年标准生肖顺序 (Index 0 = 1号的生肖)
// 顺序: 马->蛇->龙->兔->虎->牛->鼠->猪->狗->鸡->猴->羊
const ZODIAC_SEQ = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];
const TARGET_YEAR = 2026; // 当前 NUMBER_MAP 配置对应的年份

// 用于预测展示的日期（强制使用未来/马年配置，设为2026春节后）
export const PREDICTION_DATE = '2026-02-18';

/**
 * 核心逻辑：根据开奖日期动态修正生肖
 * 
 * 原理：
 * 2026年 1号=马 (Index 0)
 * 2025年 1号=蛇 (Index 1) -> 偏移+1
 * 2024年 1号=龙 (Index 2) -> 偏移+2
 */
export const getZodiacByYear = (num: number, dateStr?: string): string => {
  // 如果没有提供日期，默认使用当前时间
  const targetDateStr = dateStr || new Date().toISOString();

  // 1. 提取年份
  let year = parseInt(targetDateStr.substring(0, 4));
  if (isNaN(year)) return NUMBER_MAP[num]?.zodiac || '';

  // 2. 农历年份修正
  const month = parseInt(targetDateStr.substring(5, 7));
  const day = parseInt(targetDateStr.substring(8, 10));

  // 针对2026年春节 (2月17日) 的特殊处理
  if (year === 2026) {
    // 2月17日之前属于蛇年 (2025)
    if (!isNaN(month) && (month < 2 || (month === 2 && !isNaN(day) && day < 17))) {
      year -= 1;
    }
  } else {
    // 其他年份简单算法: 1月份通常属于上一年
    if (!isNaN(month) && month === 1) {
      year -= 1; 
    }
  }

  // 如果年份 >= 2026，直接用现在的表 (且仅当确实是2026之后的数据)
  if (year >= TARGET_YEAR) return NUMBER_MAP[num]?.zodiac || '';

  // 3. 计算偏移量
  const yearOffset = TARGET_YEAR - year; // 例如 2025年，差1
  
  // 4. 计算当前号码在马年序列中的基础索引 (1号是Index 0)
  // num 1 -> index 0
  const baseIndex = (num - 1) % 12;
  
  // 5. 加上年份偏移，取模得到当时的生肖
  const finalIndex = (baseIndex + yearOffset) % 12;
  
  return ZODIAC_SEQ[finalIndex];
};

// 2026 马年/新规则映射数据
// 1号是马，2号是蛇...
export const NUMBER_MAP: Record<number, NumberInfo> = {
  1: { zodiac: '马', color: 'red', wuxing: '金', isEven: false },
  2: { zodiac: '蛇', color: 'red', wuxing: '金', isEven: true },
  3: { zodiac: '龙', color: 'blue', wuxing: '火', isEven: false },
  4: { zodiac: '兔', color: 'blue', wuxing: '火', isEven: true },
  5: { zodiac: '虎', color: 'green', wuxing: '木', isEven: false },
  6: { zodiac: '牛', color: 'green', wuxing: '木', isEven: true },
  7: { zodiac: '鼠', color: 'red', wuxing: '土', isEven: false },
  8: { zodiac: '猪', color: 'red', wuxing: '土', isEven: true },
  9: { zodiac: '狗', color: 'blue', wuxing: '金', isEven: false },
  10: { zodiac: '鸡', color: 'blue', wuxing: '金', isEven: true },
  11: { zodiac: '猴', color: 'green', wuxing: '水', isEven: false },
  12: { zodiac: '羊', color: 'red', wuxing: '水', isEven: true },
  13: { zodiac: '马', color: 'red', wuxing: '木', isEven: false },
  14: { zodiac: '蛇', color: 'blue', wuxing: '木', isEven: true },
  15: { zodiac: '龙', color: 'blue', wuxing: '土', isEven: false },
  16: { zodiac: '兔', color: 'green', wuxing: '土', isEven: true },
  17: { zodiac: '虎', color: 'green', wuxing: '火', isEven: false },
  18: { zodiac: '牛', color: 'red', wuxing: '火', isEven: true },
  19: { zodiac: '鼠', color: 'red', wuxing: '水', isEven: false },
  20: { zodiac: '猪', color: 'blue', wuxing: '水', isEven: true },
  21: { zodiac: '狗', color: 'green', wuxing: '木', isEven: false },
  22: { zodiac: '鸡', color: 'green', wuxing: '木', isEven: true },
  23: { zodiac: '猴', color: 'red', wuxing: '金', isEven: false },
  24: { zodiac: '羊', color: 'red', wuxing: '金', isEven: true },
  25: { zodiac: '马', color: 'blue', wuxing: '火', isEven: false },
  26: { zodiac: '蛇', color: 'blue', wuxing: '火', isEven: true },
  27: { zodiac: '龙', color: 'green', wuxing: '水', isEven: false },
  28: { zodiac: '兔', color: 'green', wuxing: '水', isEven: true },
  29: { zodiac: '虎', color: 'red', wuxing: '土', isEven: false },
  30: { zodiac: '牛', color: 'red', wuxing: '土', isEven: true },
  31: { zodiac: '鼠', color: 'blue', wuxing: '金', isEven: false },
  32: { zodiac: '猪', color: 'green', wuxing: '金', isEven: true },
  33: { zodiac: '狗', color: 'green', wuxing: '火', isEven: false },
  34: { zodiac: '鸡', color: 'red', wuxing: '火', isEven: true },
  35: { zodiac: '猴', color: 'red', wuxing: '木', isEven: false },
  36: { zodiac: '羊', color: 'blue', wuxing: '木', isEven: true },
  37: { zodiac: '马', color: 'blue', wuxing: '土', isEven: false },
  38: { zodiac: '蛇', color: 'green', wuxing: '土', isEven: true },
  39: { zodiac: '龙', color: 'green', wuxing: '金', isEven: false },
  40: { zodiac: '兔', color: 'red', wuxing: '金', isEven: true },
  41: { zodiac: '虎', color: 'blue', wuxing: '水', isEven: false },
  42: { zodiac: '牛', color: 'blue', wuxing: '水', isEven: true },
  43: { zodiac: '鼠', color: 'green', wuxing: '木', isEven: false },
  44: { zodiac: '猪', color: 'green', wuxing: '木', isEven: true },
  45: { zodiac: '狗', color: 'red', wuxing: '土', isEven: false },
  46: { zodiac: '鸡', color: 'red', wuxing: '土', isEven: true },
  47: { zodiac: '猴', color: 'blue', wuxing: '火', isEven: false },
  48: { zodiac: '羊', color: 'blue', wuxing: '火', isEven: true },
  49: { zodiac: '马', color: 'green', wuxing: '水', isEven: false }
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
