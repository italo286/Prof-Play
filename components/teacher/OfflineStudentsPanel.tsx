import React, { useContext } from 'react';
import { GameDataContext } from '../../contexts/GameDataContext';
import type { ClassData } from '../../types';

interface OfflineStudentsPanelProps {
    teacherClasses: ClassData[];
}

export const OfflineStudentsPanel: React.FC<OfflineStudentsPanelProps> = ({ teacherClasses }) => {
    const { offlineStudents } = useContext(GameDataContext);

    return (
        <div className="bg-slate-900/70 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-slate-500 mb-4">Alunos Offlines ({offlineStudents.length})</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {offlineStudents.length > 0 ? offlineStudents.map(student => (
                    <div key={student.name} className="flex items-center gap-3 p-2 bg-slate-700 rounded-lg opacity-60">
                        <div className="relative flex-shrink-0">
                            {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-10 h-10 rounded-full bg-slate-600" />}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-slate-500 rounded-full border-2 border-slate-700" title="Offline"></div>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-300">{student.name}</p>
                            <p className="text-xs text-slate-400">{teacherClasses.find(c => c.classCode === student.classCode)?.className}</p>
                        </div>
                    </div>
                )) : (
                    <p className="text-slate-500 text-center pt-8">Nenhum aluno offline.</p>
                )}
            </div>
        </div>
    );
};