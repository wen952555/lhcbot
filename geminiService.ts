
import { DrawResult, LotteryConfig, PredictionResult, PredictionHistoryItem } from "./types.ts";

export const fetchLotteryHistory = async (config: LotteryConfig): Promise<{ 
  history: DrawResult[], 
  prediction: PredictionResult,
  predictionHistory: PredictionHistoryItem[]
}> => {
  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        lotteryId: config.id
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
