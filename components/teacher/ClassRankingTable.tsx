import React from 'react';
import type { UserProfile } from '../../types';

const getRankingInfo = (rank: number) => {
    switch (rank) {
      case 0: return { icon: 'fa-medal', color: 'text-amber-400', bg: 'bg-amber-900/40', border: 'border-amber-500' };
      case 1: return { icon: 'fa-medal', color: 'text-gray-400', bg: 'bg-gray-800', border: 'border-gray-500' };
      case 2: return { icon: 'fa-medal', color: 'text-orange-500', bg: 'bg-orange-900/40', border: 'border-orange-600' };
      default: return null;
    }
};

interface ClassRankingTableProps {
    students: UserProfile[];
}

export const ClassRankingTable: React.FC<ClassRankingTableProps> = ({ students }) => {
    return (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg" style={{ maxHeight: 'calc(100vh - 350px)'}}>
            <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-sky-300 uppercase bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="p-3">Posição</th>
                        <th scope="col" className="p-3">Aluno</th>
                        <th scope="col" className="p-3 text-center">Nível</th>
                        <th scope="col" className="p-3 text-center">XP</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {students.map((student, index) => {
                        const rankingInfo = getRankingInfo(index);
                        const rowBg = rankingInfo ? rankingInfo.bg : 'bg-slate-800';
                        return (
                            <tr key={student.name} className={`${rowBg} hover:bg-slate-700/50 border-l-4 ${rankingInfo ? rankingInfo.border : 'border-transparent'} transition-colors duration-200`}>
                                <td className="p-3 font-bold w-24">
                                     <div className="flex items-center gap-3">
                                        <span className={`w-6 text-center font-bold ${rankingInfo ? rankingInfo.color : 'text-slate-400'}`}>{index + 1}</span>
                                        {rankingInfo && <i className={`fas ${rankingInfo.icon} ${rankingInfo.color} text-lg ml-1`}></i>}
                                    </div>
                                </td>
                                <th scope="row" className={`p-3 font-semibold text-slate-100`}>
                                    <div className="flex items-center gap-3 whitespace-nowrap">
                                        {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-8 h-8 rounded-full bg-slate-700"/>}
                                        <span>{student.name}</span>
                                    </div>
                                </th>
                                <td className="p-3 text-center text-lg font-bold">{student.level}</td>
                                <td className="p-3 text-center text-lg font-mono">{student.xp}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
