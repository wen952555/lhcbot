
import { generateDeterministicPrediction } from '../analysis';

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
            ORDER BY draw_number DESC 
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

    // --- 获取缓存的预测 ---
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
            // 如果最新一期开奖数据的入库时间(createdAt) 晚于 预测的生成时间(updated_at)
            // 说明有新开奖数据进入了系统，当前的预测是基于旧数据算的，需要作废。
            if (historyData.length > 0) {
                const lastDrawTime = historyData[0].createdAt || 0;
                if (prediction.timestamp < lastDrawTime) {
                    isStale = true;
                    prediction = null; // 标记为失效，触发下方重新生成
                }
            }
        }
    }

    // --- 如果没有预测或预测已过期，实时生成 ---
    if ((!prediction || isStale) && historyData.length > 0) {
        const generated = generateDeterministicPrediction(historyData);
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

    // --- 获取预测历史记录 ---
    let predictionHistory: any[] = [];
    if (env.DB) {
        const { results } = await env.DB.prepare(`
            SELECT draw_number, data, created_at 
            FROM prediction_history 
            WHERE lottery_id = ? 
            ORDER BY draw_number DESC 
            LIMIT 30
        `).bind(lotteryId).all();

        predictionHistory = results.map((row: any) => ({
            drawNumber: row.draw_number,
            prediction: JSON.parse(row.data as string),
            timestamp: row.created_at
        }));
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
