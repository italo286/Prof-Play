import React, { useState, FormEvent } from 'react';
import type { Point } from '../types';

interface CoordinateInputProps {
  onSubmit: (coords: Point) => void;
  disabled?: boolean;
  xLabel?: string;
  yLabel?: string;
}

export const CoordinateInput: React.FC<CoordinateInputProps> = ({ 
  onSubmit, 
  disabled = false, 
  xLabel = 'X', 
  yLabel = 'Y' 
}) => {
  const [xValue, setXValue] = useState('');
  const [yValue, setYValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const x = parseInt(xValue, 10);
    const y = parseInt(yValue, 10);

    if (!isNaN(x) && !isNaN(y)) {
      onSubmit({ x, y });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="my-4 flex flex-row flex-wrap items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="x-coord" className="font-bold text-slate-300 text-lg">{xLabel}:</label>
        <input
          id="x-coord"
          type="number"
          value={xValue}
          onChange={(e) => setXValue(e.target.value)}
          disabled={disabled}
          className="w-24 p-2 border border-slate-600 rounded-md shadow-sm text-center text-lg bg-slate-700 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          aria-label={`Coordenada ${xLabel}`}
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="y-coord" className="font-bold text-slate-300 text-lg">{yLabel}:</label>
        <input
          id="y-coord"
          type="number"
          value={yValue}
          onChange={(e) => setYValue(e.target.value)}
          disabled={disabled}
          className="w-24 p-2 border border-slate-600 rounded-md shadow-sm text-center text-lg bg-slate-700 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          aria-label={`Coordenada ${yLabel}`}
          required
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="px-6 py-2.5 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 disabled:bg-slate-600 disabled:cursor-not-allowed"
      >
        <i className="fas fa-check mr-2"></i>
        Verificar
      </button>
    </form>
  );
};