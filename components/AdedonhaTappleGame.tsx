import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import { playSuccessSound } from '../utils/audio';
import { CountdownTimer } from './CountdownTimer';

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

const AlphabetGrid: React.FC<{ usedLetters: string[] }> = ({ usedLetters }) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const usedSet = new Set(usedLetters);
    return (
        <div className="grid grid-cols-7 gap-1.5 my-4">
            {alphabet.map(letter => {
                const isUsed = usedSet.has(letter);
                return (
                    <div key={letter} className={`flex items-center justify-center h-10 rounded font-bold text-lg transition-colors ${
                        isUsed ? 'bg-red-800 text-red-400 line-through' : 'bg-slate-700 text-slate-200'
                    }`}>
                        {letter}
                    </div>
                )
            })}
        </div>
    );
};


export const AdedonhaTappleGame: React.FC<{ onReturnToMenu: () => void }> = ({ onReturnToMenu }) => {
    const { user } = useContext(AuthContext);
    const { activeAdedonhaSession, activeAdedonhaRound, adedonhaSubmissions, submitAdedonhaAnswer, getStudentsInClass } = useContext(GameDataContext);
    const [answer, setAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [timeUp, setTimeUp] = useState(false);
    const [inputError, setInputError] = useState('');

    const usedLetters = useMemo(() => activeAdedonhaRound?.usedLetters || [], [activeAdedonhaRound]);

    const studentsInClass = useMemo(() => {
        if (!activeAdedonhaSession) return [];
        return getStudentsInClass(activeAdedonhaSession.classCode);
    }, [activeAdedonhaSession, getStudentsInClass]);

    const avatarMap = useMemo(() => {
        const map = new Map<string, string | undefined>();
        studentsInClass.forEach(student => {
            map.set(student.name, student.avatar);
        });
        return map;
    }, [studentsInClass]);
    
    useEffect(() => {
        if (activeAdedonhaRound?.status === 'playing') {
            setAnswer('');
            setSubmitted(false);
            setTimeUp(false);
            setInputError('');
        }
    }, [activeAdedonhaRound]);
    
    useEffect(() => {
        if(answer) {
            const firstLetter = answer.charAt(0).toUpperCase();
            if (usedLetters.includes(firstLetter)) {
                setInputError(`A letra ${firstLetter} já foi usada!`);
            } else {
                setInputError('');
            }
        } else {
            setInputError('');
        }
    }, [answer, usedLetters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAdedonhaRound || submitted || timeUp || inputError) return;
        
        const success = await submitAdedonhaAnswer(activeAdedonhaRound.id, answer);

        if (success) {
            playSuccessSound();
            setSubmitted(true);
        } else {
            const firstLetter = answer.trim().charAt(0).toUpperCase();
            setInputError(`A letra '${firstLetter}' foi usada por outro jogador! Tente outra.`);
        }
    };

    const mySubmission = useMemo(() => {
        if (!user || !activeAdedonhaRound) return null;
        return adedonhaSubmissions.find(s => s.roundId === activeAdedonhaRound?.id && s.studentName === user.name);
    }, [adedonhaSubmissions, activeAdedonhaRound, user]);
    
    useEffect(() => {
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
                    <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400"><i className="fas fa-arrow-left mr-2"></i>Voltar</button>
                    <i className="fas fa-couch text-5xl text-sky-400 mb-4 animate-pulse"></i>
                    <h1 className="text-2xl font-bold">Lobby da Adedonha Tapple</h1>
                    <p className="text-slate-300 mt-2">Aguardando o professor iniciar o jogo...</p>
                    <footer className="text-center text-sm text-slate-400 mt-8">
                        <p>Desenvolvido por Ítalo Natan – 2025</p>
                    </footer>
                </div>
            </div>
        );
    }
    
     if (!activeAdedonhaRound || activeAdedonhaRound.status === 'finished') {
         return (
             <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
                <div className="relative bg-slate-800 shadow-2xl rounded-xl p-8 w-full max-w-lg text-center">
                     <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400"><i className="fas fa-arrow-left mr-2"></i>Voltar</button>
                    <i className="fas fa-hourglass-half text-5xl text-sky-400 mb-4"></i>
                    <h1 className="text-2xl font-bold">Aguardando Rodada</h1>
                    <p className="text-slate-300 mt-2">O professor está preparando a próxima rodada.</p>
                    <div className="mt-6 w-full bg-slate-700 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-cyan-300 mb-2">Placar Atual</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {Object.entries(activeAdedonhaSession.scores).sort(([, a]: [string, number], [, b]: [string, number]) => b - a).map(([name, score]) => {
                            const avatar = avatarMap.get(name);
                            return (
                                <div key={name} className="flex justify-between items-center p-2 bg-slate-800 rounded">
                                    <div className="flex items-center gap-2">
                                        {avatar && <img src={avatar} alt={`Avatar de ${name}`} className="w-8 h-8 rounded-full bg-slate-700"/>}
                                        <span className="font-semibold">{name}</span>
                                    </div>
                                    <span className="font-bold text-sky-300">{score} pontos</span>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                     <footer className="text-center text-sm text-slate-400 mt-8">
                        <p>Desenvolvido por Ítalo Natan – 2025</p>
                    </footer>
                </div>
             </div>
         );
    }
    
    if (activeAdedonhaRound.status === 'playing') {
        const showWaitingMessage = submitted || timeUp;
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
                <div className="relative bg-slate-800 shadow-2xl rounded-xl p-8 w-full max-w-md text-center">
                    <CountdownTimer key={activeAdedonhaRound.id} startTime={activeAdedonhaRound.startTime} duration={activeAdedonhaRound.duration} onEnd={() => setTimeUp(true)} />
                    <div className="my-4">
                        <p className="text-slate-400 text-lg">Tema:</p>
                        <p className="text-2xl font-bold text-sky-300">{activeAdedonhaRound.theme}</p>
                    </div>
                    
                    <AlphabetGrid usedLetters={usedLetters} />
                    
                    {showWaitingMessage ? (
                         <div className="mt-6 p-4 bg-green-900/50 border border-green-700 rounded-lg animate-fade-in">
                            <p className="font-bold text-green-300 animate-pulse">{timeUp ? "Tempo esgotado!" : "Resposta enviada!"}</p>
                            <p className="text-sm text-slate-300">Aguardando o professor corrigir...</p>
                         </div>
                      ) : (
                        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2 animate-fade-in">
                            <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Sua resposta..." className="w-full p-4 border-2 border-slate-600 rounded-lg bg-slate-700 text-white text-center text-xl focus:ring-2 focus:ring-sky-500" required autoFocus />
                            {inputError && <p className="text-red-400 text-sm font-semibold">{inputError}</p>}
                            <button type="submit" disabled={!!inputError} className="w-full px-6 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 disabled:bg-slate-500 disabled:cursor-not-allowed">Enviar</button>
                        </form>
                      )
                    }
                     <footer className="text-center text-sm text-slate-400 mt-8">
                        <p>Desenvolvido por Ítalo Natan – 2025</p>
                    </footer>
                </div>
            </div>
        );
    }

    if (activeAdedonhaRound.status === 'scoring') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
                <div className="relative bg-slate-800 shadow-2xl rounded-xl p-8 w-full max-w-2xl text-center">
                     <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400"><i className="fas fa-arrow-left mr-2"></i>Voltar</button>
                    <i className="fas fa-gavel text-5xl text-amber-400 mb-4 animate-pulse"></i>
                    <h1 className="text-2xl font-bold">Avaliação da Rodada</h1>
                    <p className="text-slate-300 mt-2">O professor está avaliando as respostas. Veja o resultado parcial.</p>
                    <div className="mt-6 w-full bg-slate-700 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-cyan-300 mb-2">Respostas da Rodada {activeAdedonhaRound.roundNumber}</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {adedonhaSubmissions.map(sub => {
                            const avatar = avatarMap.get(sub.studentName);
                            const validationIcon = sub.isValid === true ? 'fa-check-circle text-green-400' : sub.isValid === false ? 'fa-times-circle text-red-400' : 'fa-question-circle text-slate-500';
                            return (
                                <div key={sub.id} className="flex justify-between items-center p-2 bg-slate-800 rounded">
                                    <div className="flex items-center gap-2">
                                        {avatar && <img src={avatar} alt={`Avatar de ${sub.studentName}`} className="w-8 h-8 rounded-full bg-slate-700"/>}
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
                     <footer className="text-center text-sm text-slate-400 mt-8">
                        <p>Desenvolvido por Ítalo Natan – 2025</p>
                    </footer>
                </div>
            </div>
        );
    }

    return null;
};