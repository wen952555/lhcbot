
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DrawResult, NumberFrequency } from '../types';
import { getNumberColor } from '../constants';

interface FrequencyChartProps {
  history: DrawResult[];
}

const FrequencyChart: React.FC<FrequencyChartProps> = ({ history }) => {
  const calculateFrequency = (): NumberFrequency[] => {
    const counts: Record<number, number> = {};
    history.forEach(draw => {
      [...draw.numbers, draw.specialNumber].forEach(num => {
        counts[num] = (counts[num] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([num, count]) => ({ number: parseInt(num), count }))
      .sort((a, b) => a.number - b.number);
  };

  const data = calculateFrequency();

  return (
    <div className="h-[400px] w-full mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="number" 
            stroke="#94a3b8" 
            fontSize={12}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#f8fafc' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} className={getNumberColor(entry.number).replace('bg-', 'fill-')} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FrequencyChart;
