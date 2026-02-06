
import React from 'react';
import { DrawResult, PredictionHistoryItem } from '../types.ts';
import Ball from './Ball.tsx';
import { NUMBER_MAP } from '../constants.tsx';

interface HistoryListProps {
  history: DrawResult[];
  predictions: PredictionHistoryItem[];
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, predictions = [] }) => {
  if (!history || history.length <= 1) return (
      <div className="text-center py-8 text-slate-400 text-xs">
          暂无更多历史记录
      </div>
  );

  const pastDraws = history.slice(1);

  return (
      <div className="space-y-3 pb-8">
        {pastDraws.map((draw, i) => {
           const spInfo = NUMBER_MAP[draw.specialNumber];
           const dateStr = draw.date ? draw.date.split(' ')[0] : '--';
           
           // 查找对应预测
           const predItem = predictions.find(p => p.drawNumber === draw.drawNumber);
           const hitBadges: string[] = [];
           
           if (predItem && spInfo) {
               const p = predItem.prediction;
               const num = draw.specialNumber;
               
               if (p.zodiacs.includes(spInfo.zodiac)) hitBadges.push("六肖中");
               if (p.numbers_18.includes(num)) hitBadges.push("18码中");
               if (p.colors.includes(spInfo.color)) hitBadges.push("波色中");
               if (p.heads.includes(Math.floor(num / 10))) hitBadges.push("头数中");
               if (p.tails.includes(num % 10)) hitBadges.push("尾数中");
           }

           return (
            <div key={i} className="glass-card p-3 rounded-xl flex flex-col gap-2 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1 w-16 flex-shrink-0">
                    <span className="text-amber-600 font-mono text-xs font-bold">{draw.drawNumber}期</span>
                    <span className="text-slate-400 text-[10px]">{dateStr}</span>
                </div>
                
                <div className="flex gap-1">
                    {draw.numbers.map((n, idx) => (
                    <Ball key={idx} number={n} size="sm" showZodiac={false} />
                    ))}
                </div>

                <div className="w-px h-6 bg-slate-300 mx-2"></div>

                <div className="flex flex-col items-center w-8 flex-shrink-0">
                    <Ball number={draw.specialNumber} size="sm" isSpecial showZodiac={false} />
                    <span className="text-[9px] scale-75 mt-0.5 text-slate-500 font-medium">
                        {spInfo?.zodiac}
                    </span>
                </div>
              </div>

              {/* 战绩显示区域 */}
              {predItem && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 items-center">
                      <span className="text-[10px] text-slate-400">预测战绩:</span>
                      {hitBadges.length > 0 ? (
                          hitBadges.map((badge, idx) => (
                             <span key={idx} className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                {badge}
                             </span>
                          ))
                      ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">未中</span>
                      )}
                  </div>
              )}
            </div>
          );
        })}
      </div>
  );
};
