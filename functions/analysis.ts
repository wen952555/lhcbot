
import { NUMBER_MAP, ZODIAC_RELATIONS, NumberInfo, getZodiacByYear } from '../constants.ts';

// --- 全局常量 ---
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const MAX_LAG_SCAN = 15; // 降低扫描深度至15期，过滤深层噪音，提高近期规律权重

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
const getHead = (num: number): number => Math.floor(num / 10);
const getSumValue = (num: number): number => Math.floor(num / 10) + (num % 10);

const getPoultryBeast = (zodiac: string): string => {
    const poultry = ['牛', '马', '羊', '鸡', '狗', '猪'];
    return poultry.includes(zodiac) ? 'poultry' : 'beast';
};

const getMaleFemale = (zodiac: string): string => {
    const male = ['鼠', '牛', '虎', '龙', '马', '猴', '狗'];
    return male.includes(zodiac) ? 'male' : 'female';
};

// 计算 Z-Score (标准分数)，用于衡量概率的统计显著性，自动惩罚小样本噪音
const calculateZScore = (prob: number, expected: number, total: number): number => {
    if (total <= 1) return 0; // 样本太小无统计意义
    const variance = (expected * (1 - expected)) / total;
    if (variance === 0) return 0;
    return (prob - expected) / Math.sqrt(variance);
};

