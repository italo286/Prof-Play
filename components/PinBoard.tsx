import React, { useMemo } from 'react';
import type { Pin, Line, ClaimedTriangle, PlayerColor } from '../types';

interface PinBoardProps {
  pins: Map<string, Pin>;
  lines: Line[];
  claimedTriangles: ClaimedTriangle[];
  selectedPin: string | null;
  validNextPins: Set<string>;
  onPinClick: (pinId: string) => void;
}

const PIN_RADIUS = 6;
const CELL_SPACING = 35; 
const SVG_PADDING = 20;
const PIECE_SIZE_RATIO = 0.35; 

export const PinBoard: React.FC<PinBoardProps> = ({ pins, lines, claimedTriangles, selectedPin, validNextPins, onPinClick }) => {
  const pinArray = useMemo(() => Array.from(pins.values()), [pins]);

  const hexToPixel = (pin: Pin) => {
    const x = CELL_SPACING * (3 / 2 * pin.q);
    const y = CELL_SPACING * (Math.sqrt(3) / 2 * pin.q + Math.sqrt(3) * pin.r);
    return { x, y };
  };

  const { width, height, offsetX, offsetY } = useMemo(() => {
    if (pinArray.length === 0) return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
    const coords = pinArray.map(hexToPixel);
    const minX = Math.min(...coords.map(p => p.x));
    const maxX = Math.max(...coords.map(p => p.x));
    const minY = Math.min(...coords.map(p => p.y));
    const maxY = Math.max(...coords.map(p => p.y));
    return {
      width: maxX - minX + SVG_PADDING * 2,
      height: maxY - minY + SVG_PADDING * 2,
      offsetX: -minX + SVG_PADDING,
      offsetY: -minY + SVG_PADDING,
    };
  }, [pinArray]);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} aria-label="Tabuleiro de Xadrez de Triângulos">
      <g>
        {claimedTriangles.map(triangle => {
          const v1 = pins.get(triangle.vertices[0]);
          const v2 = pins.get(triangle.vertices[1]);
          const v3 = pins.get(triangle.vertices[2]);
          if (!v1 || !v2 || !v3) return null;

          const p1 = hexToPixel(v1);
          const p2 = hexToPixel(v2);
          const p3 = hexToPixel(v3);

          const centerX = (p1.x + p2.x + p3.x) / 3;
          const centerY = (p1.y + p2.y + p3.y) / 3;
          
          const sortedY = [p1.y, p2.y, p3.y].sort((a, b) => a - b);
          const isPointingUp = Math.abs(sortedY[1] - sortedY[0]) > Math.abs(sortedY[2] - sortedY[1]);

          const pieceSize = CELL_SPACING * PIECE_SIZE_RATIO;
          let piecePoints = '';

          if (isPointingUp) {
            const topY = centerY - (pieceSize * Math.sqrt(3) / 3);
            const botY = centerY + (pieceSize * Math.sqrt(3) / 6);
            const leftX = centerX - (pieceSize / 2);
            const rightX = centerX + (pieceSize / 2);
            piecePoints = `${centerX + offsetX},${topY + offsetY} ${leftX + offsetX},${botY + offsetY} ${rightX + offsetX},${botY + offsetY}`;
          } else { 
            const botY = centerY + (pieceSize * Math.sqrt(3) / 3);
            const topY = centerY - (pieceSize * Math.sqrt(3) / 6);
            const leftX = centerX - (pieceSize / 2);
            const rightX = centerX + (pieceSize / 2);
            piecePoints = `${centerX + offsetX},${botY + offsetY} ${leftX + offsetX},${topY + offsetY} ${rightX + offsetX},${topY + offsetY}`;
          }

          const playerFill = triangle.owner === 'player1' ? 'fill-sky-400' : 'fill-cyan-400';
          return (
            <polygon
              key={triangle.id}
              points={piecePoints}
              className={`${playerFill} transition-all duration-300`}
            />
          );
        })}

        {lines.map((line, index) => {
          const fromPin = pins.get(line.from);
          const toPin = pins.get(line.to);
          if (!fromPin || !toPin) return null;
          const p1 = hexToPixel(fromPin);
          const p2 = hexToPixel(toPin);
          return (
            <line
              key={`${line.from}-${line.to}-${index}`}
              x1={p1.x + offsetX}
              y1={p1.y + offsetY}
              x2={p2.x + offsetX}
              y2={p2.y + offsetY}
              className="stroke-white stroke-[4px]"
              strokeLinecap="round"
            />
          );
        })}
        
        {pinArray.map(pin => {
          const { x, y } = hexToPixel(pin);
          const isSelected = selectedPin === pin.id;
          const isValidNext = validNextPins.has(pin.id);
          return (
            <g key={pin.id} onClick={() => onPinClick(pin.id)} className="cursor-pointer">
              {isValidNext && !isSelected && (
                <circle
                  cx={x + offsetX}
                  cy={y + offsetY}
                  r={PIN_RADIUS * 1.8}
                  className="fill-sky-500/50"
                >
                  <animate
                    attributeName="r"
                    values={`${PIN_RADIUS};${PIN_RADIUS * 1.8};${PIN_RADIUS}`}
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.5;0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              <circle
                cx={x + offsetX}
                cy={y + offsetY}
                r={isSelected ? PIN_RADIUS * 1.5 : PIN_RADIUS}
                className={`transition-all duration-200 ${
                  isSelected ? 'fill-yellow-400' : 'fill-slate-700 hover:fill-slate-500'
                }`}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
};
