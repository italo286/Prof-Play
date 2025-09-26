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

const PREDEFINED_COLORS = [
  { name: 'Azul', pieceClass: 'fill-sky-400', uiClass: 'bg-sky-400' },
  { name: 'Ciano', pieceClass: 'fill-cyan-400', uiClass: 'bg-cyan-400' },
  { name: 'Verde', pieceClass: 'fill-green-400', uiClass: 'bg-green-400' },
  { name: 'Laranja', pieceClass: 'fill-orange-400', uiClass: 'bg-orange-400' },
  { name: 'Amarelo', pieceClass: 'fill-yellow-400', uiClass: 'bg-yellow-400' },
  { name: 'Rosa', pieceClass: 'fill-pink-400', uiClass: 'bg-pink-400' },
];

const ColorSelector: React.FC<{
    onColorSelect: (color: typeof PREDEFINED_COLORS[0]) => void;
    disabledColors: string[];
    playerNumber: 1 | 2;
}> = ({ onColorSelect, disabledColors, playerNumber }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 animate-fade-in-down">
            <h2 className="text-2xl font-bold text-sky-300 mb-4">Jogador {playerNumber}, escolha sua cor:</h2>
            <div className="grid grid-cols-3 gap-4">
                {PREDEFINED_COLORS.map(color => {
                    const isDisabled = disabledColors.includes(color.name);
                    return (
                        <button
                            key={color.name}
                            onClick={() => onColorSelect(color)}
                            disabled={isDisabled}
                            className={`p-4 rounded-lg flex flex-col items-center gap-2 transition-transform transform hover:scale-110 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed border-2 ${isDisabled ? 'border-slate-700' : 'border-transparent hover:border-white'}`}
                        >
                            <div className={`w-16 h-16 rounded-full ${color.uiClass}`}></div>
                            <span className="font-semibold">{color.name}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    );
};


export const XadrezTriangulosGame: React.FC<XadrezTriangulosGameProps> = ({ onReturnToMenu, duel = null }) => {
  const { user } = useContext(AuthContext);
  const { submitXadrezTurn, forfeitDuel } = useContext(DuelContext);

  const isOnline = !!duel;
  
  // Game state management
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'finished'>(isOnline ? 'playing' : 'setup');

  // Color state for local game
  const [playerColors, setPlayerColors] = useState<{ player1: typeof PREDEFINED_COLORS[0] | null, player2: typeof PREDEFINED_COLORS[0] | null }>({ player1: null, player2: null });
  const [colorSelectionTurn, setColorSelectionTurn] = useState<'player1' | 'player2'>('player1');

  // Local state for offline play
  const [localPins, setLocalPins] = useState<Map<string, Pin>>(new Map());
  const [localLines, setLocalLines] = useState<Line[]>([]);
  const [localClaimedTriangles, setLocalClaimedTriangles] = useState<Map<string, ClaimedTriangle>>(new Map());
  const [localCurrentPlayer, setLocalCurrentPlayer] = useState<PlayerColor>('player1');
  
  // Shared state for both modes
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [validNextPins, setValidNextPins] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('info');
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  
  // --- Game State Derivation ---
  const pins = useMemo(() => generatePins(BOARD_RADIUS), []);
  
  const player1Name = isOnline ? duel.players[0].name : (playerColors.player1?.name || 'Jogador 1');
  const player2Name = isOnline ? duel.players[1].name : (playerColors.player2?.name || 'Jogador 2');

  const lines = useMemo(() => {
    if (!isOnline) return localLines;
    return duel.xadrezGameState?.lines.map(l => ({...l, player: l.player === duel.players[0].name ? 'player1' : 'player2'} as Line)) || [];
  }, [isOnline, duel, localLines]);

  const claimedTriangles = useMemo(() => {
    if (!isOnline) return Array.from(localClaimedTriangles.values());
    return duel.xadrezGameState?.claimedTriangles.map(t => ({...t, owner: t.owner === duel.players[0].name ? 'player1' : 'player2'} as ClaimedTriangle)) || [];
  }, [isOnline, duel, localClaimedTriangles]);

  const currentPlayerName = isOnline ? duel.xadrezGameState?.currentPlayer : (localCurrentPlayer === 'player1' ? player1Name : player2Name);
  const currentPlayerColor = isOnline ? (duel.xadrezGameState?.currentPlayer === duel.players[0].name ? 'player1' : 'player2') : localCurrentPlayer;

  const winner = useMemo(() => {
    if(isOnline) return duel.winner ? (duel.winner === duel.players[0].name ? 'player1' : 'player2') : null;
    const scores = claimedTriangles.reduce((acc, tri) => { acc[tri.owner]++; return acc; }, {player1: 0, player2: 0});
    if (scores.player1 >= PIECES_TO_WIN) return 'player1';
    if (scores.player2 >= PIECES_TO_WIN) return 'player2';
    return null;
  }, [isOnline, duel, claimedTriangles]);
  
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
    setLocalPins(pins);
    setLocalLines([]);
    setLocalClaimedTriangles(new Map());
    setLocalCurrentPlayer('player1');
    setSelectedPin(null);
    setValidNextPins(new Set());
    setMessage('Jogador 1, selecione um pino para começar.');
    setMessageType('info');
    setGameState('playing');
  }, [pins]);

  useEffect(() => {
    if (winner) {
      setGameState('finished');
      const winnerName = winner === 'player1' ? player1Name : player2Name;
      setMessage(`${winnerName} venceu!`);
      setMessageType('final');
    }
  }, [winner, player1Name, player2Name]);
  
  // --- Player Actions ---
  const handleColorSelect = (color: typeof PREDEFINED_COLORS[0]) => {
      if (colorSelectionTurn === 'player1') {
          setPlayerColors(prev => ({ ...prev, player1: color }));
          setColorSelectionTurn('player2');
      } else {
          setPlayerColors(prev => ({ ...prev, player2: color }));
          initializeLocalGame();
      }
  };

  const handlePinClick = useCallback((pinId: string) => {
    if (winner) return;

    if (isOnline) {
        if (currentPlayerName !== user?.name) return; // Not your turn
        const isSelection = !selectedPin;
        const isDeselection = selectedPin === pinId;
        const isMove = selectedPin && selectedPin !== pinId;
        
        let fromPin = isSelection ? pinId : selectedPin!;
        let toPin = isMove ? pinId : '';
        if(isDeselection) {
            fromPin = '';
            toPin = '';
        }

        submitXadrezTurn(duel.id, fromPin, toPin).catch(e => console.error("Error submitting turn:", e));
        
        if (isSelection) setSelectedPin(pinId);
        else setSelectedPin(null);

    } else {
        // Local game logic
        if (!selectedPin) {
          setSelectedPin(pinId);
          setValidNextPins(calculateValidMoves(pinId));
          setMessage(`${currentPlayerName}, selecione um pino de destino.`);
          setMessageType('info');
          return;
        }

        if (selectedPin === pinId) {
          setSelectedPin(null); setValidNextPins(new Set());
          setMessage(`Jogada cancelada. Vez de ${currentPlayerName}.`);
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
            setMessage(`${currentPlayerName} formou ${allNewTriangles.size} triângulo(s)!`);
            setMessageType('success');
        }
        const nextPlayer = localCurrentPlayer === 'player1' ? 'player2' : 'player1';
        setLocalCurrentPlayer(nextPlayer);
        setSelectedPin(null);
        setValidNextPins(new Set());
        if (allNewTriangles.size === 0) {
            const nextPlayerName = nextPlayer === 'player1' ? player1Name : player2Name;
            setMessage(`Vez de ${nextPlayerName}.`);
            setMessageType('info');
        }
    }
  }, [selectedPin, winner, isOnline, duel, user, currentPlayerName, localCurrentPlayer, submitXadrezTurn, localLines, localClaimedTriangles, pins, validNextPins, calculateValidMoves, player1Name, player2Name]);

  useEffect(() => {
    // Update valid moves when selection changes, only for online mode.
    if (isOnline && selectedPin) {
        setValidNextPins(calculateValidMoves(selectedPin));
    } else if (isOnline && !selectedPin) {
        setValidNextPins(new Set());
    }
  }, [isOnline, selectedPin, calculateValidMoves]);

  const opponent = isOnline ? duel.players.find(p => p.name !== user?.name) : null;
  const isMyTurn = isOnline && currentPlayerName === user?.name;

  const resolvedPlayerColors = useMemo(() => {
    if (isOnline) {
        return { player1: PREDEFINED_COLORS[0].pieceClass, player2: PREDEFINED_COLORS[1].pieceClass };
    }
    return {
        player1: playerColors.player1?.pieceClass || 'fill-gray-500',
        player2: playerColors.player2?.pieceClass || 'fill-gray-500'
    };
  }, [isOnline, playerColors]);

  const renderGameContent = () => {
    if (gameState === 'setup' && !isOnline) {
        const disabledColors = colorSelectionTurn === 'player2' && playerColors.player1 ? [playerColors.player1.name] : [];
        return <ColorSelector onColorSelect={handleColorSelect} disabledColors={disabledColors} playerNumber={colorSelectionTurn === 'player1' ? 1 : 2} />
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="p-4 bg-slate-900/70 rounded-lg">
                    <h2 className="font-bold text-xl text-center mb-2">Peças Restantes</h2>
                    <div className="flex justify-around items-center">
                        <div className="text-center flex flex-col items-center gap-2">
                             <div className={`w-6 h-6 rounded-full ${isOnline ? PREDEFINED_COLORS[0].uiClass : playerColors.player1?.uiClass}`}></div>
                            <p className={`font-bold text-lg text-sky-400 truncate max-w-[120px]`}>{isOnline ? 'Você' : player1Name}</p>
                            <p className="text-3xl font-bold">{piecesLeft.player1}</p>
                        </div>
                        <div className="text-center flex flex-col items-center gap-2">
                             <div className={`w-6 h-6 rounded-full ${isOnline ? PREDEFINED_COLORS[1].uiClass : playerColors.player2?.uiClass}`}></div>
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
                      {!isOnline && <button onClick={() => setGameState('setup')} className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Reiniciar Jogo</button>}
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
                    playerColors={resolvedPlayerColors}
                />
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200">
        <ConfirmationModal isOpen={showForfeitConfirm} onClose={() => setShowForfeitConfirm(false)} onConfirm={() => duel && forfeitDuel(duel.id)} title="Desistir do Duelo" message="Tem certeza que deseja desistir? Isso contará como uma derrota." />
        <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-4xl">
            <header className="text-center mb-4">
                 <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400"> Xadrez de Triângulos </h1>
            </header>
            
            {renderGameContent()}
            
             <footer className="text-center text-sm text-slate-400 mt-8">
                <p>Desenvolvido por Ítalo Natan – 2025</p>
            </footer>
        </div>
    </div>
  );
};
