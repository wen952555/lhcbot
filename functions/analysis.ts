
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

    // 4. 动态权重 (默认值，会被回测覆盖)
    weights = {
        freq: 15,          // 基础热度 (降低，避免追热过度)
        recentTrend: 15,   // 近期走势
        omission: -2,      // 遗漏惩罚 (轻微杀冷号，避免误杀)
        lagBase: 10.0,     // 滞后规律基础分
        lagPattern: 30.0,  // 发现强规律时的额外加分
        flatStrategy: 15,  // 平特
        killPenalty: -50,  // 绝杀惩罚 (降低，避免误杀)
        overheatPenalty: -20, // 过热惩罚
        
        // 维度权重
        oddEvenBase: 5.0,
        bigSmallBase: 5.0,
        colorBase: 8.0,
        sumOddEvenBase: 3.0,
        sumBigSmallBase: 3.0
    };

    // 5. 统计指标
    omission: Record<number, number> = {}; // 当前遗漏
    avgOmission: Record<number, number> = {}; // 平均遗漏

    constructor(history: any[]) {
        this.history = history;
        this.initStats();
        this.processFullHistory();
        // 移除 performAutoBacktest，因为它会导致数据泄露（在训练集上测试）
        // 并且小样本下的回测容易导致过拟合，使用经验静态权重更稳健
    }

    private initStats() {
        for (let i = 1; i <= 49; i++) {
            this.globalFreq[i] = 0;
            this.omission[i] = 0;
            this.avgOmission[i] = 0;
        }
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
        
        // --- 1. 计算遗漏值 (从旧到新) ---
        // 临时记录每个号码上次出现的索引
        const lastSeenIndex: Record<number, number> = {};
        const omissionCounts: Record<number, number[]> = {}; // 记录每次遗漏的间隔
        
        // 从最旧的一期开始遍历到最新
        // history[0] 是最新，history[total-1] 是最旧
        // 我们需要正序遍历 (Old -> New) 来模拟遗漏累积
        for (let i = total - 1; i >= 0; i--) {
            const draw = this.history[i];
            const num = parseInt(draw.specialNumber);
            if (isNaN(num)) continue;

            // 更新该号码的遗漏记录
            if (lastSeenIndex[num] !== undefined) {
                const gap = lastSeenIndex[num] - i - 1; // 间隔期数
                if (!omissionCounts[num]) omissionCounts[num] = [];
                omissionCounts[num].push(gap);
            }
            lastSeenIndex[num] = i;
        }

        // 计算当前遗漏 (距离最新一期的间隔)
        for (let n = 1; n <= 49; n++) {
            if (lastSeenIndex[n] !== undefined) {
                this.omission[n] = lastSeenIndex[n]; // lastSeenIndex[n] 就是它在 history 数组中的索引 (0是最新)
            } else {
                this.omission[n] = total; // 从未出现
            }

            // 计算平均遗漏
            const gaps = omissionCounts[n] || [];
            if (gaps.length > 0) {
                this.avgOmission[n] = gaps.reduce((a, b) => a + b, 0) / gaps.length;
            } else {
                this.avgOmission[n] = total;
            }
        }

        // --- 2. 统计近期热度 (判断过热) ---
        for (let i = 0; i < Math.min(12, total); i++) {
            const num = parseInt(this.history[i].specialNumber);
            if (!isNaN(num)) {
                // 使用 getZodiacByYear 还原当时的真实生肖
                const zodiac = getZodiacByYear(num, this.history[i].date);
                if (zodiac) this.recentZodiacCounts[zodiac]++;
            }
        }

        // --- 3. 遍历历史构建多阶矩阵 ---
        for (let i = total - 1; i >= 0; i--) {
            const currentDraw = this.history[i]; // T
            const curNum = parseInt(currentDraw.specialNumber);
            if (isNaN(curNum)) continue;
            
            const curZodiac = getZodiacByYear(curNum, currentDraw.date);
            if (!curZodiac) continue;
            
            const curColor = NUMBER_MAP[curNum]?.color;

            // 基础热度 (加权，越近权重越高)
            // 线性衰减: 最新=2.0, 最旧=1.0
            const recency = 1 + ((total - 1 - i) / total) * 1.5;
            this.globalFreq[curNum] += recency;

            // 扫描 Lag 1 到 MAX_LAG_SCAN
            for (let lag = 1; lag <= MAX_LAG_SCAN; lag++) {
                if (i + lag < total) {
                    const prevDraw = this.history[i + lag]; // T - lag
                    const prevNum = parseInt(prevDraw.specialNumber);
                    
                    if (!isNaN(prevNum)) {
                        const prevZodiac = getZodiacByYear(prevNum, prevDraw.date);
                        const prevColor = NUMBER_MAP[prevNum]?.color;
                        
                        if (prevZodiac && curColor && prevColor) {
                            this.record(this.matrices.zodiac, lag, prevZodiac, curZodiac);
                            this.record(this.matrices.tail, lag, prevNum % 10, curNum % 10);
                            this.record(this.matrices.mod3, lag, getMod3(prevNum), getMod3(curNum));
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

    // --- 自动回测与权重调整 ---
    private performAutoBacktest() {
        // 我们对最近 20 期进行快速回测，看哪些指标最准
        const TEST_COUNT = Math.min(20, this.history.length - 10);
        if (TEST_COUNT < 5) return;

        let scores = {
            hotFreq: 0,    // 热号命中率
            coldOmission: 0, // 冷号回补率
            pattern: 0,    // 规律命中率
            flat: 0        // 平特命中率
        };

        // 模拟回测
        for (let i = 0; i < TEST_COUNT; i++) {
            const targetDraw = this.history[i];
            const targetNum = parseInt(targetDraw.specialNumber);
            if (isNaN(targetNum)) continue;

            // 1. 检查是否是热号 (在当时看来)
            // 简化处理：直接用全局频率近似，因为热度通常有惯性
            if (this.globalFreq[targetNum] > (this.history.length / 49) * 1.2) {
                scores.hotFreq++;
            }

            // 2. 检查是否是冷号回补
            // 简化处理：如果当前遗漏值很大，说明它之前很久没出
            // 注意：这里的 this.omission 是针对最新一期的，用来回测历史不太准
            // 但我们可以看该号码的 avgOmission。如果它出现间隔通常很大，说明是冷号属性
            if (this.avgOmission[targetNum] > 15) {
                scores.coldOmission++;
            }

            // 3. 检查规律 (Pattern)
            // 简单取 Lag 1 的最高概率预测
            const prevDraw = this.history[i + 1];
            if (prevDraw) {
                const prevNum = parseInt(prevDraw.specialNumber);
                if (!isNaN(prevNum)) {
                    const prevZodiac = getZodiacByYear(prevNum, prevDraw.date);
                    const targetZodiac = getZodiacByYear(targetNum, targetDraw.date);
                    if (prevZodiac && targetZodiac) {
                        const stats = this.getTransitionStats(this.matrices.zodiac, 1, prevZodiac, targetZodiac);
                        if (stats.prob > 0.15) scores.pattern++;
                    }
                }
            }
        }

        // --- 动态调整权重 ---
        // 如果热号命中率高 (> 30%)，大幅增加频率权重
        if (scores.hotFreq / TEST_COUNT > 0.3) {
            this.weights.freq = 30; // 提升热号权重
            this.weights.omission = -10; // 加大冷号惩罚 (追热杀冷)
        } else {
            // 如果热号不准，说明在走冷态，减少热号权重，减少冷号惩罚
            this.weights.freq = 10;
            this.weights.omission = 0;
        }

        // 如果规律命中率高
        if (scores.pattern / TEST_COUNT > 0.2) {
            this.weights.lagPattern = 40; // 大幅提升规律权重
            this.weights.lagBase = 10;
        }

        // 平特策略调整
        if (this.flatTailStats.probability > 0.6) {
            this.weights.flatStrategy = 20;
        } else {
            this.weights.flatStrategy = 0;
        }
    }

    private record(matrixSet: any, lag: number, from: any, to: any) {
        if (!matrixSet[lag][from]) matrixSet[lag][from] = {};
        matrixSet[lag][from][to] = (matrixSet[lag][from][to] || 0) + 1;
    }

    // --- 辅助计算 ---
    private getTransitionStats(
        matrixSet: any, 
        lag: number, 
        fromVal: any, 
        toVal: any,
        categoriesCount: number // e.g., 12 for zodiac, 10 for tail
    ): { count: number, total: number, prob: number } {
        const row = matrixSet[lag]?.[fromVal] || {};
        const count = row[toVal] || 0;
        const total = Object.values(row).reduce((a: any, b: any) => a + b, 0) as number;
        
        // 拉普拉斯平滑 (Laplace Smoothing)
        // 避免小样本下出现 100% 或 0% 的极端概率
        // 如果该条件从未出现过(total=0)，概率将平滑为 1/categoriesCount (即随机概率)
        const prob = (count + 1) / (total + categoriesCount);
        
        return { count, total, prob };
    }

    // --- 核心评分系统 ---
    // 输入: 候选号码(使用当前马年映射), 参考历史(使用历史真实生肖)
    getCompositeScore(candidate: number, referenceDraws: any[], targetDate?: string): { score: number, strongestReason: string, maxProb: number } {
        const cInfo = NUMBER_MAP[candidate]; 
        if (!cInfo) return { score: 0, strongestReason: '' };

        // Use dynamic zodiac for candidate based on target date
        const candidateZodiac = getZodiacByYear(candidate, targetDate);

        let totalScore = 0;
        let reasons: { lag: number, type: string, prob: number, val: string }[] = [];

        // --- 1. 统计学基础分 (权重最高) ---
        
        // A. 频率得分 (Frequency)
        // 归一化频率: (freq / maxFreq) * weight
        const maxFreq = Math.max(...Object.values(this.globalFreq));
        const freqScore = (this.globalFreq[candidate] / (maxFreq || 1)) * this.weights.freq;
        totalScore += freqScore;

        // B. 遗漏修正 (Omission)
        // 如果遗漏值 > 平均遗漏 * 2，视为极冷号，扣分 (除非策略是追冷)
        // 但如果遗漏值接近历史最大遗漏，可能会有"回补"预期，这里我们保守策略：杀冷
        if (this.omission[candidate] > this.avgOmission[candidate] * 2) {
            totalScore += this.weights.omission; // 默认为负分
        }
        // 如果是热号 (遗漏值很小)，加分
        if (this.omission[candidate] < 5) {
            totalScore += 5; // 近期热号奖励
        }

        // --- 2. 遍历所有滞后周期 (Lag 1 ~ 7) ---
        for (let lag = 1; lag <= MAX_LAG_SCAN; lag++) {
            const drawIndex = lag - 1;
            if (drawIndex >= referenceDraws.length) break;

            const prevDraw = referenceDraws[drawIndex];
            const prevNum = parseInt(prevDraw.specialNumber);
            if (isNaN(prevNum)) continue;
            
            const prevZodiac = getZodiacByYear(prevNum, prevDraw.date);
            const prevColor = NUMBER_MAP[prevNum]?.color;
            if (!prevZodiac || !prevColor) continue;

            // 基础权重衰减
            const lagDecay = 1 / Math.pow(lag, 0.4); 

            // --- A. 生肖规律 ---
            const zStats = this.getTransitionStats(this.matrices.zodiac, lag, prevZodiac, candidateZodiac, 12);
            
            // 绝杀 (降低门槛，因为平滑后概率不会是0)
            if (zStats.total > 20 && zStats.count === 0) {
                totalScore += this.weights.killPenalty * lagDecay;
            } 
            // 强规律 (平滑后，12分类的期望概率是 8.3%，>15% 算强规律)
            else if (zStats.prob > 0.15) {
                const boost = zStats.prob * 100 * this.weights.lagPattern * lagDecay;
                totalScore += boost;
                reasons.push({ lag, type: '生肖', prob: zStats.prob, val: `${prevZodiac}->${candidateZodiac}` });
            } else {
                totalScore += zStats.prob * 100 * this.weights.lagBase * lagDecay;
            }

            // --- B. 尾数规律 ---
            const tStats = this.getTransitionStats(this.matrices.tail, lag, prevNum % 10, candidate % 10, 10);
            if (tStats.total > 20 && tStats.count === 0) {
                totalScore += (this.weights.killPenalty / 2) * lagDecay; 
            } else if (tStats.prob > 0.15) { // 10分类期望 10%
                totalScore += tStats.prob * 80 * this.weights.lagPattern * lagDecay;
                if (tStats.prob > 0.20) reasons.push({ lag, type: '尾数', prob: tStats.prob, val: `${prevNum%10}->${candidate%10}` });
            } else {
                totalScore += tStats.prob * 80 * this.weights.lagBase * lagDecay;
            }

            // --- C. 012路规律 ---
            const mStats = this.getTransitionStats(this.matrices.mod3, lag, getMod3(prevNum), getMod3(candidate), 3);
            totalScore += mStats.prob * 40 * this.weights.lagBase * lagDecay;
            
            // --- D. 维度规律 ---
            const oeStats = this.getTransitionStats(this.matrices.oddEven, lag, getOddEven(prevNum), getOddEven(candidate), 2);
            totalScore += oeStats.prob * 30 * this.weights.oddEvenBase * lagDecay;
            
            const bsStats = this.getTransitionStats(this.matrices.bigSmall, lag, getBigSmall(prevNum), getBigSmall(candidate), 2);
            totalScore += bsStats.prob * 30 * this.weights.bigSmallBase * lagDecay;
            
            const cStats = this.getTransitionStats(this.matrices.color, lag, prevColor, cInfo.color, 3);
            totalScore += cStats.prob * 40 * this.weights.colorBase * lagDecay;
            if (cStats.prob > 0.45) reasons.push({ lag, type: '波色', prob: cStats.prob, val: `${prevColor}->${cInfo.color}` });
            
            const soeStats = this.getTransitionStats(this.matrices.sumOddEven, lag, getSumOddEven(prevNum), getSumOddEven(candidate), 2);
            totalScore += soeStats.prob * 20 * this.weights.sumOddEvenBase * lagDecay;
            
            const sbsStats = this.getTransitionStats(this.matrices.sumBigSmall, lag, getSumBigSmall(prevNum), getSumBigSmall(candidate), 2);
            totalScore += sbsStats.prob * 20 * this.weights.sumBigSmallBase * lagDecay;
        }

        // 3. 平特关联 (只看 T-1)
        if (referenceDraws.length > 0 && referenceDraws[0].numbers) {
            const prevTails = referenceDraws[0].numbers.map((n: any) => parseInt(n) % 10);
            if (prevTails.includes(candidate % 10)) {
                totalScore += this.flatTailStats.probability * this.weights.flatStrategy;
            }
        }

        // 4. 过热降权 (生肖过热)
        if (this.recentZodiacCounts[candidateZodiac] >= 4) {
            totalScore += this.weights.overheatPenalty;
        }

        // 整理最强理由
        reasons.sort((a, b) => b.prob - a.prob || a.lag - b.lag);
        let strongestReason = "";
        if (reasons.length > 0) {
            const r = reasons[0];
            const gapDesc = r.lag === 1 ? "上期" : `隔${r.lag-1}期`;
            strongestReason = `规律: ${gapDesc}${r.type}转${r.val} (概率${Math.round(r.prob*100)}%)`;
        } else if (freqScore > 15) {
            strongestReason = `统计: 历史热号 (频率${Math.round(this.globalFreq[candidate])})`;
        }

        return { score: totalScore, strongestReason, maxProb: reasons.length > 0 ? reasons[0].prob : 0 };
    }
}

export function generateDeterministicPrediction(history: any[], targetDate?: string) {
    // 数据校验
    if (!history || history.length < 3) {
        return { zodiacs:[], numbers_18:[], numbers_8:[], heads:[], tails:[], colors:[], reasoning:"数据极度缺乏(少于3期)，无法构建分析矩阵", confidence:0 };
    }

    const engine = new MultiLagEngine(history);
    
    // 获取用于分析的"过去几期"数据 (T-1, T-2... T-7)
    const referenceDraws = history.slice(0, MAX_LAG_SCAN + 1);

    const scores: { n: number, s: number, z: string, reason: string, maxProb: number }[] = [];
    let bestReason = "";

    // Use provided targetDate or default to now (for next draw prediction)
    const dateForZodiac = targetDate || new Date().toISOString();

    for (let n = 1; n <= 49; n++) {
        const { score, strongestReason, maxProb } = engine.getCompositeScore(n, referenceDraws, dateForZodiac);
        
        if (strongestReason && !bestReason && score > 0) bestReason = strongestReason;
        
        // Use dynamic zodiac for the result
        const dynamicZodiac = getZodiacByYear(n, dateForZodiac);
        scores.push({ n, s: score, z: dynamicZodiac, reason: strongestReason, maxProb });
    }

    // 稳定排序: 先按分数降序，分数相同时按号码升序
    scores.sort((a, b) => b.s - a.s || a.n - b.n);

    // --- 提取策略 (Multi-Level Extraction) ---
    
    // 1. 六肖提取 (Sum of Scores)
    // 过滤掉被深度绝杀的号码 (分数极低的)
    const validScores = scores.filter(x => x.s > -100); 
    const zodiacScores: Record<string, number> = {};
    
    validScores.forEach(({ s, z }) => {
        // 只有正向分值才贡献给生肖榜
        if (s > 0) zodiacScores[z] = (zodiacScores[z] || 0) + s; 
    });

    const topZodiacs = Object.entries(zodiacScores)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
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

    const topTails = Object.entries(tailScores).sort((a,b)=>b[1]-a[1] || parseInt(a[0])-parseInt(b[0])).slice(0,4).map(x=>parseInt(x[0])).sort((a,b)=>a-b);
    const topHeads = Object.entries(headScores).sort((a,b)=>b[1]-a[1] || parseInt(a[0])-parseInt(b[0])).slice(0,2).map(x=>parseInt(x[0])).sort((a,b)=>a-b);
    const topColors = Object.entries(colorScores).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,2).map(x=>x[0]);

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
    // 基础分 50，历史长度贡献 30，规律强度贡献 20
    const historyBonus = Math.min(30, Math.floor(history.length / 5));
    const maxPatternProb = Math.max(...scores.map(x => x.maxProb));
    const patternBonus = Math.min(20, Math.floor(maxPatternProb * 100 / 2));
    
    let confidence = 50 + historyBonus + patternBonus;
    confidence = Math.min(99, confidence);

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
