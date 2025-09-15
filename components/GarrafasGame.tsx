import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import { ProfileContext } from '../contexts/ProfileContext';
import { MessageDisplay } from './MessageDisplay';
import { GARRAFAS_IMAGES } from '../data/games';
import type { GarrafasChallenge, MessageType } from '../types';
import { playSuccessSound, playErrorSound } from '../utils/audio';

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

const arraysEqual = (a: any[], b: any[]): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const shuffleArray = (array: number[]): number[] => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

const CompletionScreen: React.FC<{
  challenge: GarrafasChallenge;
  onBack: () => void;
}> = ({ challenge, onBack }) => {
    const { user } = useContext(AuthContext);
    const { getStudentsInClass } = useContext(GameDataContext);
    const [lastUpdated, setLastUpdated] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setLastUpdated(Date.now()), 5000); // Poll for updates
        return () => clearInterval(timer);
    }, []);

    const rankedStudents = useMemo(() => {
        if (!user || !user.classCode) return [];
        const classmates = getStudentsInClass(user.classCode);
        
        return classmates
            .map(student => {
                const stat = student.garrafasStats?.find(s => s.challengeId === challenge.id);
                if (!stat || !stat.isComplete || !stat.completionTimestamp) return null;
                const completionTime = getJsDateFromTimestamp(stat.completionTimestamp);
                return { name: student.name, avatar: student.avatar, attempts: stat.attempts, completionTime };
            })
            .filter((s): s is { name: string; avatar: string | undefined; attempts: number; completionTime: Date } => !!s)
            .sort((a, b) => a.completionTime.getTime() - b.completionTime.getTime());
    }, [user, getStudentsInClass, challenge.id, lastUpdated]);

    return (
        <div className="text-center py-6 flex flex-col justify-center items-center gap-4 animate-fade-in-down">
            <h2 className="text-3xl font-bold text-sky-400">Sequência Correta!</h2>
            <div className="w-full bg-slate-900/70 p-4 rounded-lg mt-4 max-h-80 overflow-y-auto">
                <h3 className="font-bold text-lg text-cyan-300 mb-3">Ranking: {challenge.title}</h3>
                {rankedStudents.length > 0 ? (
                    <ol className="space-y-2 text-left">
                        {rankedStudents.map((student, index) => (
                             <li key={student.name} className={`flex items-center gap-3 p-2 rounded ${student.name === user?.name ? 'bg-sky-800' : 'bg-slate-800'}`}>
                                <span className={`w-6 text-center font-bold ${index < 3 ? 'text-yellow-400' : 'text-slate-400'}`}>{index + 1}</span>
                                {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-8 h-8 rounded-full bg-slate-700"/>}
                                <span className="font-semibold text-slate-100 flex-grow">{student.name}</span>
                                <span className="text-sm font-mono text-slate-300">{student.attempts} trocas</span>
                             </li>
                        ))}
                    </ol>
                ) : <p className="text-slate-500">Aguardando outros jogadores...</p>}
            </div>
            <button onClick={onBack} className="w-full sm:w-auto mt-4 px-6 py-3 bg-sky-500 text-white font-semibold rounded-lg">Voltar</button>
        </div>
    );
};

