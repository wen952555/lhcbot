
import { NUMBER_MAP, ZODIAC_RELATIONS, NumberInfo } from '../constants.tsx';

// --- 全局常量 ---
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const WUXING = ['金', '木', '水', '火', '土'];

// --- 核心分析引擎 ---
class FullHistoryEngine {
    history: any[];
    
    // 全局频率统计
    globalFreq: Record<number, number> = {};
    
    // 遗漏统计
    currentOmission: Record<number, number> = {};
    
    // 马尔可夫转移矩阵 (Transition Matrices)
    // 记录: [上期号码] -> { [下期号码]: 次数 }
    numTransition: Record<number, Record<number, number>> = {};
    // 记录: [上期生肖] -> { [下期生肖]: 次数 }
    zodiacTransition: Record<string, Record<string, number>> = {};
    // 记录: [上期尾数] -> { [下期尾数]: 次数 }
    tailTransition: Record<number, Record<number, number>> = {};

    // 奇偶/波色偏差 (用于均值回归)
    balanceStats = {
        oddCount: 0,
        totalCount: 0,
        colorCounts: { red: 0, blue: 0, green: 0 }
    };

    constructor(history: any[]) {
        this.history = history;
        this.initStats();
        this.processFullHistory();
    }

    private initStats() {
        for (let i = 1; i <= 49; i++) this.globalFreq[i] = 0;
        // 遗漏初始化
        for (let i = 1; i <= 49; i++) {
            const lastIdx = this.history.findIndex(d => parseInt(d.specialNumber) === i);
            this.currentOmission[i] = lastIdx === -1 ? this.history.length : lastIdx;
        }
    }

    private processFullHistory() {
        // 倒序遍历（从最旧的数据开始往新数据走），模拟时间流逝建立转移矩阵
        // history[0] 是最新，history[length-1] 是最旧
        // 所以我们从 length-1 遍历到 0
        const total = this.history.length;

        for (let i = total - 1; i >= 0; i--) {
            const currentDraw = this.history[i];
            const currentNum = parseInt(currentDraw.specialNumber);
            
            if (isNaN(currentNum)) continue;
            
            // 1. 全局频率 (Global Frequency)
            // 越新的数据权重稍微高一点点，但保留全量数据的影响
            // 线性加权：最旧的权重1，最新的权重2 (模拟)
            const timeWeight = 1 + ((total - 1 - i) / total); 
            this.globalFreq[currentNum] += timeWeight;

            const curInfo = NUMBER_MAP[currentNum];
            if (!curInfo) continue;

            // 统计偏差
            this.balanceStats.totalCount++;
            if (!curInfo.isEven) this.balanceStats.oddCount++;
            this.balanceStats.colorCounts[curInfo.color]++;

            // 2. 构建转移矩阵 (需要有"下一期")
            // 注意：i 是当前期在数组中的索引。数组是[新...旧]。
            // 所有的"上一期"是数组里的 i+1 (如果存在)
            if (i < total - 1) {
                const prevDraw = this.history[i + 1]; // 时间上的前一期
                const prevNum = parseInt(prevDraw.specialNumber);
                
                if (!isNaN(prevNum)) {
                    const prevInfo = NUMBER_MAP[prevNum];
                    
                    // A. 号码转移
                    if (!this.numTransition[prevNum]) this.numTransition[prevNum] = {};
                    this.numTransition[prevNum][currentNum] = (this.numTransition[prevNum][currentNum] || 0) + 1;

                    // B. 生肖转移
                    if (prevInfo && curInfo) {
                        const pZ = prevInfo.zodiac;
                        const cZ = curInfo.zodiac;
                        if (!this.zodiacTransition[pZ]) this.zodiacTransition[pZ] = {};
                        this.zodiacTransition[pZ][cZ] = (this.zodiacTransition[pZ][cZ] || 0) + 1;
                    }

                    // C. 尾数转移
                    const pTail = prevNum % 10;
                    const cTail = currentNum % 10;
                    if (!this.tailTransition[pTail]) this.tailTransition[pTail] = {};
                    this.tailTransition[pTail][cTail] = (this.tailTransition[pTail][cTail] || 0) + 1;
                }
            }
        }
    }

