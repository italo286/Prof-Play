import React, { useState, useEffect, useContext } from 'react';
import { GameDataContext } from '../../contexts/GameDataContext';
import type { ClassData, PasswordChallenge } from '../../types';
import { PasswordRankingModal } from './PasswordRankingModal';

const ChallengeForm: React.FC<{
    initialData?: PasswordChallenge | null;
    onSave: (data: Omit<PasswordChallenge, 'id' | 'creatorName' | 'status' | 'unlockedTimestamp'>, id?: string) => Promise<boolean>;
    onCancel?: () => void;
    teacherClasses: ClassData[];
}> = ({ initialData, onSave, onCancel, teacherClasses }) => {
    const [title, setTitle] = useState('');
    const [password, setPassword] = useState('');
    const [rules, setRules] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [error, setError] = useState('');
    const isEditing = !!initialData;

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setPassword(initialData.password);
            setRules(initialData.rules.join('\n'));
            setSelectedClass(initialData.classCode || '');
        } else {
            setTitle(''); setPassword(''); setRules(''); setSelectedClass('');
        }
        setError('');
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!title.trim() || !password.trim() || !rules.trim() || !selectedClass) {
            setError('Todos os campos, incluindo a turma, são obrigatórios.'); return;
        }
        if (!/^\d+$/.test(password)) { setError('A senha deve conter apenas números.'); return; }
        const challengeData = {
            title: title.trim(), password, rules: rules.split('\n').map(r => r.trim()).filter(r => r),
            digitCount: password.length, allowRepeats: new Set(password.split('')).size !== password.length,
            classCode: selectedClass,
        };
        const success = await onSave(challengeData, initialData?.id);
        if (success && !isEditing) {
            setTitle('');
            setPassword('');
            setRules('');
            setSelectedClass('');
        }
    };

    return (
        <div className="bg-slate-900/70 p-6 rounded-lg animate-fade-in-down">
            <h2 className="text-xl font-bold text-sky-300 mb-4">{isEditing ? 'Editar Desafio' : 'Criar Desafio "Descubra a Senha"'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Título do Desafio" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 bg-slate-800 rounded" required/>
                <input type="text" placeholder="Senha (apenas números)" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 bg-slate-800 rounded" required/>
                <textarea placeholder="Dicas (uma por linha)" value={rules} onChange={e => setRules(e.target.value)} rows={3} className="w-full p-2 bg-slate-800 rounded" required/>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2 bg-slate-800 rounded" required>
                    <option value="" disabled>Selecione uma turma</option>
                    {teacherClasses.map(c => <option key={c.classCode} value={c.classCode}>{c.className}</option>)}
                </select>
                 {error && <p className="text-red-400 text-sm">{error}</p>}
                 <div className="flex gap-4">
                    {onCancel && <button type="button" onClick={onCancel} className="w-full py-3 bg-slate-600 rounded-lg">Cancelar</button>}
                    <button type="submit" className="w-full py-3 bg-sky-600 rounded-lg">{isEditing ? 'Atualizar' : 'Salvar Desafio'}</button>
                </div>
            </form>
        </div>
    );
};

export const PasswordChallengeManager: React.FC<{ teacherClasses: ClassData[] }> = ({ teacherClasses }) => {
    const { 
        passwordChallenges, createPasswordChallenge, updatePasswordChallenge, 
        deletePasswordChallenge, unlockPasswordChallenge, clearChallengeRanking 
    } = useContext(GameDataContext);
    const [editingChallenge, setEditingChallenge] = useState<PasswordChallenge | null>(null);
    const [viewingRanking, setViewingRanking] = useState<PasswordChallenge | null>(null);
    const [feedback, setFeedback] = useState('');


    const handleSaveChallenge = async (data: any, id?: string): Promise<boolean> => {
        const result = id ? await updatePasswordChallenge(id, data) : await createPasswordChallenge(data);
        if (result.status === 'success') {
            setEditingChallenge(null);
            setFeedback(id ? 'Desafio atualizado com sucesso!' : 'Desafio criado com sucesso!');
            setTimeout(() => setFeedback(''), 3000);
            return true;
        }
        return false;
    };
    
    const handleDelete = (id: string) => {
        if (window.confirm("Tem certeza que deseja deletar este desafio? Esta ação não pode ser desfeita.")) {
            deletePasswordChallenge(id);
        }
    };
    
    const handleClearRanking = (id: string) => {
        if (window.confirm("Tem certeza que deseja limpar o ranking deste desafio? O progresso dos alunos será reiniciado.")) {
            clearChallengeRanking(id);
        }
    }

    return (
    <>
        {viewingRanking && <PasswordRankingModal challenge={viewingRanking} onClose={() => setViewingRanking(null)} />}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                 <ChallengeForm 
                    initialData={editingChallenge}
                    onSave={handleSaveChallenge}
                    onCancel={editingChallenge ? () => setEditingChallenge(null) : undefined}
                    teacherClasses={teacherClasses}
                />
            </div>
             <div className="bg-slate-900/70 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-sky-300 mb-4">Meus Desafios</h2>
                <div className="space-y-3 max-h-[26rem] overflow-y-auto pr-2">
                   {passwordChallenges.map(c => (
                       <div key={c.id} className="p-3 bg-slate-800 rounded">
                           <div className="flex justify-between items-start">
                               <div>
                                   <h3 className="font-bold">{c.title} ({c.classCode})</h3>
                                   <p className="text-xs text-slate-400">Senha: {c.password}</p>
                               </div>
                               <span className={`px-2 py-0.5 text-xs rounded-full ${c.status === 'locked' ? 'bg-red-800 text-red-300' : 'bg-green-800 text-green-300'}`}>{c.status}</span>
                           </div>
                           <div className="mt-2 flex gap-1 flex-wrap text-xs">
                               <button onClick={() => setViewingRanking(c)} className="px-2 py-1 bg-indigo-600 rounded">Ranking</button>
                               <button onClick={() => setEditingChallenge(c)} className="px-2 py-1 bg-sky-700 rounded">Editar</button>
                               {c.status === 'locked' && <button onClick={() => unlockPasswordChallenge(c.id)} className="px-2 py-1 bg-green-600 rounded">Desbloquear</button>}
                               <button onClick={() => handleClearRanking(c.id)} className="px-2 py-1 bg-yellow-700 rounded">Limpar Ranking</button>
                               <button onClick={() => handleDelete(c.id)} className="px-2 py-1 bg-red-700 rounded">Deletar</button>
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