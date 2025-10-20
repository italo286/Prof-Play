import React, { useMemo, useContext } from 'react';
import { getMedalForScore, ALL_BADGES_MAP } from '../data/achievements';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import type { UserProfile } from '../types';

interface ResultsScreenProps {
  successes: number;
  total: number;
  xpEarned?: number;
  badgePrefix: string;
  onRestart: () => void;
  onReturnToMenu: () => void;
  onAdvance?: () => void;
  advanceButtonText?: string;
  restartButtonText?: string;
}

const DonutChart: React.FC<{ percentage: number }> = ({ percentage }) => {
  const size = 160;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = Math.max(0, circumference - (percentage / 100) * circumference);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="stroke-red-500/30" fill="transparent"/>
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="stroke-green-500" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
      </svg>
      <span className="absolute text-3xl font-bold text-slate-50">{Math.round(percentage)}%</span>
    </div>
  );
};

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ successes, total, xpEarned, badgePrefix, onRestart, onReturnToMenu, onAdvance, advanceButtonText, restartButtonText }) => {
  const { user } = useContext(AuthContext);
  const { getStudentsInClass } = useContext(GameDataContext);

  const percentage = total > 0 ? (successes / total) * 100 : 0;
  const earnedMedal = useMemo(() => getMedalForScore(badgePrefix, successes, total), [badgePrefix, successes, total]);

  const tierInfo = earnedMedal ? {
    gold: { color: 'text-amber-400', shadow: 'shadow-amber-400/50', border: 'border-amber-400' },
    silver: { color: 'text-gray-400', shadow: 'shadow-gray-400/50', border: 'border-gray-400' },
    bronze: { color: 'text-amber-600', shadow: 'shadow-amber-600/50', border: 'border-amber-600' },
    level: { color: 'text-sky-400', shadow: 'shadow-sky-400/50', border: 'border-sky-400' },
  }[earnedMedal.tier] : null;

  const rankedStudents = useMemo(() => {
    if (!user?.classCode || !badgePrefix) return [];
    const classmates = getStudentsInClass(user.classCode);
    
    return classmates
        .map(student => {
            const stats = student.gameStats?.[badgePrefix];
            if (!stats || !stats.completionTimestamp) return null;
            
            const completionTime = stats.completionTimestamp.toDate 
                ? stats.completionTimestamp.toDate() 
                : new Date(stats.completionTimestamp.seconds * 1000);

            return { 
                name: student.name, 
                avatar: student.avatar, 
                completionTime,
                firstTrySuccesses: stats.successFirstTry,
            };
        })
        .filter((s): s is { name: string; avatar: string | undefined; completionTime: Date; firstTrySuccesses: number; } => !!s)
        .sort((a, b) => a.completionTime.getTime() - b.completionTime.getTime());
  }, [user, badgePrefix, getStudentsInClass]);


  return (
    <div className="text-center py-6 flex flex-col justify-center items-center gap-4">
      <h2 className="text-3xl font-bold text-sky-400">Fim de Jogo!</h2>
      <div className='flex flex-col md:flex-row items-center gap-6'>
        <DonutChart percentage={percentage} />
        <div className='text-center'>
            <p className="text-lg text-slate-200">
                Você acertou <span className="font-bold text-green-400">{successes}</span> de <span className="font-bold text-slate-50">{total}</span> desafios na primeira tentativa.
            </p>
            {xpEarned !== undefined && (
                <p className="mt-2 text-xl font-semibold text-sky-400 animate-pulse">
                    +{xpEarned} XP!
                </p>
            )}
            {earnedMedal && tierInfo && (
                <div className={`mt-4 p-3 bg-slate-700 rounded-lg shadow-lg flex items-center gap-3 border-l-4 ${tierInfo.border}`}>
                    <i className={`fas ${earnedMedal.icon} ${tierInfo.color} text-4xl`}></i>
                    <div>
                        <p className="text-sm font-semibold text-slate-300">Medalha Conquistada</p>
                        <p className={`font-bold text-lg ${tierInfo.color}`}>{earnedMedal.name}</p>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="w-full bg-slate-900/70 p-4 rounded-lg mt-4 max-h-64 overflow-y-auto">
        <h3 className="font-bold text-lg text-cyan-300 mb-3 text-center">Ranking da Turma</h3>
        {rankedStudents.length > 0 ? (
            <ol className="space-y-2 text-left">
                {rankedStudents.map((student, index) => {
                      const isCurrentUser = student.name === user?.name;
                      return (
                        <li key={student.name} className={`flex items-center gap-3 p-2 rounded ${isCurrentUser ? 'bg-sky-800 border-2 border-sky-500' : 'bg-slate-800'}`}>
                            <span className={`w-6 text-center font-bold ${index < 3 ? 'text-yellow-400' : 'text-slate-400'}`}>{index + 1}</span>
                            {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-8 h-8 rounded-full bg-slate-700"/>}
                            <span className="font-semibold text-slate-100 flex-grow">{student.name}</span>
                            <span className="text-sm font-mono text-slate-300" title="Acertos na 1ª Tentativa">{student.firstTrySuccesses} acertos</span>
                        </li>
                      );
                })}
            </ol>
        ) : (
            <p className="text-slate-500 text-sm text-center">Seja o primeiro da sua turma a concluir!</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 w-full mt-4">
        <button onClick={onRestart} className="w-full sm:w-auto px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75">
          <i className="fas fa-redo mr-2"></i>{restartButtonText || 'Jogar Novamente'}
        </button>
        {onAdvance && advanceButtonText && (
           <button onClick={onAdvance} className="w-full sm:w-auto px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 order-first sm:order-none">
             <i className="fas fa-arrow-right mr-2"></i>{advanceButtonText}
           </button>
        )}
        <button onClick={onReturnToMenu} className="w-full sm:w-auto px-6 py-3 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75">
          <i className="fas fa-home mr-2"></i>Menu Principal
        </button>
      </div>
    </div>
  );
};