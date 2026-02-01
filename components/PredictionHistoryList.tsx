
import React from 'react';
import { Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { DrawResult, PredictionHistoryItem } from '../types';
import { NUMBER_MAP } from '../constants';

interface PredictionHistoryListProps {
  predictions: PredictionHistoryItem[];
  drawHistory: DrawResult[];
}

export const PredictionHistoryList: React.FC<PredictionHistoryListProps> = ({ predictions, drawHistory }) => {
  if (predictions.length === 0) return (
      <div className="text-center py-8 text-slate-500 text-xs">
          暂无预测记录
      </div>
  );

  return (
    <div className="pb-8">
      <div className="space-y-3">
        {predictions.map((pred, i) => {
           // Find corresponding draw result
           const drawResult = drawHistory.find(d => d.drawNumber === pred.drawNumber);
           
           let status: 'pending' | 'win' | 'loss' = 'pending';
           let resultZodiac = '-';

           if (drawResult) {
               const spInfo = NUMBER_MAP[drawResult.specialNumber];
               resultZodiac = spInfo?.zodiac || '?';
               // Check if predicted zodiacs include the result zodiac
               if (pred.prediction.zodiacs.includes(resultZodiac)) {
                   status = 'win';
               } else {
                   status = 'loss';
               }
           }

           return (
            <div key={i} className="glass-card p-3 rounded-xl flex items-center justify-between relative overflow-hidden">
               {status === 'win' && (
                   <div className="absolute -right-2 -top-2 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl"></div>
               )}

              <div className="flex flex-col gap-1 w-16 flex-shrink-0 border-r border-slate-700/50 pr-2">
                <span className="text-slate-300 font-mono text-xs font-bold">{pred.drawNumber}</span>
                <span className="text-slate-600 text-[9px]">
                    {new Date(pred.timestamp).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex-1 px-4">
                  <div className="flex gap-1 flex-wrap mb-1">
                      {pred.prediction.zodiacs.slice(0, 6).map((z, idx) => (
                          <span key={idx} className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full ${z === resultZodiac ? 'bg-amber-500 text-white font-bold' : 'bg-slate-700 text-slate-400'}`}>
                              {z}
                          </span>
                      ))}
                  </div>
                  <div className="text-[9px] text-slate-500 flex gap-2">
                      <span>{pred.prediction.colors.map(c => c==='red'?'红':c==='blue'?'蓝':'绿').join('')}波</span>
                      <span>{pred.prediction.heads.join('')}头</span>
                  </div>
              </div>

              <div className="flex flex-col items-center justify-center w-10 flex-shrink-0 pl-2 border-l border-slate-700/50">
                 {status === 'pending' ? (
                     <span className="text-[10px] text-slate-500">待开</span>
                 ) : status === 'win' ? (
                     <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-0.5" />
                        <span className="text-[9px] text-emerald-500 font-bold">准</span>
                     </>
                 ) : (
                     <>
                        <XCircle className="w-5 h-5 text-red-500 mb-0.5" />
                        <span className="text-[9px] text-red-500 font-bold">错</span>
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
