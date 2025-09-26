import React, { useState, useMemo, useCallback, useEffect, useContext } from 'react';
import type { Pin, Line, ClaimedTriangle, PlayerColor, MessageType, DuelState } from '../types';
import { PinBoard } from './PinBoard';
import { MessageDisplay } from './MessageDisplay';
import { AuthContext } from '../contexts/AuthContext';
import { DuelContext } from '../contexts/DuelContext';
import { ConfirmationModal } from './ConfirmationModal';

interface XadrezTriangulosGameProps {
  onReturnToMenu: () => void;
  duel?: DuelState | null;
}

const BOARD_RADIUS = 3;
const PIECES_TO_WIN = 15;

export const XadrezTriangulosGame: React.FC<XadrezTriangulosGameProps> = ({ onReturnToMenu, duel = null }) => {
  const { user } = useContext(AuthContext);
  const { submitXadrezTurn, forfeitDuel } = useContext(DuelContext);

  const isOnline = !!duel;

  // Local state for offline play
  const [localPins, setLocalPins] = useState<Map<string, Pin>>(new Map());
  const [localLines, setLocalLines] = useState<Line[]>([]);
  const [localClaimedTriangles, setLocalClaimedTriangles] = useState<Map<string, ClaimedTriangle>>(new Map());
  const [localCurrentPlayer, setLocalCurrentPlayer] = useState<PlayerColor>('player1');
  const [localWinner, setLocalWinner] = useState<PlayerColor | null>(null);

  // Shared state for both modes
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [validNextPins, setValidNextPins] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('info');
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  
  // --- Game State Derivation ---
  const pins = useMemo(() => isOnline ? generatePins(BOARD_RADIUS) : localPins, [isOnline, localPins]);
  
  const player1Name = isOnline ? duel.players[0].name : 'Jogador 1 (Azul)';
  const player2Name = isOnline ? duel.players[1].name : 'Jogador 2 (Ciano)';

  const lines = useMemo(() => {
    if (!isOnline) return localLines;
    return duel.xadrezGameState?.lines.map(l => ({...l, player: l.player === player1Name ? 'player1' : 'player2'} as Line)) || [];
  }, [isOnline, duel, localLines, player1Name]);

  const claimedTriangles = useMemo(() => {
    if (!isOnline) return Array.from(localClaimedTriangles.values());
    return duel.xadrezGameState?.claimedTriangles.map(t => ({...t, owner: t.owner === player1Name ? 'player1' : 'player2'} as ClaimedTriangle)) || [];
  }, [isOnline, duel, localClaimedTriangles, player1Name]);

  const currentPlayerName = isOnline ? duel.xadrezGameState?.currentPlayer : (localCurrentPlayer === 'player1' ? player1Name : player2Name);
  const currentPlayerColor = isOnline ? (duel.xadrezGameState?.currentPlayer === player1Name ? 'player1' : 'player2') : localCurrentPlayer;

  const winner = isOnline ? (duel.winner ? (duel.winner === player1Name ? 'player1' : 'player2') : null) : localWinner;
  
  const scores = useMemo(() => {
    return claimedTriangles.reduce((acc, triangle) => {
      acc[triangle.owner]++;
      return acc;
    }, { player1: 0, player2: 0 });
  }, [claimedTriangles]);

  const piecesLeft = useMemo(() => ({
      player1: PIECES_TO_WIN - scores.player1,
      player2: PIECES_TO_WIN - scores.player2,
  }), [scores]);

  // --- Helper Functions ---
  const generatePins = (radius: number): Map<string, Pin> => {
    const pinsMap = new Map<string, Pin>();
    for (let q = -radius; q <= radius; q++) {
      for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
        const id = `${q},${r}`;
        pinsMap.set(id, { id, q, r });
      }
    }
    return pinsMap;
  };

  const getHexDistance = (p1: Pin, p2: Pin): number => (Math.abs(p1.q - p2.q) + Math.abs(p1.r - p2.r) + Math.abs(p1.q + p1.r - (p2.q + p2.r))) / 2;
  
  const getPinsOnLine = (startPin: Pin, endPin: Pin, allPins: Map<string, Pin>): Pin[] => {
    const distance = getHexDistance(startPin, endPin);
    if (distance === 0) return [startPin];
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
        if (q_diff > r_diff && q_diff > s_diff) rq = -rr - rs;
        else if (r_diff > s_diff) rr = -rq - rs;
        const pin = allPins.get(`${rq},${rr}`);
        if (pin) results.push(pin);
    }
    return results;
  };

  const calculateValidMoves = useCallback((startPinId: string) => {
    const fromPin = pins.get(startPinId);
    if (!fromPin) return new Set<string>();
    const validPins = new Set<string>();
    for (const toPin of pins.values()) {
        if (toPin.id === fromPin.id) continue;
        const areCollinear = fromPin.q === toPin.q || fromPin.r === toPin.r || (fromPin.q + fromPin.r === toPin.q + toPin.r);
        if (!areCollinear) continue;
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
        if (!pathIsBlocked) validPins.add(toPin.id);
    }
    return validPins;
  }, [pins, lines]);

  // --- Game Initialization and State Sync ---

  const initializeLocalGame = useCallback(() => {
    setLocalPins(generatePins(BOARD_RADIUS));
    setLocalLines([]);
    setLocalClaimedTriangles(new Map());
    setLocalCurrentPlayer('player1');
    setSelectedPin(null);
    setValidNextPins(new Set());
    setLocalWinner(null);
    setMessage('Jogador 1 (Azul), selecione um pino para começar.');
    setMessageType('info');
  }, []);

  useEffect(() => {
    if (!isOnline) {
      initializeLocalGame();
    }
  }, [isOnline, initializeLocalGame]);

  useEffect(() => {
    if (winner) return;
    if (!isOnline) {
        if (piecesLeft.player1 <= 0) {
            setLocalWinner('player1');
            setMessage('Jogador 1 (Azul) venceu!');
            setMessageType('final');
        } else if (piecesLeft.player2 <= 0) {
            setLocalWinner('player2');
            setMessage('Jogador 2 (Ciano) venceu!');
            setMessageType('final');
        }
    }
  }, [piecesLeft, winner, isOnline]);
  
  // --- Player Actions ---
  const handlePinClick = useCallback((pinId: string) => {
    if (winner) return;

    if (isOnline) {
        if (currentPlayerName !== user?.name) return; // Not your turn
        submitXadrezTurn(duel.id, selectedPin || pinId, selectedPin ? pinId : '');
        setSelectedPin(prev => prev ? null : pinId); // Optimistically toggle selection for UI feedback
    } else {
        // Local game logic
        if (!selectedPin) {
          setSelectedPin(pinId);
          setValidNextPins(calculateValidMoves(pinId));
          setMessage(`Jogador ${localCurrentPlayer === 'player1' ? 1 : 2}, selecione um pino de destino.`);
          setMessageType('info');
          return;
        }

        if (selectedPin === pinId) {
          setSelectedPin(null); setValidNextPins(new Set());
          setMessage(`Jogada cancelada. Vez do Jogador ${localCurrentPlayer === 'player1' ? 1 : 2}.`);
          return;
        }

        if (!validNextPins.has(pinId)) {
            setMessage('Movimento inválido.'); setMessageType('error');
            setSelectedPin(null); setValidNextPins(new Set());
            return;
        }
        
        const fromPin = pins.get(selectedPin)!;
        const toPin = pins.get(pinId)!;
        const path = getPinsOnLine(fromPin, toPin, pins);
        const newLines: Line[] = [];
        for (let i = 0; i < path.length - 1; i++) newLines.push({ from: path[i].id, to: path[i+1].id, player: localCurrentPlayer });
        const allLinesAfterMove = [...localLines, ...newLines];
        const allNewTriangles = new Map<string, ClaimedTriangle>();
        const checkNewTriangles = (newLine: Line, allLines: Line[]): ClaimedTriangle[] => {
            const [p1Id, p2Id] = [newLine.from, newLine.to];
            const newTriangles: ClaimedTriangle[] = [];
            const p1 = pins.get(p1Id);
            const p2 = pins.get(p2Id);
            if (!p1 || !p2) return [];
            for (const p3 of pins.values()) {
                if (p3.id === p1Id || p3.id === p2Id) continue;
                const sideAExists = allLines.some(l => (l.from === p1Id && l.to === p3.id) || (l.from === p3.id && l.to === p1Id));
                const sideBExists = allLines.some(l => (l.from === p2Id && l.to === p3.id) || (l.from === p3.id && l.to === p2Id));
                if (sideAExists && sideBExists && getHexDistance(p1, p3) === 1 && getHexDistance(p2, p3) === 1) {
                    const vertices = [p1Id, p2Id, p3.id].sort() as [string, string, string];
                    newTriangles.push({ id: vertices.join(';'), vertices, owner: newLine.player });
                }
            }
            return newTriangles;
        };
        for (const lineSegment of newLines) {
            const triangles = checkNewTriangles(lineSegment, allLinesAfterMove);
            for (const tri of triangles) {
                if (!localClaimedTriangles.has(tri.id)) allNewTriangles.set(tri.id, tri);
            }
        }
        setLocalLines(allLinesAfterMove);
        if (allNewTriangles.size > 0) {
            setLocalClaimedTriangles(prev => new Map([...prev, ...allNewTriangles]));
            setMessage(`Jogador ${localCurrentPlayer === 'player1' ? 1 : 2} formou ${allNewTriangles.size} triângulo(s)!`);
            setMessageType('success');
        }
        const nextPlayer = localCurrentPlayer === 'player1' ? 'player2' : 'player1';
        setLocalCurrentPlayer(nextPlayer);
        setSelectedPin(null);
        setValidNextPins(new Set());
        if (allNewTriangles.size === 0) {
            setMessage(`Vez do Jogador ${nextPlayer === 'player1' ? 1 : 2}.`);
            setMessageType('info');
        }
    }
  }, [selectedPin, winner, isOnline, duel, user, currentPlayerName, localCurrentPlayer, submitXadrezTurn, localLines, localClaimedTriangles, pins, validNextPins, calculateValidMoves]);

  useEffect(() => {
    // Update valid moves when selection changes, only for online mode. Local mode is handled inside its click handler.
    if (isOnline && selectedPin) {
        setValidNextPins(calculateValidMoves(selectedPin));
    } else {
        setValidNextPins(new Set());
    }
  }, [isOnline, selectedPin, calculateValidMoves]);

  const opponent = isOnline ? duel.players.find(p => p.name !== user?.name) : null;
  const isMyTurn = isOnline && currentPlayerName === user?.name;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
        <ConfirmationModal isOpen={showForfeitConfirm} onClose={() => setShowForfeitConfirm(false)} onConfirm={() => duel && forfeitDuel(duel.id)} title="Desistir do Duelo" message="Tem certeza que deseja desistir? Isso contará como uma derrota." />
        <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-4xl">
            <header className="text-center mb-4">
                 <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400"> Xadrez de Triângulos </h1>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="p-4 bg-slate-900/70 rounded-lg">
                        <h2 className="font-bold text-xl text-center mb-2">Peças Restantes</h2>
                        <div className="flex justify-around items-center">
                            <div className="text-center">
                                <p className={`font-bold text-lg text-sky-400 truncate max-w-[120px]`}>{isOnline ? 'Você' : player1Name}</p>
                                <p className="text-3xl font-bold">{piecesLeft.player1}</p>
                            </div>
                            <div className="text-center">
                                <p className={`font-bold text-lg text-cyan-400 truncate max-w-[120px]`}>{isOnline ? (opponent?.name || 'Oponente') : player2Name}</p>
                                <p className="text-3xl font-bold">{piecesLeft.player2}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900/70 rounded-lg text-center">
                        <h2 className="font-bold text-xl mb-2">Vez de</h2>
                        {!winner ? (
                            <p className={`text-2xl font-bold ${currentPlayerColor === 'player1' ? 'text-sky-400' : 'text-cyan-400'} ${isOnline && !isMyTurn ? 'animate-pulse' : ''}`}>
                                {isOnline ? (isMyTurn ? 'Sua Vez!' : `Aguardando ${opponent?.name}`) : (currentPlayerName)}
                            </p>
                        ) : ( <p className="text-2xl font-bold text-green-400">Fim de Jogo!</p> )}
                    </div>
                    
                    {message && <MessageDisplay message={message} type={messageType} />}

                    <div className="flex flex-col gap-2 mt-auto">
                         {!isOnline && <button onClick={initializeLocalGame} className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Reiniciar Jogo</button>}
                         {isOnline && <button onClick={() => setShowForfeitConfirm(true)} className="w-full px-6 py-2 bg-red-800 text-red-300 font-semibold rounded-lg hover:bg-red-700 hover:text-white">Desistir do Duelo</button>}
                        <button onClick={onReturnToMenu} className="w-full px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700"> {isOnline ? 'Voltar ao Lobby' : 'Menu Principal'} </button>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-slate-900/70 rounded-lg p-4 flex items-center justify-center aspect-square">
                    <PinBoard
                        pins={pins}
                        lines={lines}
                        claimedTriangles={claimedTriangles}
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