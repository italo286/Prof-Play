import React, { useMemo } from 'react';

interface LevelUpModalProps {
  level: number;
  onDismiss: () => void;
}

const ConfettiPiece: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
    <div className="confetti" style={style}></div>
);

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ level, onDismiss }) => {
  const confetti = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      const style = {
        left: `${Math.random() * 100}vw`,
        animationDelay: `${Math.random() * 5}s`,
        backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
        transform: `scale(${Math.random() * 0.5 + 0.5})`,
      };
      return <ConfettiPiece key={i} style={style} />;
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] overflow-hidden">
      {confetti}
      <div className="relative bg-slate-800 text-slate-50 rounded-2xl shadow-2xl p-8 md:p-12 text-center transform scale-100 transition-transform duration-500 ease-out animate-fade-in-down">
        <i className="fas fa-star text-7xl text-yellow-400 mb-4 animate-pulse" style={{ textShadow: '0 0 15px rgba(251, 191, 36, 0.7)' }}></i>
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
          Subiu de Nível!
        </h1>
        <p className="text-slate-200 text-2xl mb-8">
          Você alcançou o <span className="font-bold text-3xl">Nível {level}</span>
        </p>
        <button
          onClick={onDismiss}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-sky-500 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};