
import { GoogleGenAI, Type } from "@google/genai";
import { DrawResult, LotteryConfig, PredictionResult } from "./types";

export const fetchLotteryHistory = async (config: LotteryConfig): Promise<{ history: DrawResult[] }> => {
  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        apiUrl: config.apiUrl,
        lotteryName: config.name
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `服务器错误: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Fetch Error:", error);
    throw error;
  }
};

export const generatePrediction = async (history: DrawResult[], config: LotteryConfig): Promise<PredictionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const historyText = history.slice(0, 20).map(draw => 
    `期号:${draw.drawNumber} 号码:${draw.numbers.join(',')} 特码:${draw.specialNumber}`
  ).join('\n');

  const prompt = `根据以下${config.name}的历史开奖数据，预测下一期的号码（6个平码+1个特码）。
历史数据：
${historyText}

请提供：
1. 6个平码 (1-49)
2. 1个特码 (1-49)
3. 预测理由 (基于生肖、波色等规律分析)
4. 信心指数 (0-100)`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          numbers: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "6个预测平码"
          },
          specialNumber: {
            type: Type.NUMBER,
            description: "1个预测特码"
          },
          reasoning: {
            type: Type.STRING,
            description: "预测理由"
          },
          confidence: {
            type: Type.NUMBER,
            description: "信心指数"
          }
        },
        required: ['numbers', 'specialNumber', 'reasoning', 'confidence']
      }
    }
  });

  const text = response.text;
  if (!text) {
      throw new Error("No response from AI");
  }

  return JSON.parse(text) as PredictionResult;
};
