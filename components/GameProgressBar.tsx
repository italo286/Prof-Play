import React from 'react';

interface GameProgressBarProps {
  current: number;
  total: number;
}

export const GameProgressBar: React.FC<GameProgressBarProps> = ({ current, total }) => {
  const displayCurrent = Math.min(current, total);
  const percentage = total > 0 ? (displayCurrent / total) * 100 : 0;

  return (
    <div className="my-4 w-full">
        <div className="w-full bg-slate-700 rounded-full h-4 shadow-inner relative">
            <div 
                className="bg-gradient-to-r from-green-400 to-sky-500 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
            >
            </div>
             <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                Desafio {displayCurrent} / {total}
             </span>
        </div>
    </div>
  );
};