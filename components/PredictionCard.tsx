
import React from 'react';
import { Sparkles, BrainCircuit, BarChart3 } from 'lucide-react';
import { PredictionResult } from '../types.ts';
import Ball from './Ball.tsx';

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
          智能算法预测
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
          <p className="text-amber-500/80 text-xs animate-pulse">正在进行全量数据回测与统计分析...</p>
        </div>
      )}

      {prediction && !isLoading && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col items-center gap-2 mb-6 bg-slate-900/40 p-3 rounded-xl">
            <div className="flex flex-wrap justify-center gap-2">
              {prediction.numbers_18.slice(0, 6).map((num, idx) => (
                <Ball key={idx} number={num} size="md" />
              ))}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 px-4 text-center">
              精选18码预览: {prediction.numbers_18.slice(0, 10).join(', ')}...
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 relative overflow-hidden">
            {/* 装饰背景 */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                算法信心指数
              </span>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-medium">
                    自动回测优化
                </span>
                <span className="text-xs font-bold text-amber-400">{prediction.confidence}%</span>
              </div>
            </div>
            
            <div className="w-full bg-slate-700 h-1.5 rounded-full mb-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-600 to-amber-400 h-1.5 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${prediction.confidence}%` }}
              ></div>
            </div>
            
            <p className="text-[11px] text-slate-300 leading-relaxed opacity-90 border-l-2 border-amber-500/30 pl-2">
              {prediction.reasoning}
            </p>
          </div>

          <button 
            onClick={onPredict}
            className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-600/50"
          >
            <Sparkles className="w-3 h-3" />
            重新预测
          </button>
        </div>
      )}
    </div>
  );
};
