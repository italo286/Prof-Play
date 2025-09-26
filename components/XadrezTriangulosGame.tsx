import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Pin, Line, ClaimedTriangle, PlayerColor, MessageType } from '../types';
import { PinBoard } from './PinBoard';
import { MessageDisplay } from './MessageDisplay';

interface XadrezTriangulosGameProps {
  onReturnToMenu: () => void;
}

const BOARD_RADIUS = 3;
const playerColors: Record<PlayerColor, { primary: string; secondary: string }> = {
  player1: { primary: 'fill-sky-500', secondary: 'stroke-sky-500' },
  player2: { primary: 'fill-pink-500', secondary: 'stroke-pink-500' },
};

// --- Helper Functions ---

const generatePins = (radius: number): Map<string, Pin> => {
  const pins = new Map<string, Pin>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const id = `${q},${r}`;
        pins.set(id, { id, q, r });
      }
    }
  }
  return pins;
};

const getHexDistance = (p1: Pin, p2: Pin): number => {
  return (Math.abs(p1.q - p2.q) + Math.abs(p1.r - p2.r) + Math.abs(p1.q + p1.r - (p2.q + p2.r))) / 2;
};

const checkNewTriangles = (newLine: Line, existingLines: Line[], allPins: Map<string, Pin>): ClaimedTriangle[] => {
  const [p1Id, p2Id] = [newLine.from, newLine.to];
  const newTriangles: ClaimedTriangle[] = [];

  const p1 = allPins.get(p1Id);
  const p2 = allPins.get(p2Id);
  if (!p1 || !p2) return [];

  // Find common neighbors
  for (const p3 of allPins.values()) {
    if (p3.id === p1Id || p3.id === p2Id) continue;

    // Check if p3 is a common neighbor connected to both p1 and p2
    const line1Exists = existingLines.some(l => (l.from === p1Id && l.to === p3.id) || (l.from === p3.id && l.to === p1Id));
    const line2Exists = existingLines.some(l => (l.from === p2Id && l.to === p3.id) || (l.from === p3.id && l.to === p2Id));

    if (line1Exists && line2Exists) {
      const vertices: [string, string, string] = [p1Id, p2Id, p3.id].sort() as [string, string, string];
      newTriangles.push({
        id: vertices.join(';'),
        vertices,
        owner: newLine.player,
      });
    }
  }
  return newTriangles;
};

// --- Component ---