const GameView: React.FC<{ challenge: GarrafasChallenge, onBack: () => void }> = ({ challenge, onBack }) => {
    const { user } = useContext(AuthContext);
    const { logGarrafasAttempt } = useContext(ProfileContext);
    const [currentOrder, setCurrentOrder] = useState<number[]>(() => {
        let shuffled;
        do {
            shuffled = shuffleArray([...challenge.correctOrder]);
        } while (arraysEqual(shuffled, challenge.correctOrder));
        return shuffled;
    });
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [attempts, setAttempts] = useState(0);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<MessageType>('info');

    const myStat = useMemo(() => user?.garrafasStats?.find(s => s.challengeId === challenge.id), [user, challenge.id]);
    const [isComplete, setIsComplete] = useState(myStat?.isComplete || false);

    useEffect(() => {
        if (myStat?.isComplete) {
            setIsComplete(true);
        }
    }, [myStat]);

    const handleBottleClick = (index: number) => {
        if (isComplete) return;
        if (selectedIndex === null) {
            setSelectedIndex(index);
        } else {
            if (selectedIndex === index) {
                setSelectedIndex(null);
                return;
            }
            const newOrder = [...currentOrder];
            [newOrder[selectedIndex], newOrder[index]] = [newOrder[index], newOrder[selectedIndex]];
            setCurrentOrder(newOrder);
            setSelectedIndex(null);
            setAttempts(prev => prev + 1);
        }
    };
    
    const handleCheck = () => {
        if (isComplete) return;
        const isCorrect = arraysEqual(currentOrder, challenge.correctOrder);
        logGarrafasAttempt(challenge.id, attempts + 1, isCorrect);
        
        if (isCorrect) {
            playSuccessSound();
            setIsComplete(true);
        } else {
            playErrorSound();
            let correctCount = 0;
            for (let i = 0; i < currentOrder.length; i++) {
                if (currentOrder[i] === challenge.correctOrder[i]) {
                    correctCount++;
                }
            }
            setMessage(`${correctCount} garrafa(s) está(ão) na posição correta. Continue tentando!`);
            setMessageType('error');
        }
    };

    if (isComplete) {
        return <CompletionScreen challenge={challenge} onBack={onBack} />;
    }

    return (
        <div className="w-full max-w-2xl flex flex-col items-center">
            <div className="grid grid-cols-6 gap-2 md:gap-4 mb-6">
                {currentOrder.map((bottleIndex, i) => (
                    <div key={i} onClick={() => handleBottleClick(i)}
                         className={`p-2 rounded-lg cursor-pointer transition-all ${selectedIndex === i ? 'bg-sky-500 scale-110 shadow-lg' : 'bg-slate-700/50 hover:bg-slate-600'}`}>
                        <img src={GARRAFAS_IMAGES[bottleIndex]} alt={`Garrafa ${bottleIndex + 1}`} className="w-full h-auto"/>
                    </div>
                ))}
            </div>
            {message && <MessageDisplay message={message} type={messageType} />}
            <button onClick={handleCheck} disabled={isComplete} className="mt-4 px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 disabled:bg-slate-500">Verificar</button>
        </div>
    );
};

export const GarrafasGame: React.FC<{ onReturnToMenu: () => void }> = ({ onReturnToMenu }) => {
    const { user } = useContext(AuthContext);
    const { garrafasChallenges } = useContext(GameDataContext);
    const [selectedChallenge, setSelectedChallenge] = useState<GarrafasChallenge | null>(null);

    if (!user) return null;

    const availableChallenges = garrafasChallenges
        .filter(c => c.classCode === user.classCode && c.status === 'unlocked')
        .filter(c => !user.garrafasStats?.some(s => s.challengeId === c.id && s.isComplete));

    if (!selectedChallenge) {
        return (
             <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
                <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-2xl">
                    <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400 p-2 rounded-lg hover:bg-slate-700">
                        <i className="fas fa-arrow-left mr-2"></i>Voltar
                    </button>
                    <header className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-sky-400">Jogo das Garrafas</h1>
                        <p className="text-slate-300 mt-2">Selecione um desafio para começar a ordenar.</p>
                    </header>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {availableChallenges.length > 0 ? availableChallenges.map(c => (
                            <div key={c.id} onClick={() => setSelectedChallenge(c)} className="p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-sky-900/50 border-2 border-transparent hover:border-sky-600">
                                <h2 className="font-bold text-lg text-sky-300">{c.title}</h2>
                            </div>
                        )) : <p className="text-center text-slate-400 py-8">Nenhum desafio ativo para sua turma.</p>}
                    </div>
                    <footer className="text-center text-sm text-slate-400 mt-8">
                        <p>Desenvolvido por Ítalo Natan – 2025</p>
                    </footer>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
            <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-3xl">
                <button onClick={() => setSelectedChallenge(null)} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400 p-2 rounded-lg hover:bg-slate-700">
                    <i className="fas fa-arrow-left mr-2"></i>Voltar
                </button>
                <header className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-sky-400">{selectedChallenge.title}</h1>
                </header>
                <GameView challenge={selectedChallenge} onBack={() => setSelectedChallenge(null)} />
                <footer className="text-center text-sm text-slate-400 mt-8">
                    <p>Desenvolvido por Ítalo Natan – 2025</p>
                </footer>
            </div>
        </div>
    );
};