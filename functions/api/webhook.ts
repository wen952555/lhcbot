
import { generateDeterministicPrediction } from '../analysis';

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
    
    // 移除 callback_query 处理，因为不再使用内联键盘
    if (payload.callback_query) {
        await answerCallbackQuery(env.TG_BOT_TOKEN, payload.callback_query.id, "此菜单已过期");
        return new Response('OK');
    }

    // 处理普通消息 (主菜单)
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

  // 简单的权限检查 (如需限制非管理员使用某些功能)
  const adminId = env.TG_ADMIN_ID ? parseInt(env.TG_ADMIN_ID) : null;
  const isAdmin = adminId && userId === adminId;

  // 命令路由
  switch (text) {
      case '/start':
      case '/menu':
          await sendMainMenu(env.TG_BOT_TOKEN, chatId);
          break;
      case '🔄 一键同步所有':
          if (!isAdmin) {
             await sendMessage(env.TG_BOT_TOKEN, chatId, "⛔ 只有管理员可以使用同步功能");
             return;
          }
          await doSyncAll(env, chatId);
          break;
      case '🔮 一键预测':
          // 连续发送3个彩种的预测结果到当前Bot聊天窗口
          await doBatchPredictInBot(env, chatId);
          break;
      case '📊 一键查看记录':
          // 连续发送3个彩种的历史记录到当前Bot聊天窗口
          await doBatchViewInBot(env, chatId);
          break;
      case '📢 推送频道':
          if (!isAdmin) {
             await sendMessage(env.TG_BOT_TOKEN, chatId, "⛔ 只有管理员可以使用推送功能");
             return;
          }
          await doPushAllToChannel(env, chatId);
          break;
      default:
          // 如果是未知文本，默认显示菜单
          await sendMainMenu(env.TG_BOT_TOKEN, chatId);
  }

  return new Response('OK');
}

// --- Menu Functions ---

async function sendMainMenu(token: string, chatId: number) {
  // 简单明了的文本命令键盘
  const keyboard = [
    [{ text: '🔮 一键预测' }, { text: '📊 一键查看记录' }],
    [{ text: '🔄 一键同步所有' }, { text: '📢 推送频道' }]
  ];

  await sendMessage(token, chatId, "🤖 <b>六合大数据助手</b>\n请选择操作：", {
    reply_markup: {
      keyboard: keyboard,
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
}

// --- Logic Functions ---

// 1. 一键同步所有
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

// 2. 批量预测 (直接发给 Bot 用户)
async function doBatchPredictInBot(env: any, chatId: number) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, "⏳ 正在生成所有彩种预测...");

    for (const lottery of LOTTERIES) {
        try {
            const { message } = await generatePredictionMessage(env, lottery.id);
            await sendMessage(env.TG_BOT_TOKEN, chatId, message);
            // 稍微延迟一下，保证消息顺序且不触发频率限制
            await new Promise(r => setTimeout(r, 800)); 
        } catch (e: any) {
            await sendMessage(env.TG_BOT_TOKEN, chatId, `❌ [${lottery.name}] 预测生成失败: ${e.message}`);
        }
    }
}

// 3. 批量查看记录 (直接发给 Bot 用户)
async function doBatchViewInBot(env: any, chatId: number) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, "⏳ 正在获取所有彩种记录...");

    if (!env.DB) {
        await sendMessage(env.TG_BOT_TOKEN, chatId, "❌ 数据库未连接");
        return;
    }

    for (const lottery of LOTTERIES) {
        try {
            const { results } = await env.DB.prepare(`
                SELECT * FROM lottery_draws 
                WHERE lottery_id = ? 
                ORDER BY draw_number DESC 
                LIMIT 10
            `).bind(lottery.id).all();

            if (!results || results.length === 0) {
                await sendMessage(env.TG_BOT_TOKEN, chatId, `📭 [${lottery.name}] 暂无记录，请先同步。`);
                continue;
            }

            let msg = `📊 <b>[${lottery.name}] 近10期开奖</b>\n\n`;
            results.forEach((row: any) => {
                const nums = JSON.parse(row.numbers).map((n: number) => String(n).padStart(2, '0')).join(',');
                const sp = String(row.special_number).padStart(2, '0');
                msg += `🔹 <b>${row.draw_number}期</b>: ${nums} + [${sp}]\n`;
            });

            await sendMessage(env.TG_BOT_TOKEN, chatId, msg);
            await new Promise(r => setTimeout(r, 800)); // 延迟防止乱序

        } catch (e: any) {
            await sendMessage(env.TG_BOT_TOKEN, chatId, `❌ [${lottery.name}] 查询失败: ${e.message}`);
        }
    }
}

