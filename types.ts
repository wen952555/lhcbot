
export interface DrawResult {
  drawNumber: string;
  date: string;
  numbers: number[];
  specialNumber: number;
}

export interface PredictionResult {
  zodiacs: string[];      // 推荐六肖
  numbers_18: number[];   // 推荐18码
  numbers_8: number[];    // 回测推荐8码 (高胜率精选)
  heads: number[];        // 推荐3个头数
  tails: number[];        // 推荐4个尾数
  colors: string[];       // 推荐两个波色 ('red' | 'blue' | 'green')
  reasoning: string;      // 简短描述
  confidence: number;
  timestamp?: number;
}

export interface PredictionHistoryItem {
  drawNumber: string;
  prediction: PredictionResult;
  timestamp: number;
}

export interface NumberFrequency {
  number: number;
  count: number;
}

export enum TabType {
  PREDICT = 'predict',
  STATS = 'stats',
  HISTORY = 'history'
}

export interface LotteryConfig {
  id: string;
  name: string;
}
