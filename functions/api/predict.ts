
export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  try {
    const { lotteryId } = await request.json();
    
    // 1. 根据 lotteryId 获取对应的 API URL (从环境变量)
    let apiUrl = "";
    switch (lotteryId) {
      case 'new_macau': apiUrl = env.API_URL_NEW_MACAU; break;
      case 'hk_jc': apiUrl = env.API_URL_HK_JC; break;
      case 'old_macau': apiUrl = env.API_URL_OLD_MACAU; break;
    }

    // 如果没有配置 URL 且没有数据库绑定，直接报错
    if (!apiUrl && !env.DB) {
      throw new Error("服务器配置错误：未配置 API URL 或 数据库");
    }

    let historyData: any[] = [];
    let fetchError = null;

    // 2. 尝试从外部 API 获取最新数据
    if (apiUrl) {
      try {
        const response = await fetch(apiUrl);
        if (response.ok) {
          const rawData = await response.json();
          // 解析数据
          const fetchedData = (rawData.data || []).map((item: any) => {
             const codes = item.openCode.split(',').map((c: string) => parseInt(c.trim()));
             return {
               drawNumber: item.expect,
               date: item.openTime,
               numbers: codes.slice(0, 6),
               specialNumber: codes[6]
             };
          });

          // 3. 如果成功获取，存入 D1 数据库 (批量插入/更新)
          if (env.DB && fetchedData.length > 0) {
              const stmt = env.DB.prepare(`
                  INSERT OR REPLACE INTO lottery_draws (lottery_id, draw_number, open_time, numbers, special_number, created_at)
                  VALUES (?, ?, ?, ?, ?, ?)
              `);
              
              const batch = fetchedData.map((draw: any) => stmt.bind(
                  lotteryId,
                  draw.drawNumber,
                  draw.date,
                  JSON.stringify(draw.numbers),
                  draw.specialNumber,
                  Date.now()
              ));
              
              await env.DB.batch(batch);
          }
          
          // 使用最新获取的数据
          historyData = fetchedData;
        } else {
          fetchError = `API Error: ${response.status}`;
        }
      } catch (e: any) {
        fetchError = e.message;
        console.error("Fetch failed:", e);
      }
    }

    // 4. 如果外部 API 获取失败或没有配置 URL，尝试从 D1 读取缓存
    if (historyData.length === 0 && env.DB) {
        const { results } = await env.DB.prepare(`
            SELECT * FROM lottery_draws 
            WHERE lottery_id = ? 
            ORDER BY draw_number DESC 
            LIMIT 50
        `).bind(lotteryId).all();
        
        historyData = results.map((row: any) => ({
            drawNumber: row.draw_number,
            date: row.open_time,
            numbers: JSON.parse(row.numbers),
            specialNumber: row.special_number
        }));
    }

    if (historyData.length === 0) {
        throw new Error(fetchError || "无法获取数据，且无本地缓存");
    }

    // 返回前 20 条给前端
    return new Response(JSON.stringify({ history: historyData.slice(0, 20) }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
