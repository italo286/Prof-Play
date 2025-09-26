import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import { playSuccessSound } from '../utils/audio';
import { CountdownTimer } from './CountdownTimer';
import { db } from '../firebase';
import type { AdedonhaSubmission } from '../types';


const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
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
    const { activeAdedonhaSession, activeAdedonhaRound, submitAdedonhaAnswer, getStudentsInClass } = useContext(GameDataContext);
    const [answer, setAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [timeUp, setTimeUp] = useState(false);
    const [letterRevealed, setLetterRevealed] = useState(false);
    
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
            setLetterRevealed(false);
        }
    }, [activeAdedonhaRound]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAdedonhaRound || submitted || timeUp) return;
        
        await submitAdedonhaAnswer(activeAdedonhaRound.id, answer);
        playSuccessSound();
        setSubmitted(true);
    };

    // OPTIMIZATION: Check for submission status using the efficient `submittedBy` array on the round document.
    // This avoids listening to the entire `adedonhaSubmissions` collection for all students.
    useEffect(() => {
      const alreadySubmitted = activeAdedonhaRound?.submittedBy?.includes(user?.name || '');
      if (alreadySubmitted) {
        setSubmitted(true);
        // If already submitted, do a single read to get the answer text to populate the input.
        // This is a good trade-off: one read vs a persistent listener.
        const fetchMyAnswer = async () => {
            if (user && activeAdedonhaRound) {
                const q = db.collection('adedonhaSubmissions')
                            .where('roundId', '==', activeAdedonhaRound.id)
                            .where('studentName', '==', user.name)
                            .limit(1);
                const docSnap = await q.get();
                if (!docSnap.empty) {
                    const sub = docSnap.docs[0].data() as AdedonhaSubmission;
                    setAnswer(sub.answer);
                }
            }
        };
        fetchMyAnswer();
      }
    }, [activeAdedonhaRound, user]);

    // --- RENDER LOGIC ---

    if (!activeAdedonhaSession) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
                <div className="relative bg-slate-800 shadow-2xl rounded-xl p-8 w-full max-w-md text-center">
                    <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400">
                        <i className="fas fa-arrow-left mr-2"></i>Voltar
                    </button>
                    <i className="fas fa-couch text-5xl text-sky-400 mb-4 animate-pulse"></i>
                    <h1 className="text-2xl font-bold">Lobby da Adedonha Simples</h1>
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
                            .map(([name, score]) => {
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
                    {letterRevealed && <CountdownTimer key={activeAdedonhaRound.id} startTime={activeAdedonhaRound.startTime} duration={activeAdedonhaRound.duration} onEnd={() => setTimeUp(true)} />}
                    <div className="my-4">
                        <p className="text-slate-400 text-lg">Tema:</p>
                        <p className="text-2xl font-bold text-sky-300">{activeAdedonhaRound.theme}</p>
                    </div>
                    
                    {activeAdedonhaRound.letter && <LetterSpinner letter={activeAdedonhaRound.letter} onRevealed={() => setLetterRevealed(true)} />}

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
                     <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400">
                        <i className="fas fa-arrow-left mr-2"></i>Voltar
                    </button>
                    <i className="fas fa-gavel text-5xl text-amber-400 mb-4 animate-pulse"></i>
                    <h1 className="text-2xl font-bold">Avaliação da Rodada</h1>
                    <p className="text-slate-300 mt-2">O professor está avaliando as respostas. Veja o resultado parcial.</p>
                    
                    <div className="mt-6 w-full bg-slate-700 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-cyan-300 mb-2">Respostas da Rodada {activeAdedonhaRound.roundNumber}</h3>
                        <p className="text-slate-400 text-sm mb-2">Aguarde o professor atribuir a pontuação final.</p>
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