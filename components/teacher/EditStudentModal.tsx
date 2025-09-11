import React, { useState, useContext, useEffect } from 'react';
import type { UserProfile } from '../../types';
import { GameDataContext } from '../../contexts/GameDataContext';

interface EditStudentModalProps {
  student: UserProfile | null;
  onClose: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({ student, onClose }) => {
  const { updateStudentPassword } = useContext(GameDataContext);
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset state when student changes or modal opens
    setNewPassword('');
    setFeedback('');
    setError('');
  }, [student]);

  if (!student) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    const result = await updateStudentPassword(student.name, newPassword);
    if (result.status === 'success') {
      setFeedback('Senha atualizada com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(result.message || 'Ocorreu um erro.');
    }
  };

  return (
     <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in-down"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-md text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <header className="text-center mb-4">
            <h1 className="text-2xl font-bold text-sky-400">
                Editar Aluno: {student.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1">O nome de usuário não pode ser alterado.</p>
        </header>

        <form onSubmit={handleSave} className="space-y-4">
            <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-300 mb-1">Nova Senha</label>
                <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white focus:ring-2 focus:ring-sky-500"
                    placeholder="Mínimo 4 caracteres"
                    required
                    minLength={4}
                />
            </div>

            {error && <p className="text-red-400 text-sm text-center font-semibold">{error}</p>}
            {feedback && <p className="text-green-400 text-sm text-center font-semibold">{feedback}</p>}

            <div className="flex justify-center gap-4 pt-4">
                <button 
                    type="button"
                    onClick={onClose} 
                    className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                    Salvar Alterações
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};