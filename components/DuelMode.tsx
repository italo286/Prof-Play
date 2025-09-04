import React, { useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GameDataContext } from '../contexts/GameDataContext';
import { DuelContext } from '../contexts/DuelContext';
import { CartesianPlane } from './CartesianPlane';
import { CoordinateDisplay } from './CoordinateDisplay';
import { MessageDisplay } from './MessageDisplay';
import { CoordinateInput } from './CoordinateInput';
import { GeoCoordinateInput } from './GeoCoordinateInput';
import { WorldMap } from './WorldMap';
import { getSymmetryInstructionText, calculateSymmetricPoint } from './SimetriaPontosGame';
import type { Point, UserProfile, MessageType, SymmetryType, GeoPoint, DuelableGameMode } from '../types';
import { playSuccessSound, playErrorSound, playDuelStartSound } from '../utils/audio';
import { TOTAL_CHALLENGES, MIN_COORD, MAX_COORD } from '../data/duel';

interface DuelModeProps {
  onReturnToMenu: () => void;
}

const duelableGameModes: { id: DuelableGameMode; name: string }[] = [
    { id: 'encontrar-pontos', name: 'Encontrar Pontos' },
    { id: 'reconhecer-pontos', name: 'Reconhecer Pontos' },
    { id: 'simetria-pontos', name: 'Simetria de Pontos' },
    { id: 'coordenadas-geograficas', name: 'Coordenadas Geográficas' },
    { id: 'descubra-a-senha', name: 'Descubra a Senha' },
];

const getGameNameById = (id: DuelableGameMode) => {
    return duelableGameModes.find(g => g.id === id)?.name || id;
}

const ChallengeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    opponentName: string;
    onSelectMode: (mode: DuelableGameMode) => void;
}> = ({ isOpen, onClose, opponentName, onSelectMode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-down" onClick={onClose}>
            <div className="bg-slate-800 shadow-2xl rounded-xl p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-sky-400 mb-2">Desafiar {opponentName}</h3>
                <p className="text-slate-300 mb-4">Escolha um modo de jogo para o duelo:</p>
                <div className="space-y-3">
                    {duelableGameModes.map(mode => (
                        <button key={mode.id} onClick={() => onSelectMode(mode.id)} className="w-full text-left p-3 bg-slate-700 hover:bg-sky-700 rounded-lg transition-colors font-semibold">
                            {mode.name}
                        </button>
                    ))}
                </div>
                 <button onClick={onClose} className="mt-4 text-sm text-slate-400 hover:text-white">Cancelar</button>
            </div>
        </div>
    );
};

