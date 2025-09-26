import React, { useState, useContext, useEffect } from 'react';
import { MainMenu } from './components/MainMenu';
import { GameCategoryView } from './components/categories/GameCategoryView';
import { EncontrarPontosGame } from './components/EncontrarPontosGame';
import { ReconhecerPontosGame } from './components/ReconhecerPontosGame';
import { SimetriaPontosGame } from './components/SimetriaPontosGame';
import { SimetriaSegmentosGame } from './components/SimetriaSegmentosGame';
import { CoordenadasGeograficasGame } from './components/CoordenadasGeograficasGame';
import { DescubraASenhaGame } from './components/DescubraASenhaGame';
import { AdedonhaGame } from './components/AdedonhaGame';
import { AdedonhaTappleGame } from './components/AdedonhaTappleGame';
import { DuelMode } from './components/DuelMode';
import { CombinacaoTotalGame } from './components/CombinacaoTotalGame';
import { GarrafasGame } from './components/GarrafasGame';
import { XadrezTriangulosGame } from './components/XadrezTriangulosGame';
import { ProfileScreen } from './components/ProfileScreen';
import { AppProviders } from './contexts';
import { AuthContext } from './contexts/AuthContext';
import { RegistrationScreen } from './components/RegistrationScreen';
import { NotificationManager } from './components/NotificationManager';
import { playClickSound } from './utils/audio';
import { TeacherDashboard } from './components/TeacherDashboard';
import type { UserProfile } from './types';
import { GAME_CATEGORIES, GameCategory } from './data/games';

type GameMode = 'encontrar-pontos' | 'reconhecer-pontos' | 'simetria-pontos' | 'simetria-segmentos' | 'coordenadas-geograficas' | 'descubra-a-senha' | 'duelo' | 'adedonha-simples' | 'adedonha-tapple' | 'combinacao-total' | 'jogo-das-garrafas' | 'xadrez-de-triangulos';
type View = 'menu' | 'profile' | 'game' | 'teacher_dashboard' | 'category';

export const isModeUnlocked = (modeId: string, user: UserProfile | null) => {
    if (!user) return false;
    if (user.role === 'teacher') return true;

    // These modes don't depend on a sequence
    if (['duelo', 'adedonha-simples', 'adedonha-tapple', 'combinacao-total', 'descubra-a-senha', 'jogo-das-garrafas', 'xadrez-de-triangulos'].includes(modeId)) return true;

    const badges = user.badges || [];
    switch(modeId) {
        case 'coordenadas-geograficas':
            return true;
        case 'encontrar-pontos':
            return badges.some(b => b.startsWith('geo'));
        case 'reconhecer-pontos':
            return badges.some(b => b.startsWith('find_points'));
        case 'simetria-pontos':
            return badges.some(b => b.startsWith('recognize_points'));
        case 'simetria-segmentos':
            return badges.some(b => b.startsWith('symmetry_points'));
        default:
            return false;
    }
};

