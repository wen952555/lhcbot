
import React from 'react';
import { History } from 'lucide-react';
import { DrawResult } from '../types';
import Ball from '../components/Ball';
import { NUMBER_MAP, COLOR_NAMES } from '../constants';

interface HistoryPanelProps {
  history: DrawResult[];
  lotteryName: string;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, lotteryName }) => {
  return (
    <section className="glass-panel rounded-3xl overflow-hidden">
      <div className="p-8 pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <History className="text-emerald-400" /> 实况开奖详情 ({lotteryName})
        </h2>
      </div>
      <div className="overflow-x-auto">
        {history.length > 0 ? (
          <table className="w-full text-left">
            <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">期号</th>
                <th className="px-6 py-4 font-medium">开奖号码 (生肖)</th>
                <th className="px-6 py-4 font-medium">特码 (波色)</th>
                <th className="px-6 py-4 font-medium">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {history.map((draw, i) => {
                const spInfo = NUMBER_MAP[draw.specialNumber];
                return (
                  <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-6 font-mono text-amber-200 text-sm">{draw.drawNumber}</td>
                    <td className="px-6 py-6">
                      <div className="flex gap-2">
                        {draw.numbers.map((n, idx) => (
                          <Ball key={idx} number={n} size="sm" />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <Ball number={draw.specialNumber} size="sm" isSpecial />
                        <div className="flex flex-col text-[10px]">
                          <span className="text-slate-300 font-bold">{spInfo?.zodiac}</span>
                          <span className={spInfo?.color ? (COLOR_NAMES[spInfo.color] ? (spInfo.color === 'red' ? 'text-red-400' : spInfo.color === 'blue' ? 'text-blue-400' : 'text-emerald-400') : '') : ''}>
                             {spInfo?.color ? COLOR_NAMES[spInfo.color] : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-slate-500 text-xs">{draw.date.split(' ')[0]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-20 text-center text-slate-500">
            暂无数据，请前往预测页面抓取
          </div>
        )}
      </div>
    </section>
  );
};
