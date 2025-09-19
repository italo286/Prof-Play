import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { CartesianPlane } from './CartesianPlane';
import { MessageDisplay } from './MessageDisplay';
import { ResultsScreen } from './ResultsScreen';
import { GameProgressBar } from './GameProgressBar';
import type { Point, MessageType, SymmetryType, HintInfo } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { ProfileContext, getLevelColor } from '../contexts/ProfileContext';
import { playSuccessSound, playErrorSound } from '../utils/audio';
import { PlayerStatsModal } from './PlayerStatsModal';
import { BnccInfoButton } from './BnccInfoButton';
import { getMedalForScore } from '../data/achievements';
import { HintModal } from './HintModal';

interface SimetriaPontosGameProps {
  onReturnToMenu: () => void;
  onAdvance?: () => void;
  advanceButtonText?: string;
}

const GAME_ID = 'simetria-pontos';
const MIN_COORD = -4;
const MAX_COORD = 4;
const TOTAL_CHALLENGES = 10;
const SYMMETRY_TYPES: SymmetryType[] = ['x-axis', 'y-axis', 'origin'];
const COMBO_THRESHOLD = 3;

const generateRandomPoint = (): Point => {
  let x, y;
  do {
    x = Math.floor(Math.random() * (MAX_COORD - MIN_COORD + 1)) + MIN_COORD;
    y = Math.floor(Math.random() * (MAX_COORD - MIN_COORD + 1)) + MIN_COORD;
  } while (x === 0 || y === 0);
  return { x, y };
};

export const calculateSymmetricPoint = (point: Point, type: SymmetryType): Point => {
  switch (type) {
    case 'x-axis': return { x: point.x, y: -point.y };
    case 'y-axis': return { x: -point.x, y: point.y };
    case 'origin': return { x: -point.x, y: -point.y };
  }
};

export const getSymmetryInstructionText = (type: SymmetryType | null): string => {
  switch (type) {
    case 'x-axis': return 'em relação ao eixo X';
    case 'y-axis': return 'em relação ao eixo Y';
    case 'origin': return 'em relação à origem (0,0)';
    default: return '';
  }
};

const getRandomSymmetryType = (): SymmetryType => {
  const randomIndex = Math.floor(Math.random() * SYMMETRY_TYPES.length);
  return SYMMETRY_TYPES[randomIndex];
};

