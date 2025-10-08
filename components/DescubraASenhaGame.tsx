import React, { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react';
import type { PasswordChallenge, GameStat, MessageType } from '../../types';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import { ProfileContext } from '../contexts/ProfileContext';
import { playSuccessSound, playErrorSound } from '../utils/audio';
import { MessageDisplay } from './MessageDisplay';

const GAME_ID = 'password_unlock';

// --- Helper Functions ---
const calculateCorrectPositionCount = (guess: string, password: string): number => {
    let count = 0;
    for (let i = 0; i < password.length; i++) {
        if (guess[i] === password[i]) {
            count++;
        }
    }
    return count;
};

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    // Handle Firebase Timestamp object
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    // Handle plain object with seconds property (can happen from cache)
    if (typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000);
    }
    return null;
};


// --- Sub-Components ---
const GuessHistory: React.FC<{ guesses: { guess: string, correctCount: number }[] }> = ({ guesses }) => {
    const lastGuessRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        lastGuessRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [guesses]);
    
    return (
        <div className="w-full max-w-sm mx-auto space-y-2 max-h-64 overflow-y-auto pr-2">
            {guesses.map(({ guess, correctCount }, index) => (
                <div 
                    key={index} 
                    ref={index === guesses.length - 1 ? lastGuessRef : null} 
                    className="flex justify-between items-center p-2 bg-slate-700/80 rounded-md animate-fade-in-down"
                    style={{animationDelay: '0.1s'}}
                >
                    <div className="flex gap-2">
                        {guess.split('').map((char, i) => (
                            <div key={i} className="flex items-center justify-center w-10 h-10 text-xl font-bold text-white bg-slate-600 border-slate-500 rounded-md border-2">
                                {char}
                            </div>
                        ))}
                    </div>
                    <div className="text-right px-2">
                        <p className="text-lg font-bold text-sky-300">{correctCount}</p>
                        <p className="text-xs text-slate-400">dígito(s) na posição correta</p>
                    </div>
                </div>
            ))}
        </div>
    );
};


