import React from 'react';
import type { UserProfile } from '../../types';

interface ManageStudentsListProps {
    students: UserProfile[];
    onDeleteStudent: (student: UserProfile) => void;
    onEditStudent: (student: UserProfile) => void;
    onlineStudentNames: Set<string>;
    currentPage: number;
    pageSize: number;
    totalStudents: number;
    onNextPage: () => void;
    onPrevPage: () => void;
    isFirstPage: boolean;
    isLastPage: boolean;
    isLoading: boolean;
}

export const ManageStudentsList: React.FC<ManageStudentsListProps> = ({ 
    students, onDeleteStudent, onEditStudent, onlineStudentNames,
    currentPage, pageSize, totalStudents, onNextPage, onPrevPage, isFirstPage, isLastPage, isLoading
}) => {
    const totalPages = Math.ceil(totalStudents / pageSize);
    const startStudentNum = (currentPage - 1) * pageSize + 1;
    const endStudentNum = startStudentNum + students.length - 1;

    return (
        <div>
            <div className="overflow-y-auto relative p-1" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 350px)'}}>
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <i className="fas fa-spinner fa-spin text-3xl text-sky-400"></i>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {students.map(student => {
                            const isOnline = onlineStudentNames.has(student.name);
                            return (
                                <div key={student.name} className="bg-slate-900/70 p-4 rounded-lg flex items-center justify-between shadow-md transition-transform hover:scale-105 hover:bg-slate-700">
                                    <div className="flex items-center gap-4 truncate">
                                        <div className="relative flex-shrink-0">
                                            {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-12 h-12 rounded-full bg-slate-700"/>}
                                            <div 
                                                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`}
                                                title={isOnline ? 'Online' : 'Offline'}
                                            ></div>
                                        </div>
                                        <span className="font-semibold text-lg text-slate-100 truncate">{student.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => onEditStudent(student)} className="text-slate-400 hover:text-sky-400 transition-colors" title="Editar senha do aluno">
                                            <i className="fas fa-edit text-xl"></i>
                                        </button>
                                        <button onClick={() => onDeleteStudent(student)} className="text-slate-400 hover:text-red-500 transition-colors" title="Excluir aluno">
                                            <i className="fas fa-trash-alt text-xl"></i>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {totalStudents > 0 && (
                 <div className="flex justify-between items-center p-4 bg-slate-900/80 sticky bottom-0 rounded-b-lg mt-4">
                    <span className="text-sm text-slate-400">
                        Exibindo {startStudentNum}–{endStudentNum} de {totalStudents}
                    </span>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onPrevPage} 
                            disabled={isFirstPage || isLoading}
                            className="px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
                        >
                           <i className="fas fa-arrow-left mr-2"></i> Anterior
                        </button>
                        <span className="font-semibold">Página {currentPage} de {totalPages}</span>
                        <button 
                            onClick={onNextPage} 
                            disabled={isLastPage || isLoading}
                            className="px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
                        >
                            Próximo <i className="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};