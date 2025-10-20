import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { CartesianPlane } from './CartesianPlane';
import { MessageDisplay } from './MessageDisplay';
import { ResultsScreen } from './ResultsScreen';
import { GameProgressBar } from './GameProgressBar';
import type { Point, MessageType, SymmetryType, Difficulty } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { ProfileContext, getLevelColor } from '../contexts/ProfileContext';
import { playSuccessSound, playErrorSound } from '../utils/audio';
import { PlayerStatsModal } from './PlayerStatsModal';
import { BnccInfoButton } from './BnccInfoButton';
import { HintModal } from './HintModal';
import { getSymmetryInstructionText, calculateSymmetricPoint as calcSymmetricPoint } from './SimetriaPontosGame';


interface SimetriaSegmentosGameProps {
  onReturnToMenu: () => void;
  onAdvance?: () => void;
  advanceButtonText?: string;
}

const GAME_ID = 'simetria-segmentos';
const MIN_COORD = -4;
const MAX_COORD = 4;
const TOTAL_CHALLENGES = 10;
const SYMMETRY_TYPES: SymmetryType[] = ['x-axis', 'y-axis', 'origin'];
const COMBO_THRESHOLD = 3;


const getRandomSymmetryType = (): SymmetryType => SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

const generateRandomPointInQuadrant = (quadrant: number): Point => {
    let x, y;
    const range = { min: 1, max: MAX_COORD };
    const randomIn = () => Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

    switch(quadrant) {
        case 1: x = randomIn(); y = randomIn(); break;
        case 2: x = -randomIn(); y = randomIn(); break;
        case 3: x = -randomIn(); y = -randomIn(); break;
        case 4: x = randomIn(); y = -randomIn(); break;
        default: x = 0; y = 0;
    }
    return {x, y};
}

