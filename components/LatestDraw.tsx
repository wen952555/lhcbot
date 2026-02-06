
import React from 'react';
import { DrawResult, PredictionResult } from '../types.ts';
import Ball from './Ball.tsx';
import { NUMBER_MAP } from '../constants.tsx';

interface LatestDrawProps {
  draw: DrawResult | null;
  prediction?: PredictionResult;
  isLoading: boolean;
}

export const LatestDraw: React.FC<LatestDrawProps> = ({ draw, prediction, isLoading }) => {
  if (isLoading && !draw) {
    return (
      <div className="mx-4 mt-4 p-4 glass-card rounded-2xl h-32 flex items-center justify-center animate-pulse">
        <span className="text-slate-400 text-xs">加载最新开奖...</span>
      </div>
    );
  }

  if (!draw) {
    return (
      <div className="mx-4 mt-4 p-4 glass-card rounded-2xl text-center">
        <span className="text-slate-400 text-xs">暂无数据，请点击下方预测获取</span>
      </div>
    );
  }

  // 计算本期战绩
  const hitBadges: string[] = [];
  if (prediction) {
      const spInfo = NUMBER_MAP[draw.specialNumber];
      const p = prediction;
      const num = draw.specialNumber;

      if (spInfo && p.zodiacs.includes(spInfo.zodiac)) hitBadges.push("六肖中");
      if (p.numbers_18.includes(num)) hitBadges.push("18码中");
      if (spInfo && p.colors.includes(spInfo.color)) hitBadges.push("波色中");
      if (p.heads.includes(Math.floor(num / 10))) hitBadges.push("头数中");
      if (p.tails.includes(num % 10)) hitBadges.push("尾数中");
  }

  return (
    <div className="mx-4 mt-4 p-5 glass-card rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 opacity-5">
        <span className="text-6xl font-bold text-slate-900">{draw.drawNumber}</span>
      </div>
      
      <div className="flex justify-between items-end mb-4 relative z-10">
        <div>
          <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider">最新开奖</h3>
          <p className="text-amber-500 font-mono font-bold text-lg">第 {draw.drawNumber} 期</p>
        </div>
        <span className="text-slate-500 text-[10px] bg-slate-200/80 px-2 py-1 rounded-full border border-slate-300/50">{draw.date}</span>
      </div>

      <div className="flex justify-between items-center relative z-10">
        <div className="flex gap-1.5 flex-wrap">
          {draw.numbers.map((n, idx) => (
            <Ball key={idx} number={n} size="sm" />
          ))}
        </div>
        <div className="h-8 w-px bg-slate-300 mx-2"></div>
        <Ball number={draw.specialNumber} size="sm" isSpecial />
      </div>

      {/* 战绩展示区域 */}
      {prediction && (
        <div className="relative z-10 mt-4 pt-3 border-t border-slate-200/50 flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-top-1 duration-500">
             <span className="text-[10px] text-slate-400">本期战绩:</span>
             {hitBadges.length > 0 ? (
                 hitBadges.map((badge, idx) => (
                     <span key={idx} className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 shadow-sm">
                        {badge}
                     </span>
                 ))
             ) : (
                 <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    未中
                 </span>
             )}
        </div>
      )}
    </div>
  );
};
