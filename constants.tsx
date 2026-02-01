
import { DrawResult } from './types';

export const MOCK_HISTORY: DrawResult[] = [
  { drawNumber: "24/025", date: "2024-03-05", numbers: [3, 12, 18, 24, 33, 41], specialNumber: 7 },
  { drawNumber: "24/024", date: "2024-03-03", numbers: [8, 15, 22, 29, 36, 45], specialNumber: 13 },
  { drawNumber: "24/023", date: "2024-03-01", numbers: [1, 10, 20, 30, 40, 49], specialNumber: 5 },
  { drawNumber: "24/022", date: "2024-02-27", numbers: [5, 14, 21, 28, 35, 42], specialNumber: 9 },
  { drawNumber: "24/021", date: "2024-02-25", numbers: [7, 11, 19, 23, 31, 47], specialNumber: 2 },
  { drawNumber: "24/020", date: "2024-02-22", numbers: [2, 16, 25, 34, 43, 48], specialNumber: 15 },
  { drawNumber: "24/019", date: "2024-02-20", numbers: [6, 17, 26, 37, 44, 46], specialNumber: 11 },
  { drawNumber: "24/018", date: "2024-02-18", numbers: [4, 13, 27, 32, 38, 39], specialNumber: 8 },
];

export const COLORS = {
  RED: 'bg-red-500',
  GREEN: 'bg-emerald-500',
  BLUE: 'bg-blue-500',
  GOLD: 'bg-amber-500',
  SPECIAL: 'bg-purple-600'
};

export const getNumberColor = (num: number): string => {
  if (num <= 10) return COLORS.RED;
  if (num <= 20) return COLORS.BLUE;
  if (num <= 30) return COLORS.GREEN;
  if (num <= 40) return COLORS.GOLD;
  return 'bg-slate-500';
};
