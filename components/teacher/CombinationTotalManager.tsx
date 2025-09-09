import React, { useState, useMemo, useContext } from 'react';
import { GameDataContext } from '../../contexts/GameDataContext';
import type { UserProfile, ClassData, CombinacaoTotalChallenge, CombinacaoTotalChallengeRules } from '../../types';
import { calculateCombinations } from '../../utils/combinatorics';

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

const CombinationTotalRankingModal: React.FC<{
  challenge: CombinacaoTotalChallenge | null;
  onClose: () => void;
}> = ({ challenge, onClose }) => {
    const { getStudentsInClass } = useContext(GameDataContext);

    const rankedStudents = useMemo(() => {
        if (!challenge) return [];
        const classmates = getStudentsInClass(challenge.classCode);
        return classmates.map(student => {
                const stat = student.combinacaoTotalStats?.find(s => s.challengeId === challenge.id);
                return { name: student.name, avatar: student.avatar, foundCount: stat?.foundCombinations.length || 0, isComplete: stat?.isComplete || false, completionTime: getJsDateFromTimestamp(stat?.completionTimestamp) };
            }).sort((a, b) => {
                if (b.foundCount !== a.foundCount) return b.foundCount - a.foundCount;
                if (a.isComplete && b.isComplete && a.completionTime && b.completionTime) return a.completionTime.getTime() - b.completionTime.getTime();
                if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
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
                                    {student.isComplete && <i className="fas fa-trophy text-yellow-400" title="Desafio Concluído!"></i>}
                                    <span className="text-sm font-mono text-slate-300">{student.foundCount} / {challenge.totalCombinations}</span>
                                </li>
                            ))}
                        </ol>
                    ) : <p className="text-slate-500 text-sm text-center">Nenhum aluno jogou este desafio ainda.</p>}
                </div>
                <button onClick={onClose} className="w-full mt-4 py-2 bg-sky-600 text-white font-bold rounded-lg">Fechar</button>
            </div>
        </div>
    );
};

const RuleCheckbox: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void;}> = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="form-checkbox h-4 w-4 rounded bg-slate-700 border-slate-500 text-sky-500 focus:ring-sky-500" />
        {label}
    </label>
);

interface CombinationTotalManagerProps {
    teacherClasses: ClassData[];
    user: UserProfile;
}

