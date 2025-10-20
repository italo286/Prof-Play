import React, { useState, useEffect } from 'react';
import { hintsData } from '../data/hints';
import type { Point, GeoPoint, SymmetryType, HintInfo, GeoHintInfo } from '../types';
import { CartesianPlane } from './CartesianPlane';
import { WorldMap } from './WorldMap';

interface HintModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
}

export const HintModal: React.FC<HintModalProps> = ({ isOpen, onClose, gameId }) => {
  const [hint, setHint] = useState<HintInfo | GeoHintInfo | null>(null);
  
  const hintContent = hintsData[gameId];
  
  useEffect(() => {
    if (isOpen && hintContent) {
      // Generate the hint simulation data when the modal opens
      const simulationData = hintContent.simulation();
      setHint(simulationData);
    } else {
      setHint(null);
    }
  }, [isOpen, hintContent, gameId]);

  if (!isOpen || !hintContent) return null;

  const renderSimulation = () => {
    if (!hint) return null;
    
    // Safer type guard: check for a property unique to Cartesian hints
    const isCartesianHint = 'type' in hint;

    if (!isCartesianHint) {
        const geoHint = hint as GeoHintInfo;
        return (
             <div className="flex flex-col items-center gap-2">
                <WorldMap 
                    specialPoints={[{point: geoHint.point, className: 'fill-yellow-400 stroke-yellow-600 stroke-2' }]} 
                    hint={geoHint} 
                />
                <p className="text-sm font-bold text-slate-100 bg-slate-700 px-3 py-1 rounded-full">
                    Exemplo: Lat {geoHint.point.lat}, Lon {geoHint.point.lon}
                </p>
            </div>
        )
    } 
    
    // Logic for CartesianHint
    const cartesianHint = hint as HintInfo;
    const specialPoints: { point: Point; className: string; radius?: number; style?: React.CSSProperties }[] = [];
    const polylines = [];
    let exampleCoordinateText: string | null = null;
    let legendItems: { label: string, colorClass: string }[] = [];

    if (cartesianHint.fromPoint) {
        specialPoints.push({ point: cartesianHint.fromPoint, className: 'fill-pink-500' });
    }
    if (cartesianHint.fromPoints) {
        polylines.push({ points: cartesianHint.fromPoints, className: 'stroke-pink-500 stroke-[4px] fill-none' });
    }
    if (cartesianHint.type === 'line-draw-from-point' && cartesianHint.point) {
        specialPoints.push({ point: cartesianHint.point, className: 'fill-yellow-400 stroke-yellow-600 stroke-2' });
    }
    
    if (cartesianHint.point) {
        if (cartesianHint.type === 'line-draw-to-point') {
             exampleCoordinateText = `Exemplo: (${cartesianHint.point.x}, ${cartesianHint.point.y})`;
             specialPoints.push({
                point: cartesianHint.point,
                className: 'fill-yellow-400 animate-fade-in',
                radius: 6,
                style: { animationDelay: '1.5s' }
            });
        } else if (cartesianHint.type === 'line-draw-from-point') {
             exampleCoordinateText = `Exemplo: (${cartesianHint.point.x}, ${cartesianHint.point.y})`;
        } else if (cartesianHint.type === 'point-move' && cartesianHint.fromPoint) {
            exampleCoordinateText = `Exemplo: (${cartesianHint.fromPoint.x}, ${cartesianHint.fromPoint.y}) \u2192 (${cartesianHint.point.x}, ${cartesianHint.point.y})`;
        }
    } else if (cartesianHint.type === 'point-blink') {
        exampleCoordinateText = 'Exemplo de Simetria';
    }
    
    // New Showcase Logic
    if (cartesianHint.type === 'point-move-showcase' && cartesianHint.showcasePoints) {
        exampleCoordinateText = null; // Don't show coordinates for showcase
        legendItems.push({ label: 'Original', colorClass: 'bg-pink-500' });
        cartesianHint.showcasePoints.forEach(p => {
            const bgColor = p.className.replace('fill-', 'bg-');
            legendItems.push({ label: p.label, colorClass: bgColor });
        });
    }
    if (cartesianHint.type === 'point-blink-showcase' && cartesianHint.showcasePolylines) {
        exampleCoordinateText = null; // Don't show coordinates for showcase
        legendItems.push({ label: 'Original', colorClass: 'bg-pink-500' });
        cartesianHint.showcasePolylines.forEach(p => {
            const bgColor = p.className.replace('stroke-', 'bg-').split(' ')[0];
            legendItems.push({ label: p.label, colorClass: bgColor });
        });
    }


    return (
        <div className="flex flex-col items-center gap-2">
            <CartesianPlane 
                minCoord={-4} 
                maxCoord={4} 
                disabled={true} 
                hint={cartesianHint}
                specialPoints={specialPoints}
                polylines={polylines}
            />
            {legendItems.length > 0 && (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                    {legendItems.map(item => (
                        <div key={item.label} className="flex items-center gap-2 text-sm font-medium">
                            <span className={`w-3 h-3 rounded-full ${item.colorClass}`}></span>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            )}
            {exampleCoordinateText && (
                <p className="text-sm font-bold text-slate-100 bg-slate-700 px-3 py-1 rounded-full mt-2">
                    {exampleCoordinateText}
                </p>
            )}
        </div>
    );
  }

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-down"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-3xl text-slate-100 max-h-[90vh] overflow-y-auto"
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
                <i className="fas fa-lightbulb text-3xl text-yellow-500"></i>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                    Dica: {hintContent.title}
                </h1>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <section className="text-left">
                <h3 className="text-lg font-bold text-slate-50 mb-2">Passo a Passo:</h3>
                {hintContent.steps}
            </section>
            <section className="flex items-center justify-center p-4 bg-slate-900/70 rounded-lg">
                {renderSimulation()}
            </section>
        </div>

      </div>
    </div>
  );
};