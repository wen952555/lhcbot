
import React from 'react';
import { DrawResult, PredictionHistoryItem } from '../types.ts';
import Ball from './Ball.tsx';
import { NUMBER_MAP, getZodiacByYear } from '../constants.ts';
import { Trophy } from 'lucide-react';

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
           const dateStr = draw.date ? draw.date.split(' ')[0] : '--';
           
           // Calculate dynamic zodiac for the special number based on its date
           const spZodiac = getZodiacByYear(draw.specialNumber, draw.date);
           const spInfo = NUMBER_MAP[draw.specialNumber];

           // 查找对应预测
           const predItem = predictions.find(p => p.drawNumber === draw.drawNumber);
           const hitBadges: string[] = [];
           
           if (predItem && spInfo && predItem.prediction && predItem.prediction.zodiacs) {
               const p = predItem.prediction;
               const num = draw.specialNumber;
               
               // Check Zodiac Hit using the dynamic zodiac
               if (p.zodiacs.slice(0, 1).includes(spZodiac)) hitBadges.push("一肖中");
               if (p.numbers_8 && p.numbers_8.includes(num)) hitBadges.push("8码中");
               if (p.numbers_18 && p.numbers_18.includes(num)) hitBadges.push("18码中");
               if (p.colors && p.colors.includes(spInfo.color)) hitBadges.push("波色中");
               if (p.heads && p.heads.includes(Math.floor(num / 10))) hitBadges.push("头数中");
               if (p.tails && p.tails.includes(num % 10)) hitBadges.push("尾数中");
           }

           return (
            <div key={i} className="glass-card p-3.5 rounded-2xl flex flex-col gap-3 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1 w-16 flex-shrink-0">
                    <span className="text-slate-800 font-mono text-xs font-black">{draw.drawNumber}期</span>
                    <span className="text-slate-400 text-[10px]">{dateStr}</span>
                </div>
                
                <div className="flex gap-1 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100/50">
                    {draw.numbers.map((n, idx) => (
                    <Ball key={idx} number={n} size="sm" showZodiac={false} date={draw.date} />
                    ))}
                </div>

                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                <div className="flex flex-col items-center w-8 flex-shrink-0">
                    <Ball number={draw.specialNumber} size="sm" isSpecial showZodiac={false} date={draw.date} />
                    <span className="text-[9px] scale-75 mt-0.5 text-slate-500 font-bold">
                        {spZodiac}
                    </span>
                </div>
              </div>

              {/* 战绩显示区域 */}
              {predItem && (
                  <div className="flex flex-wrap gap-2 pt-2.5 border-t border-slate-100 items-center">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-500" />
                          预测战绩:
                      </span>
                      {hitBadges.length > 0 ? (
                          hitBadges.map((badge, idx) => (
                             <span key={idx} className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 shadow-sm">
                                {badge}
                             </span>
                          ))
                      ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">未中</span>
                      )}
                  </div>
              )}
            </div>
          );
        })}
      </div>
  );
};
