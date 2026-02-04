
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DrawResult, NumberFrequency } from '../types.ts';
import { getNumberColor } from '../constants.tsx';

interface FrequencyChartProps {
  history: DrawResult[];
}

const FrequencyChart: React.FC<FrequencyChartProps> = ({ history }) => {
  const calculateFrequency = (): NumberFrequency[] => {
    const counts: Record<number, number> = {};
    if (!history) return [];
    
    history.forEach(draw => {
      const allNums = [...(draw.numbers || []), draw.specialNumber];
      allNums.forEach(num => {
        if (num) counts[num] = (counts[num] || 0) + 1;
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="number" 
            stroke="#94a3b8" 
            fontSize={10}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            itemStyle={{ color: '#1e293b', fontSize: '12px' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} className={getNumberColor(entry.number)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FrequencyChart;
