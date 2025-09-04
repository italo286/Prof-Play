import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { XpProgressBar } from './XpProgressBar';
import { ALL_BADGES } from '../data/achievements';

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getTierClass = (tier: 'gold' | 'silver' | 'bronze' | 'level') => {
    switch(tier) {
        case 'gold': return { bg: 'bg-amber-900/40', border: 'border-amber-500', text: 'text-amber-400', name: 'text-amber-300' };
        case 'silver': return { bg: 'bg-gray-700', border: 'border-gray-500', text: 'text-gray-400', name: 'text-gray-300' };
        case 'bronze': return { bg: 'bg-orange-900/40', border: 'border-orange-600', text: 'text-orange-500', name: 'text-orange-400' };
        case 'level': return { bg: 'bg-sky-900/40', border: 'border-sky-500', text: 'text-sky-400', name: 'text-sky-300' };
        default: return { bg: 'bg-slate-700', border: 'border-slate-600', text: 'text-slate-500', name: 'text-slate-400' };
    }
}

export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useContext(AuthContext);

  if (!isOpen || !user) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-down"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-lg text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors z-10 text-2xl"
          aria-label="Fechar"
        >
          <i className="fas fa-times-circle"></i>
        </button>

        <header className="text-center mb-6">
            <div className="flex flex-col items-center justify-center gap-2">
                {user.avatar && user.role === 'student' ? (
                     <img src={user.avatar} alt="Seu avatar" className="w-16 h-16 rounded-full bg-slate-700 border-2 border-sky-400 shadow-md"/>
                ) : (
                    <i className="fas fa-user-graduate text-4xl text-sky-400"></i>
                )}
                <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                    {user.name}
                </h1>
            </div>
        </header>

        <section className="mb-6 p-4 bg-slate-900/70 rounded-lg shadow-inner">
            <h2 className="text-xl font-bold text-sky-300 mb-2 text-center">Meu Progresso</h2>
            <p className="text-center text-lg mb-3 font-semibold">Nível {user.level}</p>
            <XpProgressBar currentXp={user.xp} level={user.level} />
        </section>

        <section>
            <h2 className="text-xl font-bold text-cyan-300 mb-3 text-center">Medalhas</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-48 overflow-y-auto pr-2">
                {ALL_BADGES.map(badge => {
                    const isEarned = user.badges.includes(badge.id);
                    const tierClass = getTierClass(badge.tier);
                    return (
                        <div 
                            key={badge.id}
                            className={`flex flex-col items-center justify-center text-center p-2 rounded-lg border transition-all ${isEarned ? `${tierClass.bg} ${tierClass.border}` : 'bg-slate-800 border-slate-700'}`}
                            title={isEarned ? badge.description : 'Continue jogando para desbloquear'}
                        >
                            <i className={`fas ${badge.icon} text-3xl mb-1 ${isEarned ? tierClass.text : 'text-slate-500'}`}></i>
                            <h3 className={`font-bold text-xs ${isEarned ? tierClass.name : 'text-slate-400'}`}>{badge.name}</h3>
                        </div>
                    );
                })}
                {user.badges.length === 0 && <p className="col-span-full text-center text-slate-400">Continue jogando para ganhar medalhas!</p>}
            </div>
        </section>
      </div>
    </div>
  );
};
