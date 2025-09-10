import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import type { UserProfile, ClassData } from '../types';
import { ReportModal } from './ReportModal';
import { ClassReportModal } from './ClassReportModal';
import { ClassDetailTable } from './teacher/ClassDetailTable';
import { AdedonhaManager } from './teacher/AdedonhaManager';
import { PasswordChallengeManager } from './teacher/PasswordChallengeManager';
import { CombinationTotalManager } from './teacher/CombinationTotalManager';
import { ConfirmationModal } from './ConfirmationModal';
import { EditStudentModal } from './teacher/EditStudentModal';
import { ManageStudentsList } from './teacher/ManageStudentsList';

export const TeacherDashboard: React.FC<{ onReturnToMenu: () => void, onAccessGames: () => void }> = ({ onReturnToMenu, onAccessGames }) => {
  const { user, logout } = useContext(AuthContext);
  const { 
    getClassesForTeacher, getStudentsInClass, createClass, deleteClass, deleteStudent,
    onlineStudents: allOnlineStudents
  } = useContext(GameDataContext);

  const [newClassName, setNewClassName] = useState('');
  const teacherClasses = user?.name ? getClassesForTeacher(user.name) : [];
  
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedClassCode, setSelectedClassCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isClassReportModalOpen, setClassReportModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'classes' | 'challenges' | 'adedonha' | 'combinacao-total'>('classes');
  
  const [classToDelete, setClassToDelete] = useState<ClassData | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<UserProfile | null>(null);
  const [classDetailTab, setClassDetailTab] = useState<'ranking' | 'gerenciar' | 'atividade'>('ranking');

  useEffect(() => {
    if (selectedClassCode) {
      const classStudents = getStudentsInClass(selectedClassCode);
      const sorted = [...classStudents].sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.xp - a.xp;
      });
      setStudents(sorted);
    } else {
      setStudents([]);
    }
  }, [selectedClassCode, getStudentsInClass, allOnlineStudents]); // Dependency on allOnlineStudents to refresh on student data changes
  
  const onlineInClass = useMemo(() => allOnlineStudents.filter(s => s.classCode === selectedClassCode), [allOnlineStudents, selectedClassCode]);
  const offlineInClass = useMemo(() => {
    if (!selectedClassCode) return [];
    const onlineNames = new Set(onlineInClass.map(s => s.name));
    return getStudentsInClass(selectedClassCode).filter(s => !onlineNames.has(s.name));
  }, [onlineInClass, getStudentsInClass, selectedClassCode]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      setError('O nome da turma não pode ser vazio.');
      return;
    }
    setError('');
    const result = await createClass(newClassName.trim());
    if (result.status === 'success') {
      setNewClassName('');
    } else {
      setError(result.message || 'Erro ao criar a turma.');
    }
  };
  
  const handleDeleteClass = async () => {
    if (classToDelete) {
        await deleteClass(classToDelete.classCode);
        setClassToDelete(null);
    }
  };

  const handleDeleteStudent = async () => {
    if (studentToDelete) {
        await deleteStudent(studentToDelete.name);
        setStudentToDelete(null);
        // Refresh student list after deletion
        if(selectedClassCode) {
            setStudents(getStudentsInClass(selectedClassCode).sort((a, b) => b.xp - a.xp));
        }
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
        setCopyMessage('Código copiado!');
        setTimeout(() => setCopyMessage(''), 3000);
    });
  };

  const handleViewStudentReport = (student: UserProfile) => {
    setSelectedStudent(student);
    setReportModalOpen(true);
  };

  if (!user || user.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-lg text-center">
            <p className="text-red-400 text-xl">Acesso negado.</p>
            <button onClick={onReturnToMenu} className="mt-4 px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700">Voltar ao Menu</button>
        </div>
      </div>
    );
  }

  const selectedClass = selectedClassCode ? teacherClasses.find(c => c.classCode === selectedClassCode) : null;

  if (selectedClass) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 text-slate-200 select-none">
        <ReportModal isOpen={isReportModalOpen} onClose={() => setReportModalOpen(false)} student={selectedStudent} />
        <ClassReportModal isOpen={isClassReportModalOpen} onClose={() => setClassReportModalOpen(false)} students={students} className={selectedClass.className} />
        <ConfirmationModal
            isOpen={!!studentToDelete}
            onClose={() => setStudentToDelete(null)}
            onConfirm={handleDeleteStudent}
            title={`Excluir Aluno ${studentToDelete?.name}`}
            message={`Tem certeza que deseja excluir o(a) aluno(a) ${studentToDelete?.name}? TODOS os dados e o progresso serão permanentemente apagados. Esta ação não pode ser desfeita.`}
        />
        <EditStudentModal student={studentToEdit} onClose={() => setStudentToEdit(null)} />

        <div className="bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-7xl">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b border-slate-700 pb-4">
                <button 
                    onClick={() => setSelectedClassCode(null)} 
                    className="text-slate-300 hover:text-sky-400 transition-colors flex items-center text-lg font-medium p-2 rounded-lg hover:bg-slate-700"
                    aria-label="Voltar para a lista de turmas"
                >
                    <i className="fas fa-arrow-left mr-2"></i>
                    <span>Voltar para Turmas</span>
                </button>
                <div className="text-center flex-grow">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">{selectedClass.className}</h1>
                     <div className="flex items-center justify-center text-sm bg-slate-700 p-2 rounded-lg mt-2 max-w-xs mx-auto">
                        <span className="text-slate-400">Código:</span>
                        <span className="font-mono bg-slate-900 px-2 py-0.5 rounded ml-2">{selectedClass.classCode}</span>
                        <button onClick={() => handleCopyCode(selectedClass.classCode)} className="ml-3 text-sky-400 hover:text-sky-300 text-base" aria-label="Copiar código da turma">
                            <i className="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setClassReportModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <i className="fas fa-file-alt"></i>
                    Relatório da Turma
                </button>
            </header>
            
            <div className="mb-4 border-b border-slate-700 flex">
                <button onClick={() => setClassDetailTab('ranking')} className={`px-4 py-3 font-semibold text-base transition-colors ${classDetailTab === 'ranking' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                    <i className="fas fa-trophy mr-2"></i>Ranking da Turma
                </button>
                <button onClick={() => setClassDetailTab('gerenciar')} className={`px-4 py-3 font-semibold text-base transition-colors ${classDetailTab === 'gerenciar' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                    <i className="fas fa-users-cog mr-2"></i>Gerenciar Alunos ({students.length})
                </button>
                <button onClick={() => setClassDetailTab('atividade')} className={`px-4 py-3 font-semibold text-base transition-colors ${classDetailTab === 'atividade' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                    <i className="fas fa-signal mr-2"></i>Atividade
                </button>
            </div>

            <main>
              {classDetailTab === 'ranking' && (
                  students.length > 0 
                    ? <ClassDetailTable students={students} onViewReport={handleViewStudentReport} />
                    : <p className="text-slate-400 text-center mt-8 py-16">Nenhum aluno nesta turma ainda. Compartilhe o código da turma!</p>
              )}
              {classDetailTab === 'gerenciar' && (
                  students.length > 0 
                    ? <ManageStudentsList students={students} onDeleteStudent={setStudentToDelete} onEditStudent={setStudentToEdit} />
                    : <p className="text-slate-400 text-center mt-8 py-16">Nenhum aluno para gerenciar.</p>
              )}
               {classDetailTab === 'atividade' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <div className="bg-slate-900/70 p-6 rounded-lg">
                            <h2 className="text-xl font-bold text-sky-300 mb-4">Online ({onlineInClass.length})</h2>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {onlineInClass.length > 0 ? onlineInClass.map(student => (
                                    <div key={student.name} className="flex items-center gap-3 p-2 bg-slate-700 rounded-lg">
                                        <div className="relative flex-shrink-0">
                                            {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-10 h-10 rounded-full bg-slate-600" />}
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-700" title="Online"></div>
                                        </div>
                                        <p className="font-semibold text-slate-100">{student.name}</p>
                                    </div>
                                )) : <p className="text-slate-400 text-center pt-8">Ninguém online nesta turma.</p>}
                            </div>
                        </div>
                        <div className="bg-slate-900/70 p-6 rounded-lg">
                            <h2 className="text-xl font-bold text-slate-500 mb-4">Offline ({offlineInClass.length})</h2>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                               {offlineInClass.length > 0 ? offlineInClass.map(student => (
                                    <div key={student.name} className="flex items-center gap-3 p-2 bg-slate-700 rounded-lg opacity-60">
                                        <div className="relative flex-shrink-0">
                                            {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-10 h-10 rounded-full bg-slate-600" />}
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-slate-500 rounded-full border-2 border-slate-700" title="Offline"></div>
                                        </div>
                                        <p className="font-semibold text-slate-300">{student.name}</p>
                                    </div>
                                )) : <p className="text-slate-500 text-center pt-8">Todos os alunos estão online!</p>}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
        {copyMessage && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in-down">
                <i className="fas fa-check-circle mr-2"></i>
                {copyMessage}
            </div>
        )}
        <footer className="text-center text-sm text-slate-400 pt-8">
            <p>Desenvolvido por Ítalo Natan - 2025</p>
        </footer>
      </div>
    );
  }

  // Main Dashboard View (no class selected)
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200 select-none">
       <ConfirmationModal
            isOpen={!!classToDelete}
            onClose={() => setClassToDelete(null)}
            onConfirm={handleDeleteClass}
            title={`Excluir Turma ${classToDelete?.className}`}
            message="Tem certeza que deseja excluir esta turma? Todos os alunos serão desvinculados, mas suas contas NÃO serão excluídas. Esta ação não pode ser desfeita."
        />

      <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-6xl">
        <header className="mb-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                    Painel do Professor
                </h1>
                <div className="flex items-center gap-3">
                    <button onClick={onAccessGames} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors flex items-center gap-2">
                        <i className="fas fa-gamepad"></i>Acessar Jogos
                    </button>
                     <button onClick={logout} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors flex items-center gap-2">
                        <i className="fas fa-sign-out-alt"></i>Sair
                    </button>
                </div>
            </div>
            <p className="text-slate-300 mt-2">Bem-vindo(a), {user.name}! Gerencie suas turmas e crie desafios.</p>
        </header>
        
         <div className="mb-6 border-b border-slate-700 flex flex-wrap">
            <button onClick={() => setActiveTab('classes')} className={`px-4 py-3 font-semibold text-base transition-colors ${activeTab === 'classes' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                <i className="fas fa-users mr-2"></i>Turmas e Alunos
            </button>
             <button onClick={() => setActiveTab('challenges')} className={`px-4 py-3 font-semibold text-base transition-colors ${activeTab === 'challenges' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                <i className="fas fa-key mr-2"></i>Descubra a Senha
            </button>
            <button onClick={() => setActiveTab('combinacao-total')} className={`px-4 py-3 font-semibold text-base transition-colors ${activeTab === 'combinacao-total' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                <i className="fas fa-calculator mr-2"></i>Combinação Total
            </button>
            <button onClick={() => setActiveTab('adedonha')} className={`px-4 py-3 font-semibold text-base transition-colors ${activeTab === 'adedonha' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                <i className="fas fa-pen-alt mr-2"></i>Adedonha
            </button>
        </div>
        
        <main className="mt-6">
            {activeTab === 'classes' && (
                <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/70 p-6 rounded-lg">
                        <h2 className="text-xl font-bold text-sky-300 mb-4">Minhas Turmas</h2>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                            {teacherClasses.length > 0 ? teacherClasses.map(c => (
                                <div key={c.classCode} onClick={() => setSelectedClassCode(c.classCode)} className="relative p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-sky-900/50 border-2 border-transparent hover:border-sky-600 transition-all group">
                                    <h3 className="font-bold text-lg text-sky-300">{c.className}</h3>
                                    <p className="text-sm text-slate-400">Código: <span className="font-mono">{c.classCode}</span></p>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setClassToDelete(c); }} 
                                        className="absolute top-2 right-2 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        aria-label={`Excluir turma ${c.className}`}
                                    >
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            )) : (
                                <p className="text-slate-400">Você ainda não criou nenhuma turma.</p>
                            )}
                        </div>
                    </div>
                    <div className="bg-slate-900/70 p-6 rounded-lg">
                        <h2 className="text-xl font-bold text-sky-300 mb-4">Criar Nova Turma</h2>
                        <form onSubmit={handleCreateClass} className="space-y-4">
                            <div>
                                <label htmlFor="class-name" className="block text-sm font-medium text-slate-300 mb-1">Nome da Turma</label>
                                <input
                                    id="class-name"
                                    type="text"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white focus:ring-2 focus:ring-sky-500"
                                    placeholder="Ex: 6º Ano A - Manhã"
                                    required
                                />
                            </div>
                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            <button type="submit" className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors">
                                Criar Turma
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {activeTab === 'challenges' && (
                <div className="animate-fade-in">
                    <PasswordChallengeManager teacherClasses={teacherClasses} />
                </div>
            )}
             {activeTab === 'combinacao-total' && (
                <div className="animate-fade-in">
                    <CombinationTotalManager teacherClasses={teacherClasses} user={user} />
                </div>
            )}
            {activeTab === 'adedonha' && (
                <div className="animate-fade-in">
                    <AdedonhaManager teacherClasses={teacherClasses} />
                </div>
            )}
        </main>

        <footer className="text-center text-sm text-slate-400 pt-8">
            <p>Desenvolvido por Ítalo Natan - 2025</p>
        </footer>
      </div>
    </div>
  );
};