export const SimetriaSegmentosGame: React.FC<SimetriaSegmentosGameProps> = ({ onReturnToMenu, onAdvance, advanceButtonText }) => {
  const { user } = useContext(AuthContext);
  const { finalizeStandardGame } = useContext(ProfileContext);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [challenge, setChallenge] = useState<{ points: Point[]; symmetry: SymmetryType } | null>(null);
  const [userClickedPoints, setUserClickedPoints] = useState<Point[]>([]);
  
  const [userMessage, setUserMessage] = useState<string>('Selecione um nível de dificuldade para começar.');
  const [messageType, setMessageType] = useState<MessageType>('info');
  const [challengeNumber, setChallengeNumber] = useState(1);
  
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const [sessionStats, setSessionStats] = useState({ firstTry: 0, other: 0, errors: 0 });
  const [isFirstAttempt, setIsFirstAttempt] = useState<boolean>(true);
  const [comboCount, setComboCount] = useState(0);
  
  const [finalXpGained, setFinalXpGained] = useState(0);
  const [xpAnimation, setXpAnimation] = useState<{ amount: number; key: number, combo: number } | null>(null);
  const [isStatsModalOpen, setStatsModalOpen] = useState(false);
  
  const [isHintModalOpen, setHintModalOpen] = useState(false);
  const [hintUsedInChallenge, setHintUsedInChallenge] = useState(false);
  
  const levelColor = user ? getLevelColor(user.level) : 'from-slate-500 to-sky-600';
  
  const pointsToWin = useMemo(() => {
    if (!difficulty) return 0;
    return { easy: 2, medium: 3, hard: 4 }[difficulty];
  }, [difficulty]);
  
  const resetChallengeState = () => {
    setUserClickedPoints([]);
    setIsFirstAttempt(true);
    setHintUsedInChallenge(false);
  };
  
  const generateChallenge = useCallback((diff: Difficulty) => {
    const numPoints = { easy: 2, medium: 3, hard: 4 }[diff];
    const newPoints: Point[] = [];
    const quadrant = Math.floor(Math.random() * 4) + 1;

    let attempts = 0;
    while(newPoints.length < numPoints && attempts < 50) {
        const p = generateRandomPointInQuadrant(quadrant);

        const exists = newPoints.some(np => np.x === p.x && np.y === p.y);
        if (!exists) {
            newPoints.push(p);
        }
        attempts++;
    }
    
    setChallenge({ points: newPoints, symmetry: getRandomSymmetryType() });
    resetChallengeState();
    setUserMessage(`Clique nos pontos para criar a forma simétrica.`);
    setMessageType('info');
  }, []);

  const startGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    setChallengeNumber(1);
    setSessionStats({ firstTry: 0, other: 0, errors: 0 });
    setFinalXpGained(0);
    setGameOver(false);
    setIsChecking(false);
    setComboCount(0);
  }, []);
  
  const completeGame = useCallback(async () => {
    if (!difficulty) return;
    setGameOver(true);
    setUserMessage('');
    const gameId = `${GAME_ID}_${difficulty}`;
    
    const totalXP = await finalizeStandardGame(gameId, {
        ...sessionStats,
        totalChallenges: TOTAL_CHALLENGES,
        difficulty,
    });

    setFinalXpGained(totalXP);
  }, [difficulty, finalizeStandardGame, sessionStats]);

  const nextChallenge = useCallback(() => {
    if (challengeNumber + 1 > TOTAL_CHALLENGES) {
      completeGame();
    } else {
      setChallengeNumber(prev => prev + 1);
    }
  }, [challengeNumber, completeGame]);
  
  useEffect(() => {
    if (difficulty && !gameOver) {
        generateChallenge(difficulty);
    }
  }, [difficulty, challengeNumber, gameOver, generateChallenge]); 
  
  const checkAnswer = useCallback(async () => {
      if (!challenge || !difficulty) return;
      const correctSymmetricPoints = challenge.points.map(p => calcSymmetricPoint(p, challenge.symmetry));
      
      const isCorrect = userClickedPoints.length === correctSymmetricPoints.length &&
                        userClickedPoints.every(clickedPoint => 
                            correctSymmetricPoints.some(correctPoint => 
                                clickedPoint.x === correctPoint.x && clickedPoint.y === correctPoint.y
                            )
                        ) &&
                        correctSymmetricPoints.every(correctPoint =>
                            userClickedPoints.some(clickedPoint =>
                                clickedPoint.x === correctPoint.x && clickedPoint.y === correctPoint.y
                            )
                        );

      setIsChecking(true);
      if (isCorrect) {
          playSuccessSound();
          if (isFirstAttempt) {
            setSessionStats(s => ({...s, firstTry: s.firstTry + 1}));
          } else {
            setSessionStats(s => ({...s, other: s.other + 1}));
          }
          
          setComboCount(c => {
              const newCombo = c + 1;
              const comboBonus = newCombo >= COMBO_THRESHOLD ? Math.min(newCombo - COMBO_THRESHOLD + 2, 5) : 1;
              const xpGainedForAnimation = (isFirstAttempt ? 15 : 7) * comboBonus;
              
              const message = newCombo >= COMBO_THRESHOLD ? `Correto! Combo ${newCombo}x!` : "Correto!";
              setUserMessage(message);
              setMessageType('success');
              
              setXpAnimation({ amount: xpGainedForAnimation, key: Date.now(), combo: newCombo });
              return newCombo;
          });
          
          setTimeout(() => {
              setIsChecking(false);
              nextChallenge();
          }, 1500);
      } else {
          playErrorSound();
          setSessionStats(s => ({...s, errors: s.errors + 1}));
          setUserMessage('Incorreto. Se precisar de ajuda, use a dica 💡');
          setMessageType('error');
          setIsFirstAttempt(false);
          setComboCount(0);
          setTimeout(() => {
              setUserClickedPoints([]);
              setIsChecking(false);
              setUserMessage(`Tente de novo.`);
              setMessageType('info');
          }, 1500);
      }
  }, [userClickedPoints, challenge, isFirstAttempt, nextChallenge, difficulty]);

  useEffect(() => {
    if (userClickedPoints.length === pointsToWin && pointsToWin > 0 && !isChecking) {
      checkAnswer();
    }
  }, [userClickedPoints, pointsToWin, checkAnswer, isChecking]);

  const handlePointSelected = (x: number, y: number) => {
    if (isChecking || gameOver || !challenge || userClickedPoints.length >= pointsToWin) return;
    
    const alreadyClicked = userClickedPoints.some(p => p.x === x && p.y === y);
    if (!alreadyClicked) {
      setUserClickedPoints(prev => [...prev, { x, y }]);
    }
  };
  
  const handleHintClick = () => {
    if (!challenge || gameOver) return;
    if (!hintUsedInChallenge) {
        setHintUsedInChallenge(true);
        setIsFirstAttempt(false);
    }
    setHintModalOpen(true);
  }
  
  const polylines = useMemo(() => {
      const lines = [];
      if (challenge) {
          lines.push({ points: challenge.points, className: 'stroke-pink-500 stroke-[4px] fill-none stroke-linecap-round stroke-linejoin-round' });
      }
      if (userClickedPoints.length > 0) {
          lines.push({ points: userClickedPoints, className: 'stroke-sky-500 stroke-[4px] fill-none stroke-linecap-round stroke-linejoin-round' });
      }
      return lines;
  }, [challenge, userClickedPoints]);

  const renderDifficultySelector = () => (
    <div className="text-center">
        <header className="text-center mb-6">
          <div className="flex flex-col items-center justify-center gap-2">
            <img src="https://i.ibb.co/bqK98gY/Google-AI-Studio-2025-08-22-T01-43-41-630-Z.png" alt="Logo do App" className="h-16 w-16 object-contain"/>
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
              Simetria de Segmentos
            </h1>
          </div>
        </header>
        <MessageDisplay message={userMessage} type={messageType} />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                    key={d}
                    onClick={() => startGame(d)}
                    className="p-6 bg-slate-800 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-transform transform border-2 border-transparent hover:border-sky-500"
                >
                    <h3 className="text-xl font-semibold text-sky-300 capitalize">{d === 'easy' ? 'Fácil' : d === 'medium' ? 'Médio' : 'Difícil'}</h3>
                    <p className="text-sm text-slate-300 mt-1">{({easy: '2 Pontos', medium: '3 Pontos', hard: '4 Pontos'})[d]}</p>
                </button>
            ))}
        </div>
    </div>
  );
  
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
        <div className="flex justify-between items-center w-full mb-6">
            <button onClick={() => difficulty ? setDifficulty(null) : onReturnToMenu()} className="text-slate-400 hover:text-sky-400 transition-colors flex items-center text-sm font-medium p-2 rounded-lg hover:bg-slate-700" aria-label="Voltar">
                <i className="fas fa-arrow-left mr-2"></i>
                <span>{difficulty ? 'Mudar Nível' : 'Voltar'}</span>
            </button>
            {difficulty && !gameOver && (
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
            )}
        </div>
         

         {!difficulty ? renderDifficultySelector() : gameOver ? (
           <ResultsScreen 
              successes={sessionStats.firstTry} 
              total={TOTAL_CHALLENGES}
              xpEarned={finalXpGained}
              badgePrefix={`${GAME_ID}_${difficulty}`}
              onRestart={() => startGame(difficulty)} 
              onReturnToMenu={onReturnToMenu}
              onAdvance={onAdvance}
              advanceButtonText={advanceButtonText}
           />
         ) : (
          <>
            <header className="text-center mb-4">
              <div className="flex flex-col items-center justify-center gap-2">
                <img src="https://i.ibb.co/bqK98gY/Google-AI-Studio-2025-08-22-T01-43-41-630-Z.png" alt="Logo do App" className="h-16 w-16 object-contain"/>
                <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
                  Simetria de Segmentos <span className="capitalize text-2xl text-slate-200">({difficulty === 'easy' ? 'Fácil' : difficulty})</span>
                </h1>
              </div>
            </header>
            
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
                  Clique nos {pointsToWin} pontos para desenhar a forma simétrica <span className="font-bold text-sky-200">{getSymmetryInstructionText(challenge.symmetry)}</span>.
                </p>
              </div>
            )}

            {/* FIX: The variable 'message' was undefined. Replaced with 'userMessage'. */}
            {userMessage && <MessageDisplay message={userMessage} type={messageType} />}

            <div className="relative my-6 flex justify-center">
              <CartesianPlane minCoord={MIN_COORD} maxCoord={MAX_COORD} onPointSelected={handlePointSelected} disabled={isChecking || gameOver} polylines={polylines} />
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
