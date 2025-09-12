import React from 'react';
import type { ClassData } from '../../types';

export const AdedonhaTappleManager: React.FC<{ selectedClass: ClassData }> = ({ selectedClass }) => {
    return (
        <div className="bg-slate-900/70 p-6 rounded-lg text-center">
            <h2 className="text-xl font-bold text-sky-300 mb-4">Gerenciar Adedonha Tapple</h2>
            <p className="text-slate-300">Este modo de jogo ainda está em desenvolvimento.</p>
        </div>
    );
};
