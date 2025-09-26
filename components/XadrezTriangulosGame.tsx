import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Pin, Line, ClaimedTriangle, PlayerColor, MessageType } from '../types';
import { PinBoard } from './PinBoard';
import { MessageDisplay } from './MessageDisplay';

interface XadrezTriangulosGameProps {
  onReturnToMenu: () => void;
}

const BOARD_RADIUS = 3;
const PIECES_TO_WIN = 15;

// --- Helper Functions ---

const generatePins = (radius: number): Map<string, Pin> => {
  const pins = new Map<string, Pin>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const id = `${q},${r}`;
      pins.set(id, { id, q, r });
    }
  }
  return pins;
};

const getHexDistance = (p1: Pin, p2: Pin): number => {
  return (Math.abs(p1.q - p2.q) + Math.abs(p1.r - p2.r) + Math.abs(p1.q + p1.r - (p2.q + p2.r))) / 2;
};

// Uses linear interpolation to find all integer-coordinate pins on a line between two hex pins
const getPinsOnLine = (startPin: Pin, endPin: Pin, allPins: Map<string, Pin>): Pin[] => {
    const distance = getHexDistance(startPin, endPin);
    if (distance === 0) return [startPin];
    if (distance === 1) return [startPin, endPin];
    
    const results: Pin[] = [];
    for (let i = 0; i <= distance; i++) {
        const t = i / distance;
        const q = startPin.q * (1 - t) + endPin.q * t;
        const r = startPin.r * (1 - t) + endPin.r * t;
        const s = (-startPin.q - startPin.r) * (1-t) + (-endPin.q - endPin.r) * t;

        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);
        
        const q_diff = Math.abs(rq - q);
        const r_diff = Math.abs(rr - r);
        const s_diff = Math.abs(rs - s);
        
        if (q_diff > r_diff && q_diff > s_diff) {
            rq = -rr - rs;
        } else if (r_diff > s_diff) {
            rr = -rq - rs;
        }
        
        const pin = allPins.get(`${rq},${rr}`);
        if (pin) results.push(pin);
    }
    return results;
};

// Checks for small, 1-segment-sided triangles formed by adding ONE new line segment
const checkNewTriangles = (newLine: Line, allLines: Line[], allPins: Map<string, Pin>): ClaimedTriangle[] => {
  const [p1Id, p2Id] = [newLine.from, newLine.to];
  const newTriangles: ClaimedTriangle[] = [];

  const p1 = allPins.get(p1Id);
  const p2 = allPins.get(p2Id);
  if (!p1 || !p2) return [];

  // Find common neighbors that form a triangle with the new line
  for (const p3 of allPins.values()) {
    if (p3.id === p1Id || p3.id === p2Id) continue;
    
    // Check if the other two sides of the triangle already exist
    const sideAExists = allLines.some(l => (l.from === p1Id && l.to === p3.id) || (l.from === p3.id && l.to === p1Id));
    const sideBExists = allLines.some(l => (l.from === p2Id && l.to === p3.id) || (l.from === p3.id && l.to === p2Id));

    if (sideAExists && sideBExists) {
      // Check if this is a minimal triangle (all sides are adjacent pins)
      if (getHexDistance(p1, p3) === 1 && getHexDistance(p2, p3) === 1) {
        const vertices: [string, string, string] = [p1Id, p2Id, p3.id].sort() as [string, string, string];
        newTriangles.push({
          id: vertices.join(';'),
          vertices,
          owner: newLine.player,
        });
      }
    }
  }
  return newTriangles;
};

// --- Component ---

