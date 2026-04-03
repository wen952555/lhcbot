
import React from 'react';
import { getNumberColor, NUMBER_MAP, getZodiacByYear } from '../constants.ts';

interface BallProps {
  number: number;
  isSpecial?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showZodiac?: boolean;
  date?: string; // Add date prop to calculate zodiac correctly
}

const Ball: React.FC<BallProps> = ({ number, isSpecial = false, size = 'md', showZodiac = true, date }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base font-bold',
    lg: 'w-16 h-16 text-2xl font-bold'
  };

  const info = NUMBER_MAP[number];
  const formattedNumber = number.toString().padStart(2, '0');
  const baseColor = getNumberColor(number);
  
  // Use getZodiacByYear with the specific date, or default to current date logic
  const displayZodiac = showZodiac ? getZodiacByYear(number, date) : '';

  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className={`${sizeClasses[size]} ${baseColor} rounded-full flex items-center justify-center text-white shadow-md lottery-ball transform transition-all group-hover:scale-110 cursor-default relative overflow-hidden`}>
        {/* Highlight effect for 3D look */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent rounded-full pointer-events-none" style={{ height: '50%' }}></div>
        <span className="relative z-10 drop-shadow-md">{formattedNumber}</span>
      </div>
      {showZodiac && info && (
        <span className={`text-[10px] font-bold ${info.color === 'red' ? 'text-red-500' : info.color === 'blue' ? 'text-blue-500' : 'text-emerald-600'}`}>
          {displayZodiac}
        </span>
      )}
    </div>
  );
};

export default Ball;
