
import { GoogleGenAI, Type } from "@google/genai";
import { DrawResult, PredictionResult } from "./types";

export const getAIPrediction = async (history: DrawResult[]): Promise<PredictionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const historyString = history.map(h => 
    `Draw ${h.drawNumber}: ${h.numbers.join(', ')} | Special: ${h.specialNumber}`
  ).join('\n');

  const prompt = `
    As a statistical analyst for the Mark Six lottery (49 numbers), analyze the following recent draw history:
    ${historyString}
    
    Based on your analysis of frequency, "hot" and "cold" numbers, and distribution patterns, generate a set of predicted numbers for the next draw.
    Provide 6 main numbers (1-49) and 1 special number (1-49).
    Also provide a confidence score (0-100) and a brief reasoning for these choices.
    
    IMPORTANT: Acknowledge that lottery results are fundamentally random and this is for entertainment purposes based on historical patterns.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            numbers: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "Array of 6 unique integers between 1 and 49"
            },
            specialNumber: {
              type: Type.INTEGER,
              description: "A special integer between 1 and 49"
            },
            confidence: {
              type: Type.INTEGER,
              description: "Confidence score out of 100"
            },
            reasoning: {
              type: Type.STRING,
              description: "Brief statistical reasoning"
            }
          },
          required: ["numbers", "specialNumber", "confidence", "reasoning"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      numbers: result.numbers.sort((a: number, b: number) => a - b),
      specialNumber: result.specialNumber,
      confidence: result.confidence,
      reasoning: result.reasoning
    };
  } catch (error) {
    console.error("Gemini Prediction Error:", error);
    // Fallback pseudo-random prediction if API fails
    const randomNums = Array.from({length: 49}, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5)
      .slice(0, 6)
      .sort((a, b) => a - b);
    
    return {
      numbers: randomNums,
      specialNumber: Math.floor(Math.random() * 49) + 1,
      confidence: 15,
      reasoning: "The AI analyst is currently unavailable. This is a baseline statistical sample based on uniform distribution."
    };
  }
};
