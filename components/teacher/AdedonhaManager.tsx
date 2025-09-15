import React, { useState, useEffect, useContext, useMemo } from 'react';
import { GameDataContext } from '../../contexts/GameDataContext';
import type { ClassData, AdedonhaSession, AdedonhaSubmission } from '../../types';
import { CountdownTimer } from '../CountdownTimer';

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

const AdedonhaSessionView: React.FC<{ session: AdedonhaSession, onEnd: (session: AdedonhaSession) => void, onGoBackToLobby?: () => void }> = ({ session, onEnd, onGoBackToLobby }) => {
    const { 
        activeAdedonhaRound, adedonhaSubmissions, startAdedonhaRound, updateSubmissionScore, 
        finalizeRound, endAdedonhaRoundForScoring, getStudentsInClass
    } = useContext(GameDataContext);
    const [theme, setTheme] = useState('');
    const [letter, setLetter] = useState('');
    const [duration, setDuration] = useState(45);

    const studentsInClass = useMemo(() => getStudentsInClass(session.classCode), [session.classCode, getStudentsInClass]);
    const avatarMap = useMemo(() => new Map(studentsInClass.map(s => [s.name, s.avatar])), [studentsInClass]);

    useEffect(() => {
        if (activeAdedonhaRound?.status === 'playing' && activeAdedonhaRound.startTime) {
            const startTime = getJsDateFromTimestamp(activeAdedonhaRound.startTime);
            if (!startTime) return;
            
            const roundDuration = activeAdedonhaRound.duration;
            const endTime = startTime.getTime() + roundDuration * 1000;
            const remainingTime = endTime - Date.now();

            if (remainingTime <= 0) {
                endAdedonhaRoundForScoring(activeAdedonhaRound.id);
            } else {
                const timerId = setTimeout(() => {
                    endAdedonhaRoundForScoring(activeAdedonhaRound.id);
                }, remainingTime);
                return () => clearTimeout(timerId);
            }
        }
    }, [activeAdedonhaRound, endAdedonhaRoundForScoring]);

    const handleStartRound = () => {
        if (theme.trim() && (session.type === 'tapple' || letter.trim())) {
            startAdedonhaRound(session.id, theme.trim(), letter.trim().toUpperCase(), duration);
            setTheme('');
            setLetter('');
        }
    };
    
    const handleRandomLetter = () => {
        const alphabet = 'ABCDEFGHIJKLMNOPRSTUVZ';
        setLetter(alphabet[Math.floor(Math.random() * alphabet.length)]);
    }

    if (session.status === 'finished' && onGoBackToLobby) {
        return (
            <div className="text-center p-6 bg-slate-900/70 rounded-lg shadow-lg animate-fade-in">
                <i className="fas fa-trophy text-5xl text-amber-400 mb-4"></i>
                <h2 className="text-2xl font-bold text-slate-100">Sessão Encerrada</h2>
                <p className="text-slate-400 mb-4">Confira o placar final!</p>
                 <div className="md:col-span-1 bg-slate-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-bold text-cyan-300 mb-2">Placar Final</h3>
                    <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-2">
                        {Object.entries(session.scores).sort(([,a],[,b]) => b - a).map(([name, score]) => {
                            const avatar = avatarMap.get(name);
                            return (
                                <div key={name} className="flex justify-between items-center p-2 bg-slate-700 rounded">
                                    <div className="flex items-center gap-2">
                                        {avatar && <img src={avatar} alt={`Avatar de ${name}`} className="w-8 h-8 rounded-full bg-slate-600"/>}
                                        <span className="font-semibold">{name}</span>
                                    </div>
                                    <span className="font-bold text-sky-300">{score} pontos</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <button onClick={onGoBackToLobby} className="w-full mt-4 py-2 bg-sky-600 text-white font-bold rounded hover:bg-sky-700">
                    <i className="fas fa-arrow-left mr-2"></i>Voltar ao Lobby
                </button>
            </div>
        )
    }
    
    const renderGameControl = () => {
        if (!activeAdedonhaRound || activeAdedonhaRound.status === 'finished') {
            return (
                <div className="bg-slate-700 p-6 rounded-lg shadow-inner">
                    <h3 className="text-lg font-bold text-cyan-300 mb-2">Iniciar Nova Rodada</h3>
                    <div className="space-y-3">
                        <input type="text" value={theme} onChange={e => setTheme(e.target.value)} placeholder="Tema (Ex: Fruta)" className="w-full p-2 bg-slate-800 rounded border border-slate-600"/>
                        {session.type === 'simples' && (
                            <div className="flex gap-2">
                               <input type="text" value={letter} onChange={e => setLetter(e.target.value)} placeholder="Letra" maxLength={1} className="flex-grow p-2 bg-slate-800 rounded border border-slate-600"/>
                               <button onClick={handleRandomLetter} className="px-3 bg-sky-600 hover:bg-sky-700 rounded" title="Sortear Letra"><i className="fas fa-random"></i></button>
                            </div>
                        )}
                        <div>
                            <label className="text-sm text-slate-400">Duração: {duration}s</label>
                            <input type="range" min="15" max="60" step="5" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full"/>
                        </div>
                        <button onClick={handleStartRound} className="w-full py-2 bg-green-600 font-bold rounded">Iniciar Rodada</button>
                    </div>
                </div>
            );
        }
        if (activeAdedonhaRound.status === 'playing') {
             return (
                <div className="text-center bg-slate-700 p-6 rounded-lg shadow-inner">
                    <h3 className="text-lg font-bold text-cyan-300 mb-2">Rodada em Andamento</h3>
                    <CountdownTimer 
                        key={activeAdedonhaRound.id} 
                        startTime={activeAdedonhaRound.startTime} 
                        duration={activeAdedonhaRound.duration} 
                        showProgressBar={false}
                        textClassName="text-4xl"
                    />
                    <p>Tema: <span className="font-bold">{activeAdedonhaRound.theme}</span> 
                        {session.type === 'simples' && ` | Letra: `}
                        {session.type === 'simples' && <span className="font-bold">{activeAdedonhaRound.letter}</span>}
                    </p>
                    <div className="mt-4">
                        <h4 className="text-sm font-bold text-slate-300 mb-2">Submissões ({adedonhaSubmissions.length}/{studentsInClass.length})</h4>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {studentsInClass.map(student => {
                                const submitted = adedonhaSubmissions.some(s => s.studentName === student.name);
                                return <span key={student.name} className={`px-2 py-1 text-xs rounded-full ${submitted ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}>{student.name}</span>
                            })}
                        </div>
                    </div>
                </div>
            );
        }
        if (activeAdedonhaRound.status === 'scoring') {
            const scoreOptions = session.type === 'simples' ? [0, 5, 10] : [0, 10];
            return (
                <div className="bg-slate-700 p-6 rounded-lg shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-bold text-cyan-300">Avaliar Respostas</h3>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {adedonhaSubmissions.map(sub => {
                            const validationIcon = sub.isValid === true ? 'fa-check-circle text-green-400' : sub.isValid === false ? 'fa-times-circle text-red-400' : 'fa-question-circle text-slate-500';
                            return(
                                <div key={sub.id} className="p-2 bg-slate-800 rounded flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <i className={`fas ${validationIcon}`}></i>
                                        <span className="font-semibold flex-grow">{sub.studentName}: <span className="italic text-slate-300">{sub.answer || '(vazio)'}</span></span>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center gap-1">
                                        {scoreOptions.map(score => (
                                            <button key={score} onClick={() => updateSubmissionScore(sub.id, score)}
                                                    className={`w-10 h-8 rounded text-xs font-bold ${sub.finalScore === score ? 'bg-sky-500' : 'bg-slate-600 hover:bg-slate-500'}`}>
                                                {score}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={() => finalizeRound(session.id, activeAdedonhaRound.id, adedonhaSubmissions)} className="w-full mt-3 py-2 bg-green-600 font-bold rounded">Finalizar Avaliação e Pontuar</button>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-lg">
            <div className="md:col-span-1 bg-slate-900/70 p-4 rounded-lg shadow-lg">
                <h3 className="text-lg font-bold text-cyan-300 mb-2">Placar da Partida ({session.type === 'tapple' ? 'Tapple' : 'Simples'})</h3>
                <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-2">
                    {Object.entries(session.scores).sort(([,a],[,b]) => b - a).map(([name, score]) => {
                        const avatar = avatarMap.get(name);
                        return (
                            <div key={name} className="flex justify-between items-center p-2 bg-slate-800 rounded">
                                <div className="flex items-center gap-2">
                                    {avatar && <img src={avatar} alt={`Avatar de ${name}`} className="w-8 h-8 rounded-full bg-slate-600"/>}
                                    <span className="font-semibold">{name}</span>
                                </div>
                                <span className="font-bold text-sky-300">{score} pontos</span>
                            </div>
                        );
                    })}
                </div>
                <button onClick={() => onEnd(session)} className="w-full mt-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700">
                    <i className="fas fa-stop-circle mr-2"></i>Encerrar Sessão
                </button>
            </div>
            <div className="md:col-span-2">
                <h2 className="text-2xl font-bold text-center mb-4 text-slate-100">Mesa do Professor</h2>
                {renderGameControl()}
            </div>
        </div>
    );
};

export const AdedonhaManager: React.FC<{ selectedClass: ClassData }> = ({ selectedClass }) => {
    const { activeAdedonhaSession, createAdedonhaSession, endAdedonhaSession } = useContext(GameDataContext);
    const [finishedSession, setFinishedSession] = useState<AdedonhaSession | null>(null);

    const sessionToRender = useMemo(() => {
        if(activeAdedonhaSession && activeAdedonhaSession.classCode === selectedClass.classCode) {
            return activeAdedonhaSession;
        }
        if(finishedSession && finishedSession.classCode === selectedClass.classCode) {
            return finishedSession;
        }
        return null;
    }, [activeAdedonhaSession, finishedSession, selectedClass]);

    const handleStartSession = async (type: 'simples' | 'tapple') => {
        if (selectedClass) {
            setFinishedSession(null);
            await createAdedonhaSession(selectedClass.classCode, type);
        }
    };
    
    const handleEndSession = (sessionData: AdedonhaSession) => {
        endAdedonhaSession(sessionData.id);
        setFinishedSession({ ...sessionData, status: 'finished' });
    };

    if (sessionToRender) {
        return <AdedonhaSessionView session={sessionToRender} onEnd={handleEndSession} onGoBackToLobby={() => setFinishedSession(null)} />;
    }
    
    if (activeAdedonhaSession) {
         return (
            <div className="bg-slate-900/70 p-6 rounded-lg text-center">
                <p className="text-amber-400"><i className="fas fa-exclamation-triangle mr-2"></i>Você já tem uma sessão de Adedonha ativa em outra turma. Encerre-a para iniciar uma nova aqui.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/70 p-6 rounded-lg text-center">
            <h2 className="text-xl font-bold text-sky-300 mb-4">Iniciar Jogo de Adedonha</h2>
            <p className="text-slate-300 mb-4">Selecione o modo de jogo para a turma <span className="font-bold">{selectedClass.className}</span>.</p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
                <button onClick={() => handleStartSession('simples')} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">
                    <i className="fas fa-pen-alt mr-2"></i>Iniciar Adedonha Simples
                </button>
                 <button onClick={() => handleStartSession('tapple')} className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700">
                    <i className="fas fa-font mr-2"></i>Iniciar Adedonha Tapple
                </button>
            </div>
        </div>
    );
};