export const CombinationTotalManager: React.FC<CombinationTotalManagerProps> = ({ teacherClasses, user }) => {
    const { createCombinacaoTotalChallenge, combinacaoTotalChallenges, deleteCombinacaoTotalChallenge, unlockCombinacaoTotalChallenge, clearCombinacaoTotalRanking } = useContext(GameDataContext);
    const [rules, setRules] = useState<CombinacaoTotalChallengeRules>({
        digitCount: 3, allowedDigits: '012', noRepetition: false, noConsecutiveDuplicates: false,
        firstDigitNotZero: false, lastDigitMustBeEven: false, lastDigitMustBeOdd: false,
        digitsInAscendingOrder: false, digitsInDescendingOrder: false,
    });
    const [title, setTitle] = useState('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [viewingRanking, setViewingRanking] = useState<CombinacaoTotalChallenge | null>(null);

    const possibleCombinations = useMemo(() => {
        try { setError(''); return calculateCombinations(rules); }
        catch (e: any) { setError(e.message); return []; }
    }, [rules]);

    const handleRuleChange = (field: keyof CombinacaoTotalChallengeRules, value: any) => {
      setRules(prev => ({ ...prev, [field]: value }));
    };
    
    const handleCreateChallenge = async () => {
        setError('');
        if (!title.trim() || !selectedClass) { setError('Título e turma são obrigatórios.'); return; }
        if (possibleCombinations.length === 0) { setError('As regras atuais não geram nenhuma combinação. Verifique as restrições.'); return; }

        const result = await createCombinacaoTotalChallenge({
            title: title.trim(), rules, totalCombinations: possibleCombinations.length, classCode: selectedClass
        });

        if (result.status === 'success') {
            setTitle(''); 
            setSelectedClass('');
            setFeedback('Desafio de Combinação Total criado com sucesso!');
            setTimeout(() => setFeedback(''), 3000);
        } else {
            setError(result.message || 'Erro desconhecido.');
        }
    };
    
    const myChallenges = combinacaoTotalChallenges.filter(c => c.creatorName === user.name);

    return (
        <>
            {viewingRanking && <CombinationTotalRankingModal challenge={viewingRanking} onClose={() => setViewingRanking(null)} />}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/70 p-6 rounded-lg">
                    <h2 className="text-xl font-bold text-sky-300 mb-4">Criar Desafio de Combinação</h2>
                    <div className="space-y-3">
                        <input type="text" placeholder="Título do Desafio" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 bg-slate-800 rounded" />
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2 bg-slate-800 rounded">
                            <option value="" disabled>Selecione uma turma</option>
                            {teacherClasses.map(c => <option key={c.classCode} value={c.classCode}>{c.className}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                                <label className="text-sm">Nº de Posições: {rules.digitCount}</label>
                                <input type="range" min="2" max="5" value={rules.digitCount} onChange={e => handleRuleChange('digitCount', Number(e.target.value))} className="w-full" />
                            </div>
                             <div>
                                <label className="text-sm">Algarismos Permitidos</label>
                                <input type="text" value={rules.allowedDigits} onChange={e => handleRuleChange('allowedDigits', e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-1 bg-slate-800 rounded" />
                            </div>
                            <RuleCheckbox label="Sem repetição" checked={rules.noRepetition} onChange={v => handleRuleChange('noRepetition', v)} />
                            <RuleCheckbox label="Sem consecutivos iguais" checked={rules.noConsecutiveDuplicates} onChange={v => handleRuleChange('noConsecutiveDuplicates', v)} />
                            <RuleCheckbox label="1º dígito não é 0" checked={rules.firstDigitNotZero} onChange={v => handleRuleChange('firstDigitNotZero', v)} />
                            <RuleCheckbox label="Último dígito par" checked={rules.lastDigitMustBeEven} onChange={v => handleRuleChange('lastDigitMustBeEven', v)} />
                            <RuleCheckbox label="Último dígito ímpar" checked={rules.lastDigitMustBeOdd} onChange={v => handleRuleChange('lastDigitMustBeOdd', v)} />
                            <RuleCheckbox label="Ordem crescente" checked={rules.digitsInAscendingOrder} onChange={v => handleRuleChange('digitsInAscendingOrder', v)} />
                        </div>
                        <div className="p-2 text-center bg-slate-800 rounded">
                            Total de Combinações Possíveis: <span className="font-bold text-2xl text-sky-400">{possibleCombinations.length}</span>
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
                                    <div>
                                        <h3 className="font-bold">{c.title} ({c.classCode})</h3>
                                        <p className="text-xs text-slate-400">{c.totalCombinations} combinações</p>
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${c.status === 'locked' ? 'bg-red-800 text-red-300' : 'bg-green-800 text-green-300'}`}>{c.status}</span>
                                </div>
                                <div className="mt-2 flex gap-1 flex-wrap text-xs">
                                    <button onClick={() => setViewingRanking(c)} className="px-2 py-1 bg-indigo-600 rounded">Ranking</button>
                                    {c.status === 'locked' && <button onClick={() => unlockCombinacaoTotalChallenge(c.id)} className="px-2 py-1 bg-green-600 rounded">Desbloquear</button>}
                                    <button onClick={() => clearCombinacaoTotalRanking(c.id)} className="px-2 py-1 bg-yellow-700 rounded">Limpar Ranking</button>
                                    <button onClick={() => deleteCombinacaoTotalChallenge(c.id)} className="px-2 py-1 bg-red-700 rounded">Deletar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {feedback && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in-down">
                    <i className="fas fa-check-circle mr-2"></i>
                    {feedback}
                </div>
            )}
        </>
    );
};