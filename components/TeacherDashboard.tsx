import React, { useState, useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import type { UserProfile, ClassData } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { ReportModal } from './ReportModal';
import { ClassReportModal } from './ClassReportModal';
import { OnlineStudentsPanel } from './teacher/OnlineStudentsPanel';
import { OfflineStudentsPanel } from './teacher/OfflineStudentsPanel';
import { ClassDetailTable } from './teacher/ClassDetailTable';
import { ClassRankingTable } from './teacher/ClassRankingTable';
import { ManageStudentsList } from './teacher/ManageStudentsList';
import { EditStudentModal } from './teacher/EditStudentModal';
import { PasswordChallengeManager } from './teacher/PasswordChallengeManager';
import { AdedonhaManager } from './teacher/AdedonhaManager';
import { CombinationTotalManager } from './teacher/CombinationTotalManager';
import { GarrafasManager } from './teacher/GarrafasManager';
import { AdedonhaTappleManager } from './teacher/AdedonhaTappleManager';

type TeacherView = 'overview' | 'class_detail' | 'manage_students' | 'password_challenges' | 'adedonha' | 'combinacao_total' | 'garrafas' | 'adedonha_tapple';

export const TeacherDashboard: React.FC<{ onReturnToMenu: () => void }> = ({ onReturnToMenu }) => {
    const { user } = useContext(AuthContext);
    const { teacherClasses, getStudentsInClass, createClass, deleteClass, deleteStudent, onlineStudents } = useContext(GameDataContext);
    
    const [view, setView] = useState<TeacherView>('overview');
    const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
    const [newClassName, setNewClassName] = useState('');
    const [classToDelete, setClassToDelete] = useState<ClassData | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null);
    const [studentToEdit, setStudentToEdit] = useState<UserProfile | null>(null);
    const [reportStudent, setReportStudent] = useState<UserProfile | null>(null);
    const [classReport, setClassReport] = useState<ClassData | null>(null);

    const studentsInSelectedClass = useMemo(() => {
        if (!selectedClass) return [];
        return getStudentsInClass(selectedClass.classCode).sort((a, b) => b.xp - a.xp);
    }, [selectedClass, getStudentsInClass, allUsers]);

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newClassName.trim()) {
            await createClass(newClassName.trim());
            setNewClassName('');
        }
    };
    
    const handleViewClass = (cls: ClassData) => {
        setSelectedClass(cls);
        setView('class_detail');
    };

    const confirmDeleteClass = () => {
        if(classToDelete) {
            deleteClass(classToDelete.id);
            setClassToDelete(null);
            if (selectedClass?.id === classToDelete.id) {
                setView('overview');
                setSelectedClass(null);
            }
        }
    };

    const confirmDeleteStudent = () => {
        if (studentToDelete) {
            deleteStudent(studentToDelete.name);
            setStudentToDelete(null);
        }
    };

    // FIX: Add a dependency to re-fetch students when allUsers changes
    const { allUsers } = useContext(GameDataContext);
    useEffect(() => {
        if (selectedClass) {
            // This will trigger a re-render and update studentsInSelectedClass
        }
    }, [allUsers, selectedClass]);

    if (!user || user.role !== 'teacher') return null;

    const renderContent = () => {
        if (view === 'overview' || !selectedClass) {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-slate-900/70 p-6 rounded-lg">
                            <h2 className="text-xl font-bold text-sky-300 mb-4">Minhas Turmas</h2>
                            <div className="space-y-3">
                                {teacherClasses.map(cls => (
                                    <div key={cls.id} className="p-3 bg-slate-700 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-lg">{cls.className}</p>
                                            <p className="text-sm text-slate-400 font-mono">Código: <span className="bg-slate-800 px-2 py-0.5 rounded-md">{cls.classCode}</span></p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleViewClass(cls)} className="px-3 py-2 bg-sky-600 rounded">Ver Turma</button>
                                            <button onClick={() => setClassToDelete(cls)} className="px-3 py-2 bg-red-800 rounded"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <form onSubmit={handleCreateClass} className="bg-slate-900/70 p-6 rounded-lg flex gap-4">
                            <input type="text" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="Nome da nova turma" className="flex-grow p-2 bg-slate-800 rounded"/>
                            <button type="submit" className="px-4 py-2 bg-green-600 font-bold rounded">Criar Turma</button>
                        </form>
                    </div>
                    <div className="lg:col-span-1 space-y-4">
                       <OnlineStudentsPanel teacherClasses={teacherClasses} />
                       <OfflineStudentsPanel teacherClasses={teacherClasses} />
                    </div>
                </div>
            );
        }

        // Views for a selected class
        switch(view) {
            case 'class_detail':
                return <ClassDetailTable students={studentsInSelectedClass} onViewReport={setReportStudent} />;
            case 'manage_students':
                const onlineNames = new Set(onlineStudents.map(s => s.name));
                return <ManageStudentsList students={studentsInSelectedClass} onDeleteStudent={setStudentToDelete} onEditStudent={setStudentToEdit} onlineStudentNames={onlineNames}/>
            case 'password_challenges':
                return <PasswordChallengeManager selectedClass={selectedClass} />;
            case 'adedonha':
                return <AdedonhaManager selectedClass={selectedClass} />;
            case 'combinacao_total':
                return <CombinationTotalManager selectedClass={selectedClass} user={user} />;
            case 'garrafas':
                return <GarrafasManager selectedClass={selectedClass} user={user} />;
            case 'adedonha_tapple':
                return <AdedonhaTappleManager selectedClass={selectedClass} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
             <ConfirmationModal isOpen={!!classToDelete} onClose={() => setClassToDelete(null)} onConfirm={confirmDeleteClass} title="Excluir Turma" message={`Tem certeza que deseja excluir a turma "${classToDelete?.className}"? Todos os dados dos alunos serão perdidos.`} />
             <ConfirmationModal isOpen={!!studentToDelete} onClose={() => setStudentToDelete(null)} onConfirm={confirmDeleteStudent} title="Excluir Aluno" message={`Tem certeza que deseja excluir o aluno "${studentToDelete?.name}"?`} />
             <ReportModal isOpen={!!reportStudent} onClose={() => setReportStudent(null)} student={reportStudent} />
             <ClassReportModal isOpen={!!classReport} onClose={() => setClassReport(null)} students={studentsInSelectedClass} className={classReport?.className || ''} />
             <EditStudentModal student={studentToEdit} onClose={() => setStudentToEdit(null)} />
            
            <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-7xl">
                <div className="flex justify-between items-center w-full mb-6">
                    <button onClick={onReturnToMenu} className="text-slate-400 hover:text-sky-400 p-2 rounded-lg hover:bg-slate-700">
                        <i className="fas fa-arrow-left mr-2"></i>Menu Principal
                    </button>
                    <h1 className="text-3xl font-bold text-sky-400">Painel do Professor</h1>
                    <div></div>
                </div>
                
                {selectedClass && (
                    <div className="mb-6 p-4 bg-slate-700 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setView('overview'); setSelectedClass(null); }} className="text-slate-400 hover:text-sky-400"><i className="fas fa-chevron-left mr-2"></i></button>
                            <h2 className="text-2xl font-bold text-slate-100">{selectedClass.className}</h2>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button onClick={() => setView('class_detail')} className={`px-3 py-1 text-sm rounded ${view === 'class_detail' ? 'bg-sky-600' : 'bg-slate-600'}`}>Desempenho</button>
                            <button onClick={() => setView('manage_students')} className={`px-3 py-1 text-sm rounded ${view === 'manage_students' ? 'bg-sky-600' : 'bg-slate-600'}`}>Gerenciar Alunos</button>
                            <button onClick={() => setView('password_challenges')} className={`px-3 py-1 text-sm rounded ${view === 'password_challenges' ? 'bg-sky-600' : 'bg-slate-600'}`}>Senhas</button>
                            <button onClick={() => setView('adedonha')} className={`px-3 py-1 text-sm rounded ${view === 'adedonha' ? 'bg-sky-600' : 'bg-slate-600'}`}>Adedonha</button>
                            <button onClick={() => setView('adedonha_tapple')} className={`px-3 py-1 text-sm rounded ${view === 'adedonha_tapple' ? 'bg-sky-600' : 'bg-slate-600'}`}>Adedonha Tapple</button>
                            <button onClick={() => setView('combinacao_total')} className={`px-3 py-1 text-sm rounded ${view === 'combinacao_total' ? 'bg-sky-600' : 'bg-slate-600'}`}>Combinação Total</button>
                            <button onClick={() => setView('garrafas')} className={`px-3 py-1 text-sm rounded ${view === 'garrafas' ? 'bg-sky-600' : 'bg-slate-600'}`}>Garrafas</button>
                            <button onClick={() => setClassReport(selectedClass)} className="px-3 py-1 text-sm rounded bg-green-700"><i className="fas fa-file-pdf mr-1"></i>Relatório da Turma</button>
                        </div>
                    </div>
                )}
                
                {renderContent()}
            </div>
        </div>
    );
};
