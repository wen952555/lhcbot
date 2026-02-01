
import React, { useState, useEffect } from 'react';
import { TabType, DrawResult, PredictionResult, LotteryConfig } from './types';
import { LOTTERY_CONFIGS } from './constants';
import { fetchLotteryDataAndPrediction } from './geminiService';
import { Header } from './components/Header';
import { LotterySelector } from './components/LotterySelector';
import { Navigation } from './components/Navigation';
import { PredictionPanel } from './views/PredictionPanel';
import { StatisticsPanel } from './views/StatisticsPanel';
import { HistoryPanel } from './views/HistoryPanel';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.PREDICT);
  const [selectedLottery, setSelectedLottery] = useState<LotteryConfig>(LOTTERY_CONFIGS[0]);
  const [history, setHistory] = useState<DrawResult[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrediction(null);
    setHistory([]);
    setError(null);
  }, [selectedLottery]);

  const handlePredict = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchLotteryDataAndPrediction(selectedLottery);
      setPrediction(result.prediction);
      setHistory(result.history);
    } catch (err: any) {
      setError(err.message || "生成预测失败。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 max-w-5xl mx-auto px-4 sm:px-6">
      <Header />
      
      <LotterySelector 
        configs={LOTTERY_CONFIGS}
        selected={selectedLottery}
        onSelect={setSelectedLottery}
      />

      <main className="space-y-6">
        {activeTab === TabType.PREDICT && (
          <PredictionPanel 
            prediction={prediction}
            isLoading={isLoading}
            error={error}
            onPredict={handlePredict}
            lotteryName={selectedLottery.name}
          />
        )}

        {activeTab === TabType.STATS && (
          <StatisticsPanel history={history} />
        )}

        {activeTab === TabType.HISTORY && (
          <HistoryPanel history={history} lotteryName={selectedLottery.name} />
        )}
      </main>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