const DuelLobby: React.FC<{ onInvite: (name: string, gameMode: DuelableGameMode) => void }> = ({ onInvite }) => {
    const { user } = useContext(AuthContext);
    const { getAllUsers } = useContext(GameDataContext);
    const { invitations, answerDuelInvitation, cancelDuelInvitation } = useContext(DuelContext);
    const [challengeModalOpen, setChallengeModalOpen] = useState(false);
    const [challengingUser, setChallengingUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {}, 1000); // Just to force re-renders for status updates
        return () => clearInterval(timer);
    }, []);

    if (!user) return null;

    const allUsers = getAllUsers();
    const otherUsers = allUsers.filter(u => u.name !== user.name);
    const mySentInvitations = invitations.filter(inv => inv.from === user.name && inv.status === 'pending');
    const myReceivedInvitations = invitations.filter(inv => inv.to === user.name && inv.status === 'pending');
    
    const handleChallengeClick = (userToChallenge: UserProfile) => {
        setChallengingUser(userToChallenge);
        setChallengeModalOpen(true);
    };

    const handleSelectMode = (mode: DuelableGameMode) => {
        if (challengingUser) {
            onInvite(challengingUser.name, mode);
        }
        setChallengeModalOpen(false);
        setChallengingUser(null);
    };
    
    return (
        <div className="w-full max-w-3xl">
            <ChallengeModal
                isOpen={challengeModalOpen}
                onClose={() => setChallengeModalOpen(false)}
                opponentName={challengingUser?.name || ''}
                onSelectMode={handleSelectMode}
            />
            <h2 className="text-2xl font-bold text-sky-300 text-center mb-6">Lobby de Duelos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Received Invitations */}
                <div className="bg-slate-900/70 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-cyan-400 mb-3">Convites Recebidos</h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {myReceivedInvitations.length > 0 ? myReceivedInvitations.map(inv => {
                            const inviterProfile = allUsers.find(u => u.name === inv.from);
                            return (
                                <div key={inv.id} className="p-3 bg-slate-700 rounded-lg flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        {inviterProfile?.avatar && <img src={inviterProfile.avatar} alt={`Avatar de ${inviterProfile.name}`} className="w-10 h-10 rounded-full bg-slate-600"/>}
                                        <div>
                                            <span className="font-semibold">{inv.from}</span> te desafiou para
                                            <br/>
                                            <span className="text-sky-300 font-bold">{getGameNameById(inv.gameMode)}!</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => answerDuelInvitation(inv.id, 'accepted')} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"><i className="fas fa-check"></i></button>
                                        <button onClick={() => answerDuelInvitation(inv.id, 'declined')} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"><i className="fas fa-times"></i></button>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-sm text-slate-400">Nenhum convite no momento.</p>}
                    </div>
                </div>

                {/* Sent Invitations */}
                 <div className="bg-slate-900/70 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-cyan-400 mb-3">Convites Enviados</h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {mySentInvitations.length > 0 ? mySentInvitations.map(inv => (
                            <div key={inv.id} className="p-3 bg-slate-700 rounded-lg flex justify-between items-center">
                               <p>Aguardando <span className="font-semibold">{inv.to}</span>...</p>
                               <button onClick={() => cancelDuelInvitation(inv.id)} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">Cancelar</button>
                            </div>
                        )) : <p className="text-sm text-slate-400">Você não enviou convites.</p>}
                    </div>
                </div>
            </div>

             {/* Player List */}
             <div className="mt-6 bg-slate-900/70 p-4 rounded-lg">
                 <h3 className="text-lg font-bold text-cyan-400 mb-3">Desafiar um Jogador</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {otherUsers.length > 0 ? otherUsers.map(p => {
                        const isInvited = mySentInvitations.some(inv => inv.to === p.name);
                        return (
                            <div key={p.name} className="p-3 bg-slate-700 rounded-lg flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    {p.avatar && <img src={p.avatar} alt={`Avatar de ${p.name}`} className="w-10 h-10 rounded-full bg-slate-600"/>}
                                    <span className="font-semibold">{p.name}</span>
                                </div>
                                <button onClick={() => handleChallengeClick(p)} disabled={isInvited} className="px-4 py-2 text-sm bg-sky-600 text-white font-semibold rounded hover:bg-sky-700 disabled:bg-slate-500 disabled:cursor-not-allowed">
                                    {isInvited ? 'Convidado' : 'Desafiar'}
                                </button>
                            </div>
                        )
                    }) : <p className="text-sm text-slate-400">Nenhum outro jogador online.</p>}
                </div>
            </div>
        </div>
    );
};

const DuelPasswordSetup: React.FC = () => {
    const { user } = useContext(AuthContext);
    const { activeDuel, setDuelPassword } = useContext(DuelContext);
    const [password, setPassword] = useState('');
    const [rules, setRules] = useState('');
    const [error, setError] = useState('');

    if (!user || !activeDuel || !activeDuel.passwordGameState) return null;

    const selfState = activeDuel.passwordGameState[user.name];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!password.trim() || !rules.trim()) {
            setError('Todos os campos são obrigatórios.');
            return;
        }
        if (!/^\d+$/.test(password)) {
            setError('A senha deve conter apenas números.');
            return;
        }
        if (password.length < 3 || password.length > 5) {
            setError('A senha deve ter entre 3 e 5 dígitos.');
            return;
        }
        
        const passwordData = {
            password,
            rules: rules.split('\n').map(r => r.trim()).filter(Boolean),
            digitCount: password.length,
        };

        await setDuelPassword(activeDuel.id, passwordData);
    };

    if (selfState.ready) {
        return (
            <div className="text-center p-8 animate-pulse">
                <i className="fas fa-hourglass-half text-4xl text-sky-400 mb-4"></i>
                <h3 className="text-xl font-bold">Senha Definida!</h3>
                <p>Aguardando oponente...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md p-4">
            <h3 className="text-2xl font-bold text-center text-sky-300 mb-4">Crie sua Senha Secreta</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="duel-password" className="block text-sm font-medium text-slate-300 mb-1">Senha Numérica (3-5 dígitos)</label>
                    <input id="duel-password" type="text" value={password} onChange={e => setPassword(e.target.value)}
                           className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white focus:ring-2 focus:ring-sky-500"
                           required />
                </div>
                <div>
                    <label htmlFor="duel-rules" className="block text-sm font-medium text-slate-300 mb-1">Dicas (uma por linha)</label>
                    <textarea id="duel-rules" value={rules} onChange={e => setRules(e.target.value)}
                              rows={3}
                              className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white focus:ring-2 focus:ring-sky-500"
                              placeholder="Ex: A senha tem 4 dígitos.&#10;Nenhum dígito se repete."
                              required />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors">
                    Confirmar e Ficar Pronto
                </button>
            </form>
        </div>
    );
};

