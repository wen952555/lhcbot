
import { generateDeterministicPrediction } from '../../analysis';

// 定义彩种配置
const LOTTERIES = [
  { id: 'new_macau', name: '新澳门六合', envKey: 'API_URL_NEW_MACAU' },
  { id: 'hk_jc', name: '香港六合彩', envKey: 'API_URL_HK_JC' },
  { id: 'old_macau', name: '老澳门六合', envKey: 'API_URL_OLD_MACAU' }
];

export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const payload = await request.json();
    
    // 处理 Callback Query (点击按钮)
    if (payload.callback_query) {
      return await handleCallbackQuery(payload.callback_query, env);
    }

    // 处理普通消息
    if (payload.message) {
      return await handleMessage(payload.message, env);
    }

    return new Response('OK');
  } catch (err: any) {
    console.error("[Webhook Error]", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// --- 消息处理 ---
async function handleMessage(message: any, env: any) {
  const chatId = message.chat.id;
  const text = message.text?.trim();
  const userId = message.from?.id;

  // 1. 权限验证
  const adminId = env.TG_ADMIN_ID ? parseInt(env.TG_ADMIN_ID) : null;
  if (adminId && userId !== adminId) {
     await sendMessage(env.TG_BOT_TOKEN, chatId, "⛔ 权限不足");
     return new Response('Unauthorized');
  }

  // 2. 命令处理
  if (text === '/start' || text === '/menu') {
    await sendDashboard(env.TG_BOT_TOKEN, chatId);
  } else if (text && text.startsWith('/predict')) {
    // 兼容旧命令
    const parts = text.split(' ');
    if (parts[1]) await doPredict(env, chatId, parts[1]);
  } else {
    // 默认回复菜单
    await sendDashboard(env.TG_BOT_TOKEN, chatId);
  }

  return new Response('OK');
}

// --- 回调查询处理 (按钮点击) ---
async function handleCallbackQuery(query: any, env: any) {
  const chatId = query.message.chat.id;
  const data = query.data; // e.g., "predict:new_macau"
  const callbackQueryId = query.id;

  // 1. 权限验证 (再次验证，防止转发)
  const userId = query.from?.id;
  const adminId = env.TG_ADMIN_ID ? parseInt(env.TG_ADMIN_ID) : null;
  
  if (adminId && userId !== adminId) {
    await answerCallbackQuery(env.TG_BOT_TOKEN, callbackQueryId, "⛔ 权限不足", true);
    return new Response('OK');
  }

  const [action, lotteryId] = data.split(':');

  if (!lotteryId && action !== 'refresh_menu') {
      await answerCallbackQuery(env.TG_BOT_TOKEN, callbackQueryId, "参数错误");
      return new Response('OK');
  }

  // 快速响应 Telegram，消除加载状态
  await answerCallbackQuery(env.TG_BOT_TOKEN, callbackQueryId, `正在执行: ${action}...`);

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
      case 'refresh_menu':
        await sendDashboard(env.TG_BOT_TOKEN, chatId);
        break;
      default:
        await sendMessage(env.TG_BOT_TOKEN, chatId, "未知操作");
    }
  } catch (err: any) {
    console.error(err);
    await sendMessage(env.TG_BOT_TOKEN, chatId, `❌ 操作失败: ${err.message}`);
  }

  return new Response('OK');
}

// --- 业务逻辑 ---

// 1. 发送管理菜单
async function sendDashboard(token: string, chatId: number) {
  const keyboard = {
    inline_keyboard: LOTTERIES.flatMap(lottery => [
      [{ text: `🎫 ${lottery.name} (${lottery.id})`, callback_data: `ignore` }],
      [
        { text: "🔮 预测", callback_data: `predict:${lottery.id}` },
        { text: "🔄 同步记录", callback_data: `sync:${lottery.id}` },
        { text: "📊 查看记录", callback_data: `view:${lottery.id}` }
      ]
    ])
  };

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: "👋 **六合助手管理控制台**\n请选择下方功能进行操作：",
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  });
}

