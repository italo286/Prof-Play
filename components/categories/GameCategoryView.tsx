import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { GameCategory } from '../../data/games';
import { isModeUnlocked } from '../../App';
import { getLevelColor } from '../../contexts/ProfileContext';

interface GameCategoryViewProps {
  category: GameCategory;
  onSelectMode: (modeId: any) => void;
  onReturnToMenu: () => void;
}

const getTierIcon = (tier: 'gold' | 'silver' | 'bronze') => {
    const tierInfo = {
        gold: { icon: 'fa-medal', color: 'text-amber-400' },
        silver: { icon: 'fa-medal', color: 'text-gray-400' },
        bronze: { icon: 'fa-medal', color: 'text-amber-600' },
    };
    return <i className={`fas ${tierInfo[tier].icon} ${tierInfo[tier].color} text-2xl`}></i>;
};

export const GameCategoryView: React.FC<GameCategoryViewProps> = ({ category, onSelectMode, onReturnToMenu }) => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const getHighestTierMedal = (badgePrefix: string) => {
      const userBadges = user.badges || [];
      if (userBadges.includes('duelist') && badgePrefix === 'duelist') return <i className="fas fa-user-friends text-amber-600 text-2xl"></i>;
      if (userBadges.includes(`${badgePrefix}_gold`)) return getTierIcon('gold');
      if (userBadges.includes(`${badgePrefix}_silver`)) return getTierIcon('silver');
      if (userBadges.includes(`${badgePrefix}_bronze`)) return getTierIcon('bronze');
      return null;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200 select-none">
        <div className="w-full max-w-4xl">
            <header className="text-center mb-8 relative">
                 <button 
                    onClick={onReturnToMenu} 
                    className="absolute top-0 left-0 text-slate-400 hover:text-sky-400 transition-colors flex items-center text-sm font-medium p-2 rounded-lg hover:bg-slate-700"
                    aria-label="Voltar para Categorias"
                >
                    <i className="fas fa-arrow-left mr-2"></i>
                    <span>Voltar</span>
                </button>
                <div className="flex flex-col items-center justify-center gap-2">
                    <i className={`fas ${category.icon} text-5xl ${category.color}`}></i>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-100">
                        {category.name}
                    </h1>
                </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {category.games.map(mode => {
                    // For duel, just show the single card
                    if (category.id === 'duelo') {
                        return (
                             <div key={mode.id}
                                 onClick={() => onSelectMode(mode.id)}
                                 className="p-6 bg-slate-800 rounded-lg shadow-lg border-2 border-transparent hover:border-sky-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer md:col-start-2 lg:col-start-2">
                                <div className="flex justify-between items-start">
                                    <i className={`fas ${mode.icon} text-3xl text-sky-400`}></i>
                                </div>
                                <h2 className="text-xl font-bold mt-4 text-slate-100">{mode.name}</h2>
                                <p className="text-sm text-slate-400 mt-1 h-10">{mode.description}</p>
                            </div>
                        )
                    }

                    const unlocked = isModeUnlocked(mode.id, user);

                    return (
                        <div key={mode.id}
                             onClick={() => unlocked && onSelectMode(mode.id)}
                             className={`p-6 bg-slate-800 rounded-lg shadow-lg border-2 transition-all duration-300 ${unlocked ? 'border-transparent hover:border-sky-500 hover:-translate-y-1 cursor-pointer' : 'border-slate-700 opacity-60'}`}>
                            
                            <div className="flex justify-between items-start">
                                <i className={`fas ${mode.icon} text-3xl text-sky-400`}></i>
                                <div className="text-right">
                                    {getHighestTierMedal(mode.badgePrefix)}
                                </div>
                            </div>
                            <h2 className="text-xl font-bold mt-4 text-slate-100">{mode.name}</h2>
                            <p className="text-sm text-slate-400 mt-1 h-10">{mode.description}</p>
                            {!unlocked && (
                                <div className="mt-3 text-xs font-bold text-yellow-400 flex items-center gap-2">
                                    <i className="fas fa-lock"></i>
                                    <span>
                                        {'Complete o modo anterior'}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </main>
             <footer className="text-center text-sm text-slate-400 mt-8">
                <p>Desenvolvido por Ítalo Natan – 2025</p>
            </footer>
        </div>
    </div>
  );
};