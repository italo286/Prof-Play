import React from 'react';
import type { UserProfile } from '../../types';

interface ManageStudentsListProps {
    students: UserProfile[];
    onDeleteStudent: (student: UserProfile) => void;
    onEditStudent: (student: UserProfile) => void;
}

export const ManageStudentsList: React.FC<ManageStudentsListProps> = ({ students, onDeleteStudent, onEditStudent }) => {
    return (
        <div className="overflow-y-auto relative p-1" style={{ maxHeight: 'calc(100vh - 280px)'}}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map(student => (
                    <div key={student.name} className="bg-slate-900/70 p-4 rounded-lg flex items-center justify-between shadow-md transition-transform hover:scale-105 hover:bg-slate-700">
                        <div className="flex items-center gap-4 truncate">
                            {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-12 h-12 rounded-full bg-slate-700 flex-shrink-0"/>}
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
                ))}
            </div>
        </div>
    );
};