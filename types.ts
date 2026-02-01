
export interface DrawResult {
  drawNumber: string;
  date: string;
  numbers: number[];
  specialNumber: number;
}

export interface PredictionResult {
  numbers: number[];
  specialNumber: number;
  reasoning: string;
  confidence: number;
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
  apiUrl: string;
}
