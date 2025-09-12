import React from 'react';

export const AdedonhaTappleGame: React.FC<{ onReturnToMenu: () => void }> = ({ onReturnToMenu }) => {
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-sky-400">Adedonha Tapple</h1>
                <p className="mt-4 text-slate-300">Este modo de jogo ainda está em desenvolvimento.</p>
                <button onClick={onReturnToMenu} className="mt-6 px-6 py-2 bg-sky-600 text-white rounded-lg">Voltar ao Menu</button>
            </div>
        </div>
    );
};
