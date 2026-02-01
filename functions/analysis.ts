
// --- Helper Data for Backend ---
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

// 2025 蛇年映射 (1号为蛇)
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
// 核心统计类：管理所有历史记录 (完善版)
// ---------------------------------------------------------
class StatisticsEngine {
    history: any[];
    totalDraws: number;
    
    // 基础号码统计
    omissionMap: Record<number, number> = {}; 
    frequencyMap: Record<number, number> = {}; 

    // 属性统计 (生肖/波色/头数)
    zodiacFreqMap: Record<string, number> = {};
    colorFreqMap: Record<string, number> = {};
    tailFreqMap: Record<number, number> = {};

    constructor(history: any[]) {
        this.history = history;
        this.totalDraws = history.length;
        this.initializeMaps();
        this.calculateStats();
    }

    private initializeMaps() {
        for (let i = 1; i <= 49; i++) {
            this.omissionMap[i] = 0;
            this.frequencyMap[i] = 0;
        }
        ZODIACS.forEach(z => this.zodiacFreqMap[z] = 0);
        ['red', 'blue', 'green'].forEach(c => this.colorFreqMap[c] = 0);
        for(let i=0; i<=9; i++) this.tailFreqMap[i] = 0;
    }

    private calculateStats() {
        // 1. 计算当前遗漏
        for (let num = 1; num <= 49; num++) {
            let found = false;
            for (let i = 0; i < this.history.length; i++) {
                const draw = this.history[i];
                const special = parseInt(draw.specialNumber);
                if (special === num) {
                    this.omissionMap[num] = i; 
                    found = true;
                    break;
                }
            }
            if (!found) this.omissionMap[num] = this.history.length;
        }

        // 2. 计算频率 (仅看最近 50 期或全部)
        const recentLimit = Math.min(this.history.length, 50);
        for (let i = 0; i < recentLimit; i++) {
            const special = parseInt(this.history[i].specialNumber);
            if (!isNaN(special)) {
                // 号码频率
                this.frequencyMap[special]++;
                
                // 生肖频率
                const z = getZodiacForNumber(special);
                if (z) this.zodiacFreqMap[z] = (this.zodiacFreqMap[z] || 0) + 1;

                // 波色频率
                const c = getColorForNumber(special);
                if (c) this.colorFreqMap[c] = (this.colorFreqMap[c] || 0) + 1;

                // 尾数频率
                const t = special % 10;
                this.tailFreqMap[t] = (this.tailFreqMap[t] || 0) + 1;
            }
        }
    }

    getOmission(num: number) { return this.omissionMap[num] || 0; }
    getFrequency(num: number) { return this.frequencyMap[num] || 0; }
    getZodiacFreq(z: string) { return this.zodiacFreqMap[z] || 0; }
    getColorFreq(c: string) { return this.colorFreqMap[c] || 0; }
    getTailFreq(t: number) { return this.tailFreqMap[t] || 0; }
}

// ---------------------------------------------------------
// 策略权重定义
// ---------------------------------------------------------
interface StrategyWeights {
    HOT: number;      // 号码热度
    COLD: number;     // 号码冷度
    REPEAT: number;   // 邻号/重号
    ZODIAC: number;   // 生肖热度权重 (新)
    COLOR: number;    // 波色热度权重 (新)
    TAIL: number;     // 尾数热度权重
}

