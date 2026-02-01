
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
    
    // 1. 处理 Callback Query (兼容旧版消息按钮，防止报错)
    if (payload.callback_query) {
      await answerCallbackQuery(env.TG_BOT_TOKEN, payload.callback_query.id, "请使用新版键盘菜单");
      return new Response('OK');
    }

    // 2. 处理普通消息 (主要逻辑)
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
     // 如果没有权限，不显示键盘，只提示
     await sendMessage(env.TG_BOT_TOKEN, chatId, "⛔ 权限不足", true); 
     return new Response('Unauthorized');
  }

  // 2. 匹配键盘指令
  if (text && ACTION_MAP[text]) {
    const { action, lotteryId } = ACTION_MAP[text];
    await executeAction(env, chatId, action, lotteryId);
    return new Response('OK');
  }

  // 3. 处理系统命令
  if (text === '/start' || text === '/menu') {
    await sendKeyboardMenu(env.TG_BOT_TOKEN, chatId);
  } else if (text && text.startsWith('/predict')) {
    // 兼容旧命令 /predict new_macau
    const parts = text.split(' ');
    if (parts[1]) await executeAction(env, chatId, 'predict', parts[1]);
  } else {
    // 其他文本，默认回复菜单
    await sendKeyboardMenu(env.TG_BOT_TOKEN, chatId);
  }

  return new Response('OK');
}

// --- 统一动作执行入口 ---
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
    await sendMessage(env.TG_BOT_TOKEN, chatId, `❌ 操作失败: ${err.message}`);
  }
}

// --- 业务逻辑 ---

// 1. 发送键盘菜单 (ReplyKeyboardMarkup)
async function sendKeyboardMenu(token: string, chatId: number) {
  // 构建键盘布局：每个彩种一行，包含3个按钮
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
      text: "👋 **管理控制台**\n\n请点击下方键盘按钮进行操作：",
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: keyboard,
        resize_keyboard: true, // 自适应高度，更美观
        one_time_keyboard: false // 保持键盘显示
      }
    })
  });
}

// 2. 执行预测
async function doPredict(env: any, chatId: number, lotteryId: string) {
  const lotteryName = LOTTERIES.find(l => l.id === lotteryId)?.name || lotteryId;
  await sendMessage(env.TG_BOT_TOKEN, chatId, `⏳ 正在生成 [${lotteryName}] 预测...`);

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

  const msg = `✅ **[${lotteryName}] 预测更新成功**\n` +
              `------------------------------\n` +
              `🐯 **六肖**: ${prediction.zodiacs.join(' ')}\n` +
              `🎱 **18码**: ${prediction.numbers_18.slice(0, 10).join(',')}...\n` +
              `🔢 **头数**: ${prediction.heads.join(', ')}头\n` +
              `🔚 **尾数**: ${prediction.tails.join(', ')}尾\n` +
              `🎨 **波色**: ${prediction.colors.map((c: string) => c==='red'?'红':c==='blue'?'蓝':'绿').join(' ')}\n` +
              `💡 **理由**: ${prediction.reasoning}`;

  await sendMessage(env.TG_BOT_TOKEN, chatId, msg);
}

