import React, { useState, FormEvent } from 'react';
import type { Point } from '../types';

type LatDirection = 'N' | 'S';
type LonDirection = 'L' | 'O';

interface GeoCoordinateInputProps {
  onSubmit: (coords: Point) => void;
  disabled?: boolean;
}

const DirectionToggle: React.FC<{
  currentValue: string;
  options: [string, string];
  onToggle: (value: any) => void;
  'aria-label': string;
}> = ({ currentValue, options, onToggle, 'aria-label': ariaLabel }) => (
  <div className="relative grid grid-cols-2 gap-1 rounded-lg p-1 bg-slate-600" aria-label={ariaLabel}>
    {options.map(opt => (
      <button
        key={opt}
        type="button"
        onClick={() => onToggle(opt)}
        className={`relative w-12 rounded-md py-1 text-sm font-medium whitespace-nowrap focus:outline-none ${
          currentValue === opt ? 'text-white' : 'text-slate-300 hover:text-white'
        }`}
        aria-pressed={currentValue === opt}
      >
        <span className="relative z-10">{opt}</span>
        {currentValue === opt && (
          <div className="absolute inset-0 bg-sky-600 rounded-md transition-all animate-fade-in" style={{ animationDuration: '0.2s' }}></div>
        )}
      </button>
    ))}
  </div>
);

export const GeoCoordinateInput: React.FC<GeoCoordinateInputProps> = ({ onSubmit, disabled = false }) => {
  const [latValue, setLatValue] = useState('');
  const [latDir, setLatDir] = useState<LatDirection>('N');
  const [lonValue, setLonValue] = useState('');
  const [lonDir, setLonDir] = useState<LonDirection>('L');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const lat = parseInt(latValue, 10);
    const lon = parseInt(lonValue, 10);

    if (!isNaN(lat) && !isNaN(lon)) {
      const finalLat = latDir === 'S' ? -lat : lat;
      const finalLon = lonDir === 'O' ? -lon : lon; // 'O' for Oeste (West)
      onSubmit({ x: finalLon, y: finalLat }); // x is Lon, y is Lat
    }
  };

  return (
    <form onSubmit={handleSubmit} className="my-4 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-6 p-4 bg-slate-700/50 rounded-lg">
      <div className="flex items-center gap-3">
        <label htmlFor="lat-coord" className="font-bold text-slate-300 text-lg">Lat:</label>
        <input
          id="lat-coord"
          type="number"
          value={latValue}
          min="0"
          max="90"
          step="30"
          onChange={(e) => setLatValue(e.target.value)}
          disabled={disabled}
          className="w-24 p-2 border border-slate-600 rounded-md shadow-sm text-center text-lg bg-slate-700 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          aria-label="Graus de Latitude"
          required
        />
        <DirectionToggle currentValue={latDir} options={['N', 'S']} onToggle={setLatDir} aria-label="Seleção de direção de latitude (Norte/Sul)" />
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor="lon-coord" className="font-bold text-slate-300 text-lg">Lon:</label>
        <input
          id="lon-coord"
          type="number"
          value={lonValue}
          min="0"
          max="180"
          step="30"
          onChange={(e) => setLonValue(e.target.value)}
          disabled={disabled}
          className="w-24 p-2 border border-slate-600 rounded-md shadow-sm text-center text-lg bg-slate-700 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          aria-label="Graus de Longitude"
          required
        />
        <DirectionToggle currentValue={lonDir} options={['L', 'O']} onToggle={setLonDir} aria-label="Seleção de direção de longitude (Leste/Oeste)" />
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
