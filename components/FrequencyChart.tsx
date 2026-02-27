
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DrawResult, NumberFrequency } from '../types.ts';
import { NUMBER_MAP } from '../constants.tsx';

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

  const getHexColor = (num: number) => {
      const color = NUMBER_MAP[num]?.color;
      if (color === 'red') return '#ef4444'; // red-500
      if (color === 'blue') return '#3b82f6'; // blue-500
      if (color === 'green') return '#10b981'; // emerald-500
      return '#64748b'; // slate-500
  };

  return (
    <div className="h-[250px] w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis 
            dataKey="number" 
            stroke="#cbd5e1" 
            fontSize={9}
            tick={{ fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="#cbd5e1" 
            fontSize={9} 
            tick={{ fill: '#94a3b8' }} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            itemStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#64748b', fontSize: '10px' }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getHexColor(entry.number)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FrequencyChart;
