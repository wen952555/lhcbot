
import { generateDeterministicPrediction } from '../analysis';
import { PREDICTION_DATE } from '../../constants';

// 定义彩种配置
const LOTTERIES = [
  { id: 'new_macau', name: '新澳门', envKey: 'API_URL_NEW_MACAU' },
  { id: 'hk_jc', name: '香港', envKey: 'API_URL_HK_JC' },
  { id: 'old_macau', name: '老澳门', envKey: 'API_URL_OLD_MACAU' }
];

export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const payload = await request.json();
    
    if (payload.callback_query) {
        return new Response('OK');
    }

    if (payload.message) {
      return await handleMessage(payload.message, env);
    }

    return new Response('OK');
  } catch (err: any) {
    console.error("[Webhook Error]", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

async function handleMessage(message: any, env: any) {
  const chatId = message.chat.id;
  const text = message.text?.trim();
  const userId = message.from?.id;

  const adminId = env.TG_ADMIN_ID ? parseInt(env.TG_ADMIN_ID) : null;
  const isAdmin = adminId && userId === adminId;

  switch (text) {
      case '/start':
      case '/help':
      case '帮助':
          await sendHelpMessage(env.TG_BOT_TOKEN, chatId);
          break;
          
      case '一键预测':
      case '/predict':
          await doBatchPredictInBot(env, chatId);
          break;

      case '一键查看记录':
      case '/history':
          await doBatchViewInBot(env, chatId);
          break;

      case '一键同步':
      case '/sync':
          if (!isAdmin) {
             await sendMessage(env.TG_BOT_TOKEN, chatId, "⛔ 只有管理员可以使用同步功能");
             return;
          }
          await doSyncAll(env, chatId);
          break;

      case '推送频道':
      case '/push':
          if (!isAdmin) {
             await sendMessage(env.TG_BOT_TOKEN, chatId, "⛔ 只有管理员可以使用推送功能");
             return;
          }
          await doPushAllToChannel(env, chatId);
          break;
      
      default:
          break;
  }

  return new Response('OK');
}

async function sendHelpMessage(token: string, chatId: number) {
  const msg = "🤖 <b>六合大数据助手</b>\n\n" +
              "请发送以下文本命令：\n\n" +
              "🔮 <b>一键预测</b> - 获取所有彩种预测\n" +
              "📊 <b>一键查看记录</b> - 获取所有彩种记录\n\n" +
              "⚙️ <b>管理员命令：</b>\n" +
              "🔄 <b>一键同步</b> - 同步最新数据\n" +
              "📢 <b>推送频道</b> - 推送预测到频道";

  await sendMessage(token, chatId, msg, {
      reply_markup: { remove_keyboard: true }
  });
}

async function doBatchPredictInBot(env: any, chatId: number) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, "⏳ 正在分析历史数据生成预测...");

    for (const lottery of LOTTERIES) {
        try {
            const { message } = await generatePredictionMessage(env, lottery.id);
            await sendMessage(env.TG_BOT_TOKEN, chatId, message);
            await new Promise(r => setTimeout(r, 1200)); 
        } catch (e: any) {
            await sendMessage(env.TG_BOT_TOKEN, chatId, `❌ <b>[${lottery.name}]</b> 预测失败: ${e.message}`);
        }
    }
}

async function doBatchViewInBot(env: any, chatId: number) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, "⏳ 正在获取最近10期开奖记录...");

    if (!env.DB) {
        await sendMessage(env.TG_BOT_TOKEN, chatId, "❌ 数据库未连接");
        return;
    }

    for (const lottery of LOTTERIES) {
        try {
            const { results } = await env.DB.prepare(`
                SELECT * FROM lottery_draws 
                WHERE lottery_id = ? 
                ORDER BY CAST(draw_number AS INTEGER) DESC, draw_number DESC 
                LIMIT 10
            `).bind(lottery.id).all();

            if (!results || results.length === 0) {
                await sendMessage(env.TG_BOT_TOKEN, chatId, `📭 <b>[${lottery.name}]</b> 暂无记录，请先同步。`);
                continue;
            }

            let msg = `📊 <b>[${lottery.name}] 近10期开奖</b>\n\n`;
            results.forEach((row: any) => {
                const nums = JSON.parse(row.numbers).map((n: number) => String(n).padStart(2, '0')).join(',');
                const sp = String(row.special_number).padStart(2, '0');
                msg += `🔹 <b>${row.draw_number}期</b>: ${nums} + [${sp}]\n`;
            });

            await sendMessage(env.TG_BOT_TOKEN, chatId, msg);
            await new Promise(r => setTimeout(r, 1000)); 

        } catch (e: any) {
            await sendMessage(env.TG_BOT_TOKEN, chatId, `❌ <b>[${lottery.name}]</b> 查询失败: ${e.message}`);
        }
    }
}

