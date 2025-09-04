import React from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-down"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-lg text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors z-10 text-2xl"
          aria-label="Fechar"
        >
          <i className="fas fa-times-circle"></i>
        </button>

        <header className="text-center mb-4 border-b border-slate-700 pb-3">
            <div className="flex items-center justify-center gap-3">
                <i className="fas fa-info-circle text-3xl text-sky-400"></i>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                    {title}
                </h1>
            </div>
        </header>

        <section className="text-left">
            {children}
        </section>
      </div>
    </div>
  );
};