const AppContent: React.FC = () => {
  const { user, loading } = useContext(AuthContext);
  const [currentView, setCurrentView] = useState<View>('menu');
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | null>(null);
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);

  useEffect(() => {
    if (user && user.role === 'teacher' && !initialRedirectDone) {
      setCurrentView('teacher_dashboard');
      setInitialRedirectDone(true);
    } else if (!user) {
      setCurrentView('menu');
      setSelectedCategory(null);
      setInitialRedirectDone(false);
    }
  }, [user, initialRedirectDone]);

  if (loading) {
    return (
        <div className="flex flex-col gap-4 justify-center items-center min-h-screen bg-slate-900">
            <img src="https://i.ibb.co/bqK98gY/Google-AI-Studio-2025-08-22-T01-43-41-630-Z.png" alt="Logo" className="h-24 w-24 animate-pulse" />
            <div className="text-2xl font-semibold text-sky-400">Carregando...</div>
        </div>
    );
  }
  
  if (!user || !user.name) {
    return <RegistrationScreen />;
  }
  
  const handleSelectCategory = (category: GameCategory) => {
    setSelectedCategory(category);
    setCurrentView('category');
  };

  const handleSelectMode = (modeId: GameMode) => {
    setGameMode(modeId);
    setCurrentView('game');
  };
  
  const handleShowProfile = () => {
    setCurrentView('profile');
  };

  const handleShowTeacherDashboard = () => {
    setCurrentView('teacher_dashboard');
  };

  const handleReturnToMenu = () => {
    setGameMode(null);
    setSelectedCategory(null);
    setCurrentView('menu');
  };

  const handleReturnToCategoryMenu = () => {
      setGameMode(null);
      setCurrentView('category');
  }

  const renderContent = () => {
    const gameSequence = GAME_CATEGORIES.flatMap(cat => cat.games).map(g => g.id as GameMode);
    const currentGameIndex = gameMode ? gameSequence.indexOf(gameMode) : -1;
    const nextGameModeId = (currentGameIndex > -1 && currentGameIndex < gameSequence.length - 1)
        ? gameSequence[currentGameIndex + 1]
        : null;
    
    const isNextUnlocked = nextGameModeId ? isModeUnlocked(nextGameModeId, user) : false;

    const handleAdvance = () => {
        if (nextGameModeId) {
            handleSelectMode(nextGameModeId);
        }
    };
    
    const nextGameData = nextGameModeId ? GAME_CATEGORIES.flatMap(cat => cat.games).find(g => g.id === nextGameModeId) : null;
    const advanceButtonText = nextGameData ? `Ir para ${nextGameData.name}` : undefined;
    
    const advanceProps = {
        onAdvance: isNextUnlocked ? handleAdvance : undefined,
        advanceButtonText: isNextUnlocked ? advanceButtonText : undefined,
    };
    
    const backToCategoryOrMenu = selectedCategory ? handleReturnToCategoryMenu : handleReturnToMenu;

    switch (currentView) {
      case 'profile':
        return <ProfileScreen onReturnToMenu={handleReturnToMenu} />;
      case 'teacher_dashboard':
        return <TeacherDashboard onReturnToMenu={handleReturnToMenu} onAccessGames={handleReturnToMenu} />;
      case 'category':
        if (!selectedCategory) return <MainMenu onSelectCategory={handleSelectCategory} onShowProfile={handleShowProfile} onShowTeacherDashboard={handleShowTeacherDashboard} />;
        return <GameCategoryView category={selectedCategory} onSelectMode={handleSelectMode} onReturnToMenu={handleReturnToMenu} />;
      case 'game':
        switch (gameMode) {
          case 'encontrar-pontos':
            return <EncontrarPontosGame onReturnToMenu={backToCategoryOrMenu} {...advanceProps} />;
          case 'reconhecer-pontos':
            return <ReconhecerPontosGame onReturnToMenu={backToCategoryOrMenu} {...advanceProps} />;
          case 'simetria-pontos':
            return <SimetriaPontosGame onReturnToMenu={backToCategoryOrMenu} {...advanceProps} />;
          case 'simetria-segmentos':
            return <SimetriaSegmentosGame onReturnToMenu={backToCategoryOrMenu} {...advanceProps} />;
          case 'coordenadas-geograficas':
            return <CoordenadasGeograficasGame onReturnToMenu={backToCategoryOrMenu} {...advanceProps} />;
          case 'descubra-a-senha':
            return <DescubraASenhaGame onReturnToMenu={backToCategoryOrMenu} />;
          case 'adedonha-simples':
            return <AdedonhaGame onReturnToMenu={backToCategoryOrMenu} />;
          case 'adedonha-tapple':
            return <AdedonhaTappleGame onReturnToMenu={backToCategoryOrMenu} />;
          case 'combinacao-total':
            return <CombinacaoTotalGame onReturnToMenu={backToCategoryOrMenu} />;
          case 'jogo-das-garrafas':
            return <GarrafasGame onReturnToMenu={backToCategoryOrMenu} />;
          case 'xadrez-de-triangulos':
            return <XadrezTriangulosGame onReturnToMenu={backToCategoryOrMenu} />;
          case 'duelo':
            return <DuelMode onReturnToMenu={handleReturnToMenu} />; // Duel always returns to main menu
          default:
            return <MainMenu onSelectCategory={handleSelectCategory} onShowProfile={handleShowProfile} onShowTeacherDashboard={handleShowTeacherDashboard} />;
        }
      case 'menu':
      default:
        return <MainMenu onSelectCategory={handleSelectCategory} onShowProfile={handleShowProfile} onShowTeacherDashboard={handleShowTeacherDashboard} />;
    }
  };

  return renderContent();
};


const App: React.FC = () => {
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('button')) {
        playClickSound();
      }
    };

    document.addEventListener('click', handleGlobalClick);

    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  return (
    <AppProviders>
      <div className="bg-slate-900 text-slate-200">
        <NotificationManager />
        <AppContent />
      </div>
    </AppProviders>
  );
};

export default App;