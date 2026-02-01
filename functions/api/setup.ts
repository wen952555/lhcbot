
export async function onRequest(context: any) {
  try {
    const { env } = context;
    if (!env.DB) {
      throw new Error("D1 数据库 'DB' 未绑定。请在 Cloudflare Pages 设置中绑定 D1 数据库。");
    }

    // 1. 历史开奖表
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS lottery_draws (
        lottery_id TEXT NOT NULL,
        draw_number TEXT NOT NULL,
        open_time TEXT,
        numbers TEXT,
        special_number INTEGER,
        created_at INTEGER,
        PRIMARY KEY (lottery_id, draw_number)
      )
    `).run();

    // 2. 管理员预测存储表 (当前最新)
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS admin_predictions (
        lottery_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER
      )
    `).run();

    // 3. 预测历史记录表 (用于战绩回溯)
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS prediction_history (
        lottery_id TEXT NOT NULL,
        draw_number TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER,
        PRIMARY KEY (lottery_id, draw_number)
      )
    `).run();

    return new Response("数据库初始化成功！表 'lottery_draws', 'admin_predictions', 'prediction_history' 已就绪。", {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  } catch (err: any) {
    return new Response(`Setup Error: ${err.message}`, { status: 500 });
  }
}
