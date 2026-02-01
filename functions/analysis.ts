
// --- Helper Data for Backend ---
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

const COLOR_NAMES = {
  red: '红',
  blue: '蓝',
  green: '绿'
};

// 2025 蛇年映射
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
    return red.includes(num) ? 'red' : blue.includes(num) ? 'blue' : 'green';
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

// ---------------------------------------------------------
// 核心统计类：管理所有历史记录
// ---------------------------------------------------------
class StatisticsEngine {
    history: any[];
    totalDraws: number;
    
    // 缓存数据
    omissionMap: Record<number, number> = {}; // 当前遗漏期数
    frequencyMap: Record<number, number> = {}; // 出现次数 (近50期)
    avgOmissionMap: Record<number, number> = {}; // 平均遗漏

    constructor(history: any[]) {
        this.history = history;
        this.totalDraws = history.length;
        this.calculateBasicStats();
    }

    private calculateBasicStats() {
        // 初始化
        for (let i = 1; i <= 49; i++) {
            this.omissionMap[i] = 0;
            this.frequencyMap[i] = 0;
            this.avgOmissionMap[i] = 0;
        }

        // 1. 计算当前遗漏 (Current Omission)
        // 从最新一期往回找，直到找到数字
        for (let num = 1; num <= 49; num++) {
            let found = false;
            for (let i = 0; i < this.history.length; i++) {
                const draw = this.history[i];
                const special = parseInt(draw.specialNumber);
                if (special === num) {
                    this.omissionMap[num] = i; // i=0 is latest, so omission is 0 if it appeared now
                    found = true;
                    break;
                }
            }
            if (!found) this.omissionMap[num] = this.history.length;
        }

        // 2. 计算频率 (Frequency in last 50 draws)
        const recentLimit = Math.min(this.history.length, 50);
        for (let i = 0; i < recentLimit; i++) {
            const special = parseInt(this.history[i].specialNumber);
            if (!isNaN(special)) this.frequencyMap[special]++;
        }
    }

    getOmission(num: number) { return this.omissionMap[num] || 0; }
    getFrequency(num: number) { return this.frequencyMap[num] || 0; }
}

// ---------------------------------------------------------
// 策略权重定义
// ---------------------------------------------------------
interface StrategyWeights {
    HOT: number;    // 热号权重
    COLD: number;   // 冷号权重 (博反弹)
    REPEAT: number; // 连码/回补权重
    TAIL: number;   // 尾数规律权重
}

// ---------------------------------------------------------
// 主分析函数
// ---------------------------------------------------------
export function generateDeterministicPrediction(history: any[]): AnalysisResult {
    if (!history || history.length < 20) {
        return { 
            zodiacs: [], numbers_18: [], heads: [], tails: [], colors: [], 
            reasoning: "历史数据不足", confidence: 0 
        };
    }

    // 1. 自动权重调整 (Auto-Adjustment Logic)
    // 我们回测最近 10 期，看看是“热号”赢了还是“冷号”赢了
    const weights = autoAdjustWeights(history);

    // 2. 建立当前统计引擎
    const engine = new StatisticsEngine(history);

    // 3. 计算所有号码的综合得分
    const numberScores: Record<number, number> = {};
    for (let i = 1; i <= 49; i++) {
        numberScores[i] = calculateNumberScore(i, engine, weights, history[0]);
    }

    // 4. 提取结果
    const sortedNumbers = Object.entries(numberScores)
        .sort(([, a], [, b]) => b - a)
        .map(([n]) => parseInt(n));

    // --- Top 18 Numbers ---
    const numbers_18 = sortedNumbers.slice(0, 18).sort((a, b) => a - b);

    // --- Analyze Zodiacs based on top numbers ---
    // 不仅仅是看Top numbers，还要结合生肖本身的遗漏
    const zodiacScores: Record<string, number> = {};
    ZODIACS.forEach(z => zodiacScores[z] = 0);
    
    // 将号码分加权到生肖上
    sortedNumbers.forEach((num, index) => {
        const z = getZodiacForNumber(num);
        if (z) {
            // 排名越靠前，给生肖贡献的分数越高
            const rankScore = (50 - index); 
            zodiacScores[z] += rankScore;
        }
    });
    const zodiacs = Object.entries(zodiacScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([z]) => z);

    // --- Analyze Heads & Tails ---
    const headScores: Record<number, number> = {};
    const tailScores: Record<number, number> = {};
    [0,1,2,3,4].forEach(h => headScores[h] = 0);
    [0,1,2,3,4,5,6,7,8,9].forEach(t => tailScores[t] = 0);

    // 取前 15 个强力号码来分析头尾特征
    sortedNumbers.slice(0, 15).forEach(num => {
        headScores[Math.floor(num / 10)]++;
        tailScores[num % 10]++;
    });

    const heads = Object.entries(headScores).sort(([,a],[,b]) => b-a).slice(0, 3).map(([h]) => parseInt(h)).sort((a,b)=>a-b);
    const tails = Object.entries(tailScores).sort(([,a],[,b]) => b-a).slice(0, 4).map(([t]) => parseInt(t)).sort((a,b)=>a-b);

    // --- Analyze Colors ---
    const colorScores: Record<string, number> = { red: 0, blue: 0, green: 0 };
    sortedNumbers.slice(0, 12).forEach(num => {
        colorScores[getColorForNumber(num)]++;
    });
    const colors = Object.entries(colorScores).sort(([,a],[,b]) => b-a).slice(0, 2).map(([c]) => c);

    // 5. 生成理由
    const strategyName = weights.HOT > weights.COLD ? "热号追踪策略" : "冷号回补策略";
    const focus = weights.HOT > weights.COLD ? "近期高频号码" : "遗漏值较高号码";
    const bestZodiac = zodiacs[0];
    const bestTail = tails[0];

    const reasoning = `系统自动回测近10期数据，当前走势符合【${strategyName}】。已自动调整算法权重，重点捕捉${focus}。大数据锁定[${bestZodiac}]肖及[${bestTail}]尾，防范特码[${numbers_18[0]}]。`;

    // 6. 信心指数
    // 基于Top1得分与平均分的差距
    const scoreValues = Object.values(numberScores);
    const maxScore = scoreValues[0]; // sorted descending earlier? No, Object.values order not guaranteed.
    const realMax = Math.max(...scoreValues);
    const avgScore = scoreValues.reduce((a,b)=>a+b,0) / 49;
    const deviation = realMax / avgScore;
    
    // Deviation 1.5 -> 70%, 3.0 -> 95%
    let confidence = Math.floor(70 + (deviation - 1.5) * 16);
    confidence = Math.max(65, Math.min(98, confidence));

    return {
        zodiacs,
        numbers_18,
        heads,
        tails,
        colors,
        reasoning,
        confidence
    };
}

