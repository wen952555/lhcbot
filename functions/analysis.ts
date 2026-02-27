
import { NUMBER_MAP, ZODIAC_RELATIONS, NumberInfo, getZodiacByYear } from '../constants.tsx';

// --- 全局常量 ---
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const MAX_LAG_SCAN = 7; // 向前扫描7期寻找规律

// --- 辅助函数 ---
const getDigitSum = (num: number): number => {
    const tens = Math.floor(num / 10);
    const units = num % 10;
    return tens + units;
};

const getMod3 = (num: number): number => num % 3;
const getOddEven = (num: number): string => num % 2 === 0 ? 'even' : 'odd';
const getBigSmall = (num: number): string => num >= 25 ? 'big' : 'small';
const getSumOddEven = (num: number): string => getDigitSum(num) % 2 === 0 ? 'even' : 'odd';
const getSumBigSmall = (num: number): string => getDigitSum(num) >= 7 ? 'big' : 'small';

// --- 统计容器接口 ---
interface MatrixSet {
    // [LagIndex][FromValue][ToValue] -> Count
    zodiac: Record<number, Record<string, Record<string, number>>>;
    tail: Record<number, Record<number, Record<number, number>>>;
    mod3: Record<number, Record<number, Record<number, number>>>;
    oddEven: Record<number, Record<string, Record<string, number>>>;
    bigSmall: Record<number, Record<string, Record<string, number>>>;
    color: Record<number, Record<string, Record<string, number>>>;
    sumOddEven: Record<number, Record<string, Record<string, number>>>;
    sumBigSmall: Record<number, Record<string, Record<string, number>>>;
}

// --- 核心分析引擎 ---
class MultiLagEngine {
    history: any[];
    
    // 1. 基础频率
    globalFreq: Record<number, number> = {};
    recentZodiacCounts: Record<string, number> = {};

    // 2. 多阶滞后矩阵 (Lags 1-7)
    matrices: MatrixSet = {
        zodiac: {},
        tail: {},
        mod3: {},
        oddEven: {},
        bigSmall: {},
        color: {},
        sumOddEven: {},
        sumBigSmall: {}
    };

    // 3. 平特关联
    flatTailStats = { hitCount: 0, totalCount: 0, probability: 0 };

    // 4. 动态权重
    weights = {
        freq: 6,           // 基础热度
        lagBase: 5.0,      // 滞后规律基础分
        lagPattern: 20.0,  // 发现强规律时的额外加分
        flatStrategy: 0,   // 平特 (动态)
        killPenalty: -150, // 绝杀 (一旦触犯历史0概率，直接杀死)
        overheatPenalty: -40, // 过热惩罚
        oddEvenBase: 3.0,
        bigSmallBase: 3.0,
        colorBase: 4.0,
        sumOddEvenBase: 2.0,
        sumBigSmallBase: 2.0
    };

    constructor(history: any[]) {
        this.history = history;
        this.initStats();
        this.processFullHistory();
        this.adjustDynamicWeights();
    }

    private initStats() {
        for (let i = 1; i <= 49; i++) this.globalFreq[i] = 0;
        ZODIACS.forEach(z => this.recentZodiacCounts[z] = 0);

        // 初始化Lag矩阵
        for (let lag = 1; lag <= MAX_LAG_SCAN; lag++) {
            this.matrices.zodiac[lag] = {};
            this.matrices.tail[lag] = {};
            this.matrices.mod3[lag] = {};
            this.matrices.oddEven[lag] = {};
            this.matrices.bigSmall[lag] = {};
            this.matrices.color[lag] = {};
            this.matrices.sumOddEven[lag] = {};
            this.matrices.sumBigSmall[lag] = {};
        }
    }

