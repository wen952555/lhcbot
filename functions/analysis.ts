
// --- 辅助映射数据 ---
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

function getZodiacForNumber(num: number): string {
    const map: Record<number, string> = {
        1: '蛇', 2: '龙', 3: '兔', 4: '虎', 5: '牛', 6: '鼠', 7: '猪', 8: '狗', 9: '鸡', 10: '猴', 11: '羊', 12: '马',
        13: '蛇', 14: '龙', 15: '兔', 16: '虎', 17: '牛', 18: '鼠', 19: '猪', 20: '狗', 21: '鸡', 22: '猴', 23: '羊', 24: '马',
        25: '蛇', 26: '龙', 27: '兔', 28: '虎', 29: '牛', 30: '鼠', 31: '猪', 32: '狗', 33: '鸡', 34: '猴', 35: '羊', 36: '马',
        37: '蛇', 38: '龙', 39: '兔', 40: '虎', 41: '牛', 42: '鼠', 43: '猪', 44: '狗', 45: '鸡', 46: '猴', 47: '羊', 48: '马', 49: '蛇'
    };
    return map[num] || '';
}

function getColorForNumber(num: number): string {
    const red = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
    const blue = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];
    return red.includes(num) ? 'red' : blue.includes(num) ? 'blue' : 'green';
}

interface StrategyWeights {
    FREQUENCY: number;
    OMISSION: number;
    TRANSITION: number;
    PATTERN: number;
    SYNERGY: number;
    description: string;
}

class AdvancedAnalytics {
    history: any[];
    weightedFreq: Record<number, number> = {};
    omissions: Record<number, number> = {};
    // P(特码 | 上期特码)
    spTransitions: Record<number, Record<number, number>> = {};
    // P(特码 | 本期平码)
    normalToSpecial: Record<number, Record<number, number>> = {};

    constructor(history: any[]) {
        this.history = history;
        this.init();
    }

    private init() {
        for (let i = 1; i <= 49; i++) {
            this.weightedFreq[i] = 0;
            const idx = this.history.findIndex(d => parseInt(d.specialNumber) === i);
            this.omissions[i] = idx === -1 ? Math.max(this.history.length, 50) : idx;
        }

        this.history.forEach((draw, index) => {
            const sp = parseInt(draw.specialNumber);
            const weight = Math.pow(0.94, index); // 时间衰减

            if (!isNaN(sp)) {
                this.weightedFreq[sp] += weight;

                // 1. 特码状态转移
                if (index < this.history.length - 1) {
                    const prevSP = parseInt(this.history[index + 1].specialNumber);
                    if (!isNaN(prevSP)) {
                        if (!this.spTransitions[prevSP]) this.spTransitions[prevSP] = {};
                        this.spTransitions[prevSP][sp] = (this.spTransitions[prevSP][sp] || 0) + 1;
                    }
                }

                // 2. 平特关联分析
                if (draw.numbers && Array.isArray(draw.numbers)) {
                    draw.numbers.forEach((n: any) => {
                        const num = parseInt(n);
                        if (!this.normalToSpecial[num]) this.normalToSpecial[num] = {};
                        this.normalToSpecial[num][sp] = (this.normalToSpecial[num][sp] || 0) + 1;
                    });
                }
            }
        });
    }

    getPatternScore(candidate: number): number {
        if (this.history.length < 5) return 0; // 降低模式匹配门槛
        const lookback = Math.min(3, this.history.length);
        const recentZods = this.history.slice(0, lookback).map(d => getZodiacForNumber(parseInt(d.specialNumber)));
        const candidateZod = getZodiacForNumber(candidate);
        let score = 0;
        
        for (let i = 1; i < this.history.length - lookback; i++) {
            const pastZods = this.history.slice(i, i + lookback).map(d => getZodiacForNumber(parseInt(d.specialNumber)));
            if (JSON.stringify(recentZods) === JSON.stringify(pastZods)) {
                if (getZodiacForNumber(parseInt(this.history[i - 1].specialNumber)) === candidateZod) {
                    score += 15; 
                }
            }
        }
        return score;
    }
}

