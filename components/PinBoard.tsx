import React, { useMemo } from 'react';
import type { Pin, Line, ClaimedTriangle, PlayerColor } from '../types';

interface PinBoardProps {
  pins: Map<string, Pin>;
  lines: Line[];
  claimedTriangles: ClaimedTriangle[];
  selectedPin: string | null;
  onPinClick: (pinId: string) => void;
  playerColors: Record<PlayerColor, { primary: string; secondary: string }>;
}

const PIN_RADIUS = 6;
const CELL_SPACING = 35; // Increased spacing for a clearer view
const SVG_PADDING = 20;
const PIECE_SIZE_RATIO = 0.35; // Size of the piece relative to cell spacing

export const PinBoard: React.FC<PinBoardProps> = ({ pins, lines, claimedTriangles, selectedPin, onPinClick, playerColors }) => {
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
        {/* Render Claimed Pieces inside Triangles */}
        {claimedTriangles.map(triangle => {
          const v1 = pins.get(triangle.vertices[0]);
          const v2 = pins.get(triangle.vertices[1]);
          const v3 = pins.get(triangle.vertices[2]);
          if (!v1 || !v2 || !v3) return null;

          const p1 = hexToPixel(v1);
          const p2 = hexToPixel(v2);
          const p3 = hexToPixel(v3);

          // Calculate centroid
          const centerX = (p1.x + p2.x + p3.x) / 3;
          const centerY = (p1.y + p2.y + p3.y) / 3;

          // Determine piece orientation based on Y coordinates
          const sortedY = [p1.y, p2.y, p3.y].sort((a, b) => a - b);
          const isPointingUp = (sortedY[1] - sortedY[0]) > (sortedY[2] - sortedY[1]);

          const pieceSize = CELL_SPACING * PIECE_SIZE_RATIO;
          let piecePoints = '';

          if (isPointingUp) {
            const topY = centerY - (pieceSize * 2 / 3);
            const botY = centerY + (pieceSize / 3);
            const leftX = centerX - (pieceSize / Math.sqrt(3));
            const rightX = centerX + (pieceSize / Math.sqrt(3));
            piecePoints = `${centerX + offsetX},${topY + offsetY} ${leftX + offsetX},${botY + offsetY} ${rightX + offsetX},${botY + offsetY}`;
          } else { // Pointing down
            const botY = centerY + (pieceSize * 2 / 3);
            const topY = centerY - (pieceSize / 3);
            const leftX = centerX - (pieceSize / Math.sqrt(3));
            const rightX = centerX + (pieceSize / Math.sqrt(3));
            piecePoints = `${centerX + offsetX},${botY + offsetY} ${leftX + offsetX},${topY + offsetY} ${rightX + offsetX},${topY + offsetY}`;
          }

          return (
            <polygon
              key={triangle.id}
              points={piecePoints}
              className={`${playerColors[triangle.owner].primary}`}
            />
          );
        })}

        {/* Render Lines (Elastics) */}
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
        
        {/* Render Pins (Pillars) */}
        {pinArray.map(pin => {
          const { x, y } = hexToPixel(pin);
          const isSelected = selectedPin === pin.id;
          return (
            <circle
              key={pin.id}
              cx={x + offsetX}
              cy={y + offsetY}
              r={isSelected ? PIN_RADIUS * 1.5 : PIN_RADIUS}
              className={`transition-all duration-200 cursor-pointer ${
                isSelected ? 'fill-yellow-400' : 'fill-slate-700 hover:fill-slate-500'
              }`}
              onClick={() => onPinClick(pin.id)}
            />
          );
        })}
      </g>
    </svg>
  );
};