    private processFullHistory() {
        const total = this.history.length;
        
        // 1. 统计近期热度 (判断过热)
        for (let i = 0; i < Math.min(12, total); i++) {
            const num = parseInt(this.history[i].specialNumber);
            if (!isNaN(num)) {
                // 使用 getZodiacByYear 还原当时的真实生肖
                const zodiac = getZodiacByYear(num, this.history[i].date);
                if (zodiac) this.recentZodiacCounts[zodiac]++;
            }
        }

        // 2. 遍历历史构建多阶矩阵
        // 我们从最新的数据向后看，但构建矩阵时需要看"过去 -> 现在"
        for (let i = total - 1; i >= 0; i--) {
            const currentDraw = this.history[i]; // T
            const curNum = parseInt(currentDraw.specialNumber);
            if (isNaN(curNum)) continue;
            
            // 核心修正：使用开奖日期获取当时的生肖，而不是现在的生肖
            const curZodiac = getZodiacByYear(curNum, currentDraw.date);
            if (!curZodiac) continue;
            
            const curColor = NUMBER_MAP[curNum]?.color;

            // 基础热度
            const recency = 1 + ((total - 1 - i) / total) * 2;
            this.globalFreq[curNum] += recency;

            // 扫描 Lag 1 到 MAX_LAG_SCAN
            for (let lag = 1; lag <= MAX_LAG_SCAN; lag++) {
                // 如果历史足够长，可以找到 T-lag 期
                if (i + lag < total) {
                    const prevDraw = this.history[i + lag]; // T - lag
                    const prevNum = parseInt(prevDraw.specialNumber);
                    
                    if (!isNaN(prevNum)) {
                        // 核心修正：上期数据也要还原当时的真实生肖
                        const prevZodiac = getZodiacByYear(prevNum, prevDraw.date);
                        const prevColor = NUMBER_MAP[prevNum]?.color;
                        
                        if (prevZodiac && curColor && prevColor) {
                            // 记录生肖转移: [Lag][PrevZodiac][CurZodiac]++
                            // 例如：2024年 龙(1号) -> 2024年 蛇(13号)
                            // 即使现在1号是马，这里统计的依然是 龙->蛇 的规律
                            this.record(this.matrices.zodiac, lag, prevZodiac, curZodiac);
                            
                            // 记录尾数转移 (尾数不受年份影响，直接用)
                            this.record(this.matrices.tail, lag, prevNum % 10, curNum % 10);
                            // 记录012路转移
                            this.record(this.matrices.mod3, lag, getMod3(prevNum), getMod3(curNum));
                            
                            // 新增维度转移
                            this.record(this.matrices.oddEven, lag, getOddEven(prevNum), getOddEven(curNum));
                            this.record(this.matrices.bigSmall, lag, getBigSmall(prevNum), getBigSmall(curNum));
                            this.record(this.matrices.color, lag, prevColor, curColor);
                            this.record(this.matrices.sumOddEven, lag, getSumOddEven(prevNum), getSumOddEven(curNum));
                            this.record(this.matrices.sumBigSmall, lag, getSumBigSmall(prevNum), getSumBigSmall(curNum));
                        }
                    }
                }
            }

            // 平特尾数关联 (仅看上期 T-1)
            if (i < total - 1) {
                const prevDraw = this.history[i + 1];
                if (Array.isArray(prevDraw.numbers)) {
                    const prevFlatTails = prevDraw.numbers.map((n: number) => n % 10);
                    this.flatTailStats.totalCount++;
                    if (prevFlatTails.includes(curNum % 10)) {
                        this.flatTailStats.hitCount++;
                    }
                }
            }
        }

        // 计算平特概率
        if (this.flatTailStats.totalCount > 0) {
            this.flatTailStats.probability = this.flatTailStats.hitCount / this.flatTailStats.totalCount;
        }
    }

    private record(matrixSet: any, lag: number, from: any, to: any) {
        if (!matrixSet[lag][from]) matrixSet[lag][from] = {};
        matrixSet[lag][from][to] = (matrixSet[lag][from][to] || 0) + 1;
    }

    private adjustDynamicWeights() {
        if (this.flatTailStats.probability > 0.65) {
            this.weights.flatStrategy = 45; 
        } else if (this.flatTailStats.probability > 0.5) {
            this.weights.flatStrategy = 10;
        }
    }

    // --- 辅助计算 ---
    private getTransitionStats(
        matrixSet: any, 
        lag: number, 
        fromVal: any, 
        toVal: any
    ): { count: number, total: number, prob: number } {
        const row = matrixSet[lag]?.[fromVal];
        if (!row) return { count: 0, total: 0, prob: 0 };
        
        const count = row[toVal] || 0;
        const total = Object.values(row).reduce((a: any, b: any) => a + b, 0) as number;
        return { count, total, prob: total > 0 ? count / total : 0 };
    }

