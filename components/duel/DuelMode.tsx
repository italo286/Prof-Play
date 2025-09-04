import React, { useContext } from 'react';
import { DuelContext } from '../../contexts/DuelContext';
import { DuelLobby } from './DuelLobby';
import { DuelGame } from './DuelGame';
import { DuelResults } from './DuelResults';
import { DuelPasswordSetup } from './DuelPasswordSetup';

interface DuelModeProps {
  onReturnToMenu: () => void;
}

export const DuelMode: React.FC<DuelModeProps> = ({ onReturnToMenu }) => {
    const { activeDuel, clearActiveDuel } = useContext(DuelContext);

    const handleReturnFromResults = () => {
        clearActiveDuel();
    };

    const renderContent = () => {
        if (!activeDuel) {
            return <DuelLobby />;
        }
        if (activeDuel.status === 'finished') {
            return <DuelResults onReturn={handleReturnFromResults} />;
        }
        if (activeDuel.status === 'setup' && activeDuel.gameMode === 'descubra-a-senha') {
            return <DuelPasswordSetup />;
        }
        return <DuelGame />;
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200 select-none">
             <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-5xl">
                <header className="flex justify-between items-center w-full mb-6">
                    <button 
                        onClick={onReturnToMenu} 
                        className="text-slate-400 hover:text-sky-400 transition-colors flex items-center text-sm font-medium p-2 rounded-lg hover:bg-slate-700"
                        aria-label="Voltar ao menu principal"
                    >
                        <i className="fas fa-arrow-left mr-2"></i>
                        <span>Menu Principal</span>
                    </button>
                     <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
                        Duelo 1x1
                    </h1>
                    <div></div>
                </header>
                <main className="flex justify-center">
                    {renderContent()}
                </main>
             </div>
        </div>
    );
};
