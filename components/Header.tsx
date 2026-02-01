
import React from 'react';
import { TrendingUp } from 'lucide-react';

export const Header: React.FC = () => (
  <header className="py-8 text-center">
    <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
      <TrendingUp className="text-white w-8 h-8" />
    </div>
    <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500">
      六合 AI 预测大师
    </h1>
    <p className="text-slate-400 mt-2 text-lg">2025 蛇年版 · 实时生肖波色同步分析</p>
  </header>
);
