
import { DrawResult, PredictionResult, LotteryConfig } from "./types";

export const fetchLotteryDataAndPrediction = async (config: LotteryConfig): Promise<{ prediction: PredictionResult, history: DrawResult[] }> => {
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
    console.error("Prediction Error:", error);
    throw error;
  }
};
