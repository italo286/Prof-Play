import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in-down"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-md text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <header className="text-center mb-4">
            <div className="flex flex-col items-center justify-center gap-3">
                <i className="fas fa-exclamation-triangle text-4xl text-yellow-400"></i>
                <h1 className="text-2xl font-bold text-slate-50">
                    {title}
                </h1>
            </div>
        </header>

        <p className="text-center text-slate-300 mb-6">{message}</p>

        <div className="flex justify-center gap-4">
            <button 
                onClick={onClose} 
                className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={onConfirm} 
                className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
                Confirmar Exclusão
            </button>
        </div>
      </div>
    </div>
  );
};