
import React, { useState, useEffect } from 'react';
import { DrawResult, LotteryConfig, PredictionResult } from './types';
import { LOTTERY_CONFIGS } from './constants';
import { fetchLotteryHistory } from './geminiService';
import { LotteryTabs } from './components/LotteryTabs';
import { LatestDraw } from './components/LatestDraw';
import { HistoryList } from './components/HistoryList';
import { PredictionPanel } from './views/PredictionPanel';

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        MainButton: any;
        ThemeParams: any;
      };
    };
  }
}

const App: React.FC = () => {
  const [selectedLottery, setSelectedLottery] = useState<LotteryConfig>(LOTTERY_CONFIGS[0]);
  
  const [history, setHistory] = useState<DrawResult[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchLotteryHistory(selectedLottery);
      setHistory(result.history);
      setPrediction(result.prediction);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedLottery]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-amber-500/30 pb-10">
      <LotteryTabs 
        configs={LOTTERY_CONFIGS}
        selected={selectedLottery}
        onSelect={setSelectedLottery}
      />

      <LatestDraw draw={history[0]} isLoading={isLoading} />
      
      <div className="px-4 mt-6">
        <PredictionPanel 
          prediction={prediction}
          isLoading={isLoading}
          error={error}
          onPredict={loadData}
          lotteryName={selectedLottery.name}
        />
      </div>

      <HistoryList history={history} />
    </div>
  );
};

export default App;
