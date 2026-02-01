
import React from 'react';
import { Sparkles, RefreshCcw, Info, AlertCircle } from 'lucide-react';
import { PredictionResult } from '../types';
import Ball from '../components/Ball';

interface PredictionPanelProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  error: string | null;
  onPredict: () => void;
  lotteryName: string;
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ prediction, isLoading, error, onPredict, lotteryName }) => {
  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-3xl p-8 text-center">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full">
            当前：{lotteryName}
          </span>
          {prediction && (
             <span className="text-[10px] text-slate-500 flex items-center gap-1">
               <RefreshCcw className="w-3 h-3 animate-reverse-spin" /> 数据已同步 2025 属性映射
             </span>
          )}
        </div>
        
        <h2 className="text-2xl font-bold mb-6 flex items-center justify-center gap-2">
          <Sparkles className="text-amber-400" /> AI 深度预测
        </h2>
        
        {!prediction && !isLoading && (
          <div className="py-10">
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              系统将抓取最新历史开奖，结合 2025 年生肖及波色分布，通过神经网络计算最理想组合。
            </p>
            <button 
              onClick={onPredict}
              className="px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-amber-600/20 active:scale-95"
            >
              开始智能分析
            </button>
          </div>
        )}

        {isLoading && (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-amber-400 font-medium animate-pulse text-sm">正在深度分析生肖走势与波色热度...</p>
          </div>
        )}

        {error && (
          <div className="py-6 px-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={onPredict} className="text-xs underline mt-2 text-red-300">重试</button>
          </div>
        )}

        {prediction && !isLoading && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
              {prediction.numbers.map((num, idx) => (
                <Ball key={idx} number={num} size="lg" />
              ))}
              <div className="flex items-center px-1 text-slate-500 font-bold self-start mt-4">+</div>
              <Ball number={prediction.specialNumber} size="lg" isSpecial />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" /> 深度分析建议
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {prediction.reasoning}
                </p>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center">
                <div className="flex justify-between items-end mb-2">
                  <h3 className="text-amber-400 font-semibold">AI 信心模型</h3>
                  <span className="text-2xl font-bold text-white">{prediction.confidence}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-amber-500 h-3 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                    style={{ width: `${prediction.confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <button 
              onClick={onPredict}
              className="text-slate-500 hover:text-white transition-colors text-xs underline underline-offset-4"
            >
              重新计算数据
            </button>
          </div>
        )}
      </section>

      <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="text-amber-500 w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong>声明：</strong> 号码生肖及波色映射基于 2025 蛇年标准。本程序仅供数据分析娱乐，彩票结果具备随机性，请勿过度投注。
        </p>
      </div>
    </div>
  );
};
