
import React, { useState } from 'react';
import { Crown, Layers, Hash, Palette, BrainCircuit, Sparkles, Copy, Check, Info } from 'lucide-react';
import { PredictionResult } from '../types.ts';
import { COLOR_NAMES, PREDICTION_DATE } from '../constants.tsx';
import Ball from '../components/Ball.tsx';

interface PredictionPanelProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  error: string | null;
  onPredict: () => void;
  lotteryName: string;
  nextDrawId: string;
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ prediction, isLoading, onPredict, lotteryName, nextDrawId }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy18 = () => {
    if (!prediction) return;
    const text = prediction.numbers_18.map(n => n.toString().padStart(2, '0')).join(',');
    navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center gap-5 glass-panel rounded-3xl shadow-sm">
        <div className="relative">
            <div className="w-16 h-16 border-[5px] border-slate-100 border-t-amber-500 rounded-full animate-spin"></div>
            <BrainCircuit className="w-8 h-8 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
            <p className="text-slate-700 text-sm font-bold">深度引擎分析中...</p>
            <p className="text-slate-400 text-xs">正在回测历史规律与生肖矩阵</p>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="glass-panel rounded-3xl p-10 text-center border-dashed border-2 border-slate-200/60">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
           <Sparkles className="text-slate-300 w-8 h-8" />
        </div>
        <h3 className="text-slate-700 font-bold mb-2">等待生成预测</h3>
        <p className="text-slate-400 text-xs mb-8 px-4 leading-relaxed">
            系统将基于 V5.0 多阶滞后算法，对 {lotteryName} 进行全维扫描。
        </p>
        <button onClick={onPredict} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-full text-xs font-bold shadow-xl shadow-slate-200 transition-all active:scale-95">
            立即开始分析
        </button>
      </div>
    );
  }

  const strategyName = prediction.reasoning ? (prediction.reasoning.match(/【(.*?)】/)?.[1] || "多维综合分析") : "多维综合分析";

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      
      {/* Header Info */}
      <div className="flex flex-col items-center">
         <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-100/50 mb-3">
            <BrainCircuit className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[10px] text-amber-700 font-bold tracking-wide">算法: {strategyName}</span>
         </div>
         <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
            第 <span className="text-amber-500 text-3xl font-mono">{nextDrawId}</span> 期
         </h1>
         <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">{lotteryName}</span>
             <span className="text-[10px] text-slate-400">信心指数 <span className="text-amber-600 font-bold">{prediction.confidence}%</span></span>
         </div>
      </div>

      {/* 核心六肖 (Highlight) */}
      <section className="glass-panel rounded-2xl p-5 relative overflow-hidden border-t-4 border-t-amber-500 shadow-xl shadow-amber-500/5">
        <div className="absolute -right-6 -top-6 opacity-[0.03] rotate-12">
            <Crown className="w-40 h-40 text-amber-900" />
        </div>
        <div className="flex items-center justify-between mb-5 relative z-10">
            <h3 className="text-amber-700 text-xs font-black flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500" /> 核心六肖
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-amber-200/50 to-transparent ml-3"></div>
        </div>
        <div className="flex justify-between px-1 relative z-10">
            {prediction.zodiacs.map((z, i) => (
                <div key={i} className="flex flex-col items-center gap-2 group">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 flex items-center justify-center text-white font-black text-xl border-b-4 border-amber-700 transition-transform group-hover:-translate-y-1">
                        {z}
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* 18码 + 8码 */}
      <section className="glass-panel rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <h3 className="text-blue-600 text-xs font-black flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-blue-500" /> 精选18码
                </h3>
                <span className="text-[9px] text-slate-400 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                    橙色为重
                </span>
            </div>
            
            <button 
                onClick={handleCopy18}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95
                    ${copied 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-500'}`}
            >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '已复制' : '复制号码'}</span>
            </button>
        </div>
        {/* 增加 row-gap 以容纳生肖文字 */}
        <div className="grid grid-cols-6 gap-x-2.5 gap-y-4">
            {prediction.numbers_18.map((num, i) => {
                const isTop8 = prediction.numbers_8.includes(num);
                return (
                    <div key={i} className={`relative flex items-center justify-center transition-all ${isTop8 ? 'scale-110 z-10' : ''}`}>
                         {/* 
                            关键修改：showZodiac={true}
                            配合 PREDICTION_DATE (2026年)，这里将显示【马年】的生肖排位。
                         */}
                        <Ball number={num} size="sm" date={PREDICTION_DATE} showZodiac={true} />
                        {isTop8 && (
                           <span className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                           </span>
                        )}
                    </div>
                );
            })}
        </div>
      </section>

      {/* 头尾数 & 波色 Grid */}
      <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3">
             <h3 className="text-slate-500 text-[10px] font-bold flex items-center gap-1.5 uppercase">
                <Layers className="w-3.5 h-3.5" /> 头数推荐
             </h3>
             <div className="flex flex-wrap gap-1.5">
                 {prediction.heads.map((h, i) => (
                     <span key={i} className="text-xs font-black bg-slate-800 text-white px-2.5 py-1 rounded-md shadow-sm">
                        {h}
                     </span>
                 ))}
             </div>
          </div>
          
           <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3">
             <h3 className="text-slate-500 text-[10px] font-bold flex items-center gap-1.5 uppercase">
                <Layers className="w-3.5 h-3.5" /> 尾数围攻
             </h3>
             <div className="flex flex-wrap gap-1.5">
                 {prediction.tails.map((t, i) => (
                     <span key={i} className="text-xs font-black bg-white text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md">
                        {t}
                     </span>
                 ))}
             </div>
          </div>

          <div className="col-span-2 glass-panel rounded-2xl p-4 flex items-center justify-between border-l-4 border-l-purple-500">
             <h3 className="text-slate-700 text-xs font-black flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" /> 推荐波色
             </h3>
             <div className="flex gap-2">
                 {prediction.colors.map((c, i) => (
                     <div key={i} className={`px-5 py-1.5 rounded-lg text-xs font-black shadow-sm flex items-center gap-1
                         ${c === 'red' ? 'bg-red-500 text-white' : 
                           c === 'blue' ? 'bg-blue-500 text-white' : 
                           'bg-emerald-500 text-white'}`}>
                          {COLOR_NAMES[c as 'red'|'blue'|'green'] || c}波
                     </div>
                 ))}
             </div>
          </div>
      </div>
      
      {/* Footer Info */}
      <div className="flex items-start gap-2 px-2 opacity-60">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
        <p className="text-[10px] text-slate-400 leading-tight">
            算法基于历史数据统计概率，预测结果展示为【马年】排位（1号马）。
        </p>
      </div>

    </div>
  );
};