export const SimetriaPontosGame: React.FC<SimetriaPontosGameProps> = ({ onReturnToMenu, onAdvance, advanceButtonText }) => {
  const { user } = useContext(AuthContext);
  const { finalizeStandardGame } = useContext(ProfileContext);
  const [challenge, setChallenge] = useState<{ point: Point; type: SymmetryType } | null>(null);
  const [userMessage, setUserMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<MessageType>('info');
  const [challengeNumber, setChallengeNumber] = useState(1);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const [sessionStats, setSessionStats] = useState({ firstTry: 0, other: 0, errors: 0 });
  const [isFirstAttempt, setIsFirstAttempt] = useState<boolean>(true);
  const [comboCount, setComboCount] = useState(0);
  
  const [sessionXp, setSessionXp] = useState(0);
  const [xpAnimation, setXpAnimation] = useState<{ amount: number; key: number, combo: number } | null>(null);
  const [isStatsModalOpen, setStatsModalOpen] = useState(false);
  
  const [isHintModalOpen, setHintModalOpen] = useState(false);
  const [hintUsedInChallenge, setHintUsedInChallenge] = useState(false);
  
  const levelColor = user ? getLevelColor(user.level) : 'from-slate-500 to-sky-600';
  
  const completeGame = useCallback(async () => {
    setGameOver(true);
    setUserMessage('');
    setChallenge(null);
    const medal = getMedalForScore(GAME_ID, sessionStats.firstTry, TOTAL_CHALLENGES);
    const bonusXp = 50;
    
    await finalizeStandardGame(GAME_ID, {
      ...sessionStats,
      xp: sessionXp + bonusXp,
      medalId: medal?.id,
    });
    
    setSessionXp(prev => prev + 50);
  }, [finalizeStandardGame, sessionStats, sessionXp]);
  
  const resetChallengeState = () => {
      setIsFirstAttempt(true);
      setHintUsedInChallenge(false);
  };

  const initializeGame = useCallback(() => {
    setGameOver(false);
    setIsChecking(false);
    setSessionStats({ firstTry: 0, other: 0, errors: 0 });
    setSessionXp(0);
    setChallengeNumber(1);
    setComboCount(0);
    resetChallengeState();
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (gameOver) return;

    if (challengeNumber > TOTAL_CHALLENGES) {
      completeGame();
      return;
    }

    const newPoint = generateRandomPoint();
    const newSymmetryType = getRandomSymmetryType();
    
    setChallenge({ point: newPoint, type: newSymmetryType });
    resetChallengeState();
    setUserMessage(`Clique no ponto simétrico.`);
    setMessageType('info');
  }, [challengeNumber, gameOver, completeGame]);


  const handlePointSelected = async (x: number, y: number) => {
    if (isChecking || gameOver || !challenge) return;

    const correctPoint = calculateSymmetricPoint(challenge.point, challenge.type);

    if (x === correctPoint.x && y === correctPoint.y) {
      playSuccessSound();
      
      if (isFirstAttempt) {
        setSessionStats(s => ({ ...s, firstTry: s.firstTry + 1 }));
      } else {
        setSessionStats(s => ({ ...s, other: s.other + 1 }));
      }

      const newCombo = comboCount + 1;
      const comboBonus = newCombo >= COMBO_THRESHOLD ? Math.min(newCombo - COMBO_THRESHOLD + 2, 5) : 1;
      const xpGained = (isFirstAttempt ? 10 : 5) * comboBonus;
      
      const message = newCombo >= COMBO_THRESHOLD ? `Correto! Combo ${newCombo}x!` : "Correto!";
      setUserMessage(message);
      setMessageType('success');
      
      setSessionXp(prev => prev + xpGained);
      setXpAnimation({ amount: xpGained, key: Date.now(), combo: newCombo });
      setComboCount(newCombo);

      setIsChecking(true);
      setTimeout(() => {
        setIsChecking(false);
        setChallengeNumber(prev => prev + 1);
      }, 1500);
    } else {
      playErrorSound();
      setSessionStats(s => ({ ...s, errors: s.errors + 1 }));
      setIsFirstAttempt(false);
      setComboCount(0);
      
      let hintText = `Ponto incorreto. Se precisar de ajuda, use a dica 💡`;
      for (const axis of SYMMETRY_TYPES.filter(t => t !== challenge.type)) {
          const wrongAxisPoint = calculateSymmetricPoint(challenge.point, axis);
          if (x === wrongAxisPoint.x && y === wrongAxisPoint.y) {
              hintText = `Parece que você refletiu no eixo errado. O desafio é a simetria ${getSymmetryInstructionText(challenge.type)}. Use a dica 💡 se precisar.`;
              break;
          }
      }
      
      setUserMessage(hintText);
      setMessageType('error');
    }
  };
  
  const handleHintClick = () => {
    if (!challenge || gameOver) return;
    if (!hintUsedInChallenge) {
        setHintUsedInChallenge(true);
        setIsFirstAttempt(false);
    }
    setHintModalOpen(true);
  };

  const specialPoints = useMemo(() => {
    if (!challenge || gameOver) return [];
    
    return [{
      point: challenge.point,
      className: 'fill-pink-500 stroke-pink-700 stroke-2 animate-pulse',
    }];
  }, [challenge, gameOver]);
  
  if (!user) return null;

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

        <header className="text-center mb-4">
          <div className="flex flex-col items-center justify-center gap-2">
            <img src="https://i.ibb.co/bqK98gY/Google-AI-Studio-2025-08-22-T01-43-41-630-Z.png" alt="Logo do App" className="h-16 w-16 object-contain"/>
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
              Simetria de Pontos
            </h1>
          </div>
        </header>
        
        {gameOver ? (
           <ResultsScreen
              successes={sessionStats.firstTry}
              total={TOTAL_CHALLENGES}
              xpEarned={sessionXp}
              badgePrefix={GAME_ID}
              onRestart={initializeGame}
              onReturnToMenu={onReturnToMenu}
              onAdvance={onAdvance}
              advanceButtonText={advanceButtonText}
           />
        ) : (
          <>
            <div className="flex justify-between items-center gap-4">
                <GameProgressBar current={challengeNumber} total={TOTAL_CHALLENGES} />
                <button
                    onClick={handleHintClick}
                    disabled={gameOver}
                    className="flex-shrink-0 px-3 py-2 bg-yellow-400 text-white rounded-full shadow-md hover:bg-yellow-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
                    aria-label="Pedir uma dica"
                >
                    <i className="fas fa-lightbulb"></i>
                </button>
            </div>
            {challenge && (
              <div className="my-2 p-4 bg-sky-900/40 rounded-lg shadow-inner text-center">
                <p className="text-base text-sky-300 font-medium">
                  Clique no ponto que é simétrico ao ponto destacado <span className="font-bold text-sky-200">{getSymmetryInstructionText(challenge.type)}</span>.
                </p>
              </div>
            )}

            {userMessage && (
              <MessageDisplay message={userMessage} type={messageType} />
            )}

            <div className="relative my-6 flex justify-center">
              <CartesianPlane
                minCoord={MIN_COORD}
                maxCoord={MAX_COORD}
                onPointSelected={handlePointSelected}
                disabled={isChecking || gameOver}
                specialPoints={specialPoints}
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