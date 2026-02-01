
import React from 'react';
import { getNumberColor } from '../constants';

interface BallProps {
  number: number;
  isSpecial?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Ball: React.FC<BallProps> = ({ number, isSpecial = false, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl font-bold'
  };

  const baseColor = isSpecial ? 'bg-purple-600' : getNumberColor(number);

  return (
    <div className={`${sizeClasses[size]} ${baseColor} rounded-full flex items-center justify-center text-white shadow-xl lottery-ball transform transition-transform hover:scale-110 cursor-default border-t border-white/20`}>
      {number}
    </div>
  );
};

export default Ball;
