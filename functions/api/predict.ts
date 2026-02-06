
import { generateDeterministicPrediction } from '../analysis';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  try {
    const { lotteryId } = await request.json();
    
    // --- 获取更多历史数据以支持算法回测 ---
    // 增加 LIMIT 以确保实时计算时的准确性
    let historyData: any[] = [];
    if (env.DB) {
        const { results } = await env.DB.prepare(`
            SELECT * FROM lottery_draws 
            WHERE lottery_id = ? 
            ORDER BY draw_number DESC 
            LIMIT 200
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
        prediction = {
            ...generated,
            timestamp: Date.now()
        };
        // 注意：这里不写入数据库，保持 GET/Query 操作的无副作用性，
        // 且避免并发写入冲突，写入操作保留给 webhook 或同步动作。
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
