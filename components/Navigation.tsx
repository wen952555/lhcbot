
import React from 'react';
import { Sparkles, BarChart3, History } from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => (
  <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-panel border border-slate-700/50 px-8 py-3 rounded-full z-50 shadow-2xl flex gap-12">
    <button onClick={() => onTabChange(TabType.PREDICT)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === TabType.PREDICT ? 'text-amber-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}>
      <Sparkles className="w-5 h-5" />
      <span className="text-[9px] font-bold">预测</span>
    </button>
    <button onClick={() => onTabChange(TabType.STATS)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === TabType.STATS ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}>
      <BarChart3 className="w-5 h-5" />
      <span className="text-[9px] font-bold">统计</span>
    </button>
    <button onClick={() => onTabChange(TabType.HISTORY)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === TabType.HISTORY ? 'text-emerald-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}>
      <History className="w-5 h-5" />
      <span className="text-[9px] font-bold">历史</span>
    </button>
  </nav>
);
