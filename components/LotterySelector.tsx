
import React from 'react';
import { LotteryConfig } from '../types';

interface LotterySelectorProps {
  configs: LotteryConfig[];
  selected: LotteryConfig;
  onSelect: (config: LotteryConfig) => void;
}

export const LotterySelector: React.FC<LotterySelectorProps> = ({ configs, selected, onSelect }) => (
  <div className="flex justify-center mb-8">
    <div className="glass-panel p-1 rounded-2xl flex gap-1 flex-wrap justify-center">
      {configs.map((lottery) => (
        <button
          key={lottery.id}
          onClick={() => onSelect(lottery)}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            selected.id === lottery.id 
              ? 'bg-amber-500 text-white shadow-lg' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          {lottery.name}
        </button>
      ))}
    </div>
  </div>
);
