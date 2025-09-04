import React, { useMemo, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { DuelContext } from '../../contexts/DuelContext';

const ConfettiPiece: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
    <div className="confetti" style={style}></div>
);

export const DuelResults: React.FC<{ onReturn: () => void }> = ({ onReturn }) => {
    const { user } = useContext(AuthContext);
    const { activeDuel } = useContext(DuelContext);

    const isWinner = useMemo(() => activeDuel?.winner === user?.name, [activeDuel, user]);

    const confetti = useMemo(() => {
        if (!isWinner) return [];
        return Array.from({ length: 50 }).map((_, i) => {
          const style = { /* ... confetti style ... */ };
          return <ConfettiPiece key={i} style={style} />;
        });
    }, [isWinner]);

    if (!user || !activeDuel || activeDuel.status !== 'finished') return null;

    return (
        <div className="text-center py-6 flex flex-col justify-center items-center gap-4 relative">
            {isWinner && confetti}
            <h2 className="text-3xl font-bold text-sky-400">Fim de Duelo!</h2>
            {/* ... Results display logic ... */}
            <button onClick={onReturn} className="mt-6 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700">
                Voltar ao Lobby
            </button>
        </div>
    );
};
