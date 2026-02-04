
import React from 'react';
import { getNumberColor, NUMBER_MAP } from '../constants.tsx';

interface BallProps {
  number: number;
  isSpecial?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showZodiac?: boolean;
}

const Ball: React.FC<BallProps> = ({ number, isSpecial = false, size = 'md', showZodiac = true }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base font-bold',
    lg: 'w-16 h-16 text-2xl font-bold'
  };

  const info = NUMBER_MAP[number];
  const formattedNumber = number.toString().padStart(2, '0');
  const baseColor = getNumberColor(number);

  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className={`${sizeClasses[size]} ${baseColor} rounded-full flex items-center justify-center text-white shadow-md lottery-ball transform transition-all group-hover:scale-110 cursor-default border-t border-white/40 relative`}>
        {formattedNumber}
      </div>
      {showZodiac && info && (
        <span className={`text-[10px] font-bold ${info.color === 'red' ? 'text-red-500' : info.color === 'blue' ? 'text-blue-500' : 'text-emerald-600'}`}>
          {info.zodiac}
        </span>
      )}
    </div>
  );
};

export default Ball;
