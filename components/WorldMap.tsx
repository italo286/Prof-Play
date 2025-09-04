import React from 'react';
import type { GeoPoint, GeoHintInfo } from '../types';

interface WorldMapProps {
  specialPoints?: Array<{ point: GeoPoint; className: string; radius?: number }>;
  hint?: GeoHintInfo | null;
}

const MAP_WIDTH = 540;
const MAP_HEIGHT = 270;
const PADDING = 30;

const SPECIAL_POINT_RADIUS = 7;

export const WorldMap: React.FC<WorldMapProps> = ({ specialPoints = [], hint = null }) => {
  const svgWidth = MAP_WIDTH + PADDING * 2;
  const svgHeight = MAP_HEIGHT + PADDING * 2;

  const toSvgX = (lon: number): number => PADDING + ((lon + 180) / 360) * MAP_WIDTH;
  const toSvgY = (lat: number): number => PADDING + ((-lat + 90) / 180) * MAP_HEIGHT;

  const latLines = [-60, -30, 0, 30, 60];
  const lonLines = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
  
  const renderHint = () => {
    if (!hint) return null;
    const hintPointSvg = { x: toSvgX(hint.point.lon), y: toSvgY(hint.point.lat) };
    const hintStyle = "stroke-yellow-500 stroke-2 stroke-dashed pointer-events-none";
    
    return (
      <g>
        <line x1={hintPointSvg.x} y1={hintPointSvg.y} x2={hintPointSvg.x} y2={PADDING} className={`${hintStyle} animate-draw-line`} />
        <line x1={hintPointSvg.x} y1={hintPointSvg.y} x2={PADDING} y2={hintPointSvg.y} className={`${hintStyle} animate-draw-line`} style={{ animationDelay: '0.5s' }} />
      </g>
    );
  };

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="bg-slate-800 shadow-lg rounded-lg border border-slate-700"
      aria-label="Mapa Mundi com grade de latitude e longitude"
    >
      <rect x="0" y="0" width={svgWidth} height={svgHeight} className="fill-slate-800" />
      <image href="https://i.ibb.co/XryVxyf5/globalizacao-global-mapa-mundo-conceito-de-conservacao-ambiental.jpg" x={PADDING} y={PADDING} width={MAP_WIDTH} height={MAP_HEIGHT} />


      {/* Secondary grid lines */}
      <g className="grid-lines stroke-black/50 stroke-1">
        {latLines.filter(lat => lat !== 0).map((lat) => (
          <line key={`lat-${lat}`} x1={PADDING} y1={toSvgY(lat)} x2={PADDING + MAP_WIDTH} y2={toSvgY(lat)} />
        ))}
        {lonLines.filter(lon => lon !== 0).map((lon) => (
          <line key={`lon-${lon}`} x1={toSvgX(lon)} y1={PADDING} x2={toSvgX(lon)} y2={PADDING + MAP_HEIGHT} />
        ))}
      </g>
      
       {/* Main axes (Equator & Prime Meridian) */}
       <g className="axes stroke-black/80 stroke-[1.5px]">
          <line x1={PADDING} y1={toSvgY(0)} x2={PADDING + MAP_WIDTH} y2={toSvgY(0)} />
          <line x1={toSvgX(0)} y1={PADDING} x2={toSvgX(0)} y2={PADDING + MAP_HEIGHT} />
       </g>

      <g className="labels fill-slate-900 text-xs font-bold" style={{paintOrder: 'stroke', stroke: 'white', strokeWidth: '2px', strokeLinecap: 'butt', strokeLinejoin: 'miter'}}>
        {latLines.map(lat => (
            <text key={`lab-lat-${lat}`} x={PADDING - 5} y={toSvgY(lat) + 3} textAnchor="end">{Math.abs(lat)}°{lat > 0 ? 'N' : lat < 0 ? 'S' : ''}</text>
        ))}
        {lonLines.map(lon => (
             <text key={`lab-lon-${lon}`} x={toSvgX(lon)} y={PADDING - 5} textAnchor="middle">{Math.abs(lon)}°{lon > 0 ? 'L' : lon < 0 ? 'O' : ''}</text>
        ))}
      </g>

      <g className="special-points">
        {specialPoints.map(({ point, className, radius }, index) => (
          <circle
            key={`special-point-${index}`}
            cx={toSvgX(point.lon)}
            cy={toSvgY(point.lat)}
            r={radius || SPECIAL_POINT_RADIUS}
            className={`${className} transition-all`}
            aria-label={`Ponto destacado em latitude ${point.lat}, longitude ${point.lon}`}
          />
        ))}
      </g>
      
      {/* Hint rendering */}
      <g className="hints">
        {renderHint()}
      </g>
    </svg>
  );
};