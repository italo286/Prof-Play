import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { CartesianPlane } from './CartesianPlane';
import { CoordinateDisplay } from './CoordinateDisplay';
import { MessageDisplay } from './MessageDisplay';
import { ResultsScreen } from './ResultsScreen';
import { GameProgressBar } from './GameProgressBar';
import type { Point, MessageType, HintInfo } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { ProfileContext, getLevelColor } from '../contexts/ProfileContext';
import { playSuccessSound, playErrorSound } from '../utils/audio';
import { PlayerStatsModal } from './PlayerStatsModal';
import { BnccInfoButton } from './BnccInfoButton';
import { getMedalForScore } from '../data/achievements';
import { HintModal } from './HintModal';

interface EncontrarPontosGameProps {
  onReturnToMenu: () => void;
  onAdvance?: () => void;
  advanceButtonText?: string;
}

const GAME_ID = 'encontrar-pontos';
const MIN_COORD = -4;
const MAX_COORD = 4;
const TOTAL_CHALLENGES = 10;
const COMBO_THRESHOLD = 3;

const generateAllCoordinates = (): Point[] => {
  const coords: Point[] = [];
  for (let x = MIN_COORD; x <= MAX_COORD; x++) {
    for (let y = MIN_COORD; y <= MAX_COORD; y++) {
      if(x !== 0 || y !== 0) coords.push({ x, y });
    }
  }
  return coords;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const EncontrarPontosGame: React.FC<EncontrarPontosGameProps> = ({ onReturnToMenu, onAdvance, advanceButtonText }) => {
  const { user } = useContext(AuthContext);
  const { addXp, earnBadge, logAttempt } = useContext(ProfileContext);
  const [allPossibleCoordinates] = useState<Point[]>(generateAllCoordinates());
  const [challenges, setChallenges] = useState<Point[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState<number>(0);
  const [targetCoordinate, setTargetCoordinate] = useState<Point | null>(null);
  
  const [firstTrySuccesses, setFirstTrySuccesses] = useState<number>(0);
  const [isFirstAttemptForThisTarget, setIsFirstAttemptForThisTarget] = useState<boolean>(true);
  const [comboCount, setComboCount] = useState(0);
  
  const [userMessage, setUserMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<MessageType>('info');
  
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [xpAnimation, setXpAnimation] = useState<{ amount: number; key: number, combo: number } | null>(null);

  const [isStatsModalOpen, setStatsModalOpen] = useState(false);
  const [isHintModalOpen, setHintModalOpen] = useState(false);
  const [hintUsedInChallenge, setHintUsedInChallenge] = useState(false);
  
  const messageTimeoutRef = useRef<number | null>(null);
  const levelColor = user ? getLevelColor(user.level) : 'from-slate-500 to-sky-600';

  const showTemporaryMessage = useCallback((text: string, type: MessageType, duration: number = 2000) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setUserMessage(text);
    setMessageType(type);
    if (duration > 0) {
      messageTimeoutRef.current = window.setTimeout(() => {
        setUserMessage('');
        messageTimeoutRef.current = null;
      }, duration);
    }
  }, []);

  const resetChallengeState = () => {
    setIsFirstAttemptForThisTarget(true);
    setHintUsedInChallenge(false);
  }

  const initializeGame = useCallback(() => {
    const newChallenges = shuffleArray(allPossibleCoordinates).slice(0, TOTAL_CHALLENGES);
    setChallenges(newChallenges);
    setCurrentChallengeIndex(0);
    setTargetCoordinate(newChallenges[0]);
    setFirstTrySuccesses(0);
    setSessionXp(0);
    resetChallengeState();
    setGameOver(false);
    setComboCount(0);
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setUserMessage('Clique no ponto correspondente!');
    setMessageType('info');
  }, [allPossibleCoordinates]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const completeGame = useCallback(async () => {
    if(!user) return;
    setGameOver(true);
    setUserMessage('');
    
    const medal = getMedalForScore('find_points', firstTrySuccesses, TOTAL_CHALLENGES);
    if (medal) {
        await earnBadge(medal.id);
    }
    
    await addXp(50); // Bonus XP for completing the game
    setSessionXp(prev => prev + 50);

  }, [addXp, earnBadge, firstTrySuccesses, user]);

  const handlePointSelected = useCallback(async (clickedX: number, clickedY: number) => {
    if (gameOver || !targetCoordinate || !user) return;

    if (clickedX === targetCoordinate.x && clickedY === targetCoordinate.y) {
      playSuccessSound();
      await logAttempt(GAME_ID, true, isFirstAttemptForThisTarget);
      
      const newCombo = comboCount + 1;
      const comboBonus = newCombo >= COMBO_THRESHOLD ? Math.min(newCombo - COMBO_THRESHOLD + 2, 5) : 1;
      const xpGained = (isFirstAttemptForThisTarget ? 10 : 5) * comboBonus;
      
      const message = newCombo >= COMBO_THRESHOLD ? `Correto! Combo ${newCombo}x!` : "Parabéns!";
      showTemporaryMessage(message, 'success');
      
      await addXp(xpGained);
      setSessionXp(prev => prev + xpGained);
      setXpAnimation({ amount: xpGained, key: Date.now(), combo: newCombo });
      setComboCount(newCombo);
      
      if (isFirstAttemptForThisTarget) {
        setFirstTrySuccesses(prev => prev + 1);
      }

      const nextChallengeIndex = currentChallengeIndex + 1;
      
      setTimeout(() => {
        if (nextChallengeIndex >= challenges.length) {
          completeGame();
        } else {
          setCurrentChallengeIndex(nextChallengeIndex);
          setTargetCoordinate(challenges[nextChallengeIndex]);
          resetChallengeState();
          if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
          setUserMessage('Próximo ponto! Clique no local correto.');
          setMessageType('info');
        }
      }, 1500);

    } else {
      playErrorSound();
      await logAttempt(GAME_ID, false, false);
      showTemporaryMessage(`Incorreto! Se precisar de ajuda, clique no botão de dica 💡`, 'error', 3000);
      setIsFirstAttemptForThisTarget(false);
      setComboCount(0);
    }
  }, [gameOver, targetCoordinate, user, isFirstAttemptForThisTarget, currentChallengeIndex, challenges, showTemporaryMessage, addXp, completeGame, comboCount, logAttempt]);
  
  const handleHintClick = () => {
      if (!targetCoordinate || gameOver) return;
      if (!hintUsedInChallenge) {
          setHintUsedInChallenge(true);
          setIsFirstAttemptForThisTarget(false);
      }
      setHintModalOpen(true);
  };

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
      <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-2xl">
        
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

        <header className="text-center mb-6">
          <div className="flex flex-col items-center justify-center gap-2">
            <img src="https://i.ibb.co/bqK98gY/Google-AI-Studio-2025-08-22-T01-43-41-630-Z.png" alt="Logo do App" className="h-16 w-16 object-contain"/>
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
              Encontrar Pontos
            </h1>
          </div>
        </header>

        {gameOver ? (
          <ResultsScreen
            successes={firstTrySuccesses}
            total={challenges.length}
            xpEarned={sessionXp}
            badgePrefix="find_points"
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
            
            {targetCoordinate && (
              <CoordinateDisplay coordinate={targetCoordinate} />
            )}

            {userMessage && (
              <MessageDisplay message={userMessage} type={messageType} />
            )}
            
            <div className="relative my-6 flex justify-center">
              <CartesianPlane
                minCoord={MIN_COORD}
                maxCoord={MAX_COORD}
                onPointSelected={handlePointSelected}
                disabled={gameOver}
              />
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
        
         <footer className="text-center text-sm text-slate-400 mt-8">
            <p>Desenvolvido por Ítalo Natan - 2025</p>
        </footer>
      </div>
    </div>
  );
};
