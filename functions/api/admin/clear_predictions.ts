export async function onRequest(context: any) {
  try {
    const { env } = context;
    if (!env.DB) {
      throw new Error("D1 数据库 'DB' 未绑定。");
    }

    // 清理预测历史表
    const historyResult = await env.DB.prepare(`DELETE FROM prediction_history`).run();
    
    // 清理当前缓存的预测表
    const adminResult = await env.DB.prepare(`DELETE FROM admin_predictions`).run();

    return new Response(JSON.stringify({
      success: true,
      message: "所有预测记录已成功清理！",
      details: {
        history_deleted: historyResult.meta?.changes || 0,
        cache_deleted: adminResult.meta?.changes || 0
      }
    }, null, 2), {
      headers: { "Content-Type": "application/json;charset=utf-8" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json;charset=utf-8" }
    });
  }
}
