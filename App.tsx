
import React, { useState, useEffect } from 'react';
import { DrawResult, LotteryConfig } from './types';
import { LOTTERY_CONFIGS } from './constants';
import { fetchLotteryHistory } from './geminiService';
import { LotteryTabs } from './components/LotteryTabs';
import { LatestDraw } from './components/LatestDraw';
import { HistoryList } from './components/HistoryList';

// Add type definition for Telegram WebApp
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
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Telegram Web App
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  // Fetch data automatically when lottery changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setHistory([]); // Clear previous history while loading
      try {
        const result = await fetchLotteryHistory(selectedLottery);
        setHistory(result.history);
      } catch (err: any) {
        console.error(err);
        // Silent fail or minimal UI indication could be added here
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedLottery]);

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* 1. Navigation Bar */}
      <LotteryTabs 
        configs={LOTTERY_CONFIGS}
        selected={selectedLottery}
        onSelect={setSelectedLottery}
      />

      {/* 2. Latest Draw Record */}
      <LatestDraw 
        draw={history.length > 0 ? history[0] : null} 
        isLoading={isLoading} 
      />

      {/* 3. Draw History List */}
      <HistoryList history={history} />
    </div>
  );
};

export default App;