export function generateDeterministicPrediction(history: any[]) {
    // 将门槛降低到 1，只要有一期数据就能预测
    if (!history || history.length < 1) {
        return { zodiacs:[], numbers_18:[], numbers_8:[], heads:[], tails:[], colors:[], reasoning:"数据量不足，请同步数据", confidence:0 };
    }

    const engine = new AdvancedAnalytics(history);
    const lastDraw = history[0];
    const lastSP = parseInt(lastDraw.specialNumber);

    const strategies: StrategyWeights[] = [
        { FREQUENCY: 2.2, OMISSION: 0.3, TRANSITION: 1.8, PATTERN: 1.2, SYNERGY: 1.5, description: "趋势热点跟踪" },
        { FREQUENCY: 0.8, OMISSION: 2.5, TRANSITION: 0.5, PATTERN: 0.5, SYNERGY: 1.1, description: "冷门遗漏回补" },
        { FREQUENCY: 1.2, OMISSION: 0.5, TRANSITION: 2.5, PATTERN: 2.2, SYNERGY: 1.8, description: "历史规律挖掘" }
    ];

    const bestStrategy = backtestBestStrategy(history, strategies);

    const numberScores: Record<number, number> = {};
    for (let n = 1; n <= 49; n++) {
        let score = 0;
        score += engine.weightedFreq[n] * 15 * bestStrategy.FREQUENCY;
        const oms = engine.omissions[n];
        if (oms > 15) score += Math.pow(oms - 10, 1.2) * bestStrategy.OMISSION;

        if (!isNaN(lastSP)) {
            const spTrans = engine.spTransitions[lastSP]?.[n] || 0;
            score += spTrans * 30 * bestStrategy.TRANSITION;
            if (lastDraw.numbers) {
                lastDraw.numbers.forEach((num: number) => {
                    const linkScore = engine.normalToSpecial[num]?.[n] || 0;
                    score += linkScore * 10 * bestStrategy.TRANSITION;
                });
            }
        }

        score += engine.getPatternScore(n) * bestStrategy.PATTERN;
        const zH = (engine.weightedFreq[n] > 0.3) ? 1.2 : 1.0;
        score *= (zH * bestStrategy.SYNERGY);
        numberScores[n] = score;
    }

    const sorted = Object.entries(numberScores).sort(([,a],[,b]) => b-a).map(([n]) => parseInt(n));
    const numbers_18 = sorted.slice(0, 18).sort((a,b)=>a-b);
    const numbers_8 = sorted.slice(0, 8).sort((a,b)=>a-b);

    const zodiacRank = ZODIACS.map(z => {
        const score = Array.from({length: 49}, (_, i) => i + 1)
            .filter(num => getZodiacForNumber(num) === z)
            .reduce((sum, num) => sum + (numberScores[num] || 0), 0);
        return { z, score };
    }).sort((a,b) => b.score - a.score);

    const colors = ['red', 'blue', 'green'].sort((a, b) => {
        const sa = sorted.slice(0, 10).filter(n => getColorForNumber(n) === a).length;
        const sb = sorted.slice(0, 10).filter(n => getColorForNumber(n) === b).length;
        return sb - sa;
    }).slice(0, 2);

    return {
        zodiacs: zodiacRank.slice(0, 6).map(i => i.z),
        numbers_18,
        numbers_8,
        heads: [0,1,2,3,4].sort((a,b) => {
            const sa = sorted.slice(0, 15).filter(n => Math.floor(n/10) === a).length;
            const sb = sorted.slice(0, 15).filter(n => Math.floor(n/10) === b).length;
            return sb - sa;
        }).slice(0, 3).sort(),
        tails: [0,1,2,3,4,5,6,7,8,9].sort((a,b) => {
            const sa = sorted.slice(0, 15).filter(n => n%10 === a).length;
            const sb = sorted.slice(0, 15).filter(n => n%10 === b).length;
            return sb - sa;
        }).slice(0, 4).sort(),
        colors,
        reasoning: history.length < 10 ? `【样本不足】${bestStrategy.description}(参考)` : `【${bestStrategy.description}】`,
        confidence: Math.min(88, 50 + history.length * 2) // 信心值随数据量动态调整
    };
}

function backtestBestStrategy(history: any[], strategies: StrategyWeights[]): StrategyWeights {
    // 修正 testSize 计算，防止出现负数
    const testSize = Math.max(1, Math.min(5, history.length - 2)); 
    let bestIdx = 0;
    let minRankSum = Infinity;

    if (history.length < 3) return strategies[0];

    strategies.forEach((strat, idx) => {
        let rankSum = 0;
        for (let i = 0; i < testSize; i++) {
            const actual = parseInt(history[i].specialNumber);
            const subHistory = history.slice(i + 1);
            if (subHistory.length === 0) continue;

            const engine = new AdvancedAnalytics(subHistory);
            const last = parseInt(subHistory[0].specialNumber);
            
            const scores: Record<number, number> = {};
            for (let n = 1; n <= 49; n++) {
                let s = engine.weightedFreq[n] * strat.FREQUENCY;
                if (engine.omissions[n] > 20) s += (engine.omissions[n]-20) * strat.OMISSION;
                if (engine.spTransitions[last]?.[n]) s += engine.spTransitions[last][n] * strat.TRANSITION * 5;
                scores[n] = s;
            }
            const sorted = Object.entries(scores).sort(([,a],[,b]) => b-a).map(([n]) => parseInt(n));
            const rank = sorted.indexOf(actual);
            rankSum += (rank === -1 ? 50 : rank);
        }
        if (rankSum < minRankSum) {
            minRankSum = rankSum;
            bestIdx = idx;
        }
    });

    return strategies[bestIdx];
}
