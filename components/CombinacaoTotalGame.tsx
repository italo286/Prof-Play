import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import { ProfileContext } from '../contexts/ProfileContext';
import { MessageDisplay } from './MessageDisplay';
import type { CombinacaoTotalChallenge, MessageType, UserProfile } from '../types';
import { validateCombination } from '../utils/combinatorics';

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

// --- Sub-component for Ranking Screen ---
const CombinationTotalCompletionScreen: React.FC<{
  challenge: CombinacaoTotalChallenge;
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
                const stat = student.combinacaoTotalStats?.find(s => s.challengeId === challenge.id);
                if (!stat || !stat.isComplete || !stat.completionTimestamp) {
                    return null;
                }
                const completionTime = getJsDateFromTimestamp(stat.completionTimestamp);
                return { name: student.name, completionTime };
            })
            .filter((s): s is { name: string; completionTime: Date } => !!s && !!s.completionTime)
            .sort((a, b) => a.completionTime.getTime() - b.completionTime.getTime());
    }, [user, getStudentsInClass, challenge.id, lastUpdated]);

    return (
        <div className="text-center py-6 flex flex-col justify-center items-center gap-4 animate-fade-in-down">
            <h2 className="text-3xl font-bold text-sky-400">Desafio Concluído!</h2>
            <p className="text-slate-300">Você encontrou todas as {challenge.totalCombinations} combinações!</p>
            <div className="w-full bg-slate-900/70 p-4 rounded-lg mt-4 max-h-80 overflow-y-auto">
                <h3 className="font-bold text-lg text-cyan-300 mb-3">Ranking: {challenge.title}</h3>
                {rankedStudents.length > 0 ? (
                    <ol className="space-y-2 text-left">
                        {rankedStudents.map((student, index) => {
                             const isCurrentUser = student.name === user?.name;
                             return (
                                <li key={student.name} className={`flex items-center gap-3 p-2 rounded ${isCurrentUser ? 'bg-sky-800 border-2 border-sky-500' : 'bg-slate-800'}`}>
                                    <span className={`w-6 text-center font-bold ${index < 3 ? 'text-yellow-400' : 'text-slate-400'}`}>{index + 1}</span>
                                    <span className="font-semibold text-slate-100 flex-grow">{student.name}</span>
                                    <span className="text-sm text-slate-300">{student.completionTime.toLocaleString('pt-BR')}</span>
                                </li>
                             );
                        })}
                    </ol>
                ) : (
                    <p className="text-slate-500 text-sm">Aguardando outros jogadores...</p>
                )}
            </div>
            <button onClick={onBack} className="w-full sm:w-auto mt-4 px-6 py-3 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 transition-colors">
              <i className="fas fa-home mr-2"></i>Voltar aos Desafios
            </button>
        </div>
    );
};


