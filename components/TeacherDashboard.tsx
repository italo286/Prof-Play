import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import type { UserProfile, ClassData } from '../types';
import { ReportModal } from './ReportModal';
import { ClassReportModal } from './ClassReportModal';
import { ClassDetailTable } from './teacher/ClassDetailTable';
import { AdedonhaManager } from './teacher/AdedonhaManager';
import { PasswordChallengeManager } from './teacher/PasswordChallengeManager';
import { CombinationTotalManager } from './teacher/CombinationTotalManager';
import { GarrafasManager } from './teacher/GarrafasManager';
import { ConfirmationModal } from './ConfirmationModal';
import { EditStudentModal } from './teacher/EditStudentModal';
import { ManageStudentsList } from './teacher/ManageStudentsList';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';

const RANKING_PAGE_SIZE = 25;
const MANAGEMENT_PAGE_SIZE = 24;

export const TeacherDashboard: React.FC<{ onReturnToMenu: () => void, onAccessGames: () => void }> = ({ onReturnToMenu, onAccessGames }) => {
  const { user, logout } = useContext(AuthContext);
  const { 
    allUsers, getClassesForTeacher, getStudentsInClass, createClass, deleteClass, deleteStudent,
    onlineStudents, endAllAdedonhaSessions
  } = useContext(GameDataContext);

  const [newClassName, setNewClassName] = useState('');
  const teacherClasses = user?.name ? getClassesForTeacher(user.name) : [];
  
  const [selectedClassCode, setSelectedClassCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isClassReportModalOpen, setClassReportModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  
  const [classToDelete, setClassToDelete] = useState<ClassData | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<UserProfile | null>(null);
  const [classDetailTab, setClassDetailTab] = useState<'ranking' | 'gerenciar' | 'atividade' | 'jogos'>('ranking');
  const [selectedGameView, setSelectedGameView] = useState<'overview' | 'adedonha' | 'password' | 'combination' | 'garrafas'>('overview');
  const [isEndAllModalOpen, setIsEndAllModalOpen] = useState(false);

  // --- Pagination State for Ranking ---
  const [rankingStudents, setRankingStudents] = useState<UserProfile[]>([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [rankingCurrentPage, setRankingCurrentPage] = useState(1);
  const [lastVisibleRankingDoc, setLastVisibleRankingDoc] = useState<firebase.firestore.QueryDocumentSnapshot | null>(null);
  const [firstVisibleRankingDoc, setFirstVisibleRankingDoc] = useState<firebase.firestore.QueryDocumentSnapshot | null>(null);
  const [isRankingLastPage, setIsRankingLastPage] = useState(false);
  
  // --- Pagination State for Management ---
  const [managementStudents, setManagementStudents] = useState<UserProfile[]>([]);
  const [isLoadingManagement, setIsLoadingManagement] = useState(false);
  const [managementCurrentPage, setManagementCurrentPage] = useState(1);
  const [lastVisibleManagementDoc, setLastVisibleManagementDoc] = useState<firebase.firestore.QueryDocumentSnapshot | null>(null);
  const [firstVisibleManagementDoc, setFirstVisibleManagementDoc] = useState<firebase.firestore.QueryDocumentSnapshot | null>(null);
  const [isManagementLastPage, setIsManagementLastPage] = useState(false);

  const totalStudentsInClass = useMemo(() => {
    if (!selectedClassCode) return 0;
    return getStudentsInClass(selectedClassCode).length;
  }, [selectedClassCode, allUsers, getStudentsInClass]);
  
  // --- Ranking Data Fetching ---
  const baseRankingQuery = useCallback(() => {
    if (!selectedClassCode) return null;
    return db.collection('users')
      .where('classCode', '==', selectedClassCode)
      .orderBy('xp', 'desc')
      .orderBy('name', 'asc');
  }, [selectedClassCode]);

  const fetchFirstRankingPage = useCallback(async () => {
    const query = baseRankingQuery();
    if (!query) return;
    
    setIsLoadingRanking(true);
    try {
        const snapshot = await query.limit(RANKING_PAGE_SIZE).get();
        const newStudents = snapshot.docs.map(doc => doc.data() as UserProfile);
        setRankingStudents(newStudents);
        setFirstVisibleRankingDoc(snapshot.docs[0] || null);
        setLastVisibleRankingDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setIsRankingLastPage(snapshot.docs.length < RANKING_PAGE_SIZE);
        setRankingCurrentPage(1);
    } catch (err) { console.error(err); }
    finally { setIsLoadingRanking(false); }
  }, [baseRankingQuery]);

  const fetchNextRankingPage = async () => {
    const query = baseRankingQuery();
    if (!query || !lastVisibleRankingDoc) return;
    
    setIsLoadingRanking(true);
    try {
        const snapshot = await query.startAfter(lastVisibleRankingDoc).limit(RANKING_PAGE_SIZE).get();
        const newStudents = snapshot.docs.map(doc => doc.data() as UserProfile);
        setRankingStudents(newStudents);
        setFirstVisibleRankingDoc(snapshot.docs[0] || null);
        setLastVisibleRankingDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setIsRankingLastPage(snapshot.docs.length < RANKING_PAGE_SIZE);
        setRankingCurrentPage(prev => prev + 1);
    } catch (err) { console.error(err); }
    finally { setIsLoadingRanking(false); }
  };
  
  const fetchPrevRankingPage = async () => {
    const query = baseRankingQuery();
    if (!query || !firstVisibleRankingDoc) return;

    setIsLoadingRanking(true);
    try {
        const snapshot = await query.endBefore(firstVisibleRankingDoc).limitToLast(RANKING_PAGE_SIZE).get();
        const newStudents = snapshot.docs.map(doc => doc.data() as UserProfile);
        setRankingStudents(newStudents);
        setFirstVisibleRankingDoc(snapshot.docs[0] || null);
        setLastVisibleRankingDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setIsRankingLastPage(false);
        setRankingCurrentPage(prev => prev - 1);
    } catch(err) { console.error(err); }
    finally { setIsLoadingRanking(false); }
  };
  
  // --- Management Data Fetching ---
  const baseManagementQuery = useCallback(() => {
    if (!selectedClassCode) return null;
    return db.collection('users')
      .where('classCode', '==', selectedClassCode)
      .orderBy('name', 'asc');
  }, [selectedClassCode]);

  const fetchFirstManagementPage = useCallback(async () => {
    const query = baseManagementQuery();
    if (!query) return;
    setIsLoadingManagement(true);
    try {
      const snapshot = await query.limit(MANAGEMENT_PAGE_SIZE).get();
      setManagementStudents(snapshot.docs.map(doc => doc.data() as UserProfile));
      setFirstVisibleManagementDoc(snapshot.docs[0] || null);
      setLastVisibleManagementDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setIsManagementLastPage(snapshot.docs.length < MANAGEMENT_PAGE_SIZE);
      setManagementCurrentPage(1);
    } catch (err) { console.error(err); }
    finally { setIsLoadingManagement(false); }
  }, [baseManagementQuery]);

  const fetchNextManagementPage = async () => {
    const query = baseManagementQuery();
    if (!query || !lastVisibleManagementDoc) return;
    setIsLoadingManagement(true);
    try {
      const snapshot = await query.startAfter(lastVisibleManagementDoc).limit(MANAGEMENT_PAGE_SIZE).get();
      setManagementStudents(snapshot.docs.map(doc => doc.data() as UserProfile));
      setFirstVisibleManagementDoc(snapshot.docs[0] || null);
      setLastVisibleManagementDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setIsManagementLastPage(snapshot.docs.length < MANAGEMENT_PAGE_SIZE);
      setManagementCurrentPage(p => p + 1);
    } catch (err) { console.error(err); }
    finally { setIsLoadingManagement(false); }
  };

  const fetchPrevManagementPage = async () => {
    const query = baseManagementQuery();
    if (!query || !firstVisibleManagementDoc) return;
    setIsLoadingManagement(true);
    try {
      const snapshot = await query.endBefore(firstVisibleManagementDoc).limitToLast(MANAGEMENT_PAGE_SIZE).get();
      setManagementStudents(snapshot.docs.map(doc => doc.data() as UserProfile));
      setFirstVisibleManagementDoc(snapshot.docs[0] || null);
      setLastVisibleManagementDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setIsManagementLastPage(false);
      setManagementCurrentPage(p => p - 1);
    } catch (err) { console.error(err); }
    finally { setIsLoadingManagement(false); }
  };

  // --- Effect to trigger initial data fetch based on tab ---
  useEffect(() => {
    if (selectedClassCode) {
      if (classDetailTab === 'ranking') {
        fetchFirstRankingPage();
      } else if (classDetailTab === 'gerenciar') {
        fetchFirstManagementPage();
      }
    }
  }, [selectedClassCode, classDetailTab, fetchFirstRankingPage, fetchFirstManagementPage]);

  useEffect(() => {
    setSelectedGameView('overview');
  }, [classDetailTab]);

  const onlineInClass = useMemo(() => onlineStudents.filter(s => s.classCode === selectedClassCode), [onlineStudents, selectedClassCode]);
  const onlineStudentNames = useMemo(() => new Set(onlineInClass.map(s => s.name)), [onlineInClass]);
  const offlineInClass = useMemo(() => {
    if (!selectedClassCode) return [];
    return getStudentsInClass(selectedClassCode).filter(s => !onlineStudentNames.has(s.name));
  }, [onlineStudentNames, getStudentsInClass, selectedClassCode]);

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
        if (classDetailTab === 'gerenciar') {
            fetchFirstManagementPage();
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
  
  const handleEndAllSessions = async () => {
    await endAllAdedonhaSessions();
    setIsEndAllModalOpen(false);
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
  
  const gameCards = [
    { id: 'adedonha', name: 'Adedonha', description: 'Gerencie partidas em tempo real.', icon: 'fa-pen-alt', color: 'text-amber-400' },
    { id: 'password', name: 'Descubra a Senha', description: 'Crie e gerencie desafios de senha.', icon: 'fa-key', color: 'text-yellow-400' },
    { id: 'combination', name: 'Combinação Total', description: 'Elabore desafios de análise combinatória.', icon: 'fa-calculator', color: 'text-green-400' },
    { id: 'garrafas', name: 'Jogo das Garrafas', description: 'Crie desafios de ordenação de garrafas.', icon: 'fa-wine-bottle', color: 'text-teal-400' }
  ];

  const selectedClass = selectedClassCode ? teacherClasses.find(c => c.classCode === selectedClassCode) : null;

  if (selectedClass) {
    const studentsForClassReport = getStudentsInClass(selectedClass.classCode);
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 text-slate-200 select-none">
        <ReportModal isOpen={isReportModalOpen} onClose={() => setReportModalOpen(false)} student={selectedStudent} />
        <ClassReportModal isOpen={isClassReportModalOpen} onClose={() => setClassReportModalOpen(false)} students={studentsForClassReport} className={selectedClass.className} />
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
            
            <div className="mb-4 border-b border-slate-700 flex flex-wrap">
                <button onClick={() => setClassDetailTab('ranking')} className={`px-4 py-3 font-semibold text-base transition-colors ${classDetailTab === 'ranking' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                    <i className="fas fa-trophy mr-2"></i>Ranking da Turma
                </button>
                <button onClick={() => setClassDetailTab('gerenciar')} className={`px-4 py-3 font-semibold text-base transition-colors ${classDetailTab === 'gerenciar' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                    <i className="fas fa-users-cog mr-2"></i>Gerenciar Alunos ({totalStudentsInClass})
                </button>
                <button onClick={() => setClassDetailTab('atividade')} className={`px-4 py-3 font-semibold text-base transition-colors ${classDetailTab === 'atividade' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                    <i className="fas fa-signal mr-2"></i>Atividade
                </button>
                <button onClick={() => setClassDetailTab('jogos')} className={`px-4 py-3 font-semibold text-base transition-colors ${classDetailTab === 'jogos' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}>
                    <i className="fas fa-gamepad mr-2"></i>Jogos
                </button>
            </div>

            <main>
              {classDetailTab === 'ranking' && (
                  (rankingStudents.length > 0 || isLoadingRanking)
                    ? <ClassDetailTable 
                        students={rankingStudents} 
                        onViewReport={handleViewStudentReport}
                        currentPage={rankingCurrentPage}
                        pageSize={RANKING_PAGE_SIZE}
                        totalStudents={totalStudentsInClass}
                        onNextPage={fetchNextRankingPage}
                        onPrevPage={fetchPrevRankingPage}
                        isFirstPage={rankingCurrentPage === 1}
                        isLastPage={isRankingLastPage}
                        isLoading={isLoadingRanking}
                      />
                    : <p className="text-slate-400 text-center mt-8 py-16">Nenhum aluno nesta turma ainda. Compartilhe o código da turma!</p>
              )}
              {classDetailTab === 'gerenciar' && (
                   (managementStudents.length > 0 || isLoadingManagement)
                    ? <ManageStudentsList 
                        students={managementStudents} 
                        onDeleteStudent={setStudentToDelete} 
                        onEditStudent={setStudentToEdit} 
                        onlineStudentNames={onlineStudentNames}
                        currentPage={managementCurrentPage}
                        pageSize={MANAGEMENT_PAGE_SIZE}
                        totalStudents={totalStudentsInClass}
                        onNextPage={fetchNextManagementPage}
                        onPrevPage={fetchPrevManagementPage}
                        isFirstPage={managementCurrentPage === 1}
                        isLastPage={isManagementLastPage}
                        isLoading={isLoadingManagement}
                      />
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
                 {classDetailTab === 'jogos' && (
                    <div className="animate-fade-in p-4 space-y-8">
                      {selectedGameView === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                          {gameCards.map(card => (
                            <div key={card.id} onClick={() => setSelectedGameView(card.id as any)}
                              className="p-6 bg-slate-900/70 rounded-lg shadow-lg border-2 border-transparent hover:border-sky-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
                            >
                              <i className={`fas ${card.icon} text-5xl mb-4 ${card.color}`}></i>
                              <h2 className="text-2xl font-bold text-slate-100">{card.name}</h2>
                              <p className="text-sm text-slate-400 mt-1 h-10">{card.description}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedGameView !== 'overview' && (
                        <div>
                          <button onClick={() => setSelectedGameView('overview')} className="mb-4 text-slate-300 hover:text-sky-400 transition-colors flex items-center text-sm font-medium p-2 rounded-lg hover:bg-slate-700">
                            <i className="fas fa-arrow-left mr-2"></i> Voltar para Jogos
                          </button>
                          
                          {selectedGameView === 'adedonha' && <AdedonhaManager selectedClass={selectedClass} />}
                          {selectedGameView === 'password' && <PasswordChallengeManager selectedClass={selectedClass} />}
                          {selectedGameView === 'combination' && <CombinationTotalManager selectedClass={selectedClass} user={user} />}
                          {selectedGameView === 'garrafas' && <GarrafasManager selectedClass={selectedClass} user={user} />}
                        </div>
                      )}
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
            message="Tem certeza que deseja excluir esta turma? TODOS OS ALUNOS desta turma e seus progressos serão PERMANENTEMENTE APAGADOS. Esta ação não pode ser desfeita."
        />
        <ConfirmationModal
            isOpen={isEndAllModalOpen}
            onClose={() => setIsEndAllModalOpen(false)}
            onConfirm={handleEndAllSessions}
            title="Encerrar Todas as Sessões?"
            message="Isso forçará o fim de TODAS as partidas de Adedonha ativas. Os alunos serão enviados para a tela de espera. Esta ação é útil se uma partida travou ou foi esquecida. Deseja continuar?"
        />

      <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-6xl">
        <header className="mb-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                    Painel do Professor
                </h1>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsEndAllModalOpen(true)} className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:bg-amber-700 transition-colors flex items-center gap-2">
                        <i className="fas fa-power-off"></i>Encerrar Sessões
                    </button>
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
        
        <main className="mt-6">
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
                                    className="absolute top-2 right-2 text-slate-500 hover:text-red-500 transition-colors"
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
        </main>

        <footer className="text-center text-sm text-slate-400 pt-8">
            <p>Desenvolvido por Ítalo Natan - 2025</p>
        </footer>
      </div>
    </div>
  );
};