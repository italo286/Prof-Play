import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GAME_CATEGORIES, GameCategory } from '../data/games';

interface MainMenuProps {
  onSelectCategory: (category: GameCategory) => void;
  onShowProfile: () => void;
  onShowTeacherDashboard: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSelectCategory, onShowProfile, onShowTeacherDashboard }) => {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null;

  const handleCategoryClick = (category: GameCategory) => {
    // For teachers, directly access the games (menu acts as a game list)
    if (user.role === 'teacher') {
       onSelectCategory(category);
    } else {
    // For students, handle category selection
       onSelectCategory(category);
    }
  };

  const filteredCategories = user.role === 'teacher' ? GAME_CATEGORIES.filter(c => c.id !== 'duelo') : GAME_CATEGORIES;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-200 select-none">
        <div className="w-full max-w-4xl">
            <header className="text-center mb-8 relative">
                <div className="flex flex-col items-center justify-center gap-2">
                    <img src="https://i.ibb.co/bqK98gY/Google-AI-Studio-2025-08-22-T01-43-41-630-Z.png" alt="Logo do App" className="h-20 w-20 object-contain"/>
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                        Prof-Play
                    </h1>
                     <div className="flex items-center gap-3 mt-2">
                      {user.avatar && user.role === 'student' && (
                        <img src={user.avatar} alt="Seu avatar" className="w-12 h-12 rounded-full bg-slate-700 border-2 border-sky-400"/>
                      )}
                      <p className="text-lg text-slate-300">Seja bem-vindo(a), <span className="font-bold">{user.name}</span>!</p>
                    </div>
                </div>
            </header>
            
            <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCategories.map(category => (
                    <div key={category.id}
                         onClick={() => handleCategoryClick(category)}
                         className="p-6 bg-slate-800 rounded-lg shadow-lg border-2 border-transparent hover:border-sky-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center">
                        
                        <i className={`fas ${category.icon} text-5xl mb-4 ${category.color}`}></i>
                        <h2 className="text-2xl font-bold text-slate-100">{category.name}</h2>
                        <p className="text-sm text-slate-400 mt-1 h-10">{category.description}</p>
                    </div>
                ))}
            </main>
            
            <footer className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4">
                <button onClick={onShowProfile} className="px-6 py-2 bg-slate-700 text-white font-semibold rounded-lg shadow-md hover:bg-slate-600 transition-colors">
                    <i className="fas fa-user-circle mr-2"></i>Meu Perfil
                </button>
                {user?.role === 'teacher' && (
                     <button onClick={onShowTeacherDashboard} className="px-6 py-2 bg-sky-700 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 transition-colors">
                        <i className="fas fa-chalkboard-teacher mr-2"></i>Painel do Professor
                     </button>
                )}
                <button onClick={logout} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors">
                    <i className="fas fa-sign-out-alt mr-2"></i>Sair
                </button>
            </footer>
        </div>
        <footer className="text-center text-sm text-slate-400 pt-8">
            <p>Desenvolvido por Ítalo Natan - 2025</p>
        </footer>
    </div>
  );
};