// ---------------------------------------------------------
// 辅助函数：计算单个号码得分
// ---------------------------------------------------------
function calculateNumberScore(num: number, engine: StatisticsEngine, weights: StrategyWeights, lastDraw: any): number {
    let score = 0;
    
    // 1. Hot Score (Frequency)
    // Normalize frequency (0 to ~10) to a score
    const freq = engine.getFrequency(num);
    score += freq * weights.HOT * 10; 

    // 2. Cold Score (Omission)
    // Omission usually 0 to 49+. 
    const omission = engine.getOmission(num);
    // If we are looking for cold numbers, higher omission = higher score
    if (omission > 10) {
        score += (omission * weights.COLD * 2); 
    } else {
        // If we are strictly playing hot, recent omission (low value) is good.
        // But here weights.COLD handles the preference.
    }

    // 3. Repeat Score (If appeared in last draw's normal numbers)
    if (lastDraw && Array.isArray(lastDraw.numbers)) {
        if (lastDraw.numbers.includes(num)) {
            score += weights.REPEAT * 20; // Bonus for being a neighbor/repeat candidate
        }
    }
    
    // 4. Tail Analysis
    // 简单的尾数活跃度加分 (如果该尾数最近5期出过特码)
    const tail = num % 10;
    // Check last 5 draws for this tail in special number
    let tailHits = 0;
    for(let i=0; i<5 && i<engine.history.length; i++) {
        const sp = parseInt(engine.history[i].specialNumber);
        if(!isNaN(sp) && sp % 10 === tail) tailHits++;
    }
    score += tailHits * weights.TAIL * 15;

    return score;
}

// ---------------------------------------------------------
// 自动回测与权重调整 (The "AI" part)
// ---------------------------------------------------------
function autoAdjustWeights(fullHistory: any[]): StrategyWeights {
    // 默认平衡权重
    const weights: StrategyWeights = {
        HOT: 1.0,
        COLD: 1.0,
        REPEAT: 0.5,
        TAIL: 0.8
    };

    // 如果数据太少，直接返回默认
    if (fullHistory.length < 15) return weights;

    // 回测最近 10 期 (Test draws 0 to 9)
    // For each draw, we pretend we are predicting it using data from draw+1 onwards
    let hotStrategyWins = 0;
    let coldStrategyWins = 0;

    const testCount = 10;
    for (let i = 0; i < testCount; i++) {
        const targetDraw = fullHistory[i];
        const resultNum = parseInt(targetDraw.specialNumber);
        if (isNaN(resultNum)) continue;

        // Use data AFTER this draw (historically previous)
        const pastHistory = fullHistory.slice(i + 1);
        const engine = new StatisticsEngine(pastHistory);

        // Check if result was "Hot" (in top 10 frequent numbers of that time)
        // or "Cold" (omission > 20)
        const freq = engine.getFrequency(resultNum);
        const omission = engine.getOmission(resultNum);

        if (freq >= 2) hotStrategyWins++; // 50期内出现2次以上算偏热
        if (omission > 15) coldStrategyWins++; // 遗漏大于15期算偏冷
    }

    // 动态调整
    if (hotStrategyWins > coldStrategyWins) {
        weights.HOT = 2.0;
        weights.COLD = 0.5;
    } else if (coldStrategyWins > hotStrategyWins) {
        weights.HOT = 0.5;
        weights.COLD = 2.0;
    } else {
        // Tie - trend is unclear, keep balanced but slightly favor Hot (common gambling stats)
        weights.HOT = 1.2;
        weights.COLD = 0.8;
    }

    return weights;
}
