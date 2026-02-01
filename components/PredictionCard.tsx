
import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';
import { PredictionResult } from '../types';
import Ball from './Ball';

interface PredictionCardProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  onPredict: () => void;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, isLoading, onPredict }) => {
  return (
    <div className="mx-4 mt-4 glass-card rounded-2xl p-5 border-t border-amber-500/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-amber-500" />
          AI 智能预测
        </h3>
        {!prediction && !isLoading && (
          <button 
            onClick={onPredict}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-amber-500/20"
          >
            立即生成
          </button>
        )}
      </div>

      {isLoading && (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3"></div>
          <p className="text-amber-500/80 text-xs animate-pulse">正在分析生肖波色走势...</p>
        </div>
      )}

      {prediction && !isLoading && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-center gap-2 mb-6 bg-slate-900/40 p-3 rounded-xl">
            {prediction.numbers.map((num, idx) => (
              <Ball key={idx} number={num} size="md" />
            ))}
            <span className="text-slate-600 mx-1">+</span>
            <Ball number={prediction.specialNumber} size="md" isSpecial />
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400">推荐信心</span>
              <span className="text-xs font-bold text-amber-400">{prediction.confidence}%</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mb-3">
              <div 
                className="bg-amber-500 h-1.5 rounded-full" 
                style={{ width: `${prediction.confidence}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed opacity-90">
              {prediction.reasoning}
            </p>
          </div>

          <button 
            onClick={onPredict}
            className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3 h-3" />
            重新预测
          </button>
        </div>
      )}
    </div>
  );
};
