
import { generateDeterministicPrediction } from '../analysis';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  try {
    const { lotteryId } = await request.json();
    
    // --- 获取更多历史数据以支持算法回测 ---
    // 修正：统一使用 LIMIT 500，与 webhook 保持一致，确保算法输入样本相同
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
            specialNumber: row.special_number
        }));
    }

    // --- 获取最新预测 ---
    let prediction: any = null;
    if (env.DB) {
        const predRow = await env.DB.prepare(`
            SELECT data, updated_at FROM admin_predictions WHERE lottery_id = ?
        `).bind(lotteryId).first();

        if (predRow && predRow.data) {
            prediction = JSON.parse(predRow.data as string);
            prediction.timestamp = predRow.updated_at;
        }
    }

    // --- 兜底逻辑：如果数据库没有预测，实时生成 ---
    if (!prediction && historyData.length > 0) {
        const generated = generateDeterministicPrediction(historyData);
        const now = Date.now();
        prediction = {
            ...generated,
            timestamp: now
        };
        
        // 修正：将生成的预测写入数据库，确保 Bot 和前端下次读取时结果一致
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
