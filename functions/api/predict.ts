
import { generateDeterministicPrediction } from '../analysis';
import { PREDICTION_DATE } from '../../constants';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  try {
    const { lotteryId } = await request.json();
    
    // --- 获取历史数据 ---
    // 统一使用 LIMIT 500
    let historyData: any[] = [];
    if (env.DB) {
        const { results } = await env.DB.prepare(`
            SELECT * FROM lottery_draws 
            WHERE lottery_id = ? 
            ORDER BY CAST(draw_number AS INTEGER) DESC, draw_number DESC 
            LIMIT 500
        `).bind(lotteryId).all();
        
        historyData = results.map((row: any) => ({
            drawNumber: row.draw_number,
            date: row.open_time,
            numbers: JSON.parse(row.numbers),
            specialNumber: row.special_number,
            createdAt: row.created_at // 获取数据入库时间用于比对
        }));
    }

    // --- 获取缓存的预测 (针对下期) ---
    let prediction: any = null;
    let isStale = false;

    if (env.DB) {
        const predRow = await env.DB.prepare(`
            SELECT data, updated_at FROM admin_predictions WHERE lottery_id = ?
        `).bind(lotteryId).first();

        if (predRow && predRow.data) {
            prediction = JSON.parse(predRow.data as string);
            prediction.timestamp = predRow.updated_at;

            // [关键修复] 缓存过期检查
            if (historyData.length > 0) {
                const lastDrawTime = historyData[0].createdAt || 0;
                // 强制算法版本更新：如果缓存时间早于当前时间减去 1 分钟，则视为过期
                if (prediction.timestamp < lastDrawTime || prediction.timestamp < Date.now() - 60000) {
                    isStale = true;
                    prediction = null; // 标记为失效，触发下方重新生成
                }
            }
        }
    }

    // --- 如果没有预测或预测已过期，实时生成 (针对下期) ---
    if ((!prediction || isStale) && historyData.length > 0) {
        const generated = generateDeterministicPrediction(historyData, PREDICTION_DATE);
        const now = Date.now();
        prediction = {
            ...generated,
            timestamp: now
        };
        
        // 将新生成的预测回写到数据库
        try {
             await env.DB.prepare(`
                INSERT OR REPLACE INTO admin_predictions (lottery_id, data, updated_at)
                VALUES (?, ?, ?)
            `).bind(lotteryId, JSON.stringify(generated), now).run();
        } catch(e) {
            console.error("Failed to cache prediction", e);
        }
    }

    // --- 获取预测历史记录 (用于回测展示) ---
    let predictionHistory: any[] = [];
    if (env.DB) {
        const { results } = await env.DB.prepare(`
            SELECT draw_number, data, created_at 
            FROM prediction_history 
            WHERE lottery_id = ? 
            ORDER BY CAST(draw_number AS INTEGER) DESC, draw_number DESC 
            LIMIT 30
        `).bind(lotteryId).all();

        predictionHistory = results.map((row: any) => ({
            drawNumber: row.draw_number,
            prediction: JSON.parse(row.data as string),
            timestamp: row.created_at
        }));
    }

    // --- [新增] 实时回测补全与更新 ---
    // 强制使用最新算法重新计算最近 15 期的回测结果，以便前端展示最新算法的战绩。
    const BACKTEST_COUNT = 15;
    if (historyData.length > BACKTEST_COUNT + 10) {
        const newPredictionHistory: any[] = [];
        
        // 对最近的 BACKTEST_COUNT 期进行回测
        // i = 0 是最新一期。我们要预测 history[0]，需要用 history.slice(1)
        // i = 1 是上期。预测 history[1]，用 history.slice(2)
        for (let i = 0; i < BACKTEST_COUNT; i++) {
            const targetDraw = historyData[i];
            if (!targetDraw) continue;

            // 使用该期之后的数据作为"历史"进行预测
            const pastHistory = historyData.slice(i + 1);
            // 只有当有足够历史数据时才预测
            if (pastHistory.length > 10) {
                const backtestPred = generateDeterministicPrediction(pastHistory, targetDraw.date);
                newPredictionHistory.push({
                    drawNumber: targetDraw.drawNumber,
                    prediction: backtestPred,
                    timestamp: Date.now(), // 标记为实时计算
                    isBacktest: true // 标记为回测数据
                });
            }
        }
        
        // 合并旧的历史记录 (保留 15 期之前的真实记录)
        const newDrawNumbers = new Set(newPredictionHistory.map(p => p.drawNumber));
        for (const oldPred of predictionHistory) {
            if (!newDrawNumbers.has(oldPred.drawNumber)) {
                newPredictionHistory.push(oldPred);
            }
        }
        
        predictionHistory = newPredictionHistory;

        // 重新排序
        predictionHistory.sort((a, b) => {
            return b.drawNumber.localeCompare(a.drawNumber, undefined, { numeric: true });
        });
    }

    return new Response(JSON.stringify({ 
        history: historyData,
        prediction: prediction,
        predictionHistory: predictionHistory
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
