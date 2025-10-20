import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import { ProfileContext } from '../contexts/ProfileContext';
import { MessageDisplay } from './MessageDisplay';
import { GARRAFAS_IMAGES } from '../data/games';
import type { GarrafasChallenge, MessageType } from '../../types';
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

    const rankedStudents = useMemo(() => {
        if (!user || !user.classCode) return [];
        const classmates = getStudentsInClass(user.classCode);
        
        const completedStudents = classmates
            .map(student => {
                const stat = student.garrafasStats?.find(s => s.challengeId === challenge.id);
                if (!stat || !stat.isComplete || !stat.completionTimestamp) return null;
                const completionTime = getJsDateFromTimestamp(stat.completionTimestamp);
                return { name: student.name, avatar: student.avatar, attempts: stat.attempts, completionTime };
            })
            .filter((s): s is { name: string; avatar: string | undefined; attempts: number; completionTime: Date } => !!s)
            .sort((a, b) => a.completionTime.getTime() - b.completionTime.getTime());

        return completedStudents;
    }, [user, getStudentsInClass, challenge.id]);

    return (
        <div className="text-center py-6 flex flex-col justify-center items-center gap-4 animate-fade-in-down">
            <h2 className="text-3xl font-bold text-sky-400">Sequência Correta!</h2>
            <div className="w-full bg-slate-900/70 p-4 rounded-lg mt-4 max-h-80 overflow-y-auto">
                <h3 className="font-bold text-lg text-cyan-300 mb-3">Ranking: {challenge.title}</h3>
                {rankedStudents.length > 0 ? (
                    <ol className="space-y-2 text-left">
                        {rankedStudents.map((student, index) => (
                             <li key={student.name} className={`flex items-center gap-3 p-2 rounded ${student.name === user?.name ? 'bg-sky-800 border-2 border-sky-500' : 'bg-slate-800'}`}>
                                <span className={`w-6 text-center font-bold ${index < 3 ? 'text-yellow-400' : 'text-slate-400'}`}>{index + 1}</span>
                                {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-8 h-8 rounded-full bg-slate-700"/>}
                                <span className="font-semibold text-slate-100 flex-grow">{student.name}</span>
                                <span className="text-sm font-mono text-slate-300">{student.attempts} tentativa(s)</span>
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
    const { finalizeGarrafasChallenge } = useContext(ProfileContext);
    const [currentOrder, setCurrentOrder] = useState<number[]>(() => {
        let shuffled;
        do {
            shuffled = shuffleArray([...challenge.correctOrder]);
        } while (arraysEqual(shuffled, challenge.correctOrder));
        return shuffled;
    });
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<MessageType>('info');
    const [attempts, setAttempts] = useState(0);

    const myStat = useMemo(() => user?.garrafasStats?.find(s => s.challengeId === challenge.id), [user, challenge.id]);

    if (myStat?.isComplete) {
        return <CompletionScreen challenge={challenge} onBack={onBack} />;
    }

    const handleBottleClick = (index: number) => {
        if (selectedIndex === null) {
            setSelectedIndex(index);
        } else {
            if (selectedIndex === index) {
                setSelectedIndex(null); // Deselect
                return;
            }
            const newOrder = [...currentOrder];
            [newOrder[selectedIndex], newOrder[index]] = [newOrder[index], newOrder[selectedIndex]];
            setCurrentOrder(newOrder);
            setSelectedIndex(null);
        }
    };

    const handleCheck = () => {
        const currentAttempts = attempts + 1;
        setAttempts(currentAttempts);

        if (arraysEqual(currentOrder, challenge.correctOrder)) {
            playSuccessSound();
            finalizeGarrafasChallenge(challenge.id, currentAttempts);
        } else {
            playErrorSound();
            setMessage('Sequência incorreta. Tente novamente!');
            setMessageType('error');
        }
    };

    return (
        <div className="w-full max-w-lg flex flex-col items-center animate-fade-in">
            <p className="text-slate-300 mb-4 text-center">Organize as garrafas na sequência correta. Clique em duas garrafas para trocar suas posições.</p>
            
            {message && <MessageDisplay message={message} type={messageType} />}

            <div className="grid grid-cols-6 gap-2 md:gap-4 my-4 w-full">
                {currentOrder.map((bottleIndex, i) => (
                    <div key={i} onClick={() => handleBottleClick(i)}
                         className={`p-2 rounded-lg cursor-pointer transition-all ${selectedIndex === i ? 'bg-sky-500 scale-110 shadow-lg' : 'bg-slate-700/50 hover:bg-slate-600'}`}>
                        <img src={GARRAFAS_IMAGES[bottleIndex]} alt={`Garrafa ${bottleIndex + 1}`} className="w-full h-auto"/>
                    </div>
                ))}
            </div>

            <button onClick={handleCheck} className="px-8 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700">
                Verificar Sequência
            </button>
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
        .filter(c => {
            const stat = user.garrafasStats?.find(s => s.challengeId === c.id);
            return !stat || !stat.isComplete;
        });

    const resetGame = () => {
        setSelectedChallenge(null);
    };

    return (
        <div className="flex-grow flex flex-col items-center justify-center p-4">
            <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-2xl">
                <button onClick={selectedChallenge ? resetGame : onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400 transition-colors z-10 flex items-center p-2 rounded-lg hover:bg-slate-700">
                    <i className="fas fa-arrow-left mr-2"></i>
                    <span>{selectedChallenge ? 'Voltar aos Desafios' : 'Menu Principal'}</span>
                </button>
                <header className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
                        {selectedChallenge ? selectedChallenge.title : 'Jogo das Garrafas'}
                    </h1>
                </header>

                {selectedChallenge ? (
                    <GameView challenge={selectedChallenge} onBack={resetGame} />
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {availableChallenges.length > 0 ? availableChallenges.map(challenge => (
                            <div key={challenge.id} onClick={() => setSelectedChallenge(challenge)} 
                                className={`p-4 rounded-lg cursor-pointer transition-all border-2 bg-slate-700 border-transparent hover:bg-sky-900/50 hover:border-sky-600`}>
                                <h2 className="font-bold text-lg text-sky-300">{challenge.title}</h2>
                                <p className="text-sm text-slate-400">Criado por: {challenge.creatorName}</p>
                            </div>
                        )) : (
                            <p className="text-center text-slate-400 py-8">Nenhum desafio de Garrafas para sua turma no momento.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