const GuessInput: React.FC<{ digitCount: number, onGuess: (guess: string) => void, disabled: boolean }> = ({ digitCount, onGuess, disabled }) => {
    const [values, setValues] = useState<string[]>(Array(digitCount).fill(''));
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow numbers
        const newValues = [...values];
        newValues[index] = value.slice(-1); // Take only the last digit
        setValues(newValues);

        if (value && index < digitCount - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !values[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleGuess = () => {
        const guess = values.join('');
        if (guess.length === digitCount) {
            onGuess(guess);
            setValues(Array(digitCount).fill(''));
            inputsRef.current[0]?.focus();
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 my-4">
            <div className="flex justify-center gap-2">
                {Array.from({ length: digitCount }).map((_, index) => (
                    <input
                        key={index}
                        ref={el => { inputsRef.current[index] = el }}
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={1}
                        value={values[index]}
                        onChange={e => handleChange(index, e.target.value)}
                        onKeyDown={e => handleKeyDown(index, e)}
                        disabled={disabled}
                        className="w-14 h-14 text-center text-3xl font-bold bg-slate-700 text-white rounded-md border-2 border-slate-600 focus:border-sky-500 focus:ring-sky-500"
                        aria-label={`Dígito ${index + 1}`}
                    />
                ))}
            </div>
            <button onClick={handleGuess} disabled={disabled || values.join('').length !== digitCount} className="px-8 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 disabled:bg-slate-500 disabled:cursor-not-allowed">
                <i className="fas fa-check mr-2"></i>Verificar
            </button>
        </div>
    );
};

const CompletionRankingScreen: React.FC<{
  challenge: PasswordChallenge;
  onReturnToMenu: () => void;
}> = ({ challenge, onReturnToMenu }) => {
    const { user } = useContext(AuthContext);
    const { getStudentsInClass } = useContext(GameDataContext);
    const gameId = `${GAME_ID}_${challenge.id}`;
    
    const rankedStudents = useMemo(() => {
        if (!user || !user.classCode) return [];
        const classmates = getStudentsInClass(user.classCode);
        
        return classmates
            .map(student => {
                const stats = student.gameStats?.[gameId];
                if (!stats || (stats.successFirstTry + stats.successOther === 0)) {
                    return null;
                }
                const attempts = stats.successFirstTry + stats.successOther + stats.errors;
                const completionTime = getJsDateFromTimestamp(stats.completionTimestamp);
                return { name: student.name, avatar: student.avatar, attempts, completionTime };
            })
            .filter((s): s is { name: string; avatar: string | undefined; attempts: number; completionTime: Date } => !!s && !!s.completionTime)
            .sort((a, b) => a.completionTime.getTime() - b.completionTime.getTime());
    }, [user, getStudentsInClass, gameId]);

    return (
        <div className="text-center py-6 flex flex-col justify-center items-center gap-4 animate-fade-in-down">
            <h2 className="text-3xl font-bold text-sky-400">Desafio Concluído!</h2>
            <p className="text-slate-300">Veja sua posição no ranking da turma em tempo real.</p>
            <div className="w-full bg-slate-900/70 p-4 rounded-lg mt-4 max-h-80 overflow-y-auto">
                <h3 className="font-bold text-lg text-cyan-300 mb-3">Ranking: {challenge.title}</h3>
                {rankedStudents.length > 0 ? (
                    <ol className="space-y-2 text-left">
                        {rankedStudents.map((student, index) => {
                             const isCurrentUser = student.name === user?.name;
                             return (
                                <li key={student.name} className={`flex items-center gap-3 p-2 rounded ${isCurrentUser ? 'bg-sky-800 border-2 border-sky-500' : 'bg-slate-800'}`}>
                                    <span className={`w-6 text-center font-bold ${index < 3 ? 'text-yellow-400' : 'text-slate-400'}`}>{index + 1}</span>
                                    {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-8 h-8 rounded-full bg-slate-700"/>}
                                    <span className="font-semibold text-slate-100 flex-grow">{student.name}</span>
                                    <span className="text-sm font-mono text-slate-300">{student.attempts} tentativa(s)</span>
                                </li>
                             );
                        })}
                    </ol>
                ) : (
                    <p className="text-slate-500 text-sm">Aguardando outros jogadores...</p>
                )}
            </div>
            <button onClick={onReturnToMenu} className="w-full sm:w-auto mt-4 px-6 py-3 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 transition-colors">
              <i className="fas fa-home mr-2"></i>Menu Principal
            </button>
        </div>
    );
};

// --- Main Game Component ---

interface DescubraASenhaGameProps {
  onReturnToMenu: () => void;
}

export const DescubraASenhaGame: React.FC<DescubraASenhaGameProps> = ({ onReturnToMenu }) => {
  const { user } = useContext(AuthContext);
  const { passwordChallenges } = useContext(GameDataContext);
  const { finalizePasswordChallenge } = useContext(ProfileContext);
  const [selectedChallenge, setSelectedChallenge] = useState<PasswordChallenge | null>(null);
  const [guesses, setGuesses] = useState<{ guess: string; correctCount: number }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState('00:00');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('info');
  const messageTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (gameOver || !selectedChallenge?.unlockedTimestamp) return;

    const interval = setInterval(() => {
        const unlockedTime = getJsDateFromTimestamp(selectedChallenge.unlockedTimestamp)?.getTime();
        if (unlockedTime) {
            const now = Date.now();
            const diff = now - unlockedTime;
            
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);

            setTimeElapsed(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedChallenge, gameOver]);
  
  const showTemporaryMessage = useCallback((text: string, type: MessageType, duration: number = 3000) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setMessage(text);
    setMessageType(type);
    messageTimeoutRef.current = window.setTimeout(() => {
      setMessage('');
    }, duration);
  }, []);

  const handleSelectChallenge = (challenge: PasswordChallenge) => {
    setSelectedChallenge(challenge);
    setGameOver(false);
    setGuesses([]);
    setErrorCount(0);
    setIsFirstAttempt(true);
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage('');
  };

  const handleGuess = (guess: string) => {
    if (!selectedChallenge) return;

    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);

    const correctCount = calculateCorrectPositionCount(guess, selectedChallenge.password);
    setGuesses(prev => [...prev, { guess, correctCount }]);

    if (guess === selectedChallenge.password) {
        playSuccessSound();
        finalizePasswordChallenge(selectedChallenge.id, errorCount, isFirstAttempt);
        setGameOver(true);
    } else {
        playErrorSound();
        setErrorCount(prev => prev + 1);
        setIsFirstAttempt(false);
        showTemporaryMessage('Combinação incorreta. Tente novamente!', 'error');
    }
  };
  
  const resetGame = () => {
    setSelectedChallenge(null);
  };

  // Render Logic
  if (!selectedChallenge) {
     const unlockedChallenges = passwordChallenges
        .filter(c => c.status === 'unlocked' && c.classCode === user?.classCode)
        .filter(c => {
            if (!user?.gameStats) return true;
            const gameId = `${GAME_ID}_${c.id}`;
            const stats = user.gameStats[gameId];
            return !stats || (stats.successFirstTry + stats.successOther === 0);
        });

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-2xl">
            <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400 transition-colors z-10">
                <i className="fas fa-arrow-left mr-2"></i>Voltar
            </button>
            <header className="text-center mb-6">
                <h1 className="text-3xl font-bold text-sky-400">Descubra a Senha</h1>
                <p className="text-slate-300 mt-2">Selecione um desafio ativo para começar.</p>
            </header>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {unlockedChallenges.length > 0 ? unlockedChallenges.map(c => (
                    <div key={c.id} onClick={() => handleSelectChallenge(c)} className="p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-sky-900/50 border-2 border-transparent hover:border-sky-600">
                        <h2 className="font-bold text-lg text-sky-300">{c.title}</h2>
                        <p className="text-sm text-slate-400">Criado por: {c.creatorName}</p>
                    </div>
                )) : (
                    <p className="text-center text-slate-400 py-8">Nenhum desafio de senha para sua turma no momento.</p>
                )}
            </div>
        </div>
      </div>
    );
  }

  if (gameOver) {
      return (
         <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
            <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-2xl">
                 <CompletionRankingScreen challenge={selectedChallenge} onReturnToMenu={resetGame} />
            </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-2xl">
            <button onClick={resetGame} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400 p-2 rounded-lg hover:bg-slate-700 z-10">
                <i className="fas fa-arrow-left mr-2"></i>Voltar aos Desafios
            </button>
            <div className="absolute top-4 right-4 bg-slate-700/80 px-3 py-1.5 rounded-full font-mono text-sm">
                <i className="far fa-clock mr-2"></i>{timeElapsed}
            </div>
             <header className="text-center mb-4">
                <h1 className="text-3xl font-bold text-sky-400">{selectedChallenge.title}</h1>
            </header>
            
            <div className="bg-slate-900/70 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-lg text-cyan-300 mb-2">Dicas</h3>
                <ul className="text-sm space-y-1 text-slate-300 list-disc list-inside">
                    {selectedChallenge.rules.map((rule, i) => <li key={i}>{rule}</li>)}
                </ul>
            </div>
            
            {message && <MessageDisplay message={message} type={messageType} />}

            <GuessInput 
                digitCount={selectedChallenge.digitCount}
                onGuess={handleGuess}
                disabled={gameOver}
            />
            
            <GuessHistory guesses={guesses} />
        </div>
    </div>
  );
};