import React, { useMemo, useContext } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { UserProfile, GameStat } from '../types';
import { XpProgressBar } from './XpProgressBar';
import { BarChart } from './BarChart';
import { ALL_BADGES_MAP } from '../data/achievements';
import { GameDataContext } from '../contexts/GameDataContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: UserProfile | null;
}

const gameNames: { [key: string]: string } = {
    'coordenadas-geograficas': 'Coords. Geográficas',
    'encontrar-pontos': 'Encontrar Pontos',
    'reconhecer-pontos': 'Reconhecer Pontos',
    'simetria-pontos': 'Simetria de Pontos',
    'simetria-segmentos_easy': 'Segmentos (Fácil)',
    'simetria-segmentos_medium': 'Segmentos (Médio)',
    'simetria-segmentos_hard': 'Segmentos (Difícil)',
};

const GameNameFetcher: React.FC<{ gameId: string, children: (name: string) => React.ReactNode }> = ({ gameId, children }) => {
    const { passwordChallenges } = useContext(GameDataContext);

    const getGameName = (id: string): string => {
        if (id.startsWith('password_unlock_')) {
            const challengeId = id.replace('password_unlock_', '');
            const challenge = passwordChallenges.find(c => c.id === challengeId);
            return `Senha: ${challenge?.title || 'Desconhecido'}`;
        }
        return gameNames[id] || id;
    };

    return <>{children(getGameName(gameId))}</>;
};

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, student }) => {
  const { passwordChallenges } = useContext(GameDataContext);

  const getGameName = (gameId: string): string => {
      if (gameId.startsWith('password_unlock_')) {
          const challengeId = gameId.replace('password_unlock_', '');
          const challenge = passwordChallenges.find(c => c.id === challengeId);
          return `Senha: ${challenge?.title || 'Desconhecido'}`;
      }
      return gameNames[gameId] || gameId;
  };

  const handleDownloadPdf = () => {
    if (!student) return;

    const pdf = new jsPDF();
    
    // Header
    pdf.setFontSize(18);
    pdf.text(`Relatório de Desempenho: ${student.name}`, 14, 22);

    // Sub-header
    pdf.setFontSize(11);
    pdf.setTextColor(100);
    pdf.text(`Nível: ${student.level}`, 14, 32);
    pdf.text(`XP Total: ${student.xp}`, 14, 38);
    pdf.text(`Código da Turma: ${student.classCode || 'N/A'}`, 14, 44);

    let lastY = 54;

    // Medals Section
    if (student.badges && student.badges.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(0);
        pdf.text('Medalhas Conquistadas', 14, lastY);
        lastY += 7;

        pdf.setFontSize(10);
        pdf.setTextColor(100);
        const badgeNames = student.badges.map(id => ALL_BADGES_MAP.get(id)?.name).filter(Boolean).join(' • ');
        const splitText = pdf.splitTextToSize(badgeNames, 180);
        pdf.text(splitText, 14, lastY);
        lastY += (splitText.length * 5) + 5;
    }
    
    // Table data
    const tableData = Object.entries(student.gameStats || {}).map(([gameId, stats]) => {
        const totalSuccess = stats.successFirstTry + stats.successOther;
        return [
            getGameName(gameId),
            stats.successFirstTry,
            stats.successOther,
            totalSuccess,
            stats.errors
        ];
    });

    if (tableData.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(0);
        pdf.text('Desempenho Detalhado por Modo de Jogo', 14, lastY);
        lastY += 8;

        autoTable(pdf, {
            startY: lastY,
            head: [['Modo de Jogo', 'Acertos (1ª Tentativa)', 'Acertos (Outras)', 'Total Acertos', 'Erros']],
            body: tableData,
            headStyles: { fillColor: [30, 41, 59] },
            theme: 'grid',
            didDrawPage: (data) => {
                pdf.setFontSize(10);
                pdf.text(`Página ${data.pageNumber}`, data.settings.margin.left, pdf.internal.pageSize.height - 10);
            }
        });
    } else {
        pdf.setFontSize(12);
        pdf.text('Nenhuma atividade registrada para este aluno.', 14, lastY);
    }

    pdf.save(`relatorio_${student.name.replace(/\s+/g, '_')}.pdf`);
  };

  const performanceData = useMemo(() => {
    if (!student?.gameStats) return [];
    
    // FIX: Explicitly type the mapped entry to ensure type safety for stats.
    return Object.entries(student.gameStats).map(([gameId, stats]: [string, GameStat]) => {
      const totalSuccess = stats.successFirstTry + stats.successOther;
      return {
        gameName: getGameName(gameId),
        ...stats,
        totalSuccess,
      };
    });
  }, [student, passwordChallenges]);

  const successData = useMemo(() => {
    if (!performanceData) return [];
    return performanceData.map(d => ({
        label: d.gameName,
        value: d.totalSuccess,
        color: '#22c55e'
    }));
  }, [performanceData]);

  const errorData = useMemo(() => {
    if (!performanceData) return [];
    return performanceData.map(d => ({
        label: d.gameName,
        value: d.errors,
        color: '#ef4444'
    }));
  }, [performanceData]);

  if (!isOpen || !student) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative bg-slate-800 shadow-2xl rounded-xl w-full max-w-2xl text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:p-8">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors z-20 text-2xl no-print"
              aria-label="Fechar"
            >
              <i className="fas fa-times-circle"></i>
            </button>
            <header className="text-center mb-6">
                <div className="flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-chart-bar text-4xl text-sky-400"></i>
                    <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                        Relatório de Desempenho
                    </h1>
                     {student.avatar ? (
                        <img src={student.avatar} alt={`Avatar de ${student.name}`} className="w-20 h-20 rounded-full bg-slate-700 border-4 border-sky-400 shadow-lg mt-2"/>
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-slate-700 border-4 border-sky-400 shadow-lg flex items-center justify-center mt-2">
                            <i className="fas fa-user-graduate text-4xl text-sky-400"></i>
                        </div>
                    )}
                    <p className="text-xl font-semibold text-slate-100">{student.name}</p>
                </div>
            </header>

            <section className="mb-6 p-4 bg-slate-900/70 rounded-lg shadow-inner">
                <h2 className="text-xl font-bold text-sky-300 mb-2 text-center">Progresso Geral</h2>
                <p className="text-center text-lg mb-3 font-semibold">Nível {student.level}</p>
                <XpProgressBar currentXp={student.xp} level={student.level} />
            </section>
            
            <section className="space-y-6">
                 <BarChart data={successData} title="Total de Acertos por Jogo" />
                 <BarChart data={errorData} title="Total de Erros por Jogo" />
            </section>

             <div className="mt-8 text-center">
                <button
                    onClick={handleDownloadPdf}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
                >
                    <i className="fas fa-download mr-2"></i>Baixar Relatório (PDF)
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
