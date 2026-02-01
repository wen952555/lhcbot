
import React from 'react';
import { RefreshCcw, AlertCircle, Crown, Layers, Hash, Palette } from 'lucide-react';
import { PredictionResult } from '../types';
import Ball from '../components/Ball';
import { COLOR_NAMES } from '../constants';

interface PredictionPanelProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  error: string | null;
  onPredict: () => void;
  lotteryName: string;
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ prediction, isLoading, error, onPredict, lotteryName }) => {
  
  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center gap-4 glass-panel rounded-3xl mx-4">
        <div className="w-10 h-10 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-xs">正在获取最新推荐...</p>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="glass-panel rounded-3xl p-8 mx-4 text-center">
        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
           <AlertCircle className="text-slate-500 w-6 h-6" />
        </div>
        <h3 className="text-slate-300 font-bold mb-2">暂无推荐数据</h3>
        <p className="text-slate-500 text-xs mb-6">管理员暂未发布本期 {lotteryName} 的心水推荐。</p>
        <button onClick={onPredict} className="text-xs text-amber-500 underline">刷新试试</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-2 py-1 rounded">
            {lotteryName} 专家推荐
          </span>
          {prediction.timestamp && (
             <span className="text-[10px] text-slate-600">
               {new Date(prediction.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})} 更新
             </span>
          )}
      </div>

      {/* 1. 推荐六肖 */}
      <section className="glass-panel rounded-2xl p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-5">
            <Crown className="w-16 h-16" />
        </div>
        <h3 className="text-amber-500 text-xs font-bold mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4" /> 必中六肖
        </h3>
        <div className="flex justify-between px-2">
            {prediction.zodiacs.map((z, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-500 to-amber-700 shadow-lg shadow-amber-900/50 flex items-center justify-center text-white font-bold text-lg border border-amber-400/30">
                        {z}
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* 2. 推荐18码 */}
      <section className="glass-panel rounded-2xl p-4">
        <h3 className="text-blue-400 text-xs font-bold mb-3 flex items-center gap-2">
            <Hash className="w-4 h-4" /> 精选18码
        </h3>
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {prediction.numbers_18.map((num, i) => (
                <div key={i} className="aspect-square rounded-lg bg-slate-800/80 flex items-center justify-center border border-slate-700 text-slate-200 font-mono font-bold text-sm shadow-inner">
                    {num}
                </div>
            ))}
        </div>
      </section>

      {/* 3. 头数 / 尾数 / 波色 Grid */}
      <div className="grid grid-cols-2 gap-3">
          {/* 头数 */}
          <div className="glass-panel rounded-2xl p-4">
             <h3 className="text-slate-400 text-xs font-bold mb-2 flex items-center gap-1">
                <Layers className="w-3 h-3" /> 推荐头数
             </h3>
             <div className="flex flex-wrap gap-2">
                 {prediction.heads.map((h, i) => (
                     <span key={i} className="text-sm font-bold bg-slate-700/50 text-slate-200 px-2 py-1 rounded border border-slate-600">
                        {h}头
                     </span>
                 ))}
             </div>
          </div>

           {/* 尾数 */}
           <div className="glass-panel rounded-2xl p-4">
             <h3 className="text-slate-400 text-xs font-bold mb-2 flex items-center gap-1">
                <Layers className="w-3 h-3" /> 推荐尾数
             </h3>
             <div className="flex flex-wrap gap-2">
                 {prediction.tails.map((t, i) => (
                     <span key={i} className="text-sm font-bold bg-slate-700/50 text-slate-200 px-2 py-1 rounded border border-slate-600">
                        {t}尾
                     </span>
                 ))}
             </div>
          </div>
      </div>

       {/* 波色 */}
      <section className="glass-panel rounded-2xl p-4 flex items-center justify-between">
           <h3 className="text-slate-400 text-xs font-bold flex items-center gap-2">
                <Palette className="w-4 h-4" /> 推荐波色
           </h3>
           <div className="flex gap-3">
               {prediction.colors.map((c, i) => (
                   <div key={i} className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2
                       ${c === 'red' ? 'bg-red-500 text-white shadow-red-900/20' : 
                         c === 'blue' ? 'bg-blue-500 text-white shadow-blue-900/20' : 
                         'bg-emerald-500 text-white shadow-emerald-900/20'}`}>
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        {COLOR_NAMES[c as 'red'|'blue'|'green']}波
                   </div>
               ))}
           </div>
      </section>
      
      <div className="p-4 flex items-start gap-3 opacity-50">
        <AlertCircle className="text-slate-500 w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          所有预测数据由后台智能算法生成，仅供娱乐参考，请勿沉迷。
        </p>
      </div>
    </div>
  );
};