const DuelGuessHistory: React.FC<{ guesses: { guess: string, correctCount: number }[] }> = ({ guesses }) => {
    const lastGuessRef = useRef<HTMLDivElement>(null);
    useEffect(() => { lastGuessRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [guesses]);
    return (<div className="w-full space-y-2 max-h-40 overflow-y-auto pr-2">
            {guesses.map(({ guess, correctCount }, index) => (<div key={index} ref={index === guesses.length - 1 ? lastGuessRef : null} className="flex justify-between items-center p-1 bg-slate-700/80 rounded-md">
                    <div className="flex gap-1">
                        {guess.split('').map((char, i) => ( <div key={i} className="flex items-center justify-center w-8 h-8 text-lg font-bold text-white bg-slate-600 rounded-md"> {char} </div> ))}
                    </div>
                    <div className="text-right px-2">
                        <p className="text-md font-bold text-sky-300">{correctCount}</p>
                        <p className="text-xs text-slate-400">correto(s)</p>
                    </div>
                </div>))}
        </div>);
};

const DuelGuessInput: React.FC<{ digitCount: number, onGuess: (guess: string) => void, disabled: boolean }> = ({ digitCount, onGuess, disabled }) => {
    const [values, setValues] = useState<string[]>(Array(digitCount).fill(''));
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
    useEffect(() => { setValues(Array(digitCount).fill('')) }, [digitCount]);
    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newValues = [...values];
        newValues[index] = value.slice(-1);
        setValues(newValues);
        if (value && index < digitCount - 1) { inputsRef.current[index + 1]?.focus(); }
    };
    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !values[index] && index > 0) { inputsRef.current[index - 1]?.focus(); }
    };
    const handleGuess = () => {
        const guess = values.join('');
        if (guess.length === digitCount) { onGuess(guess); setValues(Array(digitCount).fill('')); inputsRef.current[0]?.focus(); }
    };
    return (<div className="flex flex-col items-center gap-2 my-2">
            <div className="flex justify-center gap-2">
                {Array.from({ length: digitCount }).map((_, index) => ( <input key={index} ref={el => { inputsRef.current[index] = el }} type="text" pattern="\d*" maxLength={1} value={values[index]} onChange={e => handleChange(index, e.target.value)} onKeyDown={e => handleKeyDown(index, e)} disabled={disabled} className="w-12 h-12 text-center text-2xl font-bold bg-slate-700 text-white rounded-md border-2 border-slate-600 focus:border-sky-500"/> ))}
            </div>
            <button onClick={handleGuess} disabled={disabled || values.join('').length !== digitCount} className="px-6 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 disabled:bg-slate-500">
                Adivinhar
            </button>
        </div>
    );
};

