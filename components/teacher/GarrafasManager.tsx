import React, { useState, useMemo, useContext, useEffect } from 'react';
import { GameDataContext } from '../../contexts/GameDataContext';
import type { UserProfile, ClassData, GarrafasChallenge } from '../../types';
import { GARRAFAS_IMAGES } from '../../data/games';

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

const RankingModal: React.FC<{ challenge: GarrafasChallenge | null; onClose: () => void; }> = ({ challenge, onClose }) => {
    const { getStudentsInClass } = useContext(GameDataContext);
    const [lastUpdated, setLastUpdated] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setLastUpdated(Date.now()), 5000); // Poll for updates
        return () => clearInterval(timer);
    }, []);

    const { completedStudents, inProgressStudents } = useMemo(() => {
        if (!challenge) return { completedStudents: [], inProgressStudents: [] };
        const classmates = getStudentsInClass(challenge.classCode);
        
        const allStudentStats = classmates.map(student => {
            const stat = student.garrafasStats?.find(s => s.challengeId === challenge.id);
            return { name: student.name, avatar: student.avatar, attempts: stat?.attempts || 0, isComplete: stat?.isComplete || false, completionTime: getJsDateFromTimestamp(stat?.completionTimestamp) };
        });

        const completed = allStudentStats
            .filter((s): s is { name: string; avatar: string | undefined; attempts: number; isComplete: true; completionTime: Date; } => s.isComplete && !!s.completionTime)
            .sort((a, b) => a.completionTime!.getTime() - b.completionTime!.getTime());

        const inProgress = allStudentStats
            .filter(s => !s.isComplete)
            .sort((a, b) => b.attempts - a.attempts); // Sort by most attempts first
        
        console.log('[Professor] Verificando ranking Garrafas:', { 
            timestamp: new Date().toLocaleTimeString(),
            challengeId: challenge.id,
            totalAlunosNaTurma: classmates.length,
            alunosCompletos: completed.length
        });

        return { completedStudents: completed, inProgressStudents: inProgress };
    }, [challenge, getStudentsInClass, lastUpdated]);


    if (!challenge) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 shadow-2xl rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-center text-sky-400 mb-4">Ranking: {challenge.title}</h2>
                <div className="w-full bg-slate-900/70 p-4 rounded-lg mt-4 max-h-[70vh] overflow-y-auto">
                    
                    {/* Completed Section */}
                    <h3 className="font-bold text-lg text-green-400 mb-2">Concluído ({completedStudents.length})</h3>
                    {completedStudents.length > 0 ? (
                        <ol className="space-y-2 text-left mb-6">
                            {completedStudents.map((student, index) => (
                                <li key={student.name} className="p-3 rounded bg-slate-800 flex items-center gap-3">
                                    <span className={`w-6 text-center font-bold ${index < 3 ? 'text-yellow-400' : 'text-slate-400'}`}>{index + 1}</span>
                                    {student.avatar && <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-full"/>}
                                    <div className="flex-grow">
                                        <span className="font-semibold text-slate-100">{student.name}</span>
                                        <span className="block text-xs text-slate-400">{student.completionTime?.toLocaleString('pt-BR')}</span>
                                    </div>
                                    <span className="text-sm font-mono text-slate-300">{student.attempts} trocas</span>
                                </li>
                            ))}
                        </ol>
                    ) : <p className="text-slate-500 text-sm mb-4">Nenhum aluno completou o desafio ainda.</p>}

                    {/* In Progress Section */}
                    <h3 className="font-bold text-lg text-amber-400 mb-2">Em Progresso ({inProgressStudents.length})</h3>
                    {inProgressStudents.length > 0 ? (
                        <ul className="space-y-2 text-left">
                            {inProgressStudents.map((student) => (
                                <li key={student.name} className="p-3 rounded bg-slate-800/50 flex items-center gap-3">
                                    <div className="w-6 text-center text-slate-500"><i className="fas fa-hourglass-half"></i></div>
                                    {student.avatar && <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-full"/>}
                                    <span className="font-semibold text-slate-100 flex-grow">{student.name}</span>
                                    <span className="text-sm font-mono text-slate-300">{student.attempts} trocas</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-slate-500 text-sm">Todos os alunos completaram o desafio!</p>}
                </div>
                <button onClick={onClose} className="w-full mt-4 py-2 bg-sky-600 text-white font-bold rounded-lg">Fechar</button>
            </div>
        </div>
    );
};

interface GarrafasManagerProps {
    selectedClass: ClassData;
    user: UserProfile;
}

export const GarrafasManager: React.FC<GarrafasManagerProps> = ({ selectedClass, user }) => {
    const { createGarrafasChallenge, garrafasChallenges, deleteGarrafasChallenge, unlockGarrafasChallenge, clearGarrafasRanking } = useContext(GameDataContext);
    
    const [title, setTitle] = useState('');
    const [correctOrder, setCorrectOrder] = useState<number[]>([0,1,2,3,4,5]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [viewingRanking, setViewingRanking] = useState<GarrafasChallenge | null>(null);

    const handleBottleClick = (index: number) => {
        if (selectedIndex === null) {
            setSelectedIndex(index);
        } else {
            const newOrder = [...correctOrder];
            [newOrder[selectedIndex], newOrder[index]] = [newOrder[index], newOrder[selectedIndex]];
            setCorrectOrder(newOrder);
            setSelectedIndex(null);
        }
    };
    
    const handleCreateChallenge = async () => {
        setError('');
        if (!title.trim()) { setError('Título é obrigatório.'); return; }

        const result = await createGarrafasChallenge({ title: title.trim(), correctOrder, classCode: selectedClass.classCode });
        if (result.status === 'success') {
            setTitle('');
            setCorrectOrder([0,1,2,3,4,5]);
            setFeedback('Desafio criado com sucesso!');
            setTimeout(() => setFeedback(''), 3000);
        } else {
            setError(result.message || 'Erro desconhecido.');
        }
    };
    
    const myChallenges = garrafasChallenges.filter(c => c.creatorName === user.name && c.classCode === selectedClass.classCode);

    return (
        <>
            {viewingRanking && <RankingModal challenge={viewingRanking} onClose={() => setViewingRanking(null)} />}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/70 p-6 rounded-lg">
                    <h2 className="text-xl font-bold text-sky-300 mb-4">Criar Desafio das Garrafas</h2>
                    <div className="space-y-4">
                        <input type="text" placeholder="Título do Desafio" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 bg-slate-800 rounded"/>
                        <div>
                            <label className="text-sm text-slate-300">Defina a sequência correta:</label>
                             <p className="text-xs text-slate-400 mb-2">Clique em duas garrafas para trocar suas posições.</p>
                            <div className="grid grid-cols-6 gap-2 p-2 bg-slate-800 rounded-lg">
                                {correctOrder.map((bottleIndex, i) => (
                                    <div key={i} onClick={() => handleBottleClick(i)}
                                        className={`p-1 rounded-md cursor-pointer transition-all ${selectedIndex === i ? 'bg-sky-500 scale-105' : 'hover:bg-slate-700'}`}>
                                        <img src={GARRAFAS_IMAGES[bottleIndex]} alt={`Garrafa ${bottleIndex + 1}`} className="w-full"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <button onClick={handleCreateChallenge} className="w-full py-2 bg-green-600 font-bold rounded">Criar</button>
                    </div>
                </div>
                <div className="bg-slate-900/70 p-6 rounded-lg">
                    <h2 className="text-xl font-bold text-sky-300 mb-4">Desafios Criados</h2>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {myChallenges.map(c => (
                            <div key={c.id} className="p-3 bg-slate-800 rounded">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold">{c.title}</h3>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${c.status === 'locked' ? 'bg-red-800 text-red-300' : 'bg-green-800 text-green-300'}`}>{c.status}</span>
                                </div>
                                <div className="grid grid-cols-6 gap-1 my-2">
                                    {c.correctOrder.map(bottleIndex => <img key={bottleIndex} src={GARRAFAS_IMAGES[bottleIndex]} className="w-8 h-auto"/>)}
                                </div>
                                <div className="mt-2 flex gap-1 flex-wrap text-xs">
                                    <button onClick={() => setViewingRanking(c)} className="px-2 py-1 bg-indigo-600 rounded">Ranking</button>
                                    {c.status === 'locked' && <button onClick={() => unlockGarrafasChallenge(c.id)} className="px-2 py-1 bg-green-600 rounded">Desbloquear</button>}
                                    <button onClick={() => clearGarrafasRanking(c.id)} className="px-2 py-1 bg-yellow-700 rounded">Limpar Rank</button>
                                    <button onClick={() => deleteGarrafasChallenge(c.id)} className="px-2 py-1 bg-red-700 rounded">Deletar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {feedback && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full">{feedback}</div>}
        </>
    );
};