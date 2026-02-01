
import React from 'react';
import { BarChart3 } from 'lucide-react';
import { DrawResult } from '../types';
import FrequencyChart from '../components/FrequencyChart';

interface StatisticsPanelProps {
  history: DrawResult[];
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ history }) => {
  return (
    <section className="glass-panel rounded-3xl p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 className="text-blue-400" /> 号码出球频率分析
      </h2>
      {history.length > 0 ? (
        <FrequencyChart history={history} />
      ) : (
        <div className="py-20 text-center text-slate-500">
          请先在“预测”页面点击分析以获取实时数据
        </div>
      )}
    </section>
  );
};
