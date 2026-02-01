
import React from 'react';
import { TrendingUp } from 'lucide-react';

export const Header: React.FC = () => (
  <header className="py-4 text-center">
    <div className="inline-flex items-center justify-center gap-2 text-slate-400">
      <TrendingUp className="w-4 h-4 text-amber-500" />
      <span className="text-xs font-medium tracking-widest">六合助手</span>
    </div>
  </header>
);