    // --- 核心评分系统 ---
    // 输入: 候选号码(使用当前马年映射), 参考历史(使用历史真实生肖)
    getCompositeScore(candidate: number, referenceDraws: any[]): { score: number, strongestReason: string } {
        // 候选号码必须使用 NUMBER_MAP (马年)，因为我们是为明天预测
        const cInfo = NUMBER_MAP[candidate]; 
        if (!cInfo) return { score: 0, strongestReason: '' };

        let totalScore = 0;
        let reasons: { lag: number, type: string, prob: number, val: string }[] = [];

        // 1. 遍历所有滞后周期 (Lag 1 ~ 7)
        for (let lag = 1; lag <= MAX_LAG_SCAN; lag++) {
            // 获取 T-lag 期的开奖数据
            const drawIndex = lag - 1;
            if (drawIndex >= referenceDraws.length) break;

            const prevDraw = referenceDraws[drawIndex];
            const prevNum = parseInt(prevDraw.specialNumber);
            if (isNaN(prevNum)) continue;
            
            // 核心修正：参考的历史期数，必须还原为当时的真实生肖
            // 例如上一期是2025年，1号是蛇。如果上一期开了1号，这里 prevZodiac 必须是 '蛇'
            const prevZodiac = getZodiacByYear(prevNum, prevDraw.date);
            const prevColor = NUMBER_MAP[prevNum]?.color;
            if (!prevZodiac || !prevColor) continue;

            // 基础权重衰减
            const lagDecay = 1 / Math.pow(lag, 0.4); 

            // --- A. 生肖规律 ---
            // 逻辑：历史上的 "PrevZodiac" 出了之后，是否倾向于出 "CandidateZodiac"(马年)?
            const zStats = this.getTransitionStats(this.matrices.zodiac, lag, prevZodiac, cInfo.zodiac);
            
            // 绝杀
            if (zStats.total > 25 && zStats.count === 0) {
                totalScore += this.weights.killPenalty * lagDecay;
            } 
            // 强规律
            else if (zStats.prob > 0.20) {
                const boost = zStats.prob * 100 * this.weights.lagPattern * lagDecay;
                totalScore += boost;
                reasons.push({ lag, type: '生肖', prob: zStats.prob, val: `${prevZodiac}->${cInfo.zodiac}` });
            } else {
                totalScore += zStats.prob * 100 * this.weights.lagBase * lagDecay;
            }

            // --- B. 尾数规律 ---
            const tStats = this.getTransitionStats(this.matrices.tail, lag, prevNum % 10, candidate % 10);
            if (tStats.total > 20 && tStats.count === 0) {
                totalScore += (this.weights.killPenalty / 2) * lagDecay; 
            } else if (tStats.prob > 0.18) {
                totalScore += tStats.prob * 80 * this.weights.lagPattern * lagDecay;
                if (tStats.prob > 0.25) reasons.push({ lag, type: '尾数', prob: tStats.prob, val: `${prevNum%10}->${candidate%10}` });
            } else {
                totalScore += tStats.prob * 80 * this.weights.lagBase * lagDecay;
            }

            // --- C. 012路规律 ---
            const mStats = this.getTransitionStats(this.matrices.mod3, lag, getMod3(prevNum), getMod3(candidate));
            totalScore += mStats.prob * 40 * this.weights.lagBase * lagDecay;
            
            // --- D. 新增维度规律 ---
            const oeStats = this.getTransitionStats(this.matrices.oddEven, lag, getOddEven(prevNum), getOddEven(candidate));
            totalScore += oeStats.prob * 30 * this.weights.oddEvenBase * lagDecay;
            
            const bsStats = this.getTransitionStats(this.matrices.bigSmall, lag, getBigSmall(prevNum), getBigSmall(candidate));
            totalScore += bsStats.prob * 30 * this.weights.bigSmallBase * lagDecay;
            
            const cStats = this.getTransitionStats(this.matrices.color, lag, prevColor, cInfo.color);
            totalScore += cStats.prob * 40 * this.weights.colorBase * lagDecay;
            if (cStats.prob > 0.45) reasons.push({ lag, type: '波色', prob: cStats.prob, val: `${prevColor}->${cInfo.color}` });
            
            const soeStats = this.getTransitionStats(this.matrices.sumOddEven, lag, getSumOddEven(prevNum), getSumOddEven(candidate));
            totalScore += soeStats.prob * 20 * this.weights.sumOddEvenBase * lagDecay;
            
            const sbsStats = this.getTransitionStats(this.matrices.sumBigSmall, lag, getSumBigSmall(prevNum), getSumBigSmall(candidate));
            totalScore += sbsStats.prob * 20 * this.weights.sumBigSmallBase * lagDecay;
        }

        // 2. 平特关联 (只看 T-1)
        if (referenceDraws.length > 0 && referenceDraws[0].numbers) {
            const prevTails = referenceDraws[0].numbers.map((n: any) => parseInt(n) % 10);
            if (prevTails.includes(candidate % 10)) {
                totalScore += this.flatTailStats.probability * this.weights.flatStrategy;
            }
        }

        // 3. 过热降权
        if (this.recentZodiacCounts[cInfo.zodiac] >= 4) {
            totalScore += this.weights.overheatPenalty;
        }

        // 4. 全局热度修正
        totalScore += (this.globalFreq[candidate] / this.history.length) * this.weights.freq;

        // 整理最强理由
        reasons.sort((a, b) => b.prob - a.prob);
        let strongestReason = "";
        if (reasons.length > 0) {
            const r = reasons[0];
            const gapDesc = r.lag === 1 ? "上期" : `隔${r.lag-1}期`;
            strongestReason = `规律: ${gapDesc}${r.type}转${r.val} (概率${Math.round(r.prob*100)}%)`;
        }

        return { score: totalScore, strongestReason };
    }
}

