
import { GoogleGenAI, Type } from "@google/genai";

export async function onRequestPost(context: any) {
  try {
    const { apiUrl, lotteryName } = await context.request.json();
    const apiKey = context.env.API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Cloudflare 环境中未配置 API_KEY" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const externalResponse = await fetch(apiUrl);
    if (!externalResponse.ok) {
      throw new Error(`无法从数据源获取数据: ${externalResponse.status}`);
    }
    const rawData = await externalResponse.json();
    
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

    const ai = new GoogleGenAI({ apiKey });
    
    // 我们将映射表作为上下文传给 AI，以便它理解生肖和波色
    const prompt = `
      作为专业的彩票分析大师，正在分析 "${lotteryName}"。
      
      2025年属性映射背景：
      - 蛇(01,13,25,37,49), 龙(02,14,26,38), 兔(03,15,27,39), 虎(04,16,28,40)...
      - 红波(01,02,07,08,12,13,18,19,23,24,29,30,34,35,40,45,46)
      - 蓝波(03,04,09,10,14,15,20,25,26,31,36,37,41,42,47,48)
      - 绿波(05,06,11,16,17,21,22,27,28,32,33,38,39,43,44,49)
      
      历史数据：
      ${historyData.map((h: any) => `期号 ${h.drawNumber}: ${h.numbers.join(',')} 特:${h.specialNumber}`).join('\n')}
      
      请预测下一期号码并输出 JSON：
      1. numbers: 6个正码
      2. specialNumber: 1个特码
      3. confidence: 信心值
      4. reasoning: 详细分析理由（请从生肖冷热、波色平衡、大小单双比例等维度进行中文深度分析）
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            numbers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            specialNumber: { type: Type.INTEGER },
            confidence: { type: Type.INTEGER },
            reasoning: { type: Type.STRING }
          },
          required: ["numbers", "specialNumber", "confidence", "reasoning"]
        }
      }
    });

    const prediction = JSON.parse(response.text || '{}');
    return new Response(JSON.stringify({ prediction, history: historyData }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