// 4. 推送全部到频道 (管理员功能)
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
            await new Promise(r => setTimeout(r, 2000)); // 推送频道间隔稍微长一点
        } catch (e: any) {
            console.error(`Push failed for ${lottery.name}`, e);
            await sendMessage(env.TG_BOT_TOKEN, adminChatId, `⚠️ [${lottery.name}] 推送失败: ${e.message}`);
        }
    }

    await sendMessage(env.TG_BOT_TOKEN, adminChatId, `✅ 推送完成 (${successCount}/${LOTTERIES.length})`);
}

// --- Core Helpers ---

async function syncLotteryData(env: any, lottery: any): Promise<number> {
    const apiUrl = env[lottery.envKey];
    if (!apiUrl) throw new Error(`Env Var Missing: ${lottery.envKey}`);

    const resp = await fetch(apiUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
    });
    
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

       const special = nums.length >= 7 ? nums[nums.length - 1] : nums[nums.length - 1]; 
       const normalNums = nums.length >= 7 ? nums.slice(0, 6) : nums; 
       const drawNumStr = String(drawNumber);

       if (processedDraws.has(drawNumStr)) continue;
       processedDraws.add(drawNumStr);

       batch.push(stmt.bind(lottery.id, drawNumStr, openTime, JSON.stringify(normalNums), special, Date.now()));
       count++;
       if (batch.length >= 50) break;
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
        ORDER BY draw_number DESC 
        LIMIT 500
    `).bind(lotteryId).all();

    const historyData = results.map((row: any) => ({
        drawNumber: row.draw_number,
        numbers: JSON.parse(row.numbers),
        specialNumber: row.special_number
    }));

    if (historyData.length === 0) throw new Error("暂无历史数据，请先同步");

    // Calculate next draw number
    let nextDrawNumber = "Unknown";
    try {
        const lastDraw = historyData[0].drawNumber;
        const nextVal = BigInt(lastDraw) + 1n;
        nextDrawNumber = nextVal.toString();
    } catch {
        nextDrawNumber = `${historyData[0].drawNumber}_Next`;
    }

    const prediction = generateDeterministicPrediction(historyData);
    const jsonPrediction = JSON.stringify(prediction);
    const now = Date.now();

    // Save to DB
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
                `🐯 <b>六肖</b>: ${prediction.zodiacs.join(' ')}\n` +
                `🎱 <b>18码</b>: ${prediction.numbers_18.join(',')}\n` +
                `🔢 <b>头数</b>: ${prediction.heads.join(', ')}头\n` +
                `🔚 <b>尾数</b>: ${prediction.tails.join(', ')}尾\n` +
                `🎨 <b>波色</b>: ${prediction.colors.map((c: string) => c==='red'?'红':c==='blue'?'蓝':'绿').join(' ')}\n` +
                `💡 <b>分析</b>: ${prediction.reasoning}\n` + 
                `🔥 <b>信心</b>: ${prediction.confidence}%`;

    return { message: msg, prediction };
}

// --- Telegram API Helpers ---

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

async function answerCallbackQuery(token: string, callbackQueryId: string, text: string) {
  if(!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text })
  });
}
