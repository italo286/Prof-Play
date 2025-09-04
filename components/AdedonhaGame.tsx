import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import { playSuccessSound } from '../utils/audio';

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

const CountdownTimer: React.FC<{ startTime: any, duration: number }> = ({ startTime, duration }) => {
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        const serverStartTime = getJsDateFromTimestamp(startTime)?.getTime();
        if (!serverStartTime) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - serverStartTime) / 1000);
            const remaining = duration - elapsed;
            setTimeLeft(Math.max(0, remaining));
        }, 500);

        return () => clearInterval(interval);
    }, [startTime, duration]);

    const color = timeLeft <= 10 ? 'text-red-500' : timeLeft <= 20 ? 'text-yellow-400' : 'text-green-400';

    return <div className={`text-6xl font-mono font-bold ${color}`}>{timeLeft}</div>;
};

export const AdedonhaGame: React.FC<{ onReturnToMenu: () => void }> = ({ onReturnToMenu }) => {
    const { user } = useContext(AuthContext);
    const { activeAdedonhaSession, activeAdedonhaRound, adedonhaSubmissions, submitAdedonhaAnswer } = useContext(GameDataContext);
    const [answer, setAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [timeUp, setTimeUp] = useState(false);
    
    useEffect(() => {
        // Reset state when a new round starts
        if (activeAdedonhaRound?.status === 'playing') {
            setAnswer('');
            setSubmitted(false);
            setTimeUp(false);
        }
    }, [activeAdedonhaRound]);

    useEffect(() => {
        if (activeAdedonhaRound?.status !== 'playing') return;

        const serverStartTime = getJsDateFromTimestamp(activeAdedonhaRound.startTime)?.getTime();
        if (!serverStartTime) return;

        const roundDuration = activeAdedonhaRound.duration || 30;
        const timer = setTimeout(() => {
            setTimeUp(true);
        }, serverStartTime + roundDuration * 1000 - Date.now());

        return () => clearTimeout(timer);
    }, [activeAdedonhaRound]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAdedonhaRound || submitted || timeUp) return;
        
        await submitAdedonhaAnswer(activeAdedonhaRound.id, answer);
        playSuccessSound();
        setSubmitted(true);
    };

    if (!activeAdedonhaSession) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
                <div className="relative bg-slate-800 shadow-2xl rounded-xl p-8 w-full max-w-md text-center">
                    <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400">
                        <i className="fas fa-arrow-left mr-2"></i>Voltar
                    </button>
                    <i className="fas fa-couch text-5xl text-sky-400 mb-4 animate-pulse"></i>
                    <h1 className="text-2xl font-bold">Lobby da Adedonha</h1>
                    <p className="text-slate-300 mt-2">Aguardando o professor iniciar o jogo...</p>
                </div>
            </div>
        );
    }
    
    if (!activeAdedonhaRound || activeAdedonhaRound.status === 'finished') {
         return (
             <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
                <div className="relative bg-slate-800 shadow-2xl rounded-xl p-8 w-full max-w-lg text-center">
                     <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400">
                        <i className="fas fa-arrow-left mr-2"></i>Voltar
                    </button>
                    <i className="fas fa-hourglass-half text-5xl text-sky-400 mb-4"></i>
                    <h1 className="text-2xl font-bold">Aguardando Rodada</h1>
                    <p className="text-slate-300 mt-2">O professor está preparando a próxima rodada.</p>
                    <div className="mt-6 w-full bg-slate-700 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-cyan-300 mb-2">Placar Atual</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {Object.entries(activeAdedonhaSession.scores)
                            .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
                            .map(([name, score]) => (
                                <div key={name} className="flex justify-between p-2 bg-slate-800 rounded">
                                    <span className="font-semibold">{name}</span>
                                    <span className="font-bold text-sky-300">{score} pontos</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
         );
    }
    
    if (activeAdedonhaRound.status === 'playing') {
        const showWaitingMessage = submitted || timeUp;
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
                <div className="relative bg-slate-800 shadow-2xl rounded-xl p-8 w-full max-w-md text-center">
                    <CountdownTimer startTime={activeAdedonhaRound.startTime} duration={activeAdedonhaRound.duration} />
                    <div className="my-4">
                        <p className="text-slate-400 text-lg">Tema:</p>
                        <p className="text-2xl font-bold text-sky-300">{activeAdedonhaRound.theme}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-lg">Começando com a letra:</p>
                        <p className="text-7xl font-bold text-amber-400">{activeAdedonhaRound.letter}</p>
                    </div>
                    
                    {showWaitingMessage ? (
                         <div className="mt-6 p-4 bg-green-900/50 border border-green-700 rounded-lg">
                            <p className="font-bold text-green-300 animate-pulse">
                                {timeUp ? "Tempo esgotado!" : "Resposta enviada!"}
                            </p>
                            <p className="text-sm text-slate-300">Aguardando os outros jogadores...</p>
                         </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
                            <input 
                                type="text"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="Sua resposta..."
                                className="flex-grow p-3 border border-slate-600 rounded-md bg-slate-700 text-white focus:ring-2 focus:ring-sky-500"
                                required
                            />
                            <button type="submit" className="px-6 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700">Enviar</button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    if (activeAdedonhaRound.status === 'scoring') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
                <div className="relative bg-slate-800 shadow-2xl rounded-xl p-8 w-full max-w-lg text-center">
                     <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400">
                        <i className="fas fa-arrow-left mr-2"></i>Voltar
                    </button>
                    <i className="fas fa-gavel text-5xl text-amber-400 mb-4 animate-pulse"></i>
                    <h1 className="text-2xl font-bold">Avaliação</h1>
                    <p className="text-slate-300 mt-2">O professor está avaliando as respostas.</p>
                    
                    <div className="mt-6 w-full bg-slate-700 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-cyan-300 mb-2">Respostas da Rodada</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {adedonhaSubmissions.map(sub => (
                            <div key={sub.id} className="flex justify-between p-2 bg-slate-800 rounded">
                                <div>
                                    <span className="font-semibold">{sub.studentName}: </span>
                                    <span className="italic text-slate-300">{sub.answer || "(em branco)"}</span>
                                </div>
                                <span className="font-bold text-sky-300">{sub.finalScore} pontos</span>
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null; // Should not be reached
};