
import React, { useState, useEffect, useCallback } from 'react';
import { TabType, DrawResult, PredictionResult } from './types';
import { MOCK_HISTORY } from './constants';
import { getAIPrediction } from './geminiService';
import Ball from './components/Ball';
import FrequencyChart from './components/FrequencyChart';
import { Sparkles, History, BarChart3, TrendingUp, Info, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.PREDICT);
  const [history] = useState<DrawResult[]>(MOCK_HISTORY);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAIPrediction(history);
      setPrediction(result);
    } catch (err) {
      setError("Failed to generate prediction. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <header className="py-8 text-center">
        <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
          <TrendingUp className="text-white w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500">
          Mark Six AI Oracle
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Harnessing Gemini AI to decode lottery patterns</p>
      </header>

      {/* Main Content */}
      <main className="space-y-6">
        {activeTab === TabType.PREDICT && (
          <div className="space-y-6">
            <section className="glass-panel rounded-3xl p-8 text-center">
              <h2 className="text-2xl font-bold mb-6 flex items-center justify-center gap-2">
                <Sparkles className="text-amber-400" /> AI Insights
              </h2>
              
              {!prediction && !isLoading && (
                <div className="py-10">
                  <p className="text-slate-400 mb-8 max-w-md mx-auto">
                    Let our advanced neural network analyze recent trends and suggest a statistical set for your next entry.
                  </p>
                  <button 
                    onClick={handlePredict}
                    className="px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl transition-all transform hover:scale-105 shadow-xl shadow-amber-600/20 active:scale-95"
                  >
                    Generate AI Prediction
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="py-20 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                  <p className="text-amber-400 font-medium animate-pulse">Analyzing historical data patterns...</p>
                </div>
              )}

              {prediction && !isLoading && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex flex-wrap justify-center gap-4">
                    {prediction.numbers.map((num, idx) => (
                      <Ball key={idx} number={num} size="lg" />
                    ))}
                    <div className="flex items-center px-2 text-slate-500 font-bold">+</div>
                    <Ball number={prediction.specialNumber} size="lg" isSpecial />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                      <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" /> Statistical Reasoning
                      </h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {prediction.reasoning}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center">
                      <div className="flex justify-between items-end mb-2">
                        <h3 className="text-amber-400 font-semibold">AI Confidence</h3>
                        <span className="text-2xl font-bold text-white">{prediction.confidence}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3">
                        <div 
                          className="bg-amber-500 h-3 rounded-full transition-all duration-1000" 
                          style={{ width: `${prediction.confidence}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handlePredict}
                    className="text-slate-400 hover:text-white transition-colors text-sm underline underline-offset-4"
                  >
                    Recalculate Prediction
                  </button>
                </div>
              )}
            </section>

            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-200/80 leading-relaxed">
                <strong>Disclaimer:</strong> This application is for entertainment and informational purposes only. Lottery is a game of chance. There is no scientific method to guarantee a win. Please play responsibly.
              </p>
            </div>
          </div>
        )}

        {activeTab === TabType.STATS && (
          <section className="glass-panel rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <BarChart3 className="text-blue-400" /> Distribution Analysis
            </h2>
            <p className="text-slate-400 mb-6">Frequency of numbers across the last {history.length} draws.</p>
            <FrequencyChart history={history} />
          </section>
        )}

        {activeTab === TabType.HISTORY && (
          <section className="glass-panel rounded-3xl overflow-hidden">
            <div className="p-8 pb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <History className="text-emerald-400" /> Draw History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/80 text-slate-400 text-sm">
                  <tr>
                    <th className="px-8 py-4 font-medium">Draw No.</th>
                    <th className="px-8 py-4 font-medium">Date</th>
                    <th className="px-8 py-4 font-medium">Winning Numbers</th>
                    <th className="px-8 py-4 font-medium">S/N</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {history.map((draw, i) => (
                    <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-8 py-6 font-mono text-amber-200">{draw.drawNumber}</td>
                      <td className="px-8 py-6 text-slate-300">{draw.date}</td>
                      <td className="px-8 py-6">
                        <div className="flex gap-2">
                          {draw.numbers.map((n, idx) => (
                            <Ball key={idx} number={n} size="sm" />
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <Ball number={draw.specialNumber} size="sm" isSpecial />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-slate-800 px-4 py-3 z-50">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            onClick={() => setActiveTab(TabType.PREDICT)}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === TabType.PREDICT ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Predict</span>
          </button>
          <button 
            onClick={() => setActiveTab(TabType.STATS)}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === TabType.STATS ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Stats</span>
          </button>
          <button 
            onClick={() => setActiveTab(TabType.HISTORY)}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === TabType.HISTORY ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <History className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
