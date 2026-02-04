
import React from 'react';
import { Crown, Layers, Hash, Palette, AlertCircle, BrainCircuit, Star } from 'lucide-react';
import { PredictionResult } from '../types.ts';
import { COLOR_NAMES } from '../constants.tsx';

interface PredictionPanelProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  error: string | null;
  onPredict: () => void;
  lotteryName: string;
  nextDrawId: string;
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ prediction, isLoading, error, onPredict, lotteryName, nextDrawId }) => {
  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center gap-4 glass-panel rounded-3xl mx-4 shadow-inner">
        <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-amber-500 rounded-full animate-spin"></div>
            <BrainCircuit className="w-6 h-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-slate-500 text-xs font-medium">深度引擎正在回测历史规律...</p>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="glass-panel rounded-3xl p-8 mx-4 text-center border-dashed border-2 border-slate-200">
        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
           <AlertCircle className="text-slate-300 w-8 h-8" />
        </div>
        <h3 className="text-slate-600 font-bold mb-2">尚未生成预测</h3>
        <p className="text-slate-400 text-[10px] mb-6 px-4">为了保证准确率，本期预测正在等待最新开奖数据完成校验。</p>
        <button onClick={onPredict} className="bg-slate-800 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg shadow-slate-200">立即同步并分析</button>
      </div>
    );
  }

  const strategyName = prediction.reasoning ? (prediction.reasoning.match(/【(.*?)】/)?.[1] || "智能综合") : "智能综合";

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="text-center">
         <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 mb-2">
            <BrainCircuit className="w-3 h-3 text-amber-600" />
            <span className="text-[10px] text-amber-700 font-bold">算法模式: {strategyName}</span>
         </div>
         <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            第 <span className="text-amber-500">{nextDrawId}</span> 期 推荐
         </h1>
         <div className="text-[10px] text-slate-400 mt-1">
            {lotteryName} · 算法信心指数 <span className="text-amber-600 font-bold">{prediction.confidence}%</span>
         </div>
      </div>

      <section className="glass-panel rounded-2xl p-4 relative overflow-hidden border-2 border-amber-400/20 shadow-xl shadow-amber-500/5">
        <div className="absolute -right-4 -top-4 opacity-[0.03] rotate-12">
            <Crown className="w-32 h-32 text-amber-900" />
        </div>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-amber-600 text-[11px] font-black flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-md">
                <Crown className="w-3.5 h-3.5" /> 核心六肖推荐
            </h3>
            <span className="text-[9px] text-slate-400">历史高关联度肖</span>
        </div>
        <div className="flex justify-between px-1">
            {prediction.zodiacs.map((z, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 flex items-center justify-center text-white font-black text-lg border-b-4 border-orange-700 transform hover:-translate-y-1 transition-transform">
                        {z}
                    </div>
                </div>
            ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-4 shadow-xl shadow-amber-500/20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
            <Star className="w-16 h-16 rotate-12" />
        </div>
        <div className="flex items-center justify-between mb-3 relative z-10">
            <h3 className="text-[11px] font-black flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md">
                <Star className="w-3.5 h-3.5" /> 回测精选8码
            </h3>
            <span className="text-[9px] text-white/70">高频回测锁定</span>
        </div>
        <div className="grid grid-cols-4 gap-3 relative z-10">
            {prediction.numbers_8.map((num, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-lg rounded-xl py-2 flex items-center justify-center border border-white/20 font-mono font-black text-lg shadow-inner">
                    {num.toString().padStart(2, '0')}
                </div>
            ))}
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-4">
        <h3 className="text-blue-500 text-[11px] font-black mb-3 flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-md w-fit">
            <Hash className="w-3.5 h-3.5" /> 智能筛选18码
        </h3>
        <div className="grid grid-cols-6 gap-2">
            {prediction.numbers_18.map((num, i) => (
                <div key={i} className="aspect-square rounded-lg bg-white flex items-center justify-center border border-slate-200 text-slate-700 font-mono font-black text-sm shadow-sm hover:border-blue-300 hover:text-blue-600 transition-colors">
                    {num.toString().padStart(2, '0')}
                </div>
            ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
          <div className="glass-panel rounded-2xl p-4 border border-slate-100">
             <h3 className="text-slate-400 text-[10px] font-bold mb-3 flex items-center gap-1 uppercase">
                <Layers className="w-3 h-3" /> 头数锁定
             </h3>
             <div className="flex flex-wrap gap-2">
                 {prediction.heads.map((h, i) => (
                     <span key={i} className="text-xs font-black bg-slate-800 text-white px-2 py-1 rounded shadow-sm">
                        {h}头
                     </span>
                 ))}
             </div>
          </div>
           <div className="glass-panel rounded-2xl p-4 border border-slate-100">
             <h3 className="text-slate-400 text-[10px] font-bold mb-3 flex items-center gap-1 uppercase">
                <Layers className="w-3 h-3" /> 尾数围攻
             </h3>
             <div className="flex flex-wrap gap-2">
                 {prediction.tails.map((t, i) => (
                     <span key={i} className="text-xs font-black bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                        {t}尾
                     </span>
                 ))}
             </div>
          </div>
      </div>

      <section className="glass-panel rounded-2xl p-4 flex items-center justify-between border-l-4 border-l-amber-500">
           <h3 className="text-slate-600 text-[11px] font-black flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-400" /> 推荐波色
           </h3>
           <div className="flex gap-2">
               {prediction.colors.map((c, i) => (
                   <div key={i} className={`px-4 py-1.5 rounded-lg text-xs font-black shadow-sm flex items-center gap-2 border border-white/20
                       ${c === 'red' ? 'bg-red-500 text-white' : 
                         c === 'blue' ? 'bg-blue-500 text-white' : 
                         'bg-emerald-500 text-white'}`}>
                        {COLOR_NAMES[c as 'red'|'blue'|'green'] || c}波
                   </div>
               ))}
           </div>
      </section>

      <div className="p-4 flex items-start gap-2 opacity-50">
        <AlertCircle className="text-slate-400 w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-slate-500 leading-tight">
          预测仅代表基于历史数据的数学概率建模结果，不作为博彩依据。大数据模型并非100%准确，请理性对待。
        </p>
      </div>
    </div>
  );
};