// Sub-component for a single game session
const GameView: React.FC<{ challenge: CombinacaoTotalChallenge, onBack: () => void }> = ({ challenge, onBack }) => {
    const { user } = useContext(AuthContext);
    const { getStudentsInClass } = useContext(GameDataContext);
    const { logCombinacaoTotalAttempt } = useContext(ProfileContext);
    const [attempt, setAttempt] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<MessageType>('info');
    
    const myStat = useMemo(() => {
        return user?.combinacaoTotalStats?.find(s => s.challengeId === challenge.id) || { challengeId: challenge.id, foundCombinations: [], isComplete: false };
    }, [user, challenge.id]);
    
    // Use data directly from context to avoid state synchronization bugs
    const foundCombinations = myStat.foundCombinations;

    const classmates = useMemo(() => {
        if (!user?.classCode) return [];
        return getStudentsInClass(user.classCode);
    }, [user, getStudentsInClass]);

    const rankedClassmates = useMemo(() => {
        // This dependency ensures the ranking updates when any student's data changes
        const allStats = classmates.map(s => s.combinacaoTotalStats).flat(); 
        
        return classmates
            .map(student => {
                const stat = student.combinacaoTotalStats?.find(s => s.challengeId === challenge.id);
                const foundCount = stat?.foundCombinations.length || 0;
                return { name: student.name, foundCount };
            })
            .sort((a, b) => b.foundCount - a.foundCount);
    }, [classmates, challenge.id]);


    const totalCount = challenge.totalCombinations;
    const isComplete = myStat.isComplete;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!attempt.trim() || isComplete) return;

        const validation = validateCombination(attempt, challenge.rules, foundCombinations);
        
        setMessage(validation.message);
        if (validation.isValid && validation.isNew) {
            setMessageType('success');
            logCombinacaoTotalAttempt(challenge.id, attempt);
        } else if (validation.isValid && !validation.isNew) {
            setMessageType('info');
        } else {
            setMessageType('error');
        }
        setAttempt('');
    };

    if (isComplete) {
        return <CombinationTotalCompletionScreen challenge={challenge} onBack={onBack} />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full">
            {/* Left Panel: Rules & Input */}
            <div className="lg:col-span-3">
                <div className="bg-slate-900/70 p-4 rounded-lg mb-4">
                    <h3 className="font-bold text-lg text-sky-300 mb-2">Regras do Desafio</h3>
                    <ul className="text-sm space-y-1 text-slate-300 list-disc list-inside">
                        <li>A combinação tem {challenge.rules.digitCount} posições.</li>
                        <li>Use apenas os algarismos: <span className="font-mono bg-slate-700 px-1 rounded">{challenge.rules.allowedDigits}</span></li>
                        {challenge.rules.noRepetition && <li>Sem repetição de dígitos.</li>}
                        {challenge.rules.noConsecutiveDuplicates && <li>Sem dígitos consecutivos iguais.</li>}
                        {challenge.rules.firstDigitNotZero && <li>O primeiro dígito não pode ser 0.</li>}
                        {challenge.rules.lastDigitMustBeEven && <li>O último dígito deve ser par.</li>}
                        {challenge.rules.lastDigitMustBeOdd && <li>O último dígito deve ser ímpar.</li>}
                        {challenge.rules.digitsInAscendingOrder && <li>Os dígitos devem estar em ordem crescente.</li>}
                        {challenge.rules.digitsInDescendingOrder && <li>Os dígitos devem estar em ordem decrescente.</li>}
                        {challenge.rules.mustContainDigit && <li>Deve conter o dígito '{challenge.rules.mustContainDigit}'.</li>}
                        {challenge.rules.specificConsecutiveDisallowed && <li>A sequência "{challenge.rules.specificConsecutiveDisallowed}" é proibida.</li>}
                        {challenge.rules.sumOfDigits !== undefined && <li>A soma dos dígitos deve ser {challenge.rules.sumOfDigits}.</li>}
                    </ul>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                     <input
                        type="text"
                        inputMode="numeric"
                        value={attempt}
                        onChange={(e) => setAttempt(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full p-4 text-center text-2xl font-mono border-2 border-slate-600 rounded-md bg-slate-700 text-white focus:ring-2 focus:ring-sky-500"
                        maxLength={challenge.rules.digitCount}
                        placeholder={Array(challenge.rules.digitCount).fill('_').join(' ')}
                        required
                    />
                    <button type="submit" className="w-full py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700">Verificar</button>
                </form>

                {message && <MessageDisplay message={message} type={messageType} />}
                
                <div className="bg-slate-900/70 p-4 rounded-lg mt-4">
                    <h3 className="font-bold text-lg text-cyan-300 mb-2">Suas Combinações ({foundCombinations.length} / {totalCount})</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-2">
                        {[...foundCombinations].sort().map(c => (
                            <div key={c} className="p-2 bg-slate-700 text-center font-mono rounded-md animate-fade-in-down">
                                {c}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel: Progress */}
            <div className="bg-slate-900/70 p-4 rounded-lg lg:col-span-2">
                <h3 className="font-bold text-lg text-cyan-300 mb-2">Ranking da Turma</h3>
                <div className="space-y-2 max-h-[34rem] overflow-y-auto pr-2">
                    {rankedClassmates.map((student, index) => {
                         const percentage = totalCount > 0 ? (student.foundCount / totalCount) * 100 : 0;
                         const isCurrentUser = student.name === user?.name;
                         return (
                            <div key={student.name} className={`p-2 rounded-md ${isCurrentUser ? 'bg-sky-800/50' : 'bg-slate-800'}`}>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className={`w-6 text-center font-bold ${index < 3 ? 'text-yellow-400' : 'text-slate-400'}`}>{index + 1}.</span>
                                    <span className="font-semibold text-slate-100 flex-grow truncate">{student.name}</span>
                                    <span className="font-mono text-slate-300">{student.foundCount}/{totalCount}</span>
                                </div>
                                <div className="w-full bg-slate-600 rounded-full h-1.5 mt-1">
                                    <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${percentage}%`}}></div>
                                </div>
                            </div>
                         );
                    })}
                </div>
            </div>
        </div>
    );
};


// Main component for the game mode
export const CombinacaoTotalGame: React.FC<{ onReturnToMenu: () => void }> = ({ onReturnToMenu }) => {
    const { user } = useContext(AuthContext);
    const { combinacaoTotalChallenges } = useContext(GameDataContext);
    const [selectedChallenge, setSelectedChallenge] = useState<CombinacaoTotalChallenge | null>(null);
    
    if (!user) return null;

    const availableChallenges = combinacaoTotalChallenges
        .filter(c => c.classCode === user.classCode && c.status === 'unlocked')
        .filter(c => {
            const stat = user.combinacaoTotalStats?.find(s => s.challengeId === c.id);
            return !stat || !stat.isComplete;
        });

    const resetGame = () => {
        setSelectedChallenge(null);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
            <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-5xl">
                <button onClick={selectedChallenge ? resetGame : onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400 transition-colors z-10 flex items-center p-2 rounded-lg hover:bg-slate-700">
                    <i className="fas fa-arrow-left mr-2"></i>
                    <span>{selectedChallenge ? 'Voltar aos Desafios' : 'Menu Principal'}</span>
                </button>
                 <header className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
                        {selectedChallenge ? selectedChallenge.title : 'Combinação Total'}
                    </h1>
                </header>

                {selectedChallenge ? (
                    <GameView challenge={selectedChallenge} onBack={resetGame} />
                ) : (
                    // Lobby View
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                         {availableChallenges.length > 0 ? availableChallenges.map(challenge => {
                            const stat = user.combinacaoTotalStats?.find(s => s.challengeId === challenge.id);
                            const foundCount = stat?.foundCombinations.length || 0;
                            const isComplete = stat?.isComplete || false;

                            return (
                                <div key={challenge.id} onClick={() => setSelectedChallenge(challenge)} 
                                    className={`p-4 rounded-lg cursor-pointer transition-all border-2 bg-slate-700 border-transparent hover:bg-sky-900/50 hover:border-sky-600`}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="font-bold text-lg text-sky-300">{challenge.title}</h2>
                                            <p className="text-sm text-slate-400">Criado por: {challenge.creatorName}</p>
                                        </div>
                                        {isComplete ? (
                                            <div className="text-center text-green-400">
                                                <i className="fas fa-check-circle text-2xl"></i>
                                                <p className="text-xs font-bold">Concluído</p>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <p className="font-bold text-xl">{foundCount} / {challenge.totalCombinations}</p>
                                                <p className="text-xs text-slate-400">encontradas</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-center text-slate-400 py-8">Nenhum desafio de Combinação Total para sua turma no momento.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};