export const XadrezTriangulosGame: React.FC<XadrezTriangulosGameProps> = ({ onReturnToMenu }) => {
  const [pins, setPins] = useState<Map<string, Pin>>(new Map());
  const [lines, setLines] = useState<Line[]>([]);
  const [claimedTriangles, setClaimedTriangles] = useState<Map<string, ClaimedTriangle>>(new Map());
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>('player1');
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [validNextPins, setValidNextPins] = useState<Set<string>>(new Set());
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('info');

  const scores = useMemo(() => {
    return Array.from(claimedTriangles.values()).reduce((acc, triangle) => {
      acc[triangle.owner]++;
      return acc;
    }, { player1: 0, player2: 0 });
  }, [claimedTriangles]);

  const piecesLeft = useMemo(() => ({
      player1: PIECES_TO_WIN - scores.player1,
      player2: PIECES_TO_WIN - scores.player2,
  }), [scores]);

  const initializeGame = useCallback(() => {
    setPins(generatePins(BOARD_RADIUS));
    setLines([]);
    setClaimedTriangles(new Map());
    setCurrentPlayer('player1');
    setSelectedPin(null);
    setValidNextPins(new Set());
    setWinner(null);
    setMessage('Jogador 1 (Azul), selecione um pino para começar.');
    setMessageType('info');
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (winner) return;
    if (piecesLeft.player1 <= 0) {
      setWinner('player1');
      setMessage('Jogador 1 (Azul) venceu!');
      setMessageType('final');
    } else if (piecesLeft.player2 <= 0) {
      setWinner('player2');
      setMessage('Jogador 2 (Ciano) venceu!');
      setMessageType('final');
    }
  }, [piecesLeft, winner]);
  
  const calculateValidMoves = useCallback((startPinId: string) => {
    const fromPin = pins.get(startPinId);
    if (!fromPin) return new Set<string>();

    const validPins = new Set<string>();
    for (const toPin of pins.values()) {
        if (toPin.id === fromPin.id) continue;

        // Rule 1: Must be collinear
        const areCollinear = fromPin.q === toPin.q || fromPin.r === toPin.r || (fromPin.q + fromPin.r === toPin.q + toPin.r);
        if (!areCollinear) continue;

        // Rule 2: Path must be clear of existing lines
        const path = getPinsOnLine(fromPin, toPin, pins);
        let pathIsBlocked = false;
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i+1];
            if (lines.some(l => (l.from === p1.id && l.to === p2.id) || (l.from === p2.id && l.to === p1.id))) {
                pathIsBlocked = true;
                break;
            }
        }

        if (!pathIsBlocked) {
            validPins.add(toPin.id);
        }
    }
    return validPins;
  }, [pins, lines]);

  const handlePinClick = useCallback((pinId: string) => {
    if (winner) return;

    if (!selectedPin) {
      setSelectedPin(pinId);
      setValidNextPins(calculateValidMoves(pinId));
      setMessage(`Jogador ${currentPlayer === 'player1' ? 1 : 2}, selecione um pino de destino.`);
      setMessageType('info');
      return;
    }

    if (selectedPin === pinId) {
      setSelectedPin(null);
      setValidNextPins(new Set());
      setMessage(`Jogada cancelada. Vez do Jogador ${currentPlayer === 'player1' ? 1 : 2}.`);
      setMessageType('info');
      return;
    }

    if (!validNextPins.has(pinId)) {
        setMessage('Movimento inválido. O elástico não pode cruzar um espaço ou um elástico existente.');
        setMessageType('error');
        setSelectedPin(null);
        setValidNextPins(new Set());
        return;
    }
    
    // --- Execute Move ---
    const fromPin = pins.get(selectedPin)!;
    const toPin = pins.get(pinId)!;

    const path = getPinsOnLine(fromPin, toPin, pins);
    const newLines: Line[] = [];
    for (let i = 0; i < path.length - 1; i++) {
        newLines.push({ from: path[i].id, to: path[i+1].id, player: currentPlayer });
    }
    
    const allLinesAfterMove = [...lines, ...newLines];
    const allNewTriangles = new Map<string, ClaimedTriangle>();

    // Check for triangles created by each new segment
    for (const lineSegment of newLines) {
        const triangles = checkNewTriangles(lineSegment, allLinesAfterMove, pins);
        for (const tri of triangles) {
            if (!claimedTriangles.has(tri.id)) {
                allNewTriangles.set(tri.id, tri);
            }
        }
    }

    setLines(allLinesAfterMove);
    if (allNewTriangles.size > 0) {
        setClaimedTriangles(prev => new Map([...prev, ...allNewTriangles]));
        setMessage(`Jogador ${currentPlayer === 'player1' ? 1 : 2} formou ${allNewTriangles.size} triângulo(s)!`);
        setMessageType('success');
    }

    // Switch player
    const nextPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
    setCurrentPlayer(nextPlayer);
    setSelectedPin(null);
    setValidNextPins(new Set());
    
    if (allNewTriangles.size === 0) {
        setMessage(`Vez do Jogador ${nextPlayer === 'player1' ? 1 : 2}.`);
        setMessageType('info');
    }

  }, [selectedPin, currentPlayer, winner, lines, pins, validNextPins, calculateValidMoves, claimedTriangles]);

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
                        <h2 className="font-bold text-xl text-center mb-2">Peças Restantes</h2>
                        <div className="flex justify-around items-center">
                            <div className="text-center">
                                <p className={`font-bold text-lg text-sky-400`}>Jogador 1 (Azul)</p>
                                <p className="text-3xl font-bold">{piecesLeft.player1}</p>
                            </div>
                            <div className="text-center">
                                <p className={`font-bold text-lg text-cyan-400`}>Jogador 2 (Ciano)</p>
                                <p className="text-3xl font-bold">{piecesLeft.player2}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900/70 rounded-lg text-center">
                        <h2 className="font-bold text-xl mb-2">Vez de</h2>
                        {!winner ? (
                            <p className={`text-2xl font-bold ${currentPlayer === 'player1' ? 'text-sky-400' : 'text-cyan-400'}`}>
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
                        claimedTriangles={Array.from(claimedTriangles.values())}
                        selectedPin={selectedPin}
                        validNextPins={validNextPins}
                        onPinClick={handlePinClick}
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
