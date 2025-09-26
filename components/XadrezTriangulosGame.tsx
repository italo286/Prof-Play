import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Pin, Line, ClaimedTriangle, PlayerColor } from '../types';
import { PinBoard } from './PinBoard';

interface XadrezTriangulosGameProps {
  onReturnToMenu: () => void;
}

const BOARD_RADIUS = 5;
const TOTAL_PIECES = 15;

const PLAYER_COLORS: Record<PlayerColor, { primary: string; secondary: string; name: string }> = {
  player1: { primary: 'fill-sky-500', secondary: 'stroke-sky-400', name: 'Azul' },
  player2: { primary: 'fill-cyan-500', secondary: 'stroke-cyan-400', name: 'Ciano' },
};

// --- Game Logic Helpers ---
const generatePins = (radius: number): Map<string, Pin> => {
  const pins = new Map<string, Pin>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (q + r >= -radius && q + r <= radius) {
        const id = `${q},${r}`;
        pins.set(id, { id, q, r });
      }
    }
  }
  return pins;
};

const getNeighbors = (pinId: string): string[] => {
    const [q, r] = pinId.split(',').map(Number);
    const directions = [
        [+1, 0], [+1, -1], [0, -1],
        [-1, 0], [-1, +1], [0, +1]
    ];
    return directions.map(([dq, dr]) => `${q + dq},${r + dr}`);
}

export const XadrezTriangulosGame: React.FC<XadrezTriangulosGameProps> = ({ onReturnToMenu }) => {
  const [pins, setPins] = useState<Map<string, Pin>>(new Map());
  const [lines, setLines] = useState<Line[]>([]);
  const [claimedTriangles, setClaimedTriangles] = useState<ClaimedTriangle[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>('player1');
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [playerPieces, setPlayerPieces] = useState({ player1: TOTAL_PIECES, player2: TOTAL_PIECES });
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'gameOver'>('playing');

  const initializeGame = useCallback(() => {
    setPins(generatePins(BOARD_RADIUS));
    setLines([]);
    setClaimedTriangles([]);
    setCurrentPlayer('player1');
    setSelectedPin(null);
    setPlayerPieces({ player1: TOTAL_PIECES, player2: TOTAL_PIECES });
    setWinner(null);
    setGameState('playing');
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const findNewlyFormedTriangles = useCallback((newLine: Line, existingLines: Line[], existingTriangles: ClaimedTriangle[]): ClaimedTriangle[] => {
    const { from, to } = newLine;
    const fromNeighbors = getNeighbors(from);
    const toNeighbors = getNeighbors(to);
    const commonNeighbors = fromNeighbors.filter(n => toNeighbors.includes(n));
    const newTriangles: ClaimedTriangle[] = [];
    const lineExists = (p1: string, p2: string) => existingLines.some(l => (l.from === p1 && l.to === p2) || (l.from === p2 && l.to === p1));
    const triangleExists = (id: string) => existingTriangles.some(t => t.id === id);

    for (const common of commonNeighbors) {
      if (lineExists(from, common) && lineExists(to, common)) {
        const vertices: [string, string, string] = [from, to, common].sort() as [string, string, string];
        const triangleId = vertices.join(';');
        if (!triangleExists(triangleId)) {
          newTriangles.push({
            id: triangleId,
            vertices,
            owner: newLine.player,
          });
        }
      }
    }
    return newTriangles;
  }, []);

  const handlePinClick = (pinId: string) => {
    if (gameState === 'gameOver') return;

    if (!selectedPin) {
      setSelectedPin(pinId);
    } else {
      if (selectedPin === pinId) {
        setSelectedPin(null); // Deselect if clicked again
        return;
      }

      // Check if line already exists
      const lineAlreadyExists = lines.some(l => (l.from === selectedPin && l.to === pinId) || (l.from === pinId && l.to === selectedPin));
      if (lineAlreadyExists) {
        setSelectedPin(null);
        return;
      }

      const newLine: Line = { from: selectedPin, to: pinId, player: currentPlayer };
      const updatedLines = [...lines, newLine];
      setLines(updatedLines);
      
      const newlyFormed = findNewlyFormedTriangles(newLine, lines, claimedTriangles);
      if (newlyFormed.length > 0) {
        setClaimedTriangles(prev => [...prev, ...newlyFormed]);
        setPlayerPieces(prev => ({
          ...prev,
          [currentPlayer]: prev[currentPlayer] - newlyFormed.length,
        }));
      }

      setSelectedPin(null);
      setCurrentPlayer(prev => (prev === 'player1' ? 'player2' : 'player1'));
    }
  };

  useEffect(() => {
    if (playerPieces.player1 <= 0) {
        setWinner('player1');
        setGameState('gameOver');
    } else if (playerPieces.player2 <= 0) {
        setWinner('player2');
        setGameState('gameOver');
    }
  }, [playerPieces]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200 select-none">
      <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-5xl">
        <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400 p-2 rounded-lg hover:bg-slate-700">
            <i className="fas fa-arrow-left mr-2"></i>Voltar
        </button>
        <header className="text-center mb-4">
          <h1 className="text-3xl font-bold text-sky-400">Xadrez de Triângulos</h1>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="flex flex-col items-center bg-slate-900/70 p-4 rounded-lg">
                <h2 className={`text-xl font-bold ${PLAYER_COLORS.player1.secondary.replace('stroke', 'text')}`}>Jogador {PLAYER_COLORS.player1.name}</h2>
                <p>Peças Restantes: <span className="text-2xl font-bold">{playerPieces.player1}</span></p>
                {currentPlayer === 'player1' && gameState === 'playing' && <div className="mt-2 text-sm font-semibold text-green-400 animate-pulse">SUA VEZ</div>}
            </div>

            <div className="lg:col-span-2 flex justify-center items-center">
                <PinBoard 
                    pins={pins}
                    lines={lines}
                    claimedTriangles={claimedTriangles}
                    selectedPin={selectedPin}
                    onPinClick={handlePinClick}
                    playerColors={PLAYER_COLORS}
                />
            </div>
            
             <div className="flex flex-col items-center bg-slate-900/70 p-4 rounded-lg">
                <h2 className={`text-xl font-bold ${PLAYER_COLORS.player2.secondary.replace('stroke', 'text')}`}>Jogador {PLAYER_COLORS.player2.name}</h2>
                <p>Peças Restantes: <span className="text-2xl font-bold">{playerPieces.player2}</span></p>
                 {currentPlayer === 'player2' && gameState === 'playing' && <div className="mt-2 text-sm font-semibold text-green-400 animate-pulse">SUA VEZ</div>}
            </div>
        </div>

        {gameState === 'gameOver' && winner && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-xl animate-fade-in">
                <h2 className="text-4xl font-bold text-amber-400">Fim de Jogo!</h2>
                <p className={`text-2xl font-semibold mt-2 ${PLAYER_COLORS[winner].secondary.replace('stroke', 'text')}`}>
                    Jogador {PLAYER_COLORS[winner].name} venceu!
                </p>
                <button onClick={initializeGame} className="mt-6 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700">
                    Jogar Novamente
                </button>
            </div>
        )}
        
        <footer className="text-center text-sm text-slate-400 mt-8">
            <p>Desenvolvido por Ítalo Natan – 2025</p>
        </footer>
      </div>
    </div>
  );
};