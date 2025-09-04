import React, { useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { UserProfile } from '../types';
import { BarChart } from './BarChart';

interface ClassReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: UserProfile[];
  className: string;
}

const gameNames: { [key: string]: string } = {
    'coordenadas-geograficas': 'Coords. Geo.',
    'encontrar-pontos': 'Encontrar Pts.',
    'reconhecer-pontos': 'Reconhecer Pts.',
    'simetria-pontos': 'Simetria Pts.',
    'simetria-segmentos_easy': 'Seg. (Fácil)',
    'simetria-segmentos_medium': 'Seg. (Médio)',
    'simetria-segmentos_hard': 'Seg. (Difícil)',
};

const getGameName = (gameId: string): string => gameNames[gameId] || gameId;

export const ClassReportModal: React.FC<ClassReportModalProps> = ({ isOpen, onClose, students, className }) => {
  const reportData = useMemo(() => {
    const aggregatedStats: { [gameId: string]: { successes: number; errors: number } } = {};

    for (const student of students) {
        for (const gameId in student.gameStats) {
            if (!aggregatedStats[gameId]) {
                aggregatedStats[gameId] = { successes: 0, errors: 0 };
            }
            const stats = student.gameStats[gameId];
            aggregatedStats[gameId].successes += stats.successFirstTry + stats.successOther;
            aggregatedStats[gameId].errors += stats.errors;
        }
    }
    
    const gamePerformance = Object.entries(aggregatedStats).map(([gameId, data]) => ({
        gameName: getGameName(gameId),
        ...data
    }));

    const gameWithMostSuccesses = [...gamePerformance].sort((a, b) => b.successes - a.successes)[0];
    const gameWithMostErrors = [...gamePerformance].sort((a, b) => b.errors - a.errors)[0];

    return { gamePerformance, gameWithMostSuccesses, gameWithMostErrors };
  }, [students]);

  const successData = useMemo(() => {
    return reportData.gamePerformance.map(d => ({
        label: d.gameName,
        value: d.successes,
        color: '#22c55e' // green-500
    }));
  }, [reportData]);

  const errorData = useMemo(() => {
    return reportData.gamePerformance.map(d => ({
        label: d.gameName,
        value: d.errors,
        color: '#ef4444' // red-500
    }));
  }, [reportData]);
  
  const handleDownloadPdf = () => {
    const pdf = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    
    // Header
    pdf.setFontSize(18);
    pdf.text(`Relatório da Turma: ${className}`, 14, 22);
    pdf.setFontSize(11);
    pdf.setTextColor(100);
    pdf.text(`Gerado em: ${today}`, 14, 30);
    pdf.text(`Total de Alunos: ${students.length}`, 14, 36);

    let lastY = 46;

    if (reportData.gamePerformance.length > 0) {
        // Summary Cards
        pdf.text(`Ponto Forte (Mais Acertos): ${reportData.gameWithMostSuccesses?.gameName || 'N/A'} (${reportData.gameWithMostSuccesses?.successes || 0} acertos)`, 14, lastY);
        lastY += 6;
        pdf.text(`Ponto a Melhorar (Mais Erros): ${reportData.gameWithMostErrors?.gameName || 'N/A'} (${reportData.gameWithMostErrors?.errors || 0} erros)`, 14, lastY);
        lastY += 10;
        
        // Table 1: Per-game stats
        pdf.setFontSize(14);
        pdf.setTextColor(0);
        pdf.text('Desempenho Geral por Modo de Jogo', 14, lastY);
        lastY += 8;

        autoTable(pdf, {
            startY: lastY,
            head: [['Modo de Jogo', 'Total de Acertos', 'Total de Erros']],
            body: reportData.gamePerformance.map(g => [g.gameName, g.successes, g.errors]),
            headStyles: { fillColor: [30, 41, 59] },
            didDrawPage: (data) => {
                pdf.setFontSize(10);
                pdf.text('Relatório da Turma - Página ' + data.pageNumber, data.settings.margin.left, pdf.internal.pageSize.height - 10);
            }
        });
        
        lastY = (pdf as any).lastAutoTable.finalY + 10;
    }

    if (students.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(0);
        pdf.text('Resumo de Desempenho por Aluno', 14, lastY);
        lastY += 8;
        
        // Table 2: Per-student stats
        autoTable(pdf, {
            startY: lastY,
            head: [['Aluno', 'Nível', 'XP', 'Medalhas', 'Total de Acertos', 'Total de Erros']],
            body: students.map(s => {
                const totalSuccess = Object.values(s.gameStats).reduce((acc, cur) => acc + cur.successFirstTry + cur.successOther, 0);
                const totalErrors = Object.values(s.gameStats).reduce((acc, cur) => acc + cur.errors, 0);
                return [s.name, s.level, s.xp, s.badges.length, totalSuccess, totalErrors];
            }),
            headStyles: { fillColor: [30, 41, 59] },
            theme: 'grid'
        });
    }

    pdf.save(`relatorio_turma_${className.replace(/\s+/g, '_')}.pdf`);
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative bg-slate-800 shadow-2xl rounded-xl w-full max-w-3xl text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:p-8">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors z-20 text-2xl"
              aria-label="Fechar"
            >
              <i className="fas fa-times-circle"></i>
            </button>
            <header className="text-center mb-6">
                <div className="flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-file-invoice text-4xl text-sky-400"></i>
                    <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                        Relatório da Turma
                    </h1>
                    <p className="text-xl font-semibold text-slate-100">{className}</p>
                </div>
            </header>

            {students.length > 0 ? (
                <>
                    <section className="mb-6 p-4 bg-slate-900/70 rounded-lg shadow-inner grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                        <div>
                            <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider">Ponto Forte da Turma</h3>
                            <p className="text-lg font-semibold">{reportData.gameWithMostSuccesses?.gameName || 'N/A'}</p>
                            <p className="text-xs text-slate-400">({reportData.gameWithMostSuccesses?.successes || 0} acertos no total)</p>
                        </div>
                         <div>
                            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Ponto a Melhorar</h3>
                            <p className="text-lg font-semibold">{reportData.gameWithMostErrors?.gameName || 'N/A'}</p>
                             <p className="text-xs text-slate-400">({reportData.gameWithMostErrors?.errors || 0} erros no total)</p>
                        </div>
                    </section>
                    
                    <section className="space-y-6">
                        <BarChart data={successData} title="Total de Acertos da Turma por Jogo" />
                        <BarChart data={errorData} title="Total de Erros da Turma por Jogo" />
                    </section>
                </>
            ) : (
                <p className="text-center text-slate-400 py-10">Não há dados suficientes para gerar um relatório.</p>
            )}


            <div className="mt-8 text-center">
                <button
                    onClick={handleDownloadPdf}
                    disabled={students.length === 0}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    <i className="fas fa-download mr-2"></i>Baixar Relatório (PDF)
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};