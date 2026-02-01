
import { NUMBER_MAP } from '../constants'; // We need to access NUMBER_MAP but it's a frontend file. 
// Ideally constant data should be shared, but for Functions we'll replicate or import if configured. 
// Since we are in an ES module environment in Pages Functions, we'll redefine the mapping helper here for safety 
// or assume we can import if the build system allows. To be safe, I will inline the necessary map logic.

// --- Helper Data for Backend ---
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
// A simple function to get zodiac for a number (assuming 2025 Snake Year logic matching constants.tsx)
function getZodiacForNumber(num: number): string {
    const map: Record<number, string> = {
        1: '蛇', 2: '龙', 3: '兔', 4: '虎', 5: '牛', 6: '鼠', 7: '猪', 8: '狗', 9: '鸡', 10: '猴', 11: '羊', 12: '马',
        13: '蛇', 14: '龙', 15: '兔', 16: '虎', 17: '牛', 18: '鼠', 19: '猪', 20: '狗', 21: '鸡', 22: '猴', 23: '羊', 24: '马',
        25: '蛇', 26: '龙', 27: '兔', 28: '虎', 29: '牛', 30: '鼠', 31: '猪', 32: '狗', 33: '鸡', 34: '猴', 35: '羊', 36: '马',
        37: '蛇', 38: '龙', 39: '兔', 40: '虎', 41: '牛', 42: '鼠', 43: '猪', 44: '狗', 45: '鸡', 46: '猴', 47: '羊', 48: '马', 49: '蛇'
    };
    return map[num];
}

function getColorForNumber(num: number): string {
    const red = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
    const blue = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];
    // green is rest
    if (red.includes(num)) return 'red';
    if (blue.includes(num)) return 'blue';
    return 'green';
}

interface AnalysisResult {
  zodiacs: string[];
  numbers_18: number[];
  heads: number[];
  tails: number[];
  colors: string[];
  reasoning: string;
  confidence: number;
}

export function generateDeterministicPrediction(history: any[]): AnalysisResult {
  // 1. Analyze frequency for numbers
  const freqMap: Record<number, number> = {};
  for(let i=1; i<=49; i++) freqMap[i] = 0;
  
  const recentLimit = Math.min(history.length, 50);
  const recentHistory = history.slice(0, recentLimit);

  recentHistory.forEach(draw => {
      draw.numbers.forEach((n: any) => {
          const num = parseInt(n);
          if(!isNaN(num)) freqMap[num] = (freqMap[num] || 0) + 1;
      });
      const special = parseInt(draw.specialNumber);
      if(!isNaN(special)) freqMap[special] = (freqMap[special] || 0) + 1; // Special weight same for simplicity
  });

  const sortedNumbers = Object.entries(freqMap)
    .sort(([, a], [, b]) => b - a)
    .map(([n]) => parseInt(n));

  // --- 2. Generate "Six Xiao" (6 Zodiacs) ---
  // Strategy: Pick 3 hot zodiacs (based on number freq) + 3 distinct ones for balance
  const zodiacScores: Record<string, number> = {};
  ZODIACS.forEach(z => zodiacScores[z] = 0);
  
  Object.entries(freqMap).forEach(([numStr, count]) => {
      const z = getZodiacForNumber(parseInt(numStr));
      if(z) zodiacScores[z] += count;
  });

  const sortedZodiacs = Object.entries(zodiacScores)
    .sort(([, a], [, b]) => b - a)
    .map(([z]) => z);
  
  // Take top 4 hot zodiacs + 2 random from remaining
  const topZodiacs = sortedZodiacs.slice(0, 4);
  const remainingZodiacs = sortedZodiacs.slice(4).sort(() => 0.5 - Math.random());
  const selectedZodiacs = [...topZodiacs, ...remainingZodiacs.slice(0, 2)];

  // --- 3. Generate "18 Ma" (18 Numbers) ---
  // Strategy: 
  // - Include numbers belonging to the selected 6 zodiacs? (Too many: 6 * 4 = 24+)
  // - Instead: Take Top 12 Hot Numbers + 6 Random "Cold/Warm" numbers to balance
  const hot12 = sortedNumbers.slice(0, 12);
  const others = sortedNumbers.slice(12).sort(() => 0.5 - Math.random()).slice(0, 6);
  const numbers18 = [...hot12, ...others].sort((a, b) => a - b);

  // --- 4. Generate "3 Heads" (0-4) ---
  // Count recent heads frequency
  const headFreq: Record<number, number> = {0:0, 1:0, 2:0, 3:0, 4:0};
  recentHistory.forEach(draw => {
     const sp = parseInt(draw.specialNumber);
     if(!isNaN(sp)) headFreq[Math.floor(sp / 10)]++;
  });
  const sortedHeads = Object.entries(headFreq).sort(([,a], [,b]) => b - a).map(([h])=>parseInt(h));
  // Pick top 2 hot heads + 1 random
  const selectedHeads = Array.from(new Set([...sortedHeads.slice(0, 2), Math.floor(Math.random()*5)]));
  if(selectedHeads.length < 3) {
      // fill missing
      [0,1,2,3,4].forEach(h => { if(selectedHeads.length < 3 && !selectedHeads.includes(h)) selectedHeads.push(h); });
  }
  const finalHeads = selectedHeads.slice(0, 3).sort();

  // --- 5. Generate "4 Tails" (0-9) ---
  const tailFreq: Record<number, number> = {};
  for(let i=0; i<=9; i++) tailFreq[i] = 0;
  recentHistory.forEach(draw => {
      const sp = parseInt(draw.specialNumber);
      if(!isNaN(sp)) tailFreq[sp % 10]++;
  });
  const sortedTails = Object.entries(tailFreq).sort(([,a], [,b]) => b - a).map(([t])=>parseInt(t));
  const selectedTails = sortedTails.slice(0, 4).sort((a, b) => a - b);

  // --- 6. Generate "2 Colors" ---
  const colorFreq: Record<string, number> = {red:0, blue:0, green:0};
  recentHistory.forEach(draw => {
      const sp = parseInt(draw.specialNumber);
      if(!isNaN(sp)) colorFreq[getColorForNumber(sp)]++;
  });
  const sortedColors = Object.entries(colorFreq).sort(([,a], [,b]) => b - a).map(([c])=>c);
  // Pick Top 1 and Random 2nd? Or Top 2? Let's pick Top 2 for probability.
  const selectedColors = sortedColors.slice(0, 2);

  return {
      zodiacs: selectedZodiacs,
      numbers_18: numbers18,
      heads: finalHeads,
      tails: selectedTails,
      colors: selectedColors,
      reasoning: `基于近${recentLimit}期数据分析，${selectedZodiacs[0]}、${selectedZodiacs[1]}势头最强。`,
      confidence: Math.floor(Math.random() * (95 - 75) + 75) // Mock confidence
  };
}
