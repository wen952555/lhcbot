
import React from 'react';
import { LotteryConfig } from '../types';

interface LotteryTabsProps {
  configs: LotteryConfig[];
  selected: LotteryConfig;
  onSelect: (config: LotteryConfig) => void;
}

export const LotteryTabs: React.FC<LotteryTabsProps> = ({ configs, selected, onSelect }) => (
  <div className="sticky top-0 z-50 bg-[#0f172a] pt-2 pb-2 px-4 border-b border-white/5">
    <div className="flex bg-slate-800/50 p-1 rounded-xl">
      {configs.map((lottery) => (
        <button
          key={lottery.id}
          onClick={() => onSelect(lottery)}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            selected.id === lottery.id 
              ? 'bg-amber-500 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {lottery.name}
        </button>
      ))}
    </div>
  </div>
);