    // --- 算法评分系统 ---

    /**
     * 算法1：马尔可夫链预测 (基于上一期结果)
     * 原理：如果历史上“龙”后面经常出“狗”，那么这期“狗”得分高
     */
    getMarkovScore(lastNum: number, candidate: number): number {
        let score = 0;
        const candidateInfo = NUMBER_MAP[candidate];
        if (!candidateInfo) return 0;
        
        // 1. 号码直接转移 (权重低，因为稀疏)
        const numTransCount = this.numTransition[lastNum]?.[candidate] || 0;
        score += numTransCount * 2.0;

        // 2. 生肖转移 (权重高，因为数据密集)
        const lastInfo = NUMBER_MAP[lastNum];
        if (lastInfo) {
            const zTransCount = this.zodiacTransition[lastInfo.zodiac]?.[candidateInfo.zodiac] || 0;
            // 归一化：除以该生肖出现的总次数，得到概率
            // 这里简化，直接用次数
            score += zTransCount * 1.5; 
        }

        // 3. 尾数转移
        const lastTail = lastNum % 10;
        const candTail = candidate % 10;
        const tailTransCount = this.tailTransition[lastTail]?.[candTail] || 0;
        score += tailTransCount * 0.8;

        return score;
    }

    /**
     * 算法2：生肖玄学 (基于ZODIAC_RELATIONS)
     * 原理：三合六合加分，相冲减分
     */
    getZodiacHarmonyScore(lastNum: number, candidate: number): number {
        const lastInfo = NUMBER_MAP[lastNum];
        const candInfo = NUMBER_MAP[candidate];
        if (!lastInfo || !candInfo) return 0;

        const relation = ZODIAC_RELATIONS[lastInfo.zodiac];
        if (!relation) return 0;

        // 是朋友 (三合/六合)
        if (relation.friends.includes(candInfo.zodiac)) {
            return 8; // 强力加分
        }
        // 是敌人 (相冲)
        if (relation.clash === candInfo.zodiac) {
            return -5; // 减分
        }
        return 0;
    }

    /**
     * 算法3：均值回归 (Mean Reversion)
     * 原理：如果奇数出的太多，偶数概率增加
     */
    getBalanceScore(candidate: number): number {
        const info = NUMBER_MAP[candidate];
        if (!info) return 0;
        let score = 0;
        const total = Math.max(1, this.balanceStats.totalCount);

        // 奇偶回归
        const oddRate = this.balanceStats.oddCount / total;
        // 理论应该是 0.5。如果 oddRate > 0.6，说明奇数太多，偶数加分
        if (oddRate > 0.55 && info.isEven) score += 3;
        if (oddRate < 0.45 && !info.isEven) score += 3;

        // 波色回归 (简单版：红绿蓝约各1/3)
        const colorRate = this.balanceStats.colorCounts[info.color] / total;
        // 如果某种颜色占比过低 (< 0.25)，加分补涨
        if (colorRate < 0.28) score += 2;
        // 如果过高 (> 0.4)，减分
        if (colorRate > 0.4) score -= 1;

        return score;
    }
}

