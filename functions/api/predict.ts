
export async function onRequestPost(context: any) {
  try {
    const { apiUrl } = await context.request.json();
    
    // Fetch external data
    const externalResponse = await fetch(apiUrl);
    if (!externalResponse.ok) {
      throw new Error(`无法从数据源获取数据: ${externalResponse.status}`);
    }
    const rawData = await externalResponse.json();
    
    // Parse history data
    const historyData = (rawData.data || []).slice(0, 20).map((item: any) => {
      const codes = item.openCode.split(',').map((c: string) => parseInt(c.trim()));
      return {
        drawNumber: item.expect,
        date: item.openTime,
        numbers: codes.slice(0, 6),
        specialNumber: codes[6]
      };
    });

    if (historyData.length === 0) {
      throw new Error("未能成功解析开奖数据");
    }

    // Return only history
    return new Response(JSON.stringify({ history: historyData }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
