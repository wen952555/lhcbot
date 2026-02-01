
import { generateDeterministicPrediction } from '../analysis';

// 定义彩种配置
const LOTTERIES = [
  { id: 'new_macau', name: '新澳门', envKey: 'API_URL_NEW_MACAU' },
  { id: 'hk_jc', name: '香港', envKey: 'API_URL_HK_JC' },
  { id: 'old_macau', name: '老澳门', envKey: 'API_URL_OLD_MACAU' }
];

// 定义按钮动作映射 (用于解析用户点击键盘发送的文本)
const ACTION_MAP: Record<string, { action: string, lotteryId: string }> = {};

// 初始化映射关系
LOTTERIES.forEach(l => {
  ACTION_MAP[`🔮 ${l.name}预测`] = { action: 'predict', lotteryId: l.id };
  ACTION_MAP[`🔄 ${l.name}同步`] = { action: 'sync', lotteryId: l.id };
  ACTION_MAP[`📊 ${l.name}记录`] = { action: 'view', lotteryId: l.id };
});

export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const payload = await request.json();
    
    if (payload.callback_query) {
      await answerCallbackQuery(env.TG_BOT_TOKEN, payload.callback_query.id, "请使用新版键盘菜单");
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
  if (adminId && userId !== adminId) {
     await sendMessage(env.TG_BOT_TOKEN, chatId, "⛔ 权限不足", true); 
     return new Response('Unauthorized');
  }

  if (text && ACTION_MAP[text]) {
    const { action, lotteryId } = ACTION_MAP[text];
    await executeAction(env, chatId, action, lotteryId);
    return new Response('OK');
  }

  if (text === '/start' || text === '/menu') {
    await sendKeyboardMenu(env.TG_BOT_TOKEN, chatId);
  } else if (text && text.startsWith('/predict')) {
    const parts = text.split(' ');
    if (parts[1]) await executeAction(env, chatId, 'predict', parts[1]);
  } else {
    await sendKeyboardMenu(env.TG_BOT_TOKEN, chatId);
  }

  return new Response('OK');
}

async function executeAction(env: any, chatId: number, action: string, lotteryId: string) {
  try {
    switch (action) {
      case 'predict':
        await doPredict(env, chatId, lotteryId);
        break;
      case 'sync':
        await doSync(env, chatId, lotteryId);
        break;
      case 'view':
        await doViewRecords(env, chatId, lotteryId);
        break;
      default:
        await sendMessage(env.TG_BOT_TOKEN, chatId, "未知操作");
    }
  } catch (err: any) {
    console.error(err);
    // Try to send error message, fallback to plain text if needed is handled in sendMessage
    await sendMessage(env.TG_BOT_TOKEN, chatId, `❌ 操作失败: ${err.message}`);
  }
}

async function sendKeyboardMenu(token: string, chatId: number) {
  const keyboard = LOTTERIES.map(l => [
    { text: `🔮 ${l.name}预测` },
    { text: `🔄 ${l.name}同步` },
    { text: `📊 ${l.name}记录` }
  ]);

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: "👋 <b>管理控制台</b>\n\n请点击下方键盘按钮进行操作：",
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: keyboard,
        resize_keyboard: true,
        one_time_keyboard: false
      }
    })
  });
}

async function doPredict(env: any, chatId: number, lotteryId: string) {
  const lotteryName = LOTTERIES.find(l => l.id === lotteryId)?.name || lotteryId;
  await sendMessage(env.TG_BOT_TOKEN, chatId, `⏳ 正在生成 [${lotteryName}] 预测...`);

  let historyData = [];
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
      await sendMessage(env.TG_BOT_TOKEN, chatId, "❌ 历史数据不足 (<10期)，无法生成预测。\n请先点击“🔄 同步记录”。");
      return;
  }

  // Calculate next draw number
  let nextDrawNumber = "Unknown";
  try {
      const lastDraw = historyData[0].drawNumber;
      const nextVal = BigInt(lastDraw) + 1n;
      nextDrawNumber = nextVal.toString();
  } catch (e) {
      console.warn("Could not calculate next draw number", e);
      nextDrawNumber = `${historyData[0].drawNumber}_NEXT`;
  }

  const prediction = generateDeterministicPrediction(historyData);
  const jsonPrediction = JSON.stringify(prediction);
  const now = Date.now();

  if (env.DB) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO admin_predictions (lottery_id, data, updated_at)
        VALUES (?, ?, ?)
      `).bind(lotteryId, jsonPrediction, now).run();

      await env.DB.prepare(`
        INSERT OR REPLACE INTO prediction_history (lottery_id, draw_number, data, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(lotteryId, nextDrawNumber, jsonPrediction, now).run();
  }

  const msg = `✅ <b>[${lotteryName}] 第 ${nextDrawNumber} 期 预测成功</b>\n` +
              `------------------------------\n` +
              `🐯 <b>六肖</b>: ${prediction.zodiacs.join(' ')}\n` +
              `🎱 <b>18码</b>: ${prediction.numbers_18.join(',')}\n` +
              `🔢 <b>头数</b>: ${prediction.heads.join(', ')}头\n` +
              `🔚 <b>尾数</b>: ${prediction.tails.join(', ')}尾\n` +
              `🎨 <b>波色</b>: ${prediction.colors.map((c: string) => c==='red'?'红':c==='blue'?'蓝':'绿').join(' ')}\n` +
              `💡 <b>理由</b>: ${prediction.reasoning}`;

  await sendMessage(env.TG_BOT_TOKEN, chatId, msg);
}