export function generateDeterministicPrediction(history: any[]) {
    if (!history || history.length < 1) {
        return { zodiacs:[], numbers_18:[], numbers_8:[], heads:[], tails:[], colors:[], reasoning:"等待数据...", confidence:0 };
    }

    const engine = new FullHistoryEngine(history);
    const lastDraw = history[0]; // 最新一期
    const lastNum = parseInt(lastDraw.specialNumber);
    
    // 如果上一期数据异常，无法使用关联算法
    const hasLast = !isNaN(lastNum);

    const scores: { n: number, s: number, debug?: string }[] = [];

    // --- 综合打分循环 ---
    for (let n = 1; n <= 49; n++) {
        let finalScore = 0;
        let reasons = [];

        // 1. 基础热度 (Base Heat)
        // 归一化频率: (freq / total_draws) * 100
        const freqScore = (engine.globalFreq[n] / history.length) * 20; 
        finalScore += freqScore;

        // 2. 马尔可夫转移 (Markov)
        if (hasLast) {
            const mkScore = engine.getMarkovScore(lastNum, n);
            // 马尔可夫分数通常在 0 - 20 之间，权重给高点
            finalScore += mkScore * 2.5;
        }

        // 3. 生肖相生 (Harmony)
        if (hasLast) {
            const zScore = engine.getZodiacHarmonyScore(lastNum, n);
            finalScore += zScore;
        }

        // 4. 均值回归 (Balance)
        const balScore = engine.getBalanceScore(n);
        finalScore += balScore;

        // 5. 遗漏值修正 (Omission)
        // 策略：不追极冷号 (Omission > 30)，但追次冷号 (Omission 10-20)
        const omiss = engine.currentOmission[n];
        if (omiss > 35) {
            finalScore -= 10; // 极冷号，通常认为是死号，杀
        } else if (omiss > 10 && omiss < 25) {
            finalScore += 5; // 回补期，加分
        }

        // 6. 确定性杀号 (Deterministic Killing)
        // 杀重号：只有极小概率连开 (虽然有，但作为预测策略应杀掉)
        if (hasLast && n === lastNum) {
            finalScore -= 20;
        }

        scores.push({ n, s: finalScore });
    }

    // --- 排序与提取 ---
    scores.sort((a, b) => b.s - a.s);

    const top18 = scores.slice(0, 18).map(x => x.n).sort((a,b)=>a-b);
    const top8 = scores.slice(0, 8).map(x => x.n).sort((a,b)=>a-b);
    
    // 生肖聚合
    const zodiacScores: Record<string, number> = {};
    scores.forEach(({n, s}) => {
        const z = NUMBER_MAP[n]?.zodiac;
        if (z) zodiacScores[z] = (zodiacScores[z] || 0) + s;
    });
    const topZodiacs = Object.entries(zodiacScores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6)
        .map(([z]) => z);

    // 尾数聚合 (取前20名分析)
    const tailCounts: Record<number, number> = {};
    scores.slice(0, 20).forEach(({n}) => {
        const t = n % 10;
        tailCounts[t] = (tailCounts[t] || 0) + 1;
    });
    const topTails = Object.entries(tailCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 4)
        .map(([t]) => parseInt(t))
        .sort((a,b)=>a-b);

    // 头数聚合
    const headCounts: Record<number, number> = {};
    scores.slice(0, 15).forEach(({n}) => {
        const h = Math.floor(n / 10);
        headCounts[h] = (headCounts[h] || 0) + 1;
    });
    const topHeads = Object.entries(headCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([h]) => parseInt(h))
        .sort((a,b)=>a-b);

    // 波色聚合
    const colorScores: Record<string, number> = { red:0, blue:0, green:0 };
    scores.slice(0, 12).forEach(({n, s}) => {
        const c = NUMBER_MAP[n]?.color;
        if (c) colorScores[c] += s;
    });
    const topColors = Object.entries(colorScores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([c]) => c);

    // 信心计算
    // 基础信心 60，每多10期历史数据 +1，上限 92
    // 如果数据极少，信心会很低
    const baseConf = 60 + Math.floor(history.length / 5);
    const confidence = Math.min(92, Math.max(50, baseConf));
    
    // 生成推理文案
    let reason = "全量数据建模";
    if (history.length < 20) reason = "小样本: 生肖/尾数转移";
    else if (history.length > 100) reason = "大数据: 均值回归+马尔可夫";

    return {
        zodiacs: topZodiacs,
        numbers_18: top18,
        numbers_8: top8,
        heads: topHeads,
        tails: topTails,
        colors: topColors,
        reasoning: `【${reason}】基于${history.length}期全量回溯`,
        confidence
    };
}
