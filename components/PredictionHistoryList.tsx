
import React from 'react';
import { Trophy, TrendingUp, Target, Hash, Palette, Layers } from 'lucide-react';
import { DrawResult, PredictionHistoryItem } from '../types.ts';
import { NUMBER_MAP } from '../constants.tsx';
import Ball from './Ball.tsx';

interface PredictionHistoryListProps {
  predictions: PredictionHistoryItem[];
  drawHistory: DrawResult[];
}

export const PredictionHistoryList: React.FC<PredictionHistoryListProps> = ({ predictions, drawHistory }) => {
  if (!predictions || predictions.length === 0) return (
      <div className="text-center py-8 text-slate-400 text-xs">
          暂无预测记录
      </div>
  );

  // 计算综合胜率
  const stats = (() => {
      const recent = predictions.slice(0, 20); // 只看最近20期
      let total = 0;
      let wins = { zodiac: 0, num18: 0, color: 0 };
      
      recent.forEach(p => {
          const draw = drawHistory.find(d => d.drawNumber === p.drawNumber);
          if (draw) {
              total++;
              const sp = draw.specialNumber;
              const info = NUMBER_MAP[sp];
              
              if (info && p.prediction.zodiacs.includes(info.zodiac)) wins.zodiac++;
              if (p.prediction.numbers_18.includes(sp)) wins.num18++;
              if (info && p.prediction.colors.includes(info.color)) wins.color++;
          }
      });

      return { 
          total,
          zodiacRate: total > 0 ? Math.round((wins.zodiac / total) * 100) : 0,
          num18Rate: total > 0 ? Math.round((wins.num18 / total) * 100) : 0,
          colorRate: total > 0 ? Math.round((wins.color / total) * 100) : 0,
      };
  })();

  const renderBadge = (label: string, isHit: boolean, pending: boolean, icon?: React.ReactNode) => {
      if (pending) return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-400 border border-slate-200">
           {label} 待开
        </span>
      );

      return (
        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all
            ${isHit 
                ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' 
                : 'bg-slate-50 text-slate-400 border-slate-100 opacity-70 grayscale'
            }`}>
            {icon && <span className="w-2.5 h-2.5">{icon}</span>}
            {label} {isHit ? '中' : '✕'}
        </span>
      );
  };

  return (
    <div className="pb-8 space-y-4">
      {/* 顶部统计仪表盘 */}
      <div className="bg-slate-800 rounded-2xl p-4 text-white shadow-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-amber-500 w-4 h-4" />
              <h4 className="text-sm font-bold text-slate-200">近 {stats.total} 期 玩法胜率概览</h4>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-700/50 rounded-xl p-2 border border-slate-600">
                  <div className="text-[10px] text-slate-400 mb-1">六肖</div>
                  <div className={`text-lg font-black ${stats.zodiacRate >= 60 ? 'text-red-400' : 'text-white'}`}>
                      {stats.zodiacRate}%
                  </div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-2 border border-slate-600">
                  <div className="text-[10px] text-slate-400 mb-1">18码</div>
                  <div className={`text-lg font-black ${stats.num18Rate >= 50 ? 'text-amber-400' : 'text-white'}`}>
                      {stats.num18Rate}%
                  </div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-2 border border-slate-600">
                  <div className="text-[10px] text-slate-400 mb-1">波色</div>
                  <div className={`text-lg font-black ${stats.colorRate >= 60 ? 'text-emerald-400' : 'text-white'}`}>
                      {stats.colorRate}%
                  </div>
              </div>
          </div>
      </div>

      {/* 详细列表 */}
      <div className="space-y-3">
        {predictions.map((pred, i) => {
           const drawResult = drawHistory.find(d => d.drawNumber === pred.drawNumber);
           const sp = drawResult ? drawResult.specialNumber : 0;
           const spInfo = NUMBER_MAP[sp];
           const pending = !drawResult;

           // 计算各板块是否命中
           const hits = {
               zodiac: !pending && spInfo && pred.prediction.zodiacs.includes(spInfo.zodiac),
               num18: !pending && pred.prediction.numbers_18.includes(sp),
               color: !pending && spInfo && pred.prediction.colors.includes(spInfo.color),
               head: !pending && pred.prediction.heads.includes(Math.floor(sp / 10)),
               tail: !pending && pred.prediction.tails.includes(sp % 10),
           };

           // 综合判断是否"大中" (核心六肖或18码中)
           const isBigWin = hits.zodiac || hits.num18;

           return (
            <div key={i} className={`glass-card rounded-xl overflow-hidden transition-all border ${isBigWin ? 'border-red-500/30 shadow-red-500/5' : 'border-slate-200'}`}>
              {/* 头部：期数与开奖结果 */}
              <div className="bg-slate-50/50 p-3 flex items-center justify-between border-b border-slate-100">
                 <div className="flex items-center gap-2">
                     <span className="font-mono text-sm font-bold text-slate-700">{pred.drawNumber}期</span>
                     <span className="text-[10px] text-slate-400">{new Date(pred.timestamp).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}</span>
                 </div>
                 
                 {pending ? (
                     <span className="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded">待开奖</span>
                 ) : (
                     <div className="flex items-center gap-2">
                         <span className="text-[10px] text-slate-500">特码:</span>
                         <div className="scale-75 origin-right">
                            <Ball number={sp} size="sm" isSpecial />
                         </div>
                     </div>
                 )}
              </div>
              
              {/* 命中详情标签云 */}
              <div className="p-3">
                  <div className="flex flex-wrap gap-2">
                      {renderBadge('六肖', !!hits.zodiac, pending, <Trophy />)}
                      {renderBadge('18码', !!hits.num18, pending, <Target />)}
                      {renderBadge('波色', !!hits.color, pending, <Palette />)}
                      {renderBadge('头数', !!hits.head, pending, <Layers />)}
                      {renderBadge('尾数', !!hits.tail, pending, <Hash />)}
                  </div>

                  {/* 失败提示 (仅当全部未中时显示) */}
                  {!pending && !Object.values(hits).some(Boolean) && (
                      <div className="mt-2 text-[10px] text-slate-300 text-center">
                          本期算法失准，均值回归中...
                      </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
