import React from 'react';
import type { Point, HintInfo } from '../types';

interface CartesianPlaneProps {
  minCoord: number;
  maxCoord: number;
  onPointSelected?: (x: number, y: number) => void;
  disabled?: boolean;
  specialPoints?: Array<{ point: Point; className: string; radius?: number; style?: React.CSSProperties }>;
  polylines?: Array<{ points: Point[]; className: string }>;
  hint?: HintInfo | null;
}

const CELL_SIZE = 35; // pixels
const PADDING = 35; // pixels for labels and spacing
const POINT_RADIUS = 6; // pixels for clickable points
const SPECIAL_POINT_RADIUS = 8; // pixels for highlighted points
const AXIS_LABEL_OFFSET = 20; // Offset for axis labels from lines
const NUMBER_LABEL_OFFSET = 5; // Offset for number labels from axes

export const CartesianPlane: React.FC<CartesianPlaneProps> = ({
  minCoord,
  maxCoord,
  onPointSelected,
  disabled = false,
  specialPoints = [],
  polylines = [],
  hint = null,
}) => {
  const numTicks = maxCoord - minCoord + 1;
  const gridDimension = (numTicks - 1) * CELL_SIZE;
  const svgDimension = gridDimension + 2 * PADDING;

  const toSvgX = (cartesianX: number): number => PADDING + (cartesianX - minCoord) * CELL_SIZE;
  const toSvgY = (cartesianY: number): number => PADDING + (maxCoord - cartesianY) * CELL_SIZE;

  const clickablePoints: Point[] = [];
  if (onPointSelected) {
    for (let x = minCoord; x <= maxCoord; x++) {
      for (let y = minCoord; y <= maxCoord; y++) {
        clickablePoints.push({ x, y });
      }
    }
  }

  const originSvg = { x: toSvgX(0), y: toSvgY(0) };
  
  const renderHint = () => {
    if (!hint) return null;

    const hintPointSvg = hint.point ? { x: toSvgX(hint.point.x), y: toSvgY(hint.point.y) } : null;
    const hintStyle = "stroke-yellow-500 stroke-2 stroke-dashed pointer-events-none";

    switch (hint.type) {
        case 'line-draw-to-point':
            if (!hintPointSvg || !hint.point) return null;
            return (
                <g>
                    <line x1={toSvgX(hint.point.x)} y1={originSvg.y} x2={hintPointSvg.x} y2={hintPointSvg.y} className={`${hintStyle} animate-draw-line`} />
                    <line x1={originSvg.x} y1={toSvgY(hint.point.y)} x2={hintPointSvg.x} y2={hintPointSvg.y} className={`${hintStyle} animate-draw-line`} style={{animationDelay: '0.5s'}} />
                </g>
            );
        case 'line-draw-from-point':
             if (!hintPointSvg || !hint.point) return null;
            return (
                <g>
                    <line x1={hintPointSvg.x} y1={hintPointSvg.y} x2={hintPointSvg.x} y2={originSvg.y} className={`${hintStyle} animate-draw-line`} />
                    <line x1={hintPointSvg.x} y1={hintPointSvg.y} x2={originSvg.x} y2={hintPointSvg.y} className={`${hintStyle} animate-draw-line`} style={{animationDelay: '0.5s'}}/>
                </g>
            );
        case 'point-move':
            if (!hint.fromPoint || !hint.point) return null;
            return (
                <g>
                    <circle cx={toSvgX(hint.fromPoint.x)} cy={toSvgY(hint.fromPoint.y)} r={SPECIAL_POINT_RADIUS} className="fill-pink-500 animate-fade-out"/>
                    <circle cx={toSvgX(hint.point.x)} cy={toSvgY(hint.point.y)} r={SPECIAL_POINT_RADIUS} className="fill-teal-500 animate-fade-in" style={{animationDelay: '0.5s'}}/>
                </g>
            );
        case 'point-blink':
            if (!hint.points) return null;
            return (
                <g>
                    {hint.points.map((p, i) => (
                        <circle key={`blink-${i}`} cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={POINT_RADIUS} className="fill-yellow-500 animate-blink" />
                    ))}
                </g>
            );
        case 'point-move-showcase':
            if (!hint.fromPoint || !hint.showcasePoints) return null;
            return (
                <g>
                    {hint.showcasePoints.map((p, i) => (
                        <g key={i}>
                            <circle cx={toSvgX(p.point.x)} cy={toSvgY(p.point.y)} r={SPECIAL_POINT_RADIUS} className={p.className} />
                            <line
                                x1={toSvgX(hint.fromPoint!.x)} y1={toSvgY(hint.fromPoint!.y)}
                                x2={toSvgX(p.point.x)} y2={toSvgY(p.point.y)}
                                className="stroke-slate-400 stroke-1 stroke-dashed animate-draw-line"
                                style={{ animationDelay: `${i * 0.3}s` }}
                            />
                        </g>
                    ))}
                </g>
            );
        case 'point-blink-showcase':
            if (!hint.fromPoints || !hint.showcasePolylines) return null;
            return (
                <g>
                    {hint.showcasePolylines.map((line, i) => (
                        <polyline
                            key={`showcase-line-${i}`}
                            points={line.points.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')}
                            className={`${line.className} fill-none animate-draw-line`}
                            style={{ animationDelay: `${i * 0.3}s` }}
                        />
                    ))}
                </g>
            );
        default: return null;
    }
  }

  return (
    <svg
      width={svgDimension}
      height={svgDimension}
      className={`bg-white shadow-lg rounded-lg border border-slate-200 ${disabled && !onPointSelected ? 'cursor-not-allowed opacity-70' : ''}`}
      aria-label="Plano Cartesiano Interativo"
    >
      {/* Grid Lines */}
      <g className="grid-lines stroke-slate-200 stroke-1">
        {Array.from({ length: numTicks }).map((_, i) => {
          const coordVal = minCoord + i;
          // Vertical lines
          const xPos = toSvgX(coordVal);
          return <line key={`v-${i}`} x1={xPos} y1={PADDING} x2={xPos} y2={PADDING + gridDimension} />;
        })}
        {Array.from({ length: numTicks }).map((_, i) => {
          const coordVal = minCoord + i;
          // Horizontal lines
          const yPos = toSvgY(coordVal);
          return <line key={`h-${i}`} x1={PADDING} y1={yPos} x2={PADDING + gridDimension} y2={yPos} />;
        })}
      </g>

      {/* Axes */}
      <g className="axes stroke-slate-900 stroke-2">
        {/* X-axis */}
         <line x1={PADDING} y1={originSvg.y} x2={PADDING + gridDimension} y2={originSvg.y} />
        {/* Y-axis */}
        <line x1={originSvg.x} y1={PADDING} x2={originSvg.x} y2={PADDING + gridDimension} />
      </g>
      
      {/* Axis Labels (X and Y text) */}
       <text
        x={PADDING / 2 - 10}
        y={PADDING + gridDimension / 2}
        textAnchor="middle"
        transform={`rotate(-90, ${PADDING / 2 - 10}, ${PADDING + gridDimension / 2})`}
        className="fill-slate-700 font-semibold text-sm"
      >
        Eixo Y
      </text>
       <text
        x={PADDING + gridDimension / 2}
        y={svgDimension - PADDING / 2}
        textAnchor="middle"
        className="fill-slate-700 font-semibold text-sm"
      >
        Eixo X
      </text>


      {/* Number Labels */}
      <g className="labels fill-slate-600 text-xs">
        {Array.from({ length: numTicks }).map((_, i) => {
          const val = minCoord + i;
          if (val === 0 && (minCoord === 0 || maxCoord === 0)) return null;
          return (
            <text
              key={`lx-${i}`}
              x={toSvgX(val)}
              y={originSvg.y + AXIS_LABEL_OFFSET}
              textAnchor="middle"
            >
              {val}
            </text>
          );
        })}
        {Array.from({ length: numTicks }).map((_, i) => {
          const val = minCoord + i;
          if (val === 0) return null;
          return (
            <text
              key={`ly-${i}`}
              x={originSvg.x - AXIS_LABEL_OFFSET + 10}
              y={toSvgY(val) + NUMBER_LABEL_OFFSET}
              textAnchor="end"
            >
              {val}
            </text>
          );
        })}
         {(minCoord < 0 && maxCoord > 0) && (
            <text
              x={originSvg.x - AXIS_LABEL_OFFSET + 10}
              y={originSvg.y + AXIS_LABEL_OFFSET}
              textAnchor="end"
              className="fill-slate-600 text-xs"
            >
              0
            </text>
          )}
      </g>
      
      {/* Polylines for segments */}
      <g className="polylines">
        {polylines.map((line, index) => (
          <polyline
            key={`line-${index}`}
            points={line.points.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')}
            className={line.className}
          />
        ))}
      </g>

      {/* Clickable Points */}
      {onPointSelected && (
          <g className="clickable-points">
            {clickablePoints.map((p) => (
              <circle
                key={`point-${p.x}-${p.y}`}
                cx={toSvgX(p.x)}
                cy={toSvgY(p.y)}
                r={POINT_RADIUS}
                className={`fill-sky-500 hover:fill-sky-400 transition-colors ${disabled ? 'pointer-events-none' : 'cursor-pointer'}`}
                onClick={() => !disabled && onPointSelected(p.x, p.y)}
                aria-label={`Ponto (${p.x}, ${p.y})`}
              />
            ))}
          </g>
      )}

      {/* Special Display Points */}
      <g className="special-points">
        {specialPoints.map(({ point, className, radius, style }, index) => (
          <circle
            key={`special-point-${index}`}
            cx={toSvgX(point.x)}
            cy={toSvgY(point.y)}
            r={radius || SPECIAL_POINT_RADIUS}
            className={`${className} transition-all`}
            style={style}
            aria-label={`Ponto destacado em ${point.x}, ${point.y}`}
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