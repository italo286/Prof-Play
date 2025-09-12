import React, { useMemo, useContext } from 'react';
import { GameDataContext } from '../../contexts/GameDataContext';
import type { PasswordChallenge } from '../../types';

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

const GAME_ID_PREFIX = 'password_unlock_';

export const PasswordRankingModal: React.FC<{
  challenge: PasswordChallenge | null;
  onClose: () => void;
}> = ({ challenge, onClose }) => {
    const { getStudentsInClass } = useContext(GameDataContext);

    const rankedStudents = useMemo(() => {
        if (!challenge) return [];
        const classmates = getStudentsInClass(challenge.classCode);
        const gameId = `${GAME_ID_PREFIX}${challenge.id}`;
        
        return classmates
            .map(student => {
                const stats = student.gameStats?.[gameId];
                if (!stats || !stats.completionTimestamp) {
                    return null;
                }
                const attempts = stats.successFirstTry + stats.successOther + stats.errors;
                const completionTime = getJsDateFromTimestamp(stats.completionTimestamp);
                return { name: student.name, avatar: student.avatar, attempts, completionTime };
            })
            // FIX: Updated the type predicate to correctly handle the optional `avatar` property.
            .filter((s): s is { name: string; avatar: string | undefined; attempts: number; completionTime: Date } => !!s && !!s.completionTime)
            .sort((a, b) => a.completionTime.getTime() - b.completionTime.getTime());
    }, [challenge, getStudentsInClass]);

    if (!challenge) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in-down" onClick={onClose}>
            <div className="bg-slate-800 shadow-2xl rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-center text-sky-400 mb-4">Ranking: {challenge.title}</h2>
                 <div className="w-full bg-slate-900/70 p-4 rounded-lg mt-4 max-h-96 overflow-y-auto">
                    {rankedStudents.length > 0 ? (
                        <ol className="space-y-2 text-left">
                            {rankedStudents.map((student, index) => (
                                <li key={student.name} className="p-3 rounded bg-slate-800 flex items-center gap-3">
                                    <span className={`w-6 text-center font-bold ${index < 3 ? 'text-yellow-400' : 'text-slate-400'}`}>{index + 1}</span>
                                    {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-8 h-8 rounded-full bg-slate-700"/>}
                                    <span className="font-semibold text-slate-100 flex-grow">{student.name}</span>
                                    <span className="text-sm font-mono text-slate-300">{student.attempts} tent.</span>
                                </li>
                            ))}
                        </ol>
                    ) : <p className="text-slate-500 text-sm text-center">Nenhum aluno completou este desafio ainda.</p>}
                </div>
                <button onClick={onClose} className="w-full mt-4 py-2 bg-sky-600 text-white font-bold rounded-lg">Fechar</button>
            </div>
        </div>
    );
};
