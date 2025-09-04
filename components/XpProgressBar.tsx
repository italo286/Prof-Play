import React from 'react';
import { getXpForNextLevel } from '../contexts/ProfileContext';

interface XpProgressBarProps {
  currentXp: number;
  level: number;
}

export const XpProgressBar: React.FC<XpProgressBarProps> = ({ currentXp, level }) => {
  const xpForCurrentLevel = level > 1 ? getXpForNextLevel(level - 1) : 0;
  const xpForNext = getXpForNextLevel(level);
  const xpInCurrentLevel = currentXp - xpForCurrentLevel;
  const xpNeededForNext = xpForNext - xpForCurrentLevel;
  const percentage = xpNeededForNext > 0 ? (xpInCurrentLevel / xpNeededForNext) * 100 : 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 text-sm font-medium text-sky-300">
        <span>Nível {level}</span>
        <span>
          {currentXp.toLocaleString()} / {xpForNext.toLocaleString()} XP
        </span>
        <span>Nível {level + 1}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-4 shadow-inner">
        <div
          className="bg-gradient-to-r from-green-400 to-sky-500 h-4 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