async function doSyncAll(env: any, chatId: number) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, "⏳ 开始同步所有彩种数据...");
    
    let report = "<b>🔄 同步结果报告</b>\n------------------\n";
    
    for (const lottery of LOTTERIES) {
        try {
            const count = await syncLotteryData(env, lottery);
            report += `✅ <b>${lottery.name}</b>: 更新 ${count} 条\n`;
        } catch (e: any) {
            report += `❌ <b>${lottery.name}</b>: 失败 (${e.message})\n`;
        }
    }
    
    await sendMessage(env.TG_BOT_TOKEN, chatId, report);
}

async function doPushAllToChannel(env: any, adminChatId: number) {
    const channelId = env.TG_CHANNEL_ID;
    if (!channelId) {
        await sendMessage(env.TG_BOT_TOKEN, adminChatId, "❌ 未配置 TG_CHANNEL_ID 环境变量");
        return;
    }

    await sendMessage(env.TG_BOT_TOKEN, adminChatId, "⏳ 正在推送到频道...");

    let successCount = 0;
    
    for (const lottery of LOTTERIES) {
        try {
            const { message } = await generatePredictionMessage(env, lottery.id);
            await sendMessage(env.TG_BOT_TOKEN, channelId, message);
            successCount++;
            await new Promise(r => setTimeout(r, 2000)); 
        } catch (e: any) {
            console.error(`Push failed for ${lottery.name}`, e);
            await sendMessage(env.TG_BOT_TOKEN, adminChatId, `⚠️ [${lottery.name}] 推送失败: ${e.message}`);
        }
    }

    await sendMessage(env.TG_BOT_TOKEN, adminChatId, `✅ 推送完成 (${successCount}/${LOTTERIES.length})`);
}

