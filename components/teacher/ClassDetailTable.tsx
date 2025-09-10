import React from 'react';
import type { UserProfile } from '../../types';
import { ALL_BADGES_MAP } from '../../data/achievements';

const gameNames: { [key: string]: string } = {
    'coordenadas-geograficas': 'Coords. Geográficas',
    'encontrar-pontos': 'Encontrar Pontos',
    'reconhecer-pontos': 'Reconhecer Pontos',
    'simetria-pontos': 'Simetria de Pontos',
    'simetria-segmentos_easy': 'Segmentos (Fácil)',
    'simetria-segmentos_medium': 'Segmentos (Médio)',
    'simetria-segmentos_hard': 'Segmentos (Difícil)',
    'password_unlock': 'Descubra a Senha',
};

const gameIdsInOrder: string[] = [
    'coordenadas-geograficas', 'encontrar-pontos', 'reconhecer-pontos', 'simetria-pontos',
    'simetria-segmentos_easy', 'simetria-segmentos_medium', 'simetria-segmentos_hard',
    'password_unlock',
];

const getGameName = (gameId: string): string => {
    if (gameId.startsWith('password_unlock_')) return 'Descubra a Senha';
    return gameNames[gameId] || gameId;
};

const getRankingInfo = (rank: number) => {
    switch (rank) {
      case 0: return { icon: 'fa-medal', color: 'text-amber-400', bg: 'bg-amber-900/40', border: 'border-amber-500' };
      case 1: return { icon: 'fa-medal', color: 'text-gray-400', bg: 'bg-gray-800', border: 'border-gray-500' };
      case 2: return { icon: 'fa-medal', color: 'text-orange-500', bg: 'bg-orange-900/40', border: 'border-orange-600' };
      default: return null;
    }
};

interface ClassDetailTableProps {
    students: UserProfile[];
    onViewReport: (student: UserProfile) => void;
}

export const ClassDetailTable: React.FC<ClassDetailTableProps> = ({ students, onViewReport }) => {
    return (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg" style={{ maxHeight: 'calc(100vh - 280px)'}}>
            <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-sky-300 uppercase bg-slate-900/95 backdrop-blur-sm sticky top-0 z-30">
                    <tr>
                        <th scope="col" rowSpan={2} className="p-3 sticky left-0 top-0 z-20 bg-slate-900/95">Aluno</th>
                        <th scope="col" rowSpan={2} className="p-3 text-center">Nível</th>
                        <th scope="col" rowSpan={2} className="p-3 text-center">XP</th>
                        {gameIdsInOrder.map(gameId => (
                            <th key={gameId} scope="colgroup" colSpan={2} className="p-3 text-center border-l border-slate-700">{getGameName(gameId)}</th>
                        ))}
                        <th scope="col" rowSpan={2} className="p-3 text-center border-l border-slate-700">Medalhas</th>
                        <th scope="col" rowSpan={2} className="p-3 text-center border-l border-slate-700">Relatório</th>
                    </tr>
                    <tr>
                        {gameIdsInOrder.map(gameId => (
                            <React.Fragment key={`${gameId}-stats`}>
                                <th scope="col" className="p-2 text-center text-green-400 border-l border-slate-700 sticky top-[41px] z-10 bg-slate-900/95" title="Acertos">A</th>
                                <th scope="col" className="p-2 text-center text-red-400 sticky top-[41px] z-10 bg-slate-900/95" title="Erros">E</th>
                            </React.Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {students.map((student, index) => {
                        const rankingInfo = getRankingInfo(index);
                        const rowBg = rankingInfo ? rankingInfo.bg : 'bg-slate-800';
                        const gameStats = student.gameStats || {};
                        return (
                            <tr key={student.name} className={`${rowBg} hover:bg-slate-700/50 border-l-4 ${rankingInfo ? rankingInfo.border : 'border-transparent'} transition-colors duration-200`}>
                                <th scope="row" className={`p-3 font-semibold text-slate-100 sticky left-0 z-10 ${rowBg}`}>
                                    <div className="flex items-center gap-3 whitespace-nowrap">
                                        <span className={`w-6 text-center font-bold ${rankingInfo ? rankingInfo.color : 'text-slate-400'}`}>{index + 1}</span>
                                        {student.avatar && <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-8 h-8 rounded-full bg-slate-700"/>}
                                        <span>{student.name}</span>
                                        {rankingInfo && <i className={`fas ${rankingInfo.icon} ${rankingInfo.color} text-lg ml-1`}></i>}
                                    </div>
                                </th>
                                <td className="p-3 text-center">{student.level}</td>
                                <td className="p-3 text-center">{student.xp}</td>
                                {gameIdsInOrder.map(gameId => {
                                    const stats = gameId === 'password_unlock'
                                        ? Object.entries(gameStats).reduce((acc, [key, value]) => {
                                            if (key.startsWith('password_unlock_')) {
                                                acc.successFirstTry += value.successFirstTry;
                                                acc.successOther += value.successOther;
                                                acc.errors += value.errors;
                                            }
                                            return acc;
                                          }, { successFirstTry: 0, successOther: 0, errors: 0 })
                                        : gameStats[gameId] || { successFirstTry: 0, successOther: 0, errors: 0 };
                                    const totalSuccess = stats.successFirstTry + stats.successOther;
                                    return (
                                        <React.Fragment key={`${student.name}-${gameId}`}>
                                            <td className="p-2 text-center text-green-400 font-medium border-l border-slate-700">{totalSuccess}</td>
                                            <td className="p-2 text-center text-red-400 font-medium">{stats.errors}</td>
                                        </React.Fragment>
                                    );
                                })}
                                <td className="p-2 border-l border-slate-700 min-w-[100px]">
                                    <div className="flex flex-wrap gap-2 justify-center items-center">
                                        {student.badges.length > 0 ? (
                                            student.badges.map(badgeId => {
                                                const badge = ALL_BADGES_MAP.get(badgeId);
                                                if (!badge) return null;
                                                const tierColor = { gold: 'text-amber-400', silver: 'text-gray-400', bronze: 'text-orange-500', level: 'text-sky-400' }[badge.tier];
                                                return <i key={badgeId} className={`fas ${badge.icon} ${tierColor} text-xl`} title={badge.name}></i>;
                                            })
                                        ) : <span className="text-xs text-slate-500">-</span>}
                                    </div>
                                </td>
                                <td className="p-2 border-l border-slate-700 text-center">
                                    <button onClick={() => onViewReport(student)} className="text-sky-400 hover:text-sky-300" title="Ver relatório completo">
                                        <i className="fas fa-chart-bar text-lg"></i>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};