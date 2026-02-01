
import { generateDeterministicPrediction } from '../../analysis';

export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const payload = await request.json();
    
    // 1. Basic Validation
    if (!payload.message || !payload.message.text) {
      return new Response('OK');
    }

    const chatId = payload.message.chat.id;
    const text = payload.message.text.trim();
    const userId = payload.message.from?.id;

    // 2. Auth Check
    const adminId = env.TG_ADMIN_ID ? parseInt(env.TG_ADMIN_ID) : null;
    if (adminId && userId !== adminId) {
       await sendTelegramMessage(env.TG_BOT_TOKEN, chatId, "⛔ 权限不足");
       return new Response('Unauthorized');
    }

    // 3. Parse Command: /predict <lottery_id>
    if (text.startsWith('/predict')) {
      const parts = text.split(' ');
      const lotteryId = parts[1];

      if (!lotteryId) {
        await sendTelegramMessage(env.TG_BOT_TOKEN, chatId, "⚠️ 请指定彩种ID，例如: /predict new_macau");
        return new Response('OK');
      }

      // Notify processing
      await sendTelegramMessage(env.TG_BOT_TOKEN, chatId, `⏳ 正在分析 [${lotteryId}] 数据...`);

      // 4. Fetch History Data (Reuse logic similar to predict.ts but simplified)
      let historyData = [];
      
      // Try to get from DB history first
      if (env.DB) {
        const { results } = await env.DB.prepare(`
            SELECT * FROM lottery_draws 
            WHERE lottery_id = ? 
            ORDER BY draw_number DESC 
            LIMIT 100
        `).bind(lotteryId).all();
        
        historyData = results.map((row: any) => ({
            drawNumber: row.draw_number,
            numbers: JSON.parse(row.numbers),
            specialNumber: row.special_number
        }));
      }

      if (historyData.length < 10) {
          await sendTelegramMessage(env.TG_BOT_TOKEN, chatId, "❌ 历史数据不足，无法生成预测。请确保已同步开奖数据。");
          return new Response('OK');
      }

      // 5. Generate Prediction
      const prediction = generateDeterministicPrediction(historyData);

      // 6. Save to DB (admin_predictions)
      if (env.DB) {
          await env.DB.prepare(`
            INSERT OR REPLACE INTO admin_predictions (lottery_id, data, updated_at)
            VALUES (?, ?, ?)
          `).bind(lotteryId, JSON.stringify(prediction), Date.now()).run();
      }

      // 7. Format Result for Telegram
      const msg = `✅ **预测已更新**\n\n` +
                  `🐯 **六肖**: ${prediction.zodiacs.join(' ')}\n` +
                  `🎱 **18码**: ${prediction.numbers_18.join(',')}\n` +
                  `🔢 **头数**: ${prediction.heads.join(', ')}头\n` +
                  `🔚 **尾数**: ${prediction.tails.join(', ')}尾\n` +
                  `🎨 **波色**: ${prediction.colors.map(c => c==='red'?'红':c==='blue'?'蓝':'绿').join(' ')}`;

      await sendTelegramMessage(env.TG_BOT_TOKEN, chatId, msg);
    } else {
        // Echo or help
        if(text === '/start') {
             await sendTelegramMessage(env.TG_BOT_TOKEN, chatId, "👋 欢迎使用六合助手管理Bot。\n命令: /predict <id>");
        }
    }

    return new Response('OK');
  } catch (err: any) {
    console.error(err);
    return new Response(err.message, { status: 500 });
  }
}

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  if(!token) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
  });
}
