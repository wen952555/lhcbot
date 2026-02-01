
import React from 'react';
import { DrawResult } from '../types';
import Ball from './Ball';

interface LatestDrawProps {
  draw: DrawResult | null;
  isLoading: boolean;
}

export const LatestDraw: React.FC<LatestDrawProps> = ({ draw, isLoading }) => {
  if (isLoading && !draw) {
    return (
      <div className="mx-4 mt-4 p-4 glass-card rounded-2xl h-32 flex items-center justify-center animate-pulse">
        <span className="text-slate-500 text-xs">加载最新开奖...</span>
      </div>
    );
  }

  if (!draw) {
    return (
      <div className="mx-4 mt-4 p-4 glass-card rounded-2xl text-center">
        <span className="text-slate-500 text-xs">暂无数据，请点击下方预测获取</span>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 p-5 glass-card rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 opacity-10">
        <span className="text-6xl font-bold text-white">{draw.drawNumber}</span>
      </div>
      
      <div className="flex justify-between items-end mb-4 relative z-10">
        <div>
          <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">最新开奖</h3>
          <p className="text-amber-400 font-mono font-bold text-lg">第 {draw.drawNumber} 期</p>
        </div>
        <span className="text-slate-500 text-[10px] bg-slate-800/80 px-2 py-1 rounded-full">{draw.date}</span>
      </div>

      <div className="flex justify-between items-center relative z-10">
        <div className="flex gap-1.5 flex-wrap">
          {draw.numbers.map((n, idx) => (
            <Ball key={idx} number={n} size="sm" />
          ))}
        </div>
        <div className="h-8 w-px bg-slate-700 mx-2"></div>
        <Ball number={draw.specialNumber} size="sm" isSpecial />
      </div>
    </div>
  );
};
