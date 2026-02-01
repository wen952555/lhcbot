
import React from 'react';
import { Clock } from 'lucide-react';
import { DrawResult } from '../types';
import Ball from './Ball';
import { NUMBER_MAP, COLOR_NAMES } from '../constants';

interface HistoryListProps {
  history: DrawResult[];
}

export const HistoryList: React.FC<HistoryListProps> = ({ history }) => {
  if (history.length <= 1) return null; // Hide if only 1 (shown in latest) or 0

  // Skip the first one as it is shown in LatestDraw
  const pastDraws = history.slice(1);

  return (
    <div className="mx-4 mt-6 pb-8">
      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        历史记录
      </h3>
      <div className="space-y-2">
        {pastDraws.map((draw, i) => {
           const spInfo = NUMBER_MAP[draw.specialNumber];
           return (
            <div key={i} className="glass-card p-3 rounded-xl flex items-center justify-between">
              <div className="flex flex-col gap-1 w-16 flex-shrink-0">
                <span className="text-amber-500 font-mono text-xs font-bold">{draw.drawNumber}</span>
                <span className="text-slate-600 text-[10px]">{draw.date.split(' ')[0]}</span>
              </div>
              
              <div className="flex gap-1">
                {draw.numbers.map((n, idx) => (
                  <Ball key={idx} number={n} size="sm" showZodiac={false} />
                ))}
              </div>

              <div className="w-px h-6 bg-slate-700 mx-2"></div>

              <div className="flex flex-col items-center w-8 flex-shrink-0">
                 <Ball number={draw.specialNumber} size="sm" isSpecial showZodiac={false} />
                 <span className="text-[9px] scale-75 mt-0.5 text-slate-400">
                    {spInfo?.zodiac}
                 </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