async function doSync(env: any, chatId: number, lotteryId: string) {
  const lottery = LOTTERIES.find(l => l.id === lotteryId);
  if (!lottery) return;

  const apiUrl = env[lottery.envKey];
  if (!apiUrl) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, `⚠️ 未配置环境变量: ${lottery.envKey}`);
    return;
  }

  await sendMessage(env.TG_BOT_TOKEN, chatId, `⏳ 正在同步 [${lottery.name}] ...`);

  try {
    const resp = await fetch(apiUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
    });
    
    if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);
    
    const rawData = await resp.json();
    let list: any[] = [];

    if (Array.isArray(rawData)) {
        list = rawData;
    } else if (rawData && typeof rawData === 'object') {
        list = rawData.data || rawData.list || rawData.result?.data || rawData.rows || [];
    }

    if (list.length === 0) {
      const keys = rawData && typeof rawData === 'object' ? Object.keys(rawData).join(', ') : 'not_object';
      await sendMessage(env.TG_BOT_TOKEN, chatId, `⚠️ 未找到数据列表。\nAPI返回Keys: [${keys}]`);
      return;
    }

    let count = 0;
    const stmt = env.DB.prepare(`
      INSERT OR IGNORE INTO lottery_draws (lottery_id, draw_number, open_time, numbers, special_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const batch: any[] = [];
    const processedDraws = new Set<string>();
    let firstErrorItem = null;

    for (const item of list) {
       const drawNumber = item.expect || item.issue || item.period || item.qishu || item.drawNumber || item.draw || item.number || item.id;
       const codeStr = item.opencode || item.code || item.openCode || item.numbers || item.haoMa || item.data || item.result;
       const openTime = item.opentime || item.time || item.openTime || item.dateline || new Date().toISOString();

       if (!drawNumber || !codeStr) {
           if (!firstErrorItem) firstErrorItem = item;
           continue;
       }

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

       batch.push(stmt.bind(
         lotteryId, 
         drawNumStr, 
         openTime, 
         JSON.stringify(normalNums), 
         special, 
         Date.now()
       ));
       count++;
       
       if (batch.length >= 50) break;
    }

    if (batch.length > 0) {
      await env.DB.batch(batch);
      await sendMessage(env.TG_BOT_TOKEN, chatId, `✅ [${lottery.name}] 同步成功！\n共更新 ${count} 条记录。\n最新期号: ${list[0]?.expect || list[0]?.issue || list[0]?.period || 'Unknown'}`);
    } else {
       const debugInfo = firstErrorItem ? JSON.stringify(firstErrorItem).substring(0, 200) : "无法解析字段";
       await sendMessage(env.TG_BOT_TOKEN, chatId, `⚠️ 解析失败。\n样本数据: ${debugInfo}\n请检查代码中的字段映射。`);
    }

  } catch (e: any) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, `❌ 同步出错: ${e.message}`);
  }
}

async function doViewRecords(env: any, chatId: number, lotteryId: string) {
  const lotteryName = LOTTERIES.find(l => l.id === lotteryId)?.name || lotteryId;

  if (!env.DB) {
     await sendMessage(env.TG_BOT_TOKEN, chatId, "❌ 数据库未连接");
     return;
  }

  const { results } = await env.DB.prepare(`
    SELECT * FROM lottery_draws 
    WHERE lottery_id = ? 
    ORDER BY draw_number DESC 
    LIMIT 10
  `).bind(lotteryId).all();

  if (!results || results.length === 0) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, `📭 [${lotteryName}] 暂无记录，请先同步。`);
    return;
  }

  let msg = `📊 <b>[${lotteryName}] 近10期开奖</b>\n\n`;
  results.forEach((row: any) => {
    const nums = JSON.parse(row.numbers).map((n: number) => String(n).padStart(2, '0')).join(',');
    const sp = String(row.special_number).padStart(2, '0');
    msg += `🔹 <b>${row.draw_number}期</b>: ${nums} + [${sp}]\n`;
  });

  await sendMessage(env.TG_BOT_TOKEN, chatId, msg);
}

// --- Telegram API Helpers ---

async function sendMessage(token: string, chatId: number, text: string, removeKeyboard = false) {
  if(!token) return;
  
  const body: any = { 
    chat_id: chatId, 
    text: text, 
    parse_mode: 'HTML' // Use HTML for stability
  };

  if (removeKeyboard) {
      body.reply_markup = { remove_keyboard: true };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Telegram SendMessage Failed:", errorData);
        
        // Fallback: Try sending without formatting if it was a parsing error
        if (errorData.error_code === 400 && errorData.description?.includes('parse')) {
            body.parse_mode = undefined;
            body.text += "\n\n(Formatting Error: Showing raw text)";
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        }
    }
  } catch (error) {
      console.error("Network/Fetch Error in sendMessage:", error);
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
