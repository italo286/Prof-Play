import React, { useState, useEffect, useContext, useMemo } from 'react';
import { GameDataContext } from '../../contexts/GameDataContext';
import type { ClassData, AdedonhaSession } from '../../types';

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
    return <div className={`text-4xl font-mono font-bold ${color}`}>{timeLeft}s</div>;
};

const AdedonhaSessionView: React.FC<{ session: AdedonhaSession }> = ({ session }) => {
    const { 
        activeAdedonhaRound, adedonhaSubmissions, startAdedonhaRound, updateSubmissionScore, 
        finalizeRound, endAdedonhaRoundForScoring, endAdedonhaSession, getStudentsInClass
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
            const roundDuration = activeAdedonhaRound.duration || 45;
            const endTime = startTime.getTime() + roundDuration * 1000;
            const remainingTime = endTime - Date.now();
            if (remainingTime > 0) {
                const timerId = setTimeout(() => { endAdedonhaRoundForScoring(activeAdedonhaRound.id); }, remainingTime);
                return () => clearTimeout(timerId);
            }
        }
    }, [activeAdedonhaRound, endAdedonhaRoundForScoring]);

    const handleStartRound = () => {
        if (theme.trim() && letter.trim()) {
            startAdedonhaRound(session.id, theme.trim(), letter.trim().toUpperCase(), duration);
            setTheme('');
            setLetter('');
        }
    };
    
    const handleRandomLetter = () => {
        const alphabet = 'ABCDEFGHIJKLMNOPRSTUVZ';
        setLetter(alphabet[Math.floor(Math.random() * alphabet.length)]);
    }
    
    const renderGameControl = () => {
        if (!activeAdedonhaRound || activeAdedonhaRound.status === 'finished') {
            return (
                <div className="bg-slate-700 p-6 rounded-lg shadow-inner">
                    <h3 className="text-lg font-bold text-cyan-300 mb-2">Iniciar Nova Rodada</h3>
                    <div className="space-y-3">
                        <input type="text" value={theme} onChange={e => setTheme(e.target.value)} placeholder="Tema (Ex: Fruta)" className="w-full p-2 bg-slate-800 rounded border border-slate-600"/>
                        <div className="flex gap-2">
                           <input type="text" value={letter} onChange={e => setLetter(e.target.value)} placeholder="Letra" maxLength={1} className="flex-grow p-2 bg-slate-800 rounded border border-slate-600"/>
                           <button onClick={handleRandomLetter} className="px-3 bg-sky-600 hover:bg-sky-700 rounded" title="Sortear Letra"><i className="fas fa-random"></i></button>
                        </div>
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
                    <CountdownTimer startTime={activeAdedonhaRound.startTime} duration={activeAdedonhaRound.duration} />
                    <p>Tema: <span className="font-bold">{activeAdedonhaRound.theme}</span> | Letra: <span className="font-bold">{activeAdedonhaRound.letter}</span></p>
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
                                        {[0, 5, 10].map(score => (
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
                    <button onClick={() => finalizeRound(session.id, activeAdedonhaRound.id)} className="w-full mt-3 py-2 bg-green-600 font-bold rounded">Finalizar Avaliação e Pontuar</button>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-amber-800/10 p-4 rounded-lg" style={{backgroundImage: `url('https://www.transparenttextures.com/patterns/wood-pattern.png')`}}>
            <div className="md:col-span-1 bg-slate-900/70 p-4 rounded-lg shadow-lg">
                <h3 className="text-lg font-bold text-cyan-300 mb-2">Placar da Partida</h3>
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
                <button onClick={() => endAdedonhaSession(session.id)} className="w-full mt-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700">
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

export const AdedonhaManager: React.FC<{ teacherClasses: ClassData[] }> = ({ teacherClasses }) => {
    const { activeAdedonhaSession, createAdedonhaSession } = useContext(GameDataContext);
    const [selectedClass, setSelectedClass] = useState<string>('');

    const handleStartSession = async () => {
        if (selectedClass) await createAdedonhaSession(selectedClass);
    };
    
    if (activeAdedonhaSession) {
        return <AdedonhaSessionView session={activeAdedonhaSession} />;
    }

    return (
        <div className="bg-slate-900/70 p-6 rounded-lg text-center">
            <h2 className="text-xl font-bold text-sky-300 mb-4">Iniciar Jogo de Adedonha</h2>
            <p className="text-slate-300 mb-4">Selecione uma turma para começar uma nova partida.</p>
            <div className="flex gap-2 justify-center">
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 border border-slate-600 rounded-md bg-slate-700 text-white">
                    <option value="" disabled>Selecione uma turma</option>
                    {teacherClasses.map(c => <option key={c.classCode} value={c.classCode}>{c.className}</option>)}
                </select>
                <button onClick={handleStartSession} disabled={!selectedClass} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-slate-500">
                    Iniciar Sessão
                </button>
            </div>
        </div>
    );
};