const DuelGame: React.FC = () => {
    const { user } = useContext(AuthContext);
    const { getAllUsers } = useContext(GameDataContext);
    const { activeDuel, updateDuelProgress, finishDuel, handleDuelError, submitDuelGuess } = useContext(DuelContext);
    const [startTime, setStartTime] = useState(0);
    const [userMessage, setUserMessage] = useState<string>('');
    const [messageType, setMessageType] = useState<MessageType>('info');

    const messageTimeoutRef = React.useRef<number | null>(null);

    const showTemporaryMessage = useCallback((text: string, type: MessageType, duration: number = 1500) => {
        if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
        setUserMessage(text);
        setMessageType(type);
        if (duration > 0) {
            messageTimeoutRef.current = window.setTimeout(() => setUserMessage(''), duration);
        }
    }, []);
    
    useEffect(() => {
        if (activeDuel?.status === 'starting' || (activeDuel?.status === 'playing' && activeDuel?.gameMode === 'descubra-a-senha' && startTime === 0)) {
            playDuelStartSound();
            setStartTime(Date.now());
            if (activeDuel.gameMode !== 'descubra-a-senha') {
                updateDuelProgress(activeDuel.id, 0); // Signals ready
            }
            showTemporaryMessage('O Duelo Começou!', 'info', 2000);
        }
    }, [activeDuel?.status, activeDuel?.id, activeDuel?.gameMode, updateDuelProgress, showTemporaryMessage, startTime]);

    if (!user || !activeDuel) return null;

    const self = activeDuel.players.find(p => p.name === user.name);
    if (!self) return null;

    const opponent = activeDuel.players.find(p => p.name !== user.name);
    const allUsers = getAllUsers();
    const opponentProfile = useMemo(() => {
        if (!opponent) return null;
        return allUsers.find(u => u.name === opponent.name);
    }, [opponent, allUsers]);

    const currentChallengeIndex = self.progress;
    const currentChallenge = activeDuel.challenges[currentChallengeIndex];

    const advance = useCallback(() => {
        if (!activeDuel) return;
        const nextIndex = currentChallengeIndex + 1;
        if (nextIndex >= TOTAL_CHALLENGES) {
            const timeTaken = Date.now() - startTime;
            finishDuel(activeDuel.id, timeTaken);
        } else {
            updateDuelProgress(activeDuel.id, nextIndex);
        }
    }, [activeDuel, currentChallengeIndex, finishDuel, startTime, updateDuelProgress]);

    const handleCorrect = useCallback(() => {
        playSuccessSound();
        showTemporaryMessage("Correto!", "success");
        advance();
    }, [advance, showTemporaryMessage]);


    const handleError = useCallback(() => {
        if (!activeDuel) return;
        playErrorSound();
        const newProgress = Math.max(0, currentChallengeIndex - 1);
        showTemporaryMessage("Incorreto! Você voltou um desafio.", "error", 2000);
        handleDuelError(activeDuel.id, newProgress);
    }, [activeDuel, currentChallengeIndex, handleDuelError, showTemporaryMessage]);

    const renderGameContent = () => {
        if (currentChallengeIndex >= TOTAL_CHALLENGES && activeDuel.gameMode !== 'descubra-a-senha') {
            return <p className="text-center text-xl text-green-400 font-bold p-8">Você terminou! Aguardando oponente...</p>
        }
        if (!currentChallenge && activeDuel.gameMode !== 'descubra-a-senha') {
             return <p className="text-center text-xl text-sky-400 font-bold p-8 animate-pulse">Aguardando oponente...</p>
        }

        switch (activeDuel.gameMode) {
            case 'descubra-a-senha': {
                if (!activeDuel.passwordGameState || !opponent) return <p>Erro no estado do jogo.</p>;

                const selfState = activeDuel.passwordGameState[user.name];
                const opponentState = activeDuel.passwordGameState[opponent.name];

                return (
                    <div className="w-full max-w-md">
                        <div className="bg-slate-900/50 p-4 rounded-lg border-2 border-sky-700 w-full flex flex-col">
                            <h4 className="text-lg font-bold text-center text-sky-300">Adivinhe a senha de {opponent.name}</h4>
                            <div className="my-2 p-2 bg-slate-700/50 rounded-lg">
                                <h5 className="font-bold text-center text-xs text-slate-300 mb-1">DICAS</h5>
                                <ul className="text-center text-xs text-slate-300">
                                    {opponentState.rules.map((rule, i) => <li key={i}>{rule}</li>)}
                                </ul>
                            </div>
                            <DuelGuessInput 
                                digitCount={opponentState.digitCount}
                                onGuess={(guess) => submitDuelGuess(activeDuel.id, guess)}
                                disabled={false}
                            />
                            <div className="mt-auto pt-4 border-t border-slate-700/50">
                              <h5 className="font-bold text-center text-xs text-slate-300 mb-2">SEUS PALPITES</h5>
                              <DuelGuessHistory guesses={selfState.guesses} />
                            </div>
                        </div>
                    </div>
                );
            }
            case 'encontrar-pontos': {
                const targetCoordinate = currentChallenge as Point;
                return <>
                    <CoordinateDisplay coordinate={targetCoordinate} />
                    {userMessage && <MessageDisplay message={userMessage} type={messageType} />}
                    <div className="my-6 flex justify-center">
                        <CartesianPlane 
                            minCoord={MIN_COORD} maxCoord={MAX_COORD} 
                            onPointSelected={(x, y) => {
                                if (x === targetCoordinate.x && y === targetCoordinate.y) handleCorrect();
                                else handleError();
                            }} 
                            disabled={currentChallengeIndex >= TOTAL_CHALLENGES}
                        />
                    </div>
                </>
            }
            case 'reconhecer-pontos': {
                const targetCoordinate = currentChallenge as Point;
                return <>
                    <CoordinateInput onSubmit={(guess) => {
                        if (guess.x === targetCoordinate.x && guess.y === targetCoordinate.y) handleCorrect();
                        else handleError();
                    }} disabled={currentChallengeIndex >= TOTAL_CHALLENGES} />
                    {userMessage && <MessageDisplay message={userMessage} type={messageType} />}
                    <div className="my-6 flex justify-center">
                        <CartesianPlane minCoord={MIN_COORD} maxCoord={MAX_COORD} specialPoints={[{ point: targetCoordinate, className: 'fill-yellow-400 animate-pulse' }]} />
                    </div>
                </>
            }
            case 'simetria-pontos': {
                const challenge = currentChallenge as { point: Point; type: SymmetryType };
                const correctPoint = calculateSymmetricPoint(challenge.point, challenge.type);
                return <>
                    <div className="my-2 p-4 bg-sky-900/40 rounded-lg shadow-inner text-center">
                        <p className="text-base text-sky-300 font-medium">
                            Encontre o ponto simétrico {getSymmetryInstructionText(challenge.type)}.
                        </p>
                    </div>
                    {userMessage && <MessageDisplay message={userMessage} type={messageType} />}
                    <div className="my-6 flex justify-center">
                        <CartesianPlane 
                            minCoord={MIN_COORD} maxCoord={MAX_COORD} 
                            onPointSelected={(x, y) => {
                                if (x === correctPoint.x && y === correctPoint.y) handleCorrect();
                                else handleError();
                            }} 
                            disabled={currentChallengeIndex >= TOTAL_CHALLENGES}
                            specialPoints={[{ point: challenge.point, className: 'fill-pink-500 animate-pulse' }]}
                        />
                    </div>
                </>
            }
            case 'coordenadas-geograficas': {
                const targetCoordinate = currentChallenge as GeoPoint;
                 return <>
                    <GeoCoordinateInput onSubmit={(guess) => { // guess is {x: lon, y: lat}
                        if (guess.x === targetCoordinate.lon && guess.y === targetCoordinate.lat) handleCorrect();
                        else handleError();
                    }} disabled={currentChallengeIndex >= TOTAL_CHALLENGES} />
                    {userMessage && <MessageDisplay message={userMessage} type={messageType} />}
                    <div className="my-4 flex justify-center">
                        <WorldMap specialPoints={[{ point: targetCoordinate, className: 'fill-yellow-400 animate-pulse' }]} />
                    </div>
                </>
            }
            default: return <p>Modo de jogo inválido.</p>
        }
    };
    
    return (
        <div className="w-full max-w-4xl flex flex-col items-center">
            <h2 className="text-3xl font-bold text-center text-red-500 animate-pulse mb-4">DUELO!</h2>
            {activeDuel.gameMode !== 'descubra-a-senha' && (
                 <div className="space-y-3 mb-4 w-full">
                    {[self, opponent].map(p => {
                        if (!p) return null;
                        const playerProfile = p.name === user.name ? user : opponentProfile;
                        return (
                             <div key={p.name}>
                                <div className="flex items-center gap-2 mb-1">
                                    {playerProfile?.avatar && <img src={playerProfile.avatar} alt={`Avatar de ${playerProfile.name}`} className="w-6 h-6 rounded-full bg-slate-600"/>}
                                    <p className="text-sm font-semibold">{p.name === user.name ? 'Você' : p.name}</p>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-4 shadow-inner">
                                    <div className="bg-gradient-to-r from-green-400 to-sky-500 h-4 rounded-full transition-all"
                                        style={{ width: `${(p.progress / TOTAL_CHALLENGES) * 100}%` }}>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {renderGameContent()}
        </div>
    );
};

const ConfettiPiece: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
    <div className="confetti" style={style}></div>
);

const DuelResults: React.FC<{ onReturn: () => void }> = ({ onReturn }) => {
    const { user } = useContext(AuthContext);
    const { activeDuel } = useContext(DuelContext);

    const isWinner = useMemo(() => activeDuel?.winner === user?.name, [activeDuel, user]);

    const confetti = useMemo(() => {
        if (!isWinner) return [];
        return Array.from({ length: 50 }).map((_, i) => {
          const style = {
            left: `${Math.random() * 100}vw`,
            animationDelay: `${Math.random() * 5}s`,
            backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
            transform: `scale(${Math.random() * 0.5 + 0.5})`,
          };
          return <ConfettiPiece key={i} style={style} />;
        });
    }, [isWinner]);

    if (!user || !activeDuel || activeDuel.status !== 'finished') return null;

    const winner = activeDuel.winner;
    const self = activeDuel.players.find(p => p.name === user.name);
    const opponent = activeDuel.players.find(p => p.name !== user.name);

    const isPasswordGame = activeDuel.gameMode === 'descubra-a-senha';

    return (
        <div className="text-center py-6 flex flex-col justify-center items-center gap-4 relative">
            {isWinner && confetti}
            <h2 className="text-3xl font-bold text-sky-400">Fim de Duelo!</h2>
            {isWinner ? (
                <div className="flex flex-col items-center">
                    <i className="fas fa-trophy text-6xl text-amber-400 mb-3 animate-pulse"></i>
                    <p className="text-2xl font-bold text-green-400">VOCÊ VENCEU!</p>
                </div>
            ) : (
                <div className="flex flex-col items-center">
                     <i className="fas fa-times-circle text-6xl text-red-400 mb-3"></i>
                    <p className="text-2xl font-bold text-red-400">Você perdeu.</p>
                    {winner && <p className="text-lg">{winner} foi o vencedor.</p>}
                </div>
            )}
            {!isPasswordGame && (
                <div className="mt-4 text-slate-300">
                    <p>Seu tempo: <span className="font-bold">{(self?.timeFinished ?? 0) / 1000}s</span></p>
                    <p>Tempo do oponente: <span className="font-bold">{(opponent?.timeFinished ?? 0) / 1000}s</span></p>
                </div>
            )}
            {isPasswordGame && !isWinner && opponent && activeDuel.passwordGameState && (
                <div className="mt-4 p-3 bg-slate-700 rounded-lg">
                    <p className="text-slate-300">A senha correta de {opponent.name} era: <span className="font-mono font-bold text-amber-400">{activeDuel.passwordGameState[opponent.name].password}</span></p>
                </div>
            )}
            <button onClick={onReturn} className="mt-6 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700">
                Voltar ao Lobby
            </button>
        </div>
    );
}

export const DuelMode: React.FC<DuelModeProps> = ({ onReturnToMenu }) => {
    const { sendDuelInvitation, activeDuel, clearActiveDuel } = useContext(DuelContext);

    const handleInvite = (name: string, gameMode: DuelableGameMode) => {
        sendDuelInvitation(name, gameMode);
    };
    
    const handleReturnFromResults = () => {
        clearActiveDuel();
    }

    const renderContent = () => {
        if (!activeDuel) {
            return <DuelLobby onInvite={handleInvite} />;
        }
        if (activeDuel.status === 'finished') {
            return <DuelResults onReturn={handleReturnFromResults} />;
        }
        if (activeDuel.status === 'setup' && activeDuel.gameMode === 'descubra-a-senha') {
            return <DuelPasswordSetup />;
        }
        return <DuelGame />;
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200 select-none">
             <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-5xl">
                <header className="flex justify-between items-center w-full mb-6">
                    <button 
                        onClick={onReturnToMenu} 
                        className="text-slate-400 hover:text-sky-400 transition-colors flex items-center text-sm font-medium p-2 rounded-lg hover:bg-slate-700"
                        aria-label="Voltar ao menu principal"
                    >
                        <i className="fas fa-arrow-left mr-2"></i>
                        <span>Menu Principal</span>
                    </button>
                     <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
                        Duelo 1x1
                    </h1>
                    <div></div>
                </header>
                <main className="flex justify-center">
                    {renderContent()}
                </main>
             </div>
        </div>
    );
};