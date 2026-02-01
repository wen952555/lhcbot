
export async function onRequest(context: any) {
  try {
    const { env } = context;
    if (!env.DB) {
      throw new Error("D1 数据库 'DB' 未绑定。请在 Cloudflare Pages 设置中绑定 D1 数据库。");
    }

    // 创建 lottery_draws 表
    // 联合主键 (lottery_id, draw_number) 防止重复
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

    return new Response("数据库初始化成功！表 'lottery_draws' 已就绪。", {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  } catch (err: any) {
    return new Response(`Setup Error: ${err.message}`, { status: 500 });
  }
}
