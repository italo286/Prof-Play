import React, { useState, useEffect, useContext, useMemo } from 'react';
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
        setTimeLeft(duration);
    }, [duration]);

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

    const percentage = (timeLeft / duration) * 100;
    const barColor = timeLeft <= 10 ? 'bg-red-500' : timeLeft <= 20 ? 'bg-yellow-400' : 'bg-green-400';

    return (
        <div className="w-full">
            <div className="text-center font-mono text-2xl font-bold mb-1">{timeLeft}s</div>
            <div className="w-full bg-slate-600 rounded-full h-2.5">
                <div className={`${barColor} h-2.5 rounded-full transition-all duration-500`} style={{width: `${percentage}%`}}></div>
            </div>
        </div>
    );
};

const LetterSpinner: React.FC<{ letter: string, onRevealed: () => void }> = ({ letter, onRevealed }) => {
    // A animação de "spin" foi removida a pedido do usuário.
    // A letra agora é revelada imediatamente.
    useEffect(() => {
        onRevealed();
    }, [onRevealed]);

    return (
        <div className="flex flex-col items-center justify-center my-4">
            <p className="text-slate-400 text-lg">A letra é...</p>
            <div className="text-8xl font-bold text-amber-400 animate-fade-in-down">
                {letter}
            </div>
        </div>
    );
};


export const AdedonhaGame: React.FC<{ onReturnToMenu: () => void }> = ({ onReturnToMenu }) => {
    const { user } = useContext(AuthContext);
    const { activeAdedonhaSession, activeAdedonhaRound, adedonhaSubmissions, submitAdedonhaAnswer } = useContext(GameDataContext);
    const [answer, setAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [timeUp, setTimeUp] = useState(false);
    const [letterRevealed, setLetterRevealed] = useState(false);
    
    useEffect(() => {
        if (activeAdedonhaRound?.status === 'playing') {
            setAnswer('');
            setSubmitted(false);
            setTimeUp(false);
            setLetterRevealed(false);
        }
    }, [activeAdedonhaRound]);

    useEffect(() => {
        if (activeAdedonhaRound?.status !== 'playing' || !letterRevealed) return;

        const serverStartTime = getJsDateFromTimestamp(activeAdedonhaRound.startTime)?.getTime();
        if (!serverStartTime) return;

        const roundDuration = activeAdedonhaRound.duration || 30;
        const timer = setTimeout(() => {
            setTimeUp(true);
        }, serverStartTime + roundDuration * 1000 - Date.now());

        return () => clearTimeout(timer);
    }, [activeAdedonhaRound, letterRevealed]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAdedonhaRound || submitted || timeUp) return;
        
        await submitAdedonhaAnswer(activeAdedonhaRound.id, answer);
        playSuccessSound();
        setSubmitted(true);
    };

    const mySubmission = useMemo(() => {
        if (!user || !activeAdedonhaRound) return null;
        return adedonhaSubmissions.find(s => s.roundId === activeAdedonhaRound?.id && s.studentName === user.name);
    }, [adedonhaSubmissions, activeAdedonhaRound, user]);
    
    useEffect(() => {
      // Check if user has already submitted in this round
      if (mySubmission) {
        setSubmitted(true);
        setAnswer(mySubmission.answer);
      }
    }, [mySubmission]);

    // --- RENDER LOGIC ---

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
                    {letterRevealed && <CountdownTimer startTime={activeAdedonhaRound.startTime} duration={activeAdedonhaRound.duration} />}
                    <div className="my-4">
                        <p className="text-slate-400 text-lg">Tema:</p>
                        <p className="text-2xl font-bold text-sky-300">{activeAdedonhaRound.theme}</p>
                    </div>
                    
                    <LetterSpinner letter={activeAdedonhaRound.letter} onRevealed={() => setLetterRevealed(true)} />

                    {letterRevealed && (
                      showWaitingMessage ? (
                         <div className="mt-6 p-4 bg-green-900/50 border border-green-700 rounded-lg animate-fade-in">
                            <p className="font-bold text-green-300 animate-pulse">
                                {timeUp ? "Tempo esgotado!" : "Resposta enviada!"}
                            </p>
                            <p className="text-sm text-slate-300">Aguardando o professor corrigir...</p>
                         </div>
                      ) : (
                        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2 animate-fade-in">
                            <input 
                                type="text"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="Sua resposta..."
                                className="w-full p-4 border-2 border-slate-600 rounded-lg bg-slate-700 text-white text-center text-xl focus:ring-2 focus:ring-sky-500"
                                required
                                autoFocus
                            />
                            <button type="submit" className="w-full px-6 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700">Enviar</button>
                        </form>
                      )
                    )}
                </div>
            </div>
        );
    }

    if (activeAdedonhaRound.status === 'scoring') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
                <div className="relative bg-slate-800 shadow-2xl rounded-xl p-8 w-full max-w-2xl text-center">
                     <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400">
                        <i className="fas fa-arrow-left mr-2"></i>Voltar
                    </button>
                    <i className="fas fa-gavel text-5xl text-amber-400 mb-4 animate-pulse"></i>
                    <h1 className="text-2xl font-bold">Avaliação da Rodada</h1>
                    <p className="text-slate-300 mt-2">O professor está avaliando as respostas. Veja o resultado parcial.</p>
                    
                    <div className="mt-6 w-full bg-slate-700 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-cyan-300 mb-2">Respostas da Rodada {activeAdedonhaRound.roundNumber}</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {adedonhaSubmissions.map(sub => {
                            const validationIcon = sub.isValid === true ? 'fa-check-circle text-green-400' : sub.isValid === false ? 'fa-times-circle text-red-400' : 'fa-question-circle text-slate-500';
                            return (
                                <div key={sub.id} className="flex justify-between items-center p-2 bg-slate-800 rounded">
                                    <div className="flex items-center gap-2">
                                        <i className={`fas ${validationIcon}`}></i>
                                        <span className="font-semibold">{sub.studentName}: </span>
                                        <span className="italic text-slate-300">{sub.answer || "(em branco)"}</span>
                                    </div>
                                    <span className="font-bold text-sky-300">{sub.finalScore} pontos</span>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};