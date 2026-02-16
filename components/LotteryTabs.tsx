
import React from 'react';
import { LotteryConfig } from '../types.ts';

interface LotteryTabsProps {
  configs: LotteryConfig[];
  selected: LotteryConfig;
  onSelect: (config: LotteryConfig) => void;
}

export const LotteryTabs: React.FC<LotteryTabsProps> = ({ configs, selected, onSelect }) => (
  <div className="px-4 pb-3">
    <div className="flex bg-slate-200/50 p-1 rounded-xl">
      {configs.map((lottery) => (
        <button
          key={lottery.id}
          onClick={() => onSelect(lottery)}
          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
            selected.id === lottery.id 
              ? 'bg-white text-slate-800 shadow-sm shadow-slate-200' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {lottery.name}
        </button>
      ))}
    </div>
  </div>
);
