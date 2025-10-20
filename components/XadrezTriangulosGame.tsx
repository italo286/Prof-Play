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

// --- Helper Functions (moved outside component) ---
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
  const { submitXadrezTurn, forfeitDuel, selectDuelXadrezColor } = useContext(DuelContext);

  const isOnline = !!duel;
  
  // Game state management
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'finished'>(isOnline ? (duel.status === 'setup' ? 'setup' : 'playing') : 'setup');

  // Color state for local game
  const [playerColors, setPlayerColors] = useState<{ player1: typeof PREDEFINED_COLORS[0] | null, player2: typeof PREDEFINED_COLORS[0] | null }>({ player1: null, player2: null });
  const [colorSelectionTurn, setColorSelectionTurn] = useState<'player1' | 'player2'>('player1');

  // Local state for offline play
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
  
  const player1ColorInfo = useMemo(() => {
    if (isOnline && duel?.xadrezGameState?.playerColors) {
        return duel.xadrezGameState.playerColors[duel.players[0].name];
    }
    return playerColors.player1;
  }, [isOnline, duel, playerColors.player1]);

  const player2ColorInfo = useMemo(() => {
    if (isOnline && duel?.xadrezGameState?.playerColors) {
        return duel.xadrezGameState.playerColors[duel.players[1].name];
    }
    return playerColors.player2;
  }, [isOnline, duel, playerColors.player2]);

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
    // FIX: The variable 'PIECES' was undefined. Replaced with 'PIECES_TO_WIN'.
    if (scores.player1 >= PIECES_TO_WIN) {
        return 'player1';
    // FIX: The variable 'PIECES' was undefined. Replaced with 'PIECES_TO_WIN'.
    } else if (scores.player2 >= PIECES_TO_WIN) {
        return 'player2';
    }
    return null;
  }, [isOnline, duel, claimedTriangles]);

    useEffect(() => {
        if (winner && gameState !== 'finished') {
            setGameState('finished');
            const winnerName = winner === 'player1' ? player1Name : player2Name;
            setMessage(`${winnerName} venceu!`);
            setMessageType('final');
        }
    }, [winner, gameState, player1Name, player2Name]);

    const handlePinClick = useCallback(async (pinId: string) => {
        if (gameState !== 'playing' || winner) return;
        if (isOnline && (user?.name !== currentPlayerName)) return;

        const fromPin = selectedPin ? pins.get(selectedPin) : null;
        const toPin = pins.get(pinId);
        if (!toPin) return;

        if (!selectedPin) {
            setSelectedPin(pinId);
            const nextPins = new Set<string>();
            for (const p of pins.values()) {
                if (p.id === pinId) continue;
                if (p.q === toPin.q || p.r === toPin.r || (p.q + p.r) === (toPin.q + toPin.r)) {
                    nextPins.add(p.id);
                }
            }
            setValidNextPins(nextPins);
        } else {
            if (pinId === selectedPin) {
                setSelectedPin(null);
                setValidNextPins(new Set());
                return;
            }

            if (validNextPins.has(pinId) && fromPin) {
                const path = getPinsOnLine(fromPin, toPin, pins);
                let isBlocked = false;
                for (let i = 0; i < path.length - 1; i++) {
                    if (lines.some(l => (l.from === path[i].id && l.to === path[i + 1].id) || (l.from === path[i + 1].id && l.to === path[i].id))) {
                        isBlocked = true;
                        break;
                    }
                }

                if (isBlocked) {
                    setMessage('Caminho bloqueado por outra linha!');
                    setMessageType('error');
                } else {
                    if (isOnline) {
                        if (duel) {
                            try {
                                await submitXadrezTurn(duel.id, selectedPin, pinId);
                            } catch (e: any) {
                                setMessage(e.message || 'Jogada inválida.');
                                setMessageType('error');
                            }
                        }
                    } else {
                        const newLines: Line[] = [];
                        for (let i = 0; i < path.length - 1; i++) {
                            newLines.push({ from: path[i].id, to: path[i + 1].id, player: localCurrentPlayer });
                        }
                        const allLinesAfterMove = [...localLines, ...newLines];
                        setLocalLines(allLinesAfterMove);

                        let newTrianglesFound = false;
                        for (const line of newLines) {
                            const checkNewTrianglesLocal = (newLine: Line, allLines: Line[]): ClaimedTriangle[] => {
                                const [p1Id, p2Id] = [newLine.from, newLine.to];
                                const newTris: ClaimedTriangle[] = [];
                                const p1 = pins.get(p1Id);
                                const p2 = pins.get(p2Id);
                                if (!p1 || !p2) return [];
                                for (const p3 of pins.values()) {
                                    if (p3.id === p1Id || p3.id === p2Id) continue;
                                    if (getHexDistance(p1, p3) !== 1 || getHexDistance(p2, p3) !== 1) continue;

                                    const sideAExists = allLines.some(l => (l.from === p1Id && l.to === p3.id) || (l.from === p3.id && l.to === p1Id));
                                    const sideBExists = allLines.some(l => (l.from === p2Id && l.to === p3.id) || (l.from === p3.id && l.to === p2Id));

                                    if (sideAExists && sideBExists) {
                                        const vertices = [p1Id, p2Id, p3.id].sort() as [string, string, string];
                                        const triId = vertices.join(';');
                                        if (!localClaimedTriangles.has(triId)) {
                                            newTris.push({ id: triId, vertices, owner: newLine.player });
                                            newTrianglesFound = true;
                                        }
                                    }
                                }
                                return newTris;
                            };
                            const foundTris = checkNewTrianglesLocal(line, allLinesAfterMove);
                            if (foundTris.length > 0) {
                                setLocalClaimedTriangles(prev => {
                                    const newMap = new Map(prev);
                                    foundTris.forEach(t => newMap.set(t.id, t));
                                    return newMap;
                                });
                            }
                        }

                        if (!newTrianglesFound) {
                            setLocalCurrentPlayer(p => p === 'player1' ? 'player2' : 'player1');
                        }
                    }
                    setMessage('');
                }
            } else {
                setMessage('Pino inválido. Selecione um pino destacado ou cancele a jogada.');
                setMessageType('error');
            }

            setSelectedPin(null);
            setValidNextPins(new Set());
        }
    }, [gameState, winner, isOnline, user, currentPlayerName, selectedPin, pins, validNextPins, lines, localCurrentPlayer, duel, submitXadrezTurn, localLines, localClaimedTriangles]);

    const handleColorSelect = useCallback((color: typeof PREDEFINED_COLORS[0]) => {
        if (isOnline) {
            if (duel) selectDuelXadrezColor(duel.id, color);
        } else {
            if (colorSelectionTurn === 'player1') {
                setPlayerColors(p => ({ ...p, player1: color }));
                setColorSelectionTurn('player2');
            } else {
                setPlayerColors(p => ({ ...p, player2: color }));
                setGameState('playing');
                setMessage(`Começa o jogo! Vez de ${color.name === playerColors.player1?.name ? player2Name : player1Name}.`);
                setMessageType('info');
            }
        }
    }, [isOnline, duel, selectDuelXadrezColor, colorSelectionTurn, player1Name, player2Name, playerColors.player1]);

    const handleResetLocalGame = useCallback(() => {
        setGameState('setup');
        setPlayerColors({ player1: null, player2: null });
        setColorSelectionTurn('player1');
        setLocalLines([]);
        setLocalClaimedTriangles(new Map());
        setLocalCurrentPlayer('player1');
        setSelectedPin(null);
        setValidNextPins(new Set());
        setMessage('');
    }, []);

    return (
        <div className={`flex-grow flex flex-col items-center justify-center p-4 select-none ${isOnline ? 'w-full' : ''}`}>
            <ConfirmationModal
                isOpen={showForfeitConfirm}
                onClose={() => setShowForfeitConfirm(false)}
                onConfirm={() => {
                    if (isOnline && duel) {
                        forfeitDuel(duel.id);
                    } else {
                        setGameState('finished');
                    }
                    setShowForfeitConfirm(false);
                }}
                title="Encerrar Jogo"
                message="Tem certeza que deseja encerrar o jogo? O oponente será declarado o vencedor."
            />

            <div className={`relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full ${isOnline ? 'max-w-4xl' : 'max-w-3xl'}`}>
                {!isOnline && (
                    <button onClick={onReturnToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-sky-400 transition-colors z-10 flex items-center p-2 rounded-lg hover:bg-slate-700">
                        <i className="fas fa-arrow-left mr-2"></i>
                        <span>Voltar</span>
                    </button>
                )}

                <header className="text-center mb-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
                        Xadrez de Triângulos
                    </h1>
                </header>

                {gameState === 'setup' && (
                    isOnline && duel && user ? (
                        !duel.xadrezGameState?.playerColors?.[user.name] ? (
                            <ColorSelector
                                onColorSelect={handleColorSelect}
                                disabledColors={Object.values(duel.xadrezGameState?.playerColors || {}).map(c => c.name)}
                                playerNumber={duel.players[0].name === user.name ? 1 : 2}
                            />
                        ) : (
                            <div className="text-center p-8 animate-pulse">
                                <i className="fas fa-palette text-4xl text-sky-400 mb-4"></i>
                                <h3 className="text-xl font-bold">Aguardando oponente escolher a cor...</h3>
                            </div>
                        )
                    ) : (
                        !player1ColorInfo ? (
                            <ColorSelector onColorSelect={handleColorSelect} disabledColors={[]} playerNumber={1} />
                        ) : !player2ColorInfo ? (
                            <ColorSelector onColorSelect={handleColorSelect} disabledColors={[player1ColorInfo.name]} playerNumber={2} />
                        ) : null
                    )
                )}

                {gameState === 'playing' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 flex justify-center items-center">
                            <PinBoard
                                pins={pins}
                                lines={lines}
                                claimedTriangles={claimedTriangles}
                                selectedPin={selectedPin}
                                validNextPins={validNextPins}
                                onPinClick={handlePinClick}
                                playerColors={{ player1: player1ColorInfo?.pieceClass || 'fill-gray-500', player2: player2ColorInfo?.pieceClass || 'fill-gray-500' }}
                            />
                        </div>
                        <div className="md:col-span-1 flex flex-col gap-4">
                            <div className="text-center p-4 bg-slate-900/70 rounded-lg">
                                <h3 className="text-lg font-bold text-cyan-300 mb-2">Placar</h3>
                                <div className="flex justify-around items-center">
                                    <div className={`p-2 rounded-lg ${currentPlayerColor === 'player1' ? `border-2 ${player1ColorInfo ? player1ColorInfo.uiClass.replace('bg-', 'border-') : 'border-gray-500'}` : ''}`}>
                                        <p className="text-sm font-semibold">{player1Name}</p>
                                        <p className="text-3xl font-bold">{claimedTriangles.filter(t => t.owner === 'player1').length}</p>
                                    </div>
                                    <div className={`p-2 rounded-lg ${currentPlayerColor === 'player2' ? `border-2 ${player2ColorInfo ? player2ColorInfo.uiClass.replace('bg-', 'border-') : 'border-gray-500'}` : ''}`}>
                                        <p className="text-sm font-semibold">{player2Name}</p>
                                        <p className="text-3xl font-bold">{claimedTriangles.filter(t => t.owner === 'player2').length}</p>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm text-slate-300">Vence quem fizer {PIECES_TO_WIN} peças primeiro.</p>
                            </div>
                            {message && <MessageDisplay message={message} type={messageType} />}
                            <div className="text-center p-4 bg-slate-900/70 rounded-lg">
                                <h3 className="text-lg font-bold text-cyan-300 mb-2">Vez de:</h3>
                                <p className={`text-xl font-bold`}>{currentPlayerName}</p>
                            </div>
                            {!isOnline && <button onClick={handleResetLocalGame} className="w-full py-2 bg-yellow-600 rounded">Reiniciar Jogo</button>}
                            {isOnline && <button onClick={() => setShowForfeitConfirm(true)} className="w-full py-2 bg-red-800 rounded">Desistir do Duelo</button>}
                        </div>
                    </div>
                )}

                {gameState === 'finished' && (
                    <div className="text-center py-6">
                        <h2 className="text-3xl font-bold mb-4">{winner === 'player1' ? player1Name : player2Name} Venceu!</h2>
                        {!isOnline && <button onClick={handleResetLocalGame} className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg">Jogar Novamente</button>}
                    </div>
                )}

            </div>
        </div>
    );
};
