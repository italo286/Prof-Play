import React, { useContext } from 'react';
import { GameDataContext } from '../../contexts/GameDataContext';
import type { ClassData } from '../../types';

interface OnlineStudentsPanelProps {
    teacherClasses: ClassData[];
}

export const OnlineStudentsPanel: React.FC<OnlineStudentsPanelProps> = ({ teacherClasses }) => {
    const { onlineStudents } = useContext(GameDataContext);

    return (
        <div className="bg-slate-900/70 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-sky-300 mb-4">Alunos Online</h2>
            <div className="space-y-3 max-h-[19.5rem] overflow-y-auto pr-2">
                {onlineStudents.length > 0 ? onlineStudents.map(student => (
                    <div key={student.name} className="flex items-center gap-3 p-2 bg-slate-700 rounded-lg">
                        <div className="relative flex-shrink-0">
                            {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-10 h-10 rounded-full bg-slate-600" />}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-700" title="Online"></div>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-100">{student.name}</p>
                            <p className="text-xs text-slate-400">{teacherClasses.find(c => c.classCode === student.classCode)?.className}</p>
                        </div>
                    </div>
                )) : (
                    <p className="text-slate-400 text-center pt-8">Nenhum aluno online no momento.</p>
                )}
            </div>
        </div>
    );
};