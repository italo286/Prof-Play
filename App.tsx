import React, { useContext, useState } from 'react';
import { AuthContext } from './contexts/AuthContext';
import { AppProviders } from './contexts';
import { RegistrationScreen } from './components/RegistrationScreen';
import { MainMenu } from './components/MainMenu';
import { EncontrarPontosGame } from './components/EncontrarPontosGame';
import { ReconhecerPontosGame } from './components/ReconhecerPontosGame';
import { SimetriaPontosGame } from './components/SimetriaPontosGame';
import { CoordenadasGeograficasGame } from './components/CoordenadasGeograficasGame';
import { ProfileScreen } from './components/ProfileScreen';
import { NotificationManager } from './components/NotificationManager';
import { GameCategory } from './data/games';
import { GameCategoryView } from './components/categories/GameCategoryView';
import { SimetriaSegmentosGame } from './components/SimetriaSegmentosGame';
import { TeacherDashboard } from './components/TeacherDashboard';
import { DuelMode } from './components/DuelMode';
import { DescubraASenhaGame } from './components/DescubraASenhaGame';
import { AdedonhaGame } from './components/AdedonhaGame';
import { CombinacaoTotalGame } from './components/CombinacaoTotalGame';
import { GarrafasGame } from './components/GarrafasGame';
import { AdedonhaTappleGame } from './components/AdedonhaTappleGame';
import { UserProfile } from './types';

type GameView = 
  | 'main-menu' 
  | 'profile' 
  | 'teacher-dashboard'
  | 'category-view'
  | 'encontrar-pontos' 
  | 'reconhecer-pontos' 
  | 'simetria-pontos' 
  | 'simetria-segmentos'
  | 'coordenadas-geograficas'
  | 'duelo'
  | 'descubra-a-senha'
  | 'adedonha'
  | 'combinacao-total'
  | 'jogo-das-garrafas'
  | 'adedonha-tapple';

// Helper function to determine if a game mode is unlocked
export const isModeUnlocked = (modeId: string, user: UserProfile): boolean => {
    // Teacher has access to everything
    if (user.role === 'teacher') return true;
    
    // Always unlocked for now
    return true;
};

const AppContent: React.FC = () => {
    const { user, loading } = useContext(AuthContext);
    const [view, setView] = useState<GameView>('main-menu');
    const [selectedCategory, setSelectedCategory] = useState<GameCategory | null>(null);

    const handleReturnToMenu = () => {
        setView('main-menu');
        setSelectedCategory(null);
    };

    const handleSelectCategory = (category: GameCategory) => {
        if (category.id === 'duelo') {
            setView('duelo');
        } else {
            setSelectedCategory(category);
            setView('category-view');
        }
    };
    
    const handleSelectMode = (modeId: any) => {
        setView(modeId as GameView);
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-sky-400 text-xl font-bold">Carregando...</div>;
    }

    if (!user) {
        return <RegistrationScreen />;
    }
    
    const renderView = () => {
        switch (view) {
            case 'main-menu':
                return <MainMenu 
                    onSelectCategory={handleSelectCategory} 
                    onShowProfile={() => setView('profile')}
                    onShowTeacherDashboard={() => setView('teacher-dashboard')}
                />;
            case 'category-view':
                if (!selectedCategory) return <MainMenu onSelectCategory={handleSelectCategory} onShowProfile={() => setView('profile')} onShowTeacherDashboard={() => setView('teacher-dashboard')} />;
                return <GameCategoryView category={selectedCategory} onSelectMode={handleSelectMode} onReturnToMenu={handleReturnToMenu} />;
            case 'profile':
                return <ProfileScreen onReturnToMenu={handleReturnToMenu} />;
            case 'teacher-dashboard':
                 return <TeacherDashboard onReturnToMenu={handleReturnToMenu} />;
            // Games
            case 'encontrar-pontos':
                return <EncontrarPontosGame onReturnToMenu={() => setView('category-view')} />;
            case 'reconhecer-pontos':
                return <ReconhecerPontosGame onReturnToMenu={() => setView('category-view')} />;
            case 'simetria-pontos':
                return <SimetriaPontosGame onReturnToMenu={() => setView('category-view')} />;
            case 'simetria-segmentos':
                return <SimetriaSegmentosGame onReturnToMenu={() => setView('category-view')} />;
            case 'coordenadas-geograficas':
                return <CoordenadasGeograficasGame onReturnToMenu={() => setView('category-view')} />;
            case 'duelo':
                return <DuelMode onReturnToMenu={handleReturnToMenu} />;
            case 'descubra-a-senha':
                return <DescubraASenhaGame onReturnToMenu={() => setView('category-view')} />;
             case 'adedonha':
                return <AdedonhaGame onReturnToMenu={() => setView('category-view')} />;
            case 'combinacao-total':
                return <CombinacaoTotalGame onReturnToMenu={() => setView('category-view')} />;
            case 'jogo-das-garrafas':
                return <GarrafasGame onReturnToMenu={() => setView('category-view')} />;
            case 'adedonha-tapple':
                return <AdedonhaTappleGame onReturnToMenu={() => setView('category-view')} />;
            default:
                return <MainMenu 
                    onSelectCategory={handleSelectCategory} 
                    onShowProfile={() => setView('profile')}
                    onShowTeacherDashboard={() => setView('teacher-dashboard')}
                />;
        }
    };

    return (
        <>
            <NotificationManager />
            {renderView()}
        </>
    );
};

const App: React.FC = () => {
    return (
        <AppProviders>
            <AppContent />
        </AppProviders>
    );
};

export default App;
