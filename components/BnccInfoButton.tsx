import React, { useState } from 'react';
import { InfoModal } from './InfoModal';
import { BNCC_DATA } from '../data/bncc';

interface BnccInfoButtonProps {
  gameId: string;
}

export const BnccInfoButton: React.FC<BnccInfoButtonProps> = ({ gameId }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const bnccInfo = BNCC_DATA[gameId];

  if (!bnccInfo) return null;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="text-slate-400 hover:text-sky-400 transition-colors flex items-center text-sm font-medium p-2 rounded-lg hover:bg-slate-700"
        aria-label="Ver habilidades da BNCC"
      >
        <i className="fas fa-info-circle text-lg"></i>
      </button>

      <InfoModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title="Habilidades da BNCC"
      >
        <h3 className="text-xl font-bold text-slate-50 mb-2">{bnccInfo.title}</h3>
        {bnccInfo.content}
      </InfoModal>
    </>
  );
};