// 2. 执行预测
async function doPredict(env: any, chatId: number, lotteryId: string) {
  await sendMessage(env.TG_BOT_TOKEN, chatId, `⏳ 正在生成 [${lotteryId}] 预测...`);

  // Fetch History
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

  const prediction = generateDeterministicPrediction(historyData);

  // Save to DB
  if (env.DB) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO admin_predictions (lottery_id, data, updated_at)
        VALUES (?, ?, ?)
      `).bind(lotteryId, JSON.stringify(prediction), Date.now()).run();
  }

  const msg = `✅ **[${lotteryId}] 预测更新成功**\n` +
              `------------------------------\n` +
              `🐯 **六肖**: ${prediction.zodiacs.join(' ')}\n` +
              `🎱 **18码**: ${prediction.numbers_18.slice(0, 10).join(',')}...\n` +
              `🔢 **头数**: ${prediction.heads.join(', ')}头\n` +
              `🔚 **尾数**: ${prediction.tails.join(', ')}尾\n` +
              `🎨 **波色**: ${prediction.colors.map((c: string) => c==='red'?'红':c==='blue'?'蓝':'绿').join(' ')}\n` +
              `💡 **理由**: ${prediction.reasoning}`;

  await sendMessage(env.TG_BOT_TOKEN, chatId, msg);
}

// 3. 执行同步 (从外部API获取数据)
async function doSync(env: any, chatId: number, lotteryId: string) {
  const lottery = LOTTERIES.find(l => l.id === lotteryId);
  if (!lottery) return;

  const apiUrl = env[lottery.envKey];
  if (!apiUrl) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, `⚠️ 未配置环境变量: ${lottery.envKey}`);
    return;
  }

  await sendMessage(env.TG_BOT_TOKEN, chatId, `⏳ 正在从源站同步 [${lottery.name}] 数据...`);

  try {
    const resp = await fetch(apiUrl);
    if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);
    
    const data: any = await resp.json();
    // 假设 API 返回格式是 { data: [...] } 或直接是 [...]
    // 这里需要根据实际的外部 API 格式进行适配。
    // 下面是一个通用的解析逻辑，适配常见的 { expect/issue, opencode/code } 格式
    const list = Array.isArray(data) ? data : (data.data || data.list || []);

    if (list.length === 0) {
      await sendMessage(env.TG_BOT_TOKEN, chatId, "⚠️ 源站返回数据为空。");
      return;
    }

    let count = 0;
    const stmt = env.DB.prepare(`
      INSERT OR IGNORE INTO lottery_draws (lottery_id, draw_number, open_time, numbers, special_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const batch = [];

    for (const item of list) {
       // 适配字段：期号(expect/issue/draw), 号码(opencode/code/numbers), 时间(opentime/time)
       const drawNumber = item.expect || item.issue || item.drawNumber || item.draw;
       const codeStr = item.opencode || item.code || item.numbers;
       const openTime = item.opentime || item.time || item.openTime || new Date().toISOString();

       if (!drawNumber || !codeStr) continue;

       // 解析号码: "01,02,03,04,05,06+07" 或 "01,02,03,04,05,06,07"
       let nums: number[] = [];
       if (Array.isArray(codeStr)) {
         nums = codeStr.map(Number);
       } else if (typeof codeStr === 'string') {
         nums = codeStr.replace(/\+/g, ',').split(',').map(n => parseInt(n.trim()));
       }

       if (nums.length < 7) continue;

       const special = nums.pop() || 0; // 最后一个是特码
       const normalNums = nums;

       batch.push(stmt.bind(
         lotteryId, 
         String(drawNumber), 
         openTime, 
         JSON.stringify(normalNums), 
         special, 
         Date.now()
       ));
       count++;
       
       // D1 Batch limit usually 100
       if (batch.length >= 50) break; 
    }

    if (batch.length > 0) {
      await env.DB.batch(batch);
    }

    await sendMessage(env.TG_BOT_TOKEN, chatId, `✅ 同步完成！共处理 ${count} 条记录。`);

  } catch (e: any) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, `❌ 同步出错: ${e.message}`);
  }
}

// 4. 查看记录
async function doViewRecords(env: any, chatId: number, lotteryId: string) {
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
    await sendMessage(env.TG_BOT_TOKEN, chatId, `📭 [${lotteryId}] 暂无记录，请先同步。`);
    return;
  }

  let msg = `📊 **[${lotteryId}] 近10期开奖**\n\n`;
  results.forEach((row: any) => {
    const nums = JSON.parse(row.numbers).map((n: number) => String(n).padStart(2, '0')).join(',');
    const sp = String(row.special_number).padStart(2, '0');
    msg += `🔹 **${row.draw_number}期**: ${nums} + [${sp}]\n`;
  });

  await sendMessage(env.TG_BOT_TOKEN, chatId, msg);
}

// --- Telegram API Helpers ---

async function sendMessage(token: string, chatId: number, text: string) {
  if(!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
  });
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text: string, showAlert = false) {
  if(!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      callback_query_id: callbackQueryId, 
      text: text, 
      show_alert: showAlert 
    })
  });
}