// 3. 执行同步 (增强版)
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

    // 智能解析列表结构
    if (Array.isArray(rawData)) {
        list = rawData;
    } else if (rawData && typeof rawData === 'object') {
        // 尝试常见的字段名
        list = rawData.data || rawData.list || rawData.result?.data || rawData.rows || [];
    }

    if (list.length === 0) {
      // 调试：如果没找到数据，打印一下 Key 帮助排查
      const keys = rawData && typeof rawData === 'object' ? Object.keys(rawData).join(', ') : 'not_object';
      await sendMessage(env.TG_BOT_TOKEN, chatId, `⚠️ 未找到数据列表。\nAPI返回Keys: [${keys}]`);
      return;
    }

    let count = 0;
    const stmt = env.DB.prepare(`
      INSERT OR IGNORE INTO lottery_draws (lottery_id, draw_number, open_time, numbers, special_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const batch = [];
    let firstErrorItem = null;

    for (const item of list) {
       // 智能解析字段：期号
       const drawNumber = item.expect || item.issue || item.period || item.qishu || item.drawNumber || item.draw || item.number || item.id;
       // 智能解析字段：号码
       const codeStr = item.opencode || item.code || item.openCode || item.numbers || item.haoMa || item.data || item.result;
       // 智能解析字段：时间
       const openTime = item.opentime || item.time || item.openTime || item.dateline || new Date().toISOString();

       if (!drawNumber || !codeStr) {
           if (!firstErrorItem) firstErrorItem = item;
           continue;
       }

       // 解析号码
       let nums: number[] = [];
       if (Array.isArray(codeStr)) {
         nums = codeStr.map(Number);
       } else if (typeof codeStr === 'string') {
         // 支持 "01,02+03", "01 02 03", "1,2,3" 等格式
         const cleanStr = codeStr.replace(/[+＋|｜]/g, ',').replace(/\s+/g, ',');
         nums = cleanStr.split(',').filter(s => s.trim() !== '').map(n => parseInt(n.trim()));
       }

       // 确保至少有1个号码 (通常是7个: 6平+1特)
       if (nums.length < 1) continue;

       const special = nums.length >= 7 ? nums[nums.length - 1] : nums[nums.length - 1]; // 取最后一个作为特码
       const normalNums = nums.length >= 7 ? nums.slice(0, 6) : nums; // 前面的是平码

       // 简单的去重/验证逻辑，防止 API 偶尔返回奇怪数据
       if (batch.find((b: any) => b.drawNumber === String(drawNumber))) continue;

       batch.push(stmt.bind(
         lotteryId, 
         String(drawNumber), 
         openTime, 
         JSON.stringify(normalNums), 
         special, 
         Date.now()
       ));
       count++;
       
       if (batch.length >= 50) break; // 限制批量插入大小
    }

    if (batch.length > 0) {
      await env.DB.batch(batch);
      await sendMessage(env.TG_BOT_TOKEN, chatId, `✅ [${lottery.name}] 同步成功！\n共更新 ${count} 条记录。\n最新期号: ${list[0]?.expect || list[0]?.issue || list[0]?.period || 'Unknown'}`);
    } else {
       // 如果找到了列表但没解析出数据，打印第一条数据结构
       const debugInfo = firstErrorItem ? JSON.stringify(firstErrorItem).substring(0, 200) : "无法解析字段";
       await sendMessage(env.TG_BOT_TOKEN, chatId, `⚠️ 解析失败。\n样本数据: ${debugInfo}\n请检查代码中的字段映射。`);
    }

  } catch (e: any) {
    await sendMessage(env.TG_BOT_TOKEN, chatId, `❌ 同步出错: ${e.message}`);
  }
}

// 4. 查看记录
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

  let msg = `📊 **[${lotteryName}] 近10期开奖**\n\n`;
  results.forEach((row: any) => {
    const nums = JSON.parse(row.numbers).map((n: number) => String(n).padStart(2, '0')).join(',');
    const sp = String(row.special_number).padStart(2, '0');
    msg += `🔹 **${row.draw_number}期**: ${nums} + [${sp}]\n`;
  });

  await sendMessage(env.TG_BOT_TOKEN, chatId, msg);
}

// --- Telegram API Helpers ---

async function sendMessage(token: string, chatId: number, text: string, removeKeyboard = false) {
  if(!token) return;
  
  const body: any = { 
    chat_id: chatId, 
    text: text, 
    parse_mode: 'Markdown' 
  };

  if (removeKeyboard) {
      body.reply_markup = { remove_keyboard: true };
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text: string) {
  if(!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      callback_query_id: callbackQueryId, 
      text: text 
    })
  });
}