async function syncLotteryData(env: any, lottery: any): Promise<number> {
    const apiUrl = env[lottery.envKey];
    if (!apiUrl) throw new Error(`环境变量缺失: ${lottery.envKey}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const resp = await fetch(apiUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const rawData = await resp.json();
    let list: any[] = [];
    if (Array.isArray(rawData)) list = rawData;
    else if (rawData && typeof rawData === 'object') list = rawData.data || rawData.list || rawData.result?.data || rawData.rows || [];

    if (list.length === 0) throw new Error("API返回空列表");

    let count = 0;
    const stmt = env.DB.prepare(`
      INSERT OR IGNORE INTO lottery_draws (lottery_id, draw_number, open_time, numbers, special_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const batch: any[] = [];
    const processedDraws = new Set<string>();

    for (const item of list) {
       const drawNumber = item.expect || item.issue || item.period || item.qishu || item.drawNumber || item.draw || item.number || item.id;
       const codeStr = item.opencode || item.code || item.openCode || item.numbers || item.haoMa || item.data || item.result;
       const openTime = item.opentime || item.time || item.openTime || item.dateline || new Date().toISOString();

       if (!drawNumber || !codeStr) continue;

       let nums: number[] = [];
       if (Array.isArray(codeStr)) {
         nums = codeStr.map(Number);
       } else if (typeof codeStr === 'string') {
         const cleanStr = codeStr.replace(/[+＋|｜]/g, ',').replace(/\s+/g, ',');
         nums = cleanStr.split(',').filter(s => s.trim() !== '').map(n => parseInt(n.trim()));
       }

       if (nums.length < 1) continue;

       const special = nums[nums.length - 1]; 
       const normalNums = nums.length >= 7 ? nums.slice(0, 6) : nums.slice(0, -1); 
       const drawNumStr = String(drawNumber);

       if (processedDraws.has(drawNumStr)) continue;
       processedDraws.add(drawNumStr);

       // 确保包含 created_at 字段
       batch.push(stmt.bind(lottery.id, drawNumStr, openTime, JSON.stringify(normalNums), special, Date.now()));
       count++;
       if (batch.length >= 100) break; // 稍微增加单次同步数量
    }

    if (batch.length > 0) {
      await env.DB.batch(batch);
    }
    return count;
}

async function generatePredictionMessage(env: any, lotteryId: string): Promise<{ message: string, prediction: any }> {
    const lotteryName = LOTTERIES.find(l => l.id === lotteryId)?.name || lotteryId;
    
    if (!env.DB) throw new Error("数据库未连接");

    const { results } = await env.DB.prepare(`
        SELECT * FROM lottery_draws 
        WHERE lottery_id = ? 
        ORDER BY CAST(draw_number AS INTEGER) DESC, draw_number DESC 
        LIMIT 500
    `).bind(lotteryId).all();

    const historyData = results.map((row: any) => ({
        drawNumber: row.draw_number,
        date: row.open_time,
        numbers: JSON.parse(row.numbers),
        specialNumber: row.special_number
    }));

    if (historyData.length === 0) throw new Error("暂无历史数据，请先同步");

    let nextDrawNumber = "Unknown";
    try {
        const lastDraw = historyData[0].drawNumber;
        const numVal = parseInt(lastDraw);
        if (!isNaN(numVal) && String(numVal) === String(lastDraw)) {
             nextDrawNumber = String(BigInt(lastDraw) + 1n);
        } else {
             nextDrawNumber = `${lastDraw}下期`;
        }
    } catch {
        nextDrawNumber = `${historyData[0].drawNumber}_Next`;
    }

    const prediction = generateDeterministicPrediction(historyData, PREDICTION_DATE);
    const jsonPrediction = JSON.stringify(prediction);
    const now = Date.now();

    await env.DB.prepare(`
        INSERT OR REPLACE INTO admin_predictions (lottery_id, data, updated_at)
        VALUES (?, ?, ?)
    `).bind(lotteryId, jsonPrediction, now).run();

    await env.DB.prepare(`
        INSERT OR REPLACE INTO prediction_history (lottery_id, draw_number, data, created_at)
        VALUES (?, ?, ?, ?)
    `).bind(lotteryId, nextDrawNumber, jsonPrediction, now).run();

    const msg = `✅ <b>[${lotteryName}] 第 ${nextDrawNumber} 期 预测</b>\n` +
                `------------------------------\n` +
                `🐯 <b>平特三肖</b>: ${prediction.zodiacs.length > 0 ? prediction.zodiacs.slice(0, 3).join(' ') : '分析中...'}\n` +
                `⭐ <b>8码</b>: ${prediction.numbers_8.length > 0 ? prediction.numbers_8.join(',') : '分析中...'}\n` +
                `🎱 <b>18码</b>: ${prediction.numbers_18.length > 0 ? prediction.numbers_18.join(',') : '分析中...'}\n` +
                `🔢 <b>头数</b>: ${prediction.heads.join(', ')}头\n` +
                `🔚 <b>尾数</b>: ${prediction.tails.join(', ')}尾\n` +
                `🎨 <b>波色</b>: ${prediction.colors.map((c: string) => c==='red'?'红':c==='blue'?'蓝':'绿').join(' ')}\n` +
                `🔥 <b>信心</b>: ${prediction.confidence}%` + 
                (historyData.length < 15 ? `\n\n⚠️ <i>注：当前历史数据仅 ${historyData.length} 期，预测仅供极小范围参考。</i>` : '');

    return { message: msg, prediction };
}

async function sendMessage(token: string, chatId: number | string, text: string, options: any = {}) {
  if(!token) return;
  
  const body: any = { 
    chat_id: chatId, 
    text: text, 
    parse_mode: 'HTML',
    ...options
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json();
        console.error("Telegram Send Error:", err);
    }
  } catch (error) {
      console.error("Fetch Error:", error);
  }
}
