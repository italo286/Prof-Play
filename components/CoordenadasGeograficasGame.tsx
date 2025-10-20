import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { WorldMap } from './WorldMap';
import { GeoCoordinateInput } from './GeoCoordinateInput';
import { MessageDisplay } from './MessageDisplay';
import { ResultsScreen } from './ResultsScreen';
import { GameProgressBar } from './GameProgressBar';
import type { GeoPoint, MessageType, Point as InputPoint, GeoHintInfo } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { ProfileContext, getLevelColor } from '../contexts/ProfileContext';
import { playSuccessSound, playErrorSound } from '../utils/audio';
import { PlayerStatsModal } from './PlayerStatsModal';
import { BnccInfoButton } from './BnccInfoButton';
import { HintModal } from './HintModal';

interface CoordenadasGeograficasGameProps {
  onReturnToMenu: () => void;
  onAdvance?: () => void;
  advanceButtonText?: string;
}

const GAME_ID = 'coordenadas-geograficas';
const allChallenges: GeoPoint[] = [
  { lat: 60, lon: -120 }, // Canada
  { lat: 30, lon: -90 },  // New Orleans, USA
  { lat: 0, lon: -60 },   // Brazil
  { lat: -30, lon: -60 }, // Argentina/Uruguay
  { lat: 60, lon: 30 },   // Finland
  { lat: 30, lon: 60 },   // Near Aral Sea
  { lat: 0, lon: 30 },    // D.R. Congo
  { lat: -30, lon: 30 },  // South Africa
  { lat: 60, lon: 120 },  // Siberia, Russia
  { lat: 30, lon: 120 },  // East China
  { lat: 0, lon: 120 },   // Borneo
  { lat: -30, lon: 150 }  // East Australia
];
const TOTAL_CHALLENGES = 10;
const COMBO_THRESHOLD = 3;


