

import React from 'react';
import type { Point } from '../types';

interface CoordinateDisplayProps {
  coordinate: Point;
}

export const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({ coordinate }) => {
  return (
    <div className="my-4 p-4 bg-slate-700/50 rounded-lg shadow-inner text-center">
      <p className="text-sm text-sky-300 font-medium mb-1">Encontre o ponto:</p>
      <p className="text-3xl font-bold text-sky-200">
        ( {coordinate.x}, {coordinate.y} )
      </p>
    </div>
  );
};