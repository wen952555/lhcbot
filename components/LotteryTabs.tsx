import React from 'react';
import { LotteryConfig } from '../types';

interface LotteryTabsProps {
  configs: LotteryConfig[];
  selected: LotteryConfig;
  onSelect: (config: LotteryConfig) => void;
}

export const LotteryTabs: React.FC<LotteryTabsProps> = ({ configs, selected, onSelect }) => (
  <div className="sticky top-0 z-50 bg-slate-100 pt-2 pb-2 px-4 border-b border-slate-200/60 backdrop-blur-sm bg-opacity-90">
    <div className="flex bg-slate-200/70 p-1 rounded-xl">
      {configs.map((lottery) => (
        <button
          key={lottery.id}
          onClick={() => onSelect(lottery)}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            selected.id === lottery.id 
              ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {lottery.name}
        </button>
      ))}
    </div>
  </div>
);