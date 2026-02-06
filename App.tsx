
import React, { useState, useEffect } from 'react';
import { DrawResult, LotteryConfig, PredictionResult, PredictionHistoryItem } from './types.ts';
import { LOTTERY_CONFIGS } from './constants.tsx';
import { fetchLotteryHistory } from './geminiService.ts';
import { LotteryTabs } from './components/LotteryTabs.tsx';
import { LatestDraw } from './components/LatestDraw.tsx';
import { HistoryList } from './components/HistoryList.tsx';
import { PredictionPanel } from './views/PredictionPanel.tsx';
import { History } from 'lucide-react';

const App: React.FC = () => {
  const [selectedLottery, setSelectedLottery] = useState<LotteryConfig>(LOTTERY_CONFIGS[0]);
  const [history, setHistory] = useState<DrawResult[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predHistory, setPredHistory] = useState<PredictionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Fix: Access Telegram WebApp through any cast to avoid TypeScript property error on window object
    const tg = (window as any).Telegram;
    if (tg?.WebApp) {
      tg.WebApp.ready();
      tg.WebApp.expand();
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchLotteryHistory(selectedLottery);
      setHistory(result.history || []);
      setPrediction(result.prediction);
      setPredHistory(result.predictionHistory || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setShowHistory(false);
  }, [selectedLottery]);

  const getNextDrawId = () => {
      if (history.length === 0) return '???';
      const last = history[0].drawNumber;
      try {
          return (BigInt(last) + 1n).toString();
      } catch {
          return `${last}_Next`;
      }
  };

  // 获取最新一期开奖对应的历史预测（如果有的话）
  const latestDraw = history[0] || null;
  const latestDrawPrediction = latestDraw 
      ? predHistory.find(p => p.drawNumber === latestDraw.drawNumber)?.prediction 
      : undefined;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-amber-500/30 pb-10">
      <LotteryTabs 
        configs={LOTTERY_CONFIGS}
        selected={selectedLottery}
        onSelect={setSelectedLottery}
      />

      <LatestDraw 
        draw={latestDraw} 
        isLoading={isLoading} 
        prediction={latestDrawPrediction}
      />
      
      <div className="px-4 mt-6">
        <PredictionPanel 
          prediction={prediction}
          isLoading={isLoading}
          error={error}
          onPredict={loadData}
          lotteryName={selectedLottery.name}
          nextDrawId={getNextDrawId()}
        />
      </div>

      <div className="px-4 mt-8">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-sm border
                ${showHistory ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
             <History className="w-4 h-4" /> 
             {showHistory ? '收起历史记录' : '查看历史开奖与战绩'}
          </button>
      </div>

      <div className="mx-4 mt-4 animate-in slide-in-from-top-2 duration-300">
          {showHistory && history.length > 1 && (
             <HistoryList history={history} predictions={predHistory} />
          )}
      </div>
    </div>
  );
};

export default App;
