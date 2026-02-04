
import React from 'react';
import { Trophy, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { DrawResult, PredictionHistoryItem } from '../types';
import { NUMBER_MAP } from '../constants';

interface PredictionHistoryListProps {
  predictions: PredictionHistoryItem[];
  drawHistory: DrawResult[];
}

export const PredictionHistoryList: React.FC<PredictionHistoryListProps> = ({ predictions, drawHistory }) => {
  if (predictions.length === 0) return (
      <div className="text-center py-8 text-slate-400 text-xs">
          暂无预测记录
      </div>
  );

  // 计算准率 (最近20期)
  const stats = (() => {
      const recent = predictions.slice(0, 20);
      let wins = 0;
      let checked = 0;
      recent.forEach(p => {
          const draw = drawHistory.find(d => d.drawNumber === p.drawNumber);
          if (draw) {
              checked++;
              const z = NUMBER_MAP[draw.specialNumber]?.zodiac;
              if (z && p.prediction.zodiacs.includes(z)) wins++;
          }
      });
      return { 
          rate: checked > 0 ? Math.round((wins / checked) * 100) : 0,
          total: checked,
          wins: wins
      };
  })();

  return (
    <div className="pb-8 space-y-4">
      {/* 胜率统计卡片 */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 text-white shadow-xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  <TrendingUp className="text-amber-500 w-6 h-6" />
              </div>
              <div>
                  <h4 className="text-amber-400 font-bold text-sm">近期算法准率</h4>
                  <p className="text-[10px] text-slate-400">基于最近 {stats.total} 期开奖校验</p>
              </div>
          </div>
          <div className="text-right">
              <span className="text-3xl font-black text-white">{stats.rate}%</span>
              <p className="text-[10px] text-emerald-400 font-bold">已连准 {stats.wins} 期</p>
          </div>
      </div>

      <div className="space-y-3">
        {predictions.map((pred, i) => {
           const drawResult = drawHistory.find(d => d.drawNumber === pred.drawNumber);
           let status: 'pending' | 'win' | 'loss' = 'pending';
           let resultZodiac = '-';

           if (drawResult) {
               const spInfo = NUMBER_MAP[drawResult.specialNumber];
               resultZodiac = spInfo?.zodiac || '?';
               if (pred.prediction.zodiacs.includes(resultZodiac)) {
                   status = 'win';
               } else {
                   status = 'loss';
               }
           }

           return (
            <div key={i} className={`glass-card p-3 rounded-xl flex items-center justify-between relative overflow-hidden transition-all border ${status === 'win' ? 'border-emerald-500/30' : 'border-slate-200'}`}>
               {status === 'win' && (
                   <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/5 rounded-full blur-2xl"></div>
               )}

              <div className="flex flex-col gap-1 w-16 flex-shrink-0 border-r border-slate-200 pr-2">
                <span className={`font-mono text-xs font-bold ${status === 'win' ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {pred.drawNumber}期
                </span>
                <span className="text-slate-400 text-[9px]">
                    {new Date(pred.timestamp).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}
                </span>
              </div>
              
              <div className="flex-1 px-4">
                  <div className="flex gap-1 flex-wrap mb-1">
                      {pred.prediction.zodiacs.slice(0, 6).map((z, idx) => (
                          <span key={idx} className={`text-[10px] w-6 h-6 flex items-center justify-center rounded-full shadow-sm transition-all ${z === resultZodiac ? 'bg-amber-500 text-white font-bold scale-110 shadow-amber-500/40 ring-2 ring-white' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                              {z}
                          </span>
                      ))}
                  </div>
                  <div className="text-[9px] text-slate-400 flex gap-2">
                      <span className="bg-slate-100 px-1 rounded">推荐{pred.prediction.colors.length}波</span>
                      <span className="bg-slate-100 px-1 rounded">精选18码</span>
                  </div>
              </div>

              <div className="flex flex-col items-center justify-center w-10 flex-shrink-0 pl-2 border-l border-slate-200">
                 {status === 'pending' ? (
                     <span className="text-[10px] text-slate-400 font-medium">待开</span>
                 ) : status === 'win' ? (
                     <>
                        <Trophy className="w-5 h-5 text-amber-500 mb-0.5 animate-bounce" />
                        <span className="text-[9px] text-emerald-600 font-black">收割</span>
                     </>
                 ) : (
                     <>
                        <XCircle className="w-5 h-5 text-slate-300 mb-0.5" />
                        <span className="text-[9px] text-slate-400">遗漏</span>
                     </>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
