
import React from 'react';
import { BarChart3 } from 'lucide-react';
import { DrawResult } from '../types.ts';
import FrequencyChart from '../components/FrequencyChart.tsx';

interface StatisticsPanelProps {
  history: DrawResult[];
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ history }) => {
  return (
    <section className="glass-panel rounded-2xl p-5 shadow-sm">
      <h3 className="text-slate-700 text-xs font-black flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-blue-500" /> 号码出球频率分析 (近500期)
      </h3>
      {history.length > 0 ? (
        <FrequencyChart history={history} />
      ) : (
        <div className="py-10 text-center text-slate-400 text-xs">
          暂无数据
        </div>
      )}
    </section>
  );
};
