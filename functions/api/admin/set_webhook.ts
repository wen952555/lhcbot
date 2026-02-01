
export async function onRequest(context: any) {
    const { request, env } = context;
    const requestUrl = new URL(request.url);
    
    // 检查环境变量
    if (!env.TG_BOT_TOKEN) {
        return new Response(JSON.stringify({ 
            error: "TG_BOT_TOKEN is not defined in Cloudflare Pages settings." 
        }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    // 自动构建 webhook 地址: <当前域名>/api/webhook
    const webhookUrl = `${requestUrl.origin}/api/webhook`;

    // 调用 Telegram API 设置 Webhook
    const telegramUrl = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
    
    try {
        const response = await fetch(telegramUrl);
        const result = await response.json();

        return new Response(JSON.stringify({
            message: "Attempting to set webhook...",
            target_url: webhookUrl,
            telegram_api_response: result
        }, null, 2), {
            headers: { "Content-Type": "application/json;charset=utf-8" }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
