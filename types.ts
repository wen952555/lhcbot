
export interface DrawResult {
  drawNumber: string;
  date: string;
  numbers: number[];
  specialNumber: number;
}

export interface PredictionResult {
  numbers: number[];
  specialNumber: number;
  confidence: number;
  reasoning: string;
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