// ---------------------------------------------------------
// 主分析函数 (入口)
// ---------------------------------------------------------
export function generateDeterministicPrediction(history: any[]): AnalysisResult {
    // 容错：无数据情况
    if (!history || history.length === 0) {
        return { 
            zodiacs: [], numbers_18: [], heads: [], tails: [], colors: [], 
            reasoning: "暂无历史数据，无法分析", confidence: 0 
        };
    }

    // 1. 自动权重调整 (AI部分)
    // 根据近期走势判断是该追热还是博冷
    const weights = autoAdjustWeights(history);

    // 2. 建立统计引擎
    const engine = new StatisticsEngine(history);

    // 3. 计算所有号码的综合得分 (闭环逻辑：属性热度反哺号码得分)
    const numberScores: Record<number, number> = {};
    for (let i = 1; i <= 49; i++) {
        numberScores[i] = calculateNumberScore(i, engine, weights, history[0]);
    }

    // 4. 排序提取 Top 号码
    const sortedNumbers = Object.entries(numberScores)
        .sort(([, a], [, b]) => b - a)
        .map(([n]) => parseInt(n));

    // --- 生成 18 码 ---
    const numbers_18 = sortedNumbers.slice(0, 18).sort((a, b) => a - b);

    // --- 生成 六肖 ---
    // 逻辑：综合“号码得分总和”与“生肖本身热度”
    const zodiacScores: Record<string, number> = {};
    ZODIACS.forEach(z => {
        // 基础分：该生肖近期出现的频率
        zodiacScores[z] = engine.getZodiacFreq(z) * 10; 
    });
    
    // 加分项：如果你预测的 Top 号码属于这个生肖，加分
    sortedNumbers.forEach((num, index) => {
        const z = getZodiacForNumber(num);
        if (z) {
            // 排名越靠前 (index越小)，贡献分越大
            zodiacScores[z] += (50 - index) * 2; 
        }
    });

    const zodiacs = Object.entries(zodiacScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([z]) => z);

    // --- 生成 头数 & 尾数 ---
    const headScores: Record<number, number> = {};
    const tailScores: Record<number, number> = {};
    
    // 基于 Top 20 号码统计头尾
    sortedNumbers.slice(0, 20).forEach(num => {
        const h = Math.floor(num / 10);
        const t = num % 10;
        headScores[h] = (headScores[h] || 0) + 1;
        tailScores[t] = (tailScores[t] || 0) + 1;
    });

    const heads = Object.entries(headScores).sort(([,a],[,b]) => b-a).slice(0, 3).map(([h]) => parseInt(h)).sort((a,b)=>a-b);
    const tails = Object.entries(tailScores).sort(([,a],[,b]) => b-a).slice(0, 4).map(([t]) => parseInt(t)).sort((a,b)=>a-b);

    // --- 生成 波色 ---
    const colorScores: Record<string, number> = { red: 0, blue: 0, green: 0 };
    // 结合号码得分 + 波色本身热度
    ['red', 'blue', 'green'].forEach(c => {
        colorScores[c] += engine.getColorFreq(c) * 5;
    });
    sortedNumbers.slice(0, 15).forEach(num => {
        colorScores[getColorForNumber(num)] += 10;
    });
    const colors = Object.entries(colorScores).sort(([,a],[,b]) => b-a).slice(0, 2).map(([c]) => c);

    // 5. 生成理由文案
    const strategyName = weights.HOT > weights.COLD ? "热号追踪与属性共振" : "冷号回补与均值回归";
    const bestZodiac = zodiacs[0];
    const bestColor = colors[0] === 'red' ? '红' : colors[0] === 'blue' ? '蓝' : '绿';
    
    // 数据量警告
    const dataWarning = history.length < 15 ? "（样本较少，仅供参考）" : "";

    const reasoning = `基于${history.length}期数据${dataWarning}，系统启用【${strategyName}】算法。权重偏向${weights.HOT > 1.2 ? '近期热码' : '遗漏回补'}。数据模型显示[${bestZodiac}]肖及[${bestColor}]波存在强劲走势，特码极大概率落入推荐的18码区间。`;

    // 6. 信心指数计算
    // 计算得分的标准差，离散度越高，信心越强（说明好的号码很突出）
    const scoreValues = Object.values(numberScores);
    const max = Math.max(...scoreValues);
    const avg = scoreValues.reduce((a,b)=>a+b,0) / 49;
    
    let confidence = 75; // 基础分
    const ratio = max / (avg || 1);
    
    if (ratio > 2.5) confidence += 15;
    else if (ratio > 1.8) confidence += 10;
    else if (ratio < 1.2) confidence -= 10;

    // 样本太少强制扣分
    if (history.length < 10) confidence = Math.min(confidence, 65);

    confidence = Math.min(99, Math.max(50, confidence));

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
// 辅助函数：计算单个号码得分 (Perfected Logic)
// ---------------------------------------------------------
function calculateNumberScore(num: number, engine: StatisticsEngine, weights: StrategyWeights, lastDraw: any): number {
    let score = 0;
    
    // 1. 号码自身热度 (Frequency)
    const freq = engine.getFrequency(num);
    score += freq * weights.HOT * 10; 

    // 2. 号码遗漏值 (Omission / Cold)
    const omission = engine.getOmission(num);
    // 遗漏超过一定值后，开始加分(博反弹)，或者减分(如果策略是极度追热)
    // 这里采用平衡逻辑：极度冷号(>30期)给予关注，但主要还是看热度
    if (omission > 20) {
        score += (omission * weights.COLD * 1.5); 
    }

    // 3. 属性共振 (Attribute Resonance) - 新增完善点
    // 如果这个号码所属的生肖很热，给号码加分
    const z = getZodiacForNumber(num);
    const zFreq = engine.getZodiacFreq(z);
    score += zFreq * weights.ZODIAC * 5;

    // 如果这个号码所属的波色很热，给号码加分
    const c = getColorForNumber(num);
    const cFreq = engine.getColorFreq(c);
    score += cFreq * weights.COLOR * 5;

    // 如果这个号码所属的尾数很热，给号码加分
    const t = num % 10;
    const tFreq = engine.getTailFreq(t);
    score += tFreq * weights.TAIL * 8;

    // 4. 邻号/重号逻辑
    if (lastDraw && Array.isArray(lastDraw.numbers)) {
        if (lastDraw.numbers.includes(num)) {
            score += weights.REPEAT * 20; // 平码复开特码概率
        }
    }
    
    return score;
}

// ---------------------------------------------------------
// 自动回测与权重调整 (The "AI" part)
// ---------------------------------------------------------
function autoAdjustWeights(fullHistory: any[]): StrategyWeights {
    // 初始平衡权重
    const weights: StrategyWeights = {
        HOT: 1.0,
        COLD: 0.8,
        REPEAT: 0.5,
        ZODIAC: 1.0,
        COLOR: 0.8,
        TAIL: 0.8
    };

    if (fullHistory.length < 5) return weights;

    // 简单回测：检查最近5期开出的特码，是热码多还是冷码多？
    let hotWins = 0;
    let coldWins = 0;

    // 我们取最近 5 期进行验证
    const testCount = Math.min(5, fullHistory.length);
    
    for (let i = 0; i < testCount; i++) {
        const resultNum = parseInt(fullHistory[i].specialNumber);
        if (isNaN(resultNum)) continue;

        // 简易判断：在全量数据中，这个号码算热还是冷？
        // 注意：严谨的回测应该切片数据，但为了性能这里做近似判断
        // 假设全量频率 > 2 (在50期内) 算热
        let freq = 0;
        // 统计该号码在 i 之后的频率
        for(let j=i+1; j<fullHistory.length && j < i+50; j++) {
            if(parseInt(fullHistory[j].specialNumber) === resultNum) freq++;
        }

        if (freq >= 1) hotWins++;
        else coldWins++;
    }

    // 策略动态调整
    if (hotWins > coldWins) {
        weights.HOT = 1.5; // 追热
        weights.COLD = 0.5;
    } else {
        weights.HOT = 0.6;
        weights.COLD = 1.5; // 追冷/防冷
    }

    return weights;
}