export function generateDeterministicPrediction(history: any[]) {
    // 数据校验
    if (!history || history.length < 3) {
        return { zodiacs:[], numbers_18:[], numbers_8:[], heads:[], tails:[], colors:[], reasoning:"数据极度缺乏(少于3期)，无法构建分析矩阵", confidence:0 };
    }

    const engine = new MultiLagEngine(history);
    
    // 获取用于分析的"过去几期"数据 (T-1, T-2... T-7)
    const referenceDraws = history.slice(0, MAX_LAG_SCAN + 1);

    const scores: { n: number, s: number, z: string, reason: string }[] = [];
    let bestReason = "";

    for (let n = 1; n <= 49; n++) {
        const { score, strongestReason } = engine.getCompositeScore(n, referenceDraws);
        if (strongestReason && !bestReason && score > 0) bestReason = strongestReason;
        scores.push({ n, s: score, z: NUMBER_MAP[n].zodiac, reason: strongestReason });
    }

    // 排序
    scores.sort((a, b) => b.s - a.s);

    // --- 提取策略 (Multi-Level Extraction) ---
    
    // 1. 六肖提取 (Sum of Scores)
    // 过滤掉被深度绝杀的号码 (分数极低的)
    const validScores = scores.filter(x => x.s > -100); 
    const zodiacScores: Record<string, number> = {};
    
    validScores.forEach(({ s, z }) => {
        // 只有正向分值才贡献给生肖榜，避免被一颗老鼠屎坏了一锅粥
        if (s > 0) zodiacScores[z] = (zodiacScores[z] || 0) + s; 
    });

    const topZodiacs = Object.entries(zodiacScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(x => x[0]);

    // 2. 18码提取 (结构化组合)
    // A. 核心肖的强码 (从推荐生肖中选分高的)
    const coreNumbers = scores
        .filter(x => topZodiacs.includes(x.z) && x.s > -50)
        .slice(0, 14);
    
    // B. 防守码 (从非推荐生肖中选分最高的，通常是漏网之鱼)
    const guardNumbers = scores
        .filter(x => !topZodiacs.includes(x.z) && x.s > 0)
        .slice(0, 4);

    const top18 = [...coreNumbers, ...guardNumbers].map(x => x.n).sort((a,b) => a-b);
    
    // 兜底补齐
    if (top18.length < 18) {
        const set = new Set(top18);
        for (const item of scores) {
            if (top18.length >= 18) break;
            if (!set.has(item.n)) {
                top18.push(item.n);
                set.add(item.n);
            }
        }
        top18.sort((a,b) => a-b);
    }

    // 3. 8码精选
    const top8 = scores.slice(0, 8).map(x => x.n).sort((a,b) => a-b);

    // 4. 特征提取 (基于Top 20高分号码)
    const tailScores: Record<number, number> = {};
    const headScores: Record<number, number> = {};
    const colorScores: Record<string, number> = { red:0, blue:0, green:0 };

    scores.slice(0, 20).forEach(({n, s}) => { 
        if (s > 0) {
            tailScores[n % 10] = (tailScores[n % 10] || 0) + s;
            headScores[Math.floor(n / 10)] = (headScores[Math.floor(n / 10)] || 0) + s;
            const c = NUMBER_MAP[n]?.color;
            if(c) colorScores[c] += s;
        }
    });

    const topTails = Object.entries(tailScores).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>parseInt(x[0])).sort((a,b)=>a-b);
    const topHeads = Object.entries(headScores).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>parseInt(x[0])).sort((a,b)=>a-b);
    const topColors = Object.entries(colorScores).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);

    // 生成文案
    let reasoning = "多阶滞后全维扫描完成。";
    if (bestReason) {
        reasoning = `【大数据捕获】${bestReason}`;
    } else if (engine.flatTailStats.probability > 0.6) {
        reasoning = `【平特指引】历史数据显示，上期平码尾数(${Math.round(engine.flatTailStats.probability*100)}%)强力渗透特码。`;
    } else if (history.length < 20) {
        reasoning = `【样本预警】历史数据稀缺(${history.length}期)，算法基于有限样本推演，请谨慎参考。`;
    }

    // 动态调整信心指数
    let confidence = 50;
    if (history.length < 10) {
        confidence = 50 + history.length; // 3期->53%, 9期->59%
    } else if (history.length < 30) {
        confidence = 60 + Math.floor(history.length / 2); // 10期->65%, 20期->70%
    } else {
        confidence = Math.min(99, 80 + Math.floor(history.length / 30));
    }

    return {
        zodiacs: topZodiacs,
        numbers_18: top18,
        numbers_8: top8,
        heads: topHeads,
        tails: topTails,
        colors: topColors,
        reasoning,
        confidence
    };
}