// --- 统计容器接口 ---
interface MatrixSet {
    // [LagIndex][FromValue][ToValue] -> Count
    zodiac: Record<number, Record<string, Record<string, number>>>;
    tail: Record<number, Record<number, Record<number, number>>>;
    head: Record<number, Record<number, Record<number, number>>>; // 新增头数矩阵
    number: Record<number, Record<number, Record<number, number>>>; // 新增：特码到特码的精准转移
    mod3: Record<number, Record<number, Record<number, number>>>;
    oddEven: Record<number, Record<string, Record<string, number>>>;
    bigSmall: Record<number, Record<string, Record<string, number>>>;
    color: Record<number, Record<string, Record<string, number>>>;
    sumOddEven: Record<number, Record<string, Record<string, number>>>;
    sumBigSmall: Record<number, Record<string, Record<string, number>>>;
    neighbor: Record<number, Record<string, Record<string, number>>>; // 邻号规律 (prevNum -> candidate is neighbor?)
    wuxing: Record<number, Record<string, Record<string, number>>>;
    sumValue: Record<number, Record<number, Record<number, number>>>;
    poultryBeast: Record<number, Record<string, Record<string, number>>>;
    maleFemale: Record<number, Record<string, Record<string, number>>>;
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
        head: {},
        number: {},
        mod3: {},
        oddEven: {},
        bigSmall: {},
        color: {},
        sumOddEven: {},
        sumBigSmall: {},
        neighbor: {},
        wuxing: {},
        sumValue: {},
        poultryBeast: {},
        maleFemale: {}
    };

    // 3. 平特关联
    flatTailStats = { hitCount: 0, totalCount: 0, probability: 0 };

    // 4. 优化后的静态权重矩阵 (引入 Z-Score 标准分模型)
    weights = {
        freq: 15,          // 基础热度
        recentTrend: 25,   // 近期走势 (Momentum)
        omission: -5,      // 遗漏惩罚
        reversion: 35,     // 极冷回补奖励
        zScoreBase: 12.0,  // Z-Score 基础乘数 (替代原有的 lagBase/lagPattern)
        macroOmission: 4.0,// 宏观遗漏补偿 (生肖/波色整体遗漏)
        flatStrategy: 40,  // 平特 (大幅增强，利用上期平码尾数)
        killPenalty: -60,  // 绝杀惩罚
        overheatPenalty: -30, // 过热惩罚
    };

    // 5. 统计指标
    omission: Record<number, number> = {}; // 当前遗漏
    avgOmission: Record<number, number> = {}; // 平均遗漏
    momentum: Record<number, number> = {}; // 近期动能 (近15期命中次数)

    constructor(history: any[]) {
        this.history = history;
        this.initStats();
        this.processFullHistory();
        // 移除 performAutoBacktest，改用经过优化的静态权重矩阵
    }

    private initStats() {
        for (let i = 1; i <= 49; i++) {
            this.globalFreq[i] = 0;
            this.omission[i] = 0;
            this.avgOmission[i] = 0;
            this.momentum[i] = 0;
        }
        ZODIACS.forEach(z => this.recentZodiacCounts[z] = 0);

        // 初始化Lag矩阵
        for (let lag = 1; lag <= MAX_LAG_SCAN; lag++) {
            this.matrices.zodiac[lag] = {};
            this.matrices.tail[lag] = {};
            this.matrices.head[lag] = {};
            this.matrices.number[lag] = {};
            this.matrices.mod3[lag] = {};
            this.matrices.oddEven[lag] = {};
            this.matrices.bigSmall[lag] = {};
            this.matrices.color[lag] = {};
            this.matrices.sumOddEven[lag] = {};
            this.matrices.sumBigSmall[lag] = {};
            this.matrices.neighbor[lag] = {};
            this.matrices.wuxing[lag] = {};
            this.matrices.sumValue[lag] = {};
            this.matrices.poultryBeast[lag] = {};
            this.matrices.maleFemale[lag] = {};
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

        // --- 2. 统计近期热度 (判断过热与动能) ---
        for (let i = 0; i < Math.min(15, total); i++) {
            const num = parseInt(this.history[i].specialNumber);
            if (!isNaN(num)) {
                // 动能统计
                this.momentum[num]++;
                
                // 生肖过热统计 (仅看近12期)
                if (i < 12) {
                    const zodiac = getZodiacByYear(num, this.history[i].date);
                    if (zodiac) this.recentZodiacCounts[zodiac]++;
                }
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
                            this.record(this.matrices.head, lag, getHead(prevNum), getHead(curNum));
                            this.record(this.matrices.number, lag, prevNum, curNum);
                            this.record(this.matrices.mod3, lag, getMod3(prevNum), getMod3(curNum));
                            this.record(this.matrices.oddEven, lag, getOddEven(prevNum), getOddEven(curNum));
                            this.record(this.matrices.bigSmall, lag, getBigSmall(prevNum), getBigSmall(curNum));
                            this.record(this.matrices.color, lag, prevColor, curColor);
                            this.record(this.matrices.sumOddEven, lag, getSumOddEven(prevNum), getSumOddEven(curNum));
                            this.record(this.matrices.sumBigSmall, lag, getSumBigSmall(prevNum), getSumBigSmall(curNum));
                            
                            // 新增维度
                            this.record(this.matrices.wuxing, lag, prevColor ? NUMBER_MAP[prevNum]?.wuxing : '', curColor ? NUMBER_MAP[curNum]?.wuxing : '');
                            this.record(this.matrices.sumValue, lag, getSumValue(prevNum), getSumValue(curNum));
                            this.record(this.matrices.poultryBeast, lag, getPoultryBeast(prevZodiac), getPoultryBeast(curZodiac));
                            this.record(this.matrices.maleFemale, lag, getMaleFemale(prevZodiac), getMaleFemale(curZodiac));

                            // 邻号关系 (prevNum -> curNum 是否是邻号)
                            const isNeighbor = Math.abs(prevNum - curNum) === 1 || Math.abs(prevNum - curNum) === 48 ? 'yes' : 'no';
                            this.record(this.matrices.neighbor, lag, 'any', isNeighbor);
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

        // --- 0. 计算宏观遗漏 (生肖、波色、尾数整体遗漏) ---
        const zOmission: Record<string, number> = {};
        const cOmission: Record<string, number> = {};
        const tOmission: Record<number, number> = {};
        ZODIACS.forEach(z => zOmission[z] = 100);
        ['red', 'blue', 'green'].forEach(c => cOmission[c] = 100);
        for (let i = 0; i <= 9; i++) tOmission[i] = 100;
        
        for (let i = 0; i < referenceDraws.length; i++) {
            const num = parseInt(referenceDraws[i].specialNumber);
            if (isNaN(num)) continue;
            const z = getZodiacByYear(num, referenceDraws[i].date);
            const c = NUMBER_MAP[num]?.color;
            const t = num % 10;
            if (z && zOmission[z] === 100) zOmission[z] = i;
            if (c && cOmission[c] === 100) cOmission[c] = i;
            if (tOmission[t] === 100) tOmission[t] = i;
        }

        // --- 1. 统计学基础分 (权重最高) ---
        
        // A. 频率得分 (Frequency)
        const avgFreq = Object.values(this.globalFreq).reduce((a, b) => a + b, 0) / 49;
        const freqDiff = (this.globalFreq[candidate] - avgFreq) / (avgFreq || 1);
        const freqScore = freqDiff * this.weights.freq;
        totalScore += freqScore;

        // B. 遗漏修正 (Omission) & 极冷回补 (Reversion)
        if (this.omission[candidate] > this.avgOmission[candidate] * 2.5 && this.omission[candidate] > 20) {
            totalScore += this.weights.reversion;
            reasons.push({ lag: 0, type: '极冷回补', prob: 0.8, val: `遗漏${this.omission[candidate]}期` });
        } else {
            const omissionDiff = (this.omission[candidate] - this.avgOmission[candidate]) / (this.avgOmission[candidate] || 1);
            if (omissionDiff > 0) {
                totalScore += omissionDiff * this.weights.omission; // omission weight is negative
            }
        }
        
        // 如果是热号 (遗漏值很小)，加分
        if (this.omission[candidate] <= 3) {
            totalScore += 8; // 近期热号奖励
        }

        // C. 动能得分 (Momentum)
        if (this.momentum[candidate] >= 2) {
            totalScore += this.momentum[candidate] * this.weights.recentTrend;
        }

        // 连庄惩罚 (特码连庄概率极低)
        if (referenceDraws.length > 0) {
            const lastNum = parseInt(referenceDraws[0].specialNumber);
            if (candidate === lastNum) {
                totalScore -= 40; 
            }
        }

        // --- 1.5 宏观遗漏补偿 (Zodiac/Color/Tail) ---
        if (zOmission[candidateZodiac] > 4) {
            totalScore += (zOmission[candidateZodiac] - 4) * this.weights.macroOmission;
        }
        if (cOmission[cInfo.color] > 2) {
            totalScore += (cOmission[cInfo.color] - 2) * this.weights.macroOmission * 1.5;
        }
        if (tOmission[candidate % 10] > 6) {
            totalScore += (tOmission[candidate % 10] - 6) * this.weights.macroOmission * 2.0;
        }

        // --- 1.6 短期连开趋势 (Phase Alignment) ---
        if (referenceDraws.length >= 3) {
            const last1 = parseInt(referenceDraws[0].specialNumber);
            const last2 = parseInt(referenceDraws[1].specialNumber);
            const last3 = parseInt(referenceDraws[2].specialNumber);
            
            if (!isNaN(last1) && !isNaN(last2) && !isNaN(last3)) {
                // 连大/连小
                if (getBigSmall(last1) === getBigSmall(last2) && getBigSmall(last2) === getBigSmall(last3)) {
                    if (getBigSmall(candidate) === getBigSmall(last1)) {
                        totalScore += 15; // 顺势而为
                        reasons.push({ lag: 1, type: '短期趋势', prob: 0.6, val: `连开${getBigSmall(last1) === 'big' ? '大' : '小'}` });
                    }
                }
                // 连单/连双
                if (getOddEven(last1) === getOddEven(last2) && getOddEven(last2) === getOddEven(last3)) {
                    if (getOddEven(candidate) === getOddEven(last1)) {
                        totalScore += 15;
                    }
                }
            }
        }

        // --- 2. 遍历所有滞后周期 ---
        for (let lag = 1; lag <= MAX_LAG_SCAN; lag++) {
            const drawIndex = lag - 1;
            if (drawIndex >= referenceDraws.length) break;

            const prevDraw = referenceDraws[drawIndex];
            const prevNum = parseInt(prevDraw.specialNumber);
            if (isNaN(prevNum)) continue;
            
            const prevZodiac = getZodiacByYear(prevNum, prevDraw.date);
            const prevColor = NUMBER_MAP[prevNum]?.color;
            if (!prevZodiac || !prevColor) continue;

            // 基础权重衰减 (使用更陡峭的指数级衰减，防止深层噪音淹没近期强信号)
            const lagDecay = 1 / Math.pow(lag, 1.5); 

            // --- A. 生肖规律 ---
            const zStats = this.getTransitionStats(this.matrices.zodiac, lag, prevZodiac, candidateZodiac, 12);
            const zExpected = 1 / 12;
            const zScoreVal = calculateZScore(zStats.prob, zExpected, zStats.total);
            
            if (zStats.total > 15 && zStats.count === 0) {
                totalScore += this.weights.killPenalty * lagDecay;
            } else {
                totalScore += zScoreVal * this.weights.zScoreBase * lagDecay;
                if (zScoreVal > 1.96) reasons.push({ lag, type: '生肖', prob: zStats.prob, val: `Z=${zScoreVal.toFixed(1)}` });
            }

            // --- B. 尾数规律 ---
            const tStats = this.getTransitionStats(this.matrices.tail, lag, prevNum % 10, candidate % 10, 10);
            const tExpected = 1 / 10;
            const tScoreVal = calculateZScore(tStats.prob, tExpected, tStats.total);
            if (tStats.total > 15 && tStats.count === 0) {
                totalScore += (this.weights.killPenalty / 2) * lagDecay; 
            } else {
                totalScore += tScoreVal * this.weights.zScoreBase * lagDecay;
            }

            // --- B2. 头数规律 (新增) ---
            const headExpected = (getHead(candidate) === 0 ? 9 : 10) / 49;
            const hStats = this.getTransitionStats(this.matrices.head, lag, getHead(prevNum), getHead(candidate), 5);
            const hScoreVal = calculateZScore(hStats.prob, headExpected, hStats.total);
            totalScore += hScoreVal * this.weights.zScoreBase * 0.8 * lagDecay;

            // --- C. 012路规律 ---
            const mStats = this.getTransitionStats(this.matrices.mod3, lag, getMod3(prevNum), getMod3(candidate), 3);
            totalScore += calculateZScore(mStats.prob, 1/3, mStats.total) * this.weights.zScoreBase * 0.5 * lagDecay;
            
            // --- D. 维度规律 ---
            const oeStats = this.getTransitionStats(this.matrices.oddEven, lag, getOddEven(prevNum), getOddEven(candidate), 2);
            totalScore += calculateZScore(oeStats.prob, 1/2, oeStats.total) * this.weights.zScoreBase * 0.4 * lagDecay;
            
            const bsStats = this.getTransitionStats(this.matrices.bigSmall, lag, getBigSmall(prevNum), getBigSmall(candidate), 2);
            totalScore += calculateZScore(bsStats.prob, 1/2, bsStats.total) * this.weights.zScoreBase * 0.4 * lagDecay;
            
            // --- E. 波色规律 ---
            const cStats = this.getTransitionStats(this.matrices.color, lag, prevColor, cInfo.color, 3);
            const cExpected = cInfo.color === 'red' ? 17/49 : (cInfo.color === 'blue' ? 16/49 : 16/49);
            const cScoreVal = calculateZScore(cStats.prob, cExpected, cStats.total);
            totalScore += cScoreVal * this.weights.zScoreBase * 1.2 * lagDecay;
            if (cScoreVal > 1.96) reasons.push({ lag, type: '波色', prob: cStats.prob, val: `Z=${cScoreVal.toFixed(1)}` });
            
            // --- F. 合数规律 ---
            const soeStats = this.getTransitionStats(this.matrices.sumOddEven, lag, getSumOddEven(prevNum), getSumOddEven(candidate), 2);
            totalScore += calculateZScore(soeStats.prob, 1/2, soeStats.total) * this.weights.zScoreBase * 0.3 * lagDecay;
            
            const sbsStats = this.getTransitionStats(this.matrices.sumBigSmall, lag, getSumBigSmall(prevNum), getSumBigSmall(candidate), 2);
            totalScore += calculateZScore(sbsStats.prob, 1/2, sbsStats.total) * this.weights.zScoreBase * 0.3 * lagDecay;
            
            // --- G. 邻号规律 ---
            const isNeighbor = Math.abs(prevNum - candidate) === 1 || Math.abs(prevNum - candidate) === 48 ? 'yes' : 'no';
            const nStats = this.getTransitionStats(this.matrices.neighbor, lag, 'any', isNeighbor, 2);
            const nExpected = isNeighbor === 'yes' ? 2/49 : 47/49;
            const nScoreVal = calculateZScore(nStats.prob, nExpected, nStats.total);
            if (isNeighbor === 'yes' && nScoreVal > 0) {
                totalScore += nScoreVal * this.weights.zScoreBase * 0.8 * lagDecay;
            }

            // --- H. 五行规律 ---
            const prevWuxing = NUMBER_MAP[prevNum]?.wuxing;
            const curWuxing = cInfo.wuxing;
            if (prevWuxing && curWuxing) {
                const wxStats = this.getTransitionStats(this.matrices.wuxing, lag, prevWuxing, curWuxing, 5);
                const wxExpected = 1 / 5; // 粗略期望
                const wxScoreVal = calculateZScore(wxStats.prob, wxExpected, wxStats.total);
                totalScore += wxScoreVal * this.weights.zScoreBase * 0.6 * lagDecay;
            }

            // --- I. 合数规律 (精确合数 0-18) ---
            const svStats = this.getTransitionStats(this.matrices.sumValue, lag, getSumValue(prevNum), getSumValue(candidate), 15);
            // 合数期望概率不同，例如合数7有 07, 16, 25, 34, 43 (5个)，合数1有 01, 10 (2个)
            // 这里简化处理，统一用 Z-Score 评估相对显著性
            const svScoreVal = calculateZScore(svStats.prob, 1/15, svStats.total);
            totalScore += svScoreVal * this.weights.zScoreBase * 0.5 * lagDecay;

            // --- J. 家禽野兽 / 男女肖 ---
            const pbStats = this.getTransitionStats(this.matrices.poultryBeast, lag, getPoultryBeast(prevZodiac), getPoultryBeast(candidateZodiac), 2);
            totalScore += calculateZScore(pbStats.prob, 1/2, pbStats.total) * this.weights.zScoreBase * 0.4 * lagDecay;

            const mfStats = this.getTransitionStats(this.matrices.maleFemale, lag, getMaleFemale(prevZodiac), getMaleFemale(candidateZodiac), 2);
            totalScore += calculateZScore(mfStats.prob, 1/2, mfStats.total) * this.weights.zScoreBase * 0.4 * lagDecay;

            // --- K. 精准特码转移 ---
            const numStats = this.getTransitionStats(this.matrices.number, lag, prevNum, candidate, 49);
            const numExpected = 1 / 49;
            const numScoreVal = calculateZScore(numStats.prob, numExpected, numStats.total);
            if (numScoreVal > 0) {
                totalScore += numScoreVal * this.weights.zScoreBase * 2.0 * lagDecay; // 高权重，因为极难触发
                if (numScoreVal > 1.5) reasons.push({ lag, type: '精准特码', prob: numStats.prob, val: `${prevNum}->${candidate}` });
            }
        }

        // 3. 平特关联 (只看 T-1)
        if (referenceDraws.length > 0 && referenceDraws[0].numbers) {
            const prevTails = referenceDraws[0].numbers.map((n: any) => parseInt(n) % 10);
            const prevZodiacs = referenceDraws[0].numbers.map((n: any) => getZodiacByYear(parseInt(n), referenceDraws[0].date)).filter(Boolean);

            if (prevTails.includes(candidate % 10)) {
                // 增强逻辑：直接使用历史真实命中率作为加分依据，大幅提高权重
                // 期望概率大约是 6/10 = 60% (假设6个平码尾数不重复)
                const hitRate = this.flatTailStats.probability || 0.5;
                totalScore += hitRate * this.weights.flatStrategy * 2.0; // 翻倍权重
                reasons.push({ lag: 1, type: '平码落尾', prob: hitRate, val: `包含尾数${candidate % 10}` });
            }

            if (prevZodiacs.includes(candidateZodiac)) {
                // 平码落肖
                totalScore += this.weights.flatStrategy * 1.5;
                reasons.push({ lag: 1, type: '平码落肖', prob: 0.5, val: `包含生肖${candidateZodiac}` });
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
            if (r.type === '极冷回补') {
                strongestReason = `统计: ${r.type} (${r.val})`;
            } else {
                const gapDesc = r.lag === 1 ? "上期" : `隔${r.lag-1}期`;
                strongestReason = `规律: ${gapDesc}${r.type}转${r.val} (概率${Math.round(r.prob*100)}%)`;
            }
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
    
    // 1. 生肖提取 (基于生肖内最强号码的得分)
    // 过滤掉被深度绝杀的号码 (分数极低的)
    const validScores = scores.filter(x => x.s > -100); 
    const zodiacNumberScores: Record<string, number[]> = {};
    
    validScores.forEach(({ s, z }) => {
        if (!zodiacNumberScores[z]) zodiacNumberScores[z] = [];
        zodiacNumberScores[z].push(s);
    });

    const zodiacScores: Record<string, number> = {};
    for (const [z, sList] of Object.entries(zodiacNumberScores)) {
        // 降序排列该生肖下的所有号码得分
        sList.sort((a, b) => b - a);
        if (sList.length > 0) {
            const avgScore = sList.reduce((a, b) => a + b, 0) / sList.length;
            const topScore = sList[0];
            // 综合考量最强号码和该生肖的整体平均分
            zodiacScores[z] = topScore * 0.6 + avgScore * 0.4;
        } else {
            zodiacScores[z] = -999;
        }
    }

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
    const topHeads = Object.entries(headScores).sort((a,b)=>b[1]-a[1] || parseInt(a[0])-parseInt(b[0])).slice(0,3).map(x=>parseInt(x[0])).sort((a,b)=>a-b);
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
    
    reasoning += " (注：彩票开奖为随机独立事件，历史统计规律仅供参考，不代表未来走势，请理性对待)";

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