export const XadrezTriangulosGame: React.FC<XadrezTriangulosGameProps> = ({ onReturnToMenu }) => {
  const [pins, setPins] = useState<Map<string, Pin>>(new Map());
  const [lines, setLines] = useState<Line[]>([]);
  const [claimedTriangles, setClaimedTriangles] = useState<ClaimedTriangle[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>('player1');
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('info');

  const totalPossibleTriangles = useMemo(() => 6 * BOARD_RADIUS * BOARD_RADIUS, []);

  const scores = useMemo(() => {
    return claimedTriangles.reduce((acc, triangle) => {
      acc[triangle.owner]++;
      return acc;
    }, { player1: 0, player2: 0 });
  }, [claimedTriangles]);

  const initializeGame = useCallback(() => {
    setPins(generatePins(BOARD_RADIUS));
    setLines([]);
    setClaimedTriangles([]);
    setCurrentPlayer('player1');
    setSelectedPin(null);
    setWinner(null);
    setMessage('Jogador 1, selecione um pino para começar.');
    setMessageType('info');
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (winner) return;
    const winThreshold = Math.ceil(totalPossibleTriangles / 2);
    if (scores.player1 >= winThreshold) {
      setWinner('player1');
      setMessage('Jogador 1 venceu!');
      setMessageType('final');
    } else if (scores.player2 >= winThreshold) {
      setWinner('player2');
      setMessage('Jogador 2 venceu!');
      setMessageType('final');
    }
  }, [scores, totalPossibleTriangles, winner]);

  const handlePinClick = useCallback((pinId: string) => {
    if (winner) return;

    if (!selectedPin) {
      setSelectedPin(pinId);
      setMessage(`Jogador ${currentPlayer === 'player1' ? 1 : 2}, selecione outro pino para criar uma linha.`);
      setMessageType('info');
      return;
    }

    if (selectedPin === pinId) {
      setSelectedPin(null);
      setMessage(`Jogador ${currentPlayer === 'player1' ? 1 : 2}, selecione um pino.`);
      setMessageType('info');
      return;
    }

    const fromPin = pins.get(selectedPin);
    const toPin = pins.get(pinId);

    if (!fromPin || !toPin) return;

    // Check for adjacency
    if (getHexDistance(fromPin, toPin) !== 1) {
      setMessage('Movimento inválido. Os pinos devem ser adjacentes.');
      setMessageType('error');
      setSelectedPin(null);
      return;
    }

    // Check if line already exists
    const lineExists = lines.some(
      l => (l.from === selectedPin && l.to === pinId) || (l.from === pinId && l.to === selectedPin)
    );
    if (lineExists) {
      setMessage('Esta linha já existe.');
      setMessageType('error');
      setSelectedPin(null);
      return;
    }

    const newLine: Line = { from: selectedPin, to: pinId, player: currentPlayer };
    const newLines = [...lines, newLine];
    setLines(newLines);

    const newTriangles = checkNewTriangles(newLine, lines, pins);
    if (newTriangles.length > 0) {
      setClaimedTriangles(prev => [...prev, ...newTriangles]);
      setMessage(`Jogador ${currentPlayer === 'player1' ? 1 : 2} formou ${newTriangles.length} triângulo(s)!`);
      setMessageType('success');
    } else {
      const nextPlayer = currentPlayer === 'player1' ? 2 : 1;
      setMessage(`Vez do Jogador ${nextPlayer}.`);
      setMessageType('info');
    }

    setCurrentPlayer(currentPlayer === 'player1' ? 'player2' : 'player1');
    setSelectedPin(null);
  }, [selectedPin, currentPlayer, winner, lines, pins]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-4xl">
            <header className="text-center mb-4">
                 <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
                    Xadrez de Triângulos
                </h1>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="p-4 bg-slate-900/70 rounded-lg">
                        <h2 className="font-bold text-xl text-center mb-2">Placar</h2>
                        <div className="flex justify-around items-center">
                            <div className="text-center">
                                <p className={`font-bold text-lg ${playerColors.player1.secondary.replace('stroke', 'text')}`}>Jogador 1</p>
                                <p className="text-3xl font-bold">{scores.player1}</p>
                            </div>
                            <div className="text-center">
                                <p className={`font-bold text-lg ${playerColors.player2.secondary.replace('stroke', 'text')}`}>Jogador 2</p>
                                <p className="text-3xl font-bold">{scores.player2}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900/70 rounded-lg text-center">
                        <h2 className="font-bold text-xl mb-2">Vez de</h2>
                        {!winner ? (
                            <p className={`text-2xl font-bold ${currentPlayer === 'player1' ? playerColors.player1.secondary.replace('stroke', 'text') : playerColors.player2.secondary.replace('stroke', 'text')}`}>
                                Jogador {currentPlayer === 'player1' ? 1 : 2}
                            </p>
                        ) : (
                            <p className="text-2xl font-bold text-green-400">Fim de Jogo!</p>
                        )}
                    </div>
                    
                    {message && <MessageDisplay message={message} type={messageType} />}

                    <div className="flex flex-col gap-2 mt-auto">
                         <button onClick={initializeGame} className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                            <i className="fas fa-redo mr-2"></i>Reiniciar Jogo
                        </button>
                        <button onClick={onReturnToMenu} className="w-full px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700">
                            <i className="fas fa-home mr-2"></i>Menu Principal
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-slate-900/70 rounded-lg p-4 flex items-center justify-center aspect-square">
                    <PinBoard
                        pins={pins}
                        lines={lines}
                        claimedTriangles={claimedTriangles}
                        selectedPin={selectedPin}
                        onPinClick={handlePinClick}
                        playerColors={playerColors}
                    />
                </div>
            </div>
            
             <footer className="text-center text-sm text-slate-400 mt-8">
                <p>Desenvolvido por Ítalo Natan – 2025</p>
            </footer>
        </div>
    </div>
  );
};