const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const CoordenadasGeograficasGame: React.FC<CoordenadasGeograficasGameProps> = ({ onReturnToMenu, onAdvance, advanceButtonText }) => {
  const { user } = useContext(AuthContext);
  const { finalizeStandardGame } = useContext(ProfileContext);
  const [challenges, setChallenges] = useState<GeoPoint[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState<number>(0);
  const [targetCoordinate, setTargetCoordinate] = useState<GeoPoint | null>(null);
  
  const [sessionStats, setSessionStats] = useState({ firstTry: 0, other: 0, errors: 0 });
  const [isFirstAttempt, setIsFirstAttempt] = useState<boolean>(true);
  const [comboCount, setComboCount] = useState(0);

  const [userMessage, setUserMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<MessageType>('info');
  const [isChallengeActive, setIsChallengeActive] = useState<boolean>(true);
  
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [finalXpGained, setFinalXpGained] = useState(0);
  const [xpAnimation, setXpAnimation] = useState<{ amount: number; key: number, combo: number } | null>(null);
  const [isStatsModalOpen, setStatsModalOpen] = useState(false);
  
  const [isHintModalOpen, setHintModalOpen] = useState(false);
  const [hintUsedInChallenge, setHintUsedInChallenge] = useState(false);
  
  const levelColor = user ? getLevelColor(user.level) : 'from-slate-500 to-sky-600';

  const showTemporaryMessage = useCallback((text: string, type: MessageType, duration: number = 2000) => {
    setUserMessage(text);
    setMessageType(type);
    if (duration > 0 && type !== 'final') {
      setTimeout(() => setUserMessage(''), duration);
    }
  }, []);
  
  const resetChallengeState = () => {
    setIsFirstAttempt(true);
    setIsChallengeActive(true);
    setHintUsedInChallenge(false);
  };

  const initializeGame = useCallback(() => {
    const newChallenges = shuffleArray(allChallenges).slice(0, TOTAL_CHALLENGES);
    setChallenges(newChallenges);
    setCurrentChallengeIndex(0);
    setTargetCoordinate(newChallenges[0]);
    setSessionStats({ firstTry: 0, other: 0, errors: 0 });
    setFinalXpGained(0);
    setGameOver(false);
    setComboCount(0);
    resetChallengeState();
    setUserMessage('Informe a Latitude (N/S) e a Longitude (L/O) do ponto amarelo.');
    setMessageType('info');
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);
  
  const completeGame = useCallback(async () => {
    setGameOver(true);
    setUserMessage('');

    const totalXP = await finalizeStandardGame(GAME_ID, {
        ...sessionStats,
        totalChallenges: TOTAL_CHALLENGES,
    });
    
    setFinalXpGained(totalXP);

  }, [finalizeStandardGame, sessionStats]);

  const handleGuessSubmit = useCallback(async (guessedCoords: InputPoint) => {
    if (gameOver || !targetCoordinate) return;

    setIsChallengeActive(false);

    try {
        const guessedLon = guessedCoords.x;
        const guessedLat = guessedCoords.y;

        if (guessedLat === targetCoordinate.lat && guessedLon === targetCoordinate.lon) {
            playSuccessSound();
            if (isFirstAttempt) {
                setSessionStats(s => ({...s, firstTry: s.firstTry + 1}));
            } else {
                setSessionStats(s => ({...s, other: s.other + 1}));
            }
            
            const newCombo = comboCount + 1;
            const comboBonus = newCombo >= COMBO_THRESHOLD ? Math.min(newCombo - COMBO_THRESHOLD + 2, 5) : 1;
            const xpGainedForAnimation = (isFirstAttempt ? 10 : 5) * comboBonus;
            
            const message = newCombo >= COMBO_THRESHOLD ? `Correto! Combo ${newCombo}x!` : "Correto!";
            showTemporaryMessage(message, 'success');

            setXpAnimation({ amount: xpGainedForAnimation, key: Date.now(), combo: newCombo });
            setComboCount(newCombo);
            
            const nextChallengeIndex = currentChallengeIndex + 1;
            
            setTimeout(() => {
                if (nextChallengeIndex >= challenges.length) {
                    completeGame();
                } else {
                    setCurrentChallengeIndex(nextChallengeIndex);
                    setTargetCoordinate(challenges[nextChallengeIndex]);
                    resetChallengeState();
                    setUserMessage('Excelente! Qual o próximo ponto?');
                    setMessageType('info');
                }
            }, 1500);

        } else {
            playErrorSound();
            setSessionStats(s => ({...s, errors: s.errors + 1}));
            let errorMessage = `Incorreto! Se precisar de ajuda, clique no botão de dica 💡`;

            if (guessedLat === targetCoordinate.lon && guessedLon === targetCoordinate.lat) {
                errorMessage = "Você inverteu Latitude e Longitude! Use a dica 💡 se precisar.";
            }
            
            showTemporaryMessage(errorMessage, 'error', 3000);
            setIsFirstAttempt(false);
            setComboCount(0);
            setIsChallengeActive(true);
        }
    } catch (error) {
        console.error("Erro ao submeter a resposta:", error);
        showTemporaryMessage("Ocorreu um erro ao processar sua resposta. Tente novamente.", 'error', 5000);
        setIsChallengeActive(true);
    }
  }, [gameOver, targetCoordinate, currentChallengeIndex, challenges, showTemporaryMessage, isFirstAttempt, completeGame, comboCount]);
  
  const handleHintClick = () => {
    if (!targetCoordinate || gameOver) return;
    if (!hintUsedInChallenge) {
        setHintUsedInChallenge(true);
        setIsFirstAttempt(false);
    }
    setHintModalOpen(true);
  };
  
  const specialPoints = useMemo(() => {
    if (targetCoordinate && !gameOver && isChallengeActive) {
      return [{
        point: targetCoordinate,
        className: 'fill-yellow-400 stroke-yellow-600 stroke-2 animate-pulse',
      }];
    }
    return [];
  }, [targetCoordinate, gameOver, isChallengeActive]);
  
  if (!targetCoordinate && !gameOver || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-900">
        <div className="text-2xl font-semibold text-sky-400">Carregando Jogo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200 select-none">
      <PlayerStatsModal isOpen={isStatsModalOpen} onClose={() => setStatsModalOpen(false)} />
      <HintModal 
        isOpen={isHintModalOpen}
        onClose={() => setHintModalOpen(false)}
        gameId={GAME_ID}
      />
      <div className="relative bg-slate-800 shadow-2xl rounded-xl p-4 md:p-6 w-full max-w-3xl">
        {!gameOver && (
          <div className="flex justify-between items-center w-full mb-6">
            <button 
              onClick={onReturnToMenu} 
              className="text-slate-400 hover:text-sky-400 transition-colors flex items-center text-sm font-medium p-2 rounded-lg hover:bg-slate-700"
              aria-label="Voltar ao menu principal"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              <span>Voltar</span>
            </button>
            <div className="flex items-center gap-2">
                <BnccInfoButton gameId={GAME_ID} />
                <button
                    onClick={() => setStatsModalOpen(true)}
                    className={`flex items-center gap-3 px-4 py-2 bg-gradient-to-r ${levelColor} text-white font-semibold rounded-lg shadow-lg transform hover:-translate-y-0.5 transition-all cursor-pointer`}
                    aria-label="Ver progresso do jogador"
                >
                    <i className="fas fa-trophy text-xl"></i>
                    <div>
                    <span className="text-xs font-normal block -mb-1">Nível {user.level}</span>
                    <span className="font-bold">{user.xp} XP</span>
                    </div>
                </button>
            </div>
          </div>
        )}

        <header className="text-center mb-4">
          <div className="flex flex-col items-center justify-center gap-2">
              <img src="https://i.ibb.co/bqK98gY/Google-AI-Studio-2025-08-22-T01-43-41-630-Z.png" alt="Logo do App" className="h-16 w-16 object-contain"/>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
                  Coordenadas Geográficas
              </h1>
          </div>
        </header>

        {gameOver ? (
          <ResultsScreen
            successes={sessionStats.firstTry}
            total={challenges.length}
            xpEarned={finalXpGained}
            badgePrefix={GAME_ID}
            onRestart={initializeGame}
            onReturnToMenu={onReturnToMenu}
            onAdvance={onAdvance}
            advanceButtonText={advanceButtonText}
          />
        ) : (
          <>
            <div className="flex justify-between items-center gap-4">
                <GameProgressBar current={currentChallengeIndex + 1} total={TOTAL_CHALLENGES} />
                <button
                    onClick={handleHintClick}
                    disabled={gameOver}
                    className="flex-shrink-0 px-3 py-2 bg-yellow-400 text-white rounded-full shadow-md hover:bg-yellow-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
                    aria-label="Pedir uma dica"
                >
                    <i className="fas fa-lightbulb"></i>
                </button>
            </div>
            {userMessage && (
                <MessageDisplay message={userMessage} type={messageType} />
            )}
            <GeoCoordinateInput 
              onSubmit={handleGuessSubmit} 
              disabled={!isChallengeActive}
            />
            <div className="relative my-4 flex justify-center">
                <WorldMap specialPoints={specialPoints} />
                {xpAnimation && (
                <div key={xpAnimation.key} className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="animate-float-up-fade-out text-4xl font-bold text-green-400" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                        +{xpAnimation.amount} XP {xpAnimation.combo >= COMBO_THRESHOLD && <span className="text-orange-400">x{xpAnimation.combo - COMBO_THRESHOLD + 1}</span>}
                    </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
