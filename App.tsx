
import React, { useState, useEffect, useCallback } from 'react';
import { DrawResult, LotteryConfig, PredictionResult, PredictionHistoryItem } from './types.ts';
import { LOTTERY_CONFIGS } from './constants.ts';
import { fetchLotteryHistory } from './geminiService.ts';
import { LotteryTabs } from './components/LotteryTabs.tsx';
import { LatestDraw } from './components/LatestDraw.tsx';
import { HistoryList } from './components/HistoryList.tsx';
import { PredictionPanel } from './views/PredictionPanel.tsx';
import { StatisticsPanel } from './views/StatisticsPanel.tsx';
import { History, RefreshCw, AlertTriangle, BarChart3 } from 'lucide-react';

const App: React.FC = () => {
  const [selectedLottery, setSelectedLottery] = useState<LotteryConfig>(LOTTERY_CONFIGS[0]);
  const [history, setHistory] = useState<DrawResult[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predHistory, setPredHistory] = useState<PredictionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram;
    if (tg?.WebApp) {
      tg.WebApp.ready();
      tg.WebApp.expand();
      // Set header color to match app
      tg.WebApp.setHeaderColor('#f1f5f9');
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchLotteryHistory(selectedLottery);
      setHistory(result.history || []);
      setPrediction(result.prediction);
      setPredHistory(result.predictionHistory || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "连接服务器失败，请检查网络");
    } finally {
      setIsLoading(false);
    }
  }, [selectedLottery]);

  useEffect(() => {
    loadData();
    setShowHistory(false);
    setShowStats(false);
  }, [loadData]);

  const getNextDrawId = () => {
      if (history.length === 0) return '???';
      const last = history[0].drawNumber;
      try {
          // Simple heuristic: if numeric, add 1, otherwise append suffix
          const num = BigInt(last);
          return (num + 1n).toString();
      } catch {
          return `${last}下期`;
      }
  };

  const latestDraw = history[0] || null;
  const latestDrawPrediction = latestDraw 
      ? predHistory.find(p => p.drawNumber === latestDraw.drawNumber)?.prediction 
      : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-amber-500/30 pb-24 tap-highlight-transparent">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-sm font-bold flex items-center gap-2 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                六合大数据
            </h1>
            <button 
                onClick={loadData} 
                disabled={isLoading}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 active:rotate-180 transition-all disabled:opacity-50"
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
        </div>
        <LotteryTabs 
            configs={LOTTERY_CONFIGS}
            selected={selectedLottery}
            onSelect={setSelectedLottery}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-md mx-auto space-y-6 pt-4">
        
        {error && (
            <div className="mx-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-medium animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
                <button onClick={loadData} className="ml-auto underline">重试</button>
            </div>
        )}

        <LatestDraw 
            draw={latestDraw} 
            isLoading={isLoading && !latestDraw} 
            prediction={latestDrawPrediction}
        />
        
        <div className="px-4">
            <PredictionPanel 
            prediction={prediction}
            isLoading={isLoading && !prediction}
            error={error}
            onPredict={loadData}
            lotteryName={selectedLottery.name}
            nextDrawId={getNextDrawId()}
            />
        </div>

        <div className="px-4 pt-2 flex gap-3">
            <button 
                onClick={() => {
                    setShowStats(!showStats);
                    if (!showStats) setShowHistory(false);
                }}
                className={`flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-sm active:scale-[0.98]
                    ${showStats 
                        ? 'bg-blue-600 text-white shadow-blue-600/20' 
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
                <BarChart3 className="w-4 h-4" /> 
                {showStats ? '收起统计' : '数据统计'}
            </button>
            <button 
                onClick={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory) setShowStats(false);
                }}
                className={`flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-sm active:scale-[0.98]
                    ${showHistory 
                        ? 'bg-slate-800 text-white shadow-slate-800/20' 
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
                <History className="w-4 h-4" /> 
                {showHistory ? '收起历史' : '历史战绩'}
            </button>
        </div>

        {showStats && (
            <div className="mx-4 animate-in slide-in-from-top-4 fade-in duration-300">
                <StatisticsPanel history={history} />
            </div>
        )}

        {showHistory && (
            <div className="mx-4 animate-in slide-in-from-top-4 fade-in duration-300">
                <HistoryList history={history} predictions={predHistory} />
            </div>
        )}
      </main>

      <footer className="py-6 text-center text-[10px] text-slate-300">
          Powered by Gemini AI & Cloudflare V5.0
      </footer>
    </div>
  );
};

export default App;
