import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { ProfileContext } from '../contexts/ProfileContext';
import { GameDataContext } from '../contexts/GameDataContext';
import { ALL_BADGES } from '../data/achievements';
import { XpProgressBar } from './XpProgressBar';
import { AVATARS } from '../data/avatars';

interface ProfileScreenProps {
  onReturnToMenu: () => void;
}

const getTierClass = (tier: 'gold' | 'silver' | 'bronze' | 'level') => {
    switch(tier) {
        case 'gold': return { bg: 'bg-amber-900/40', border: 'border-amber-500', text: 'text-amber-400', name: 'text-amber-300' };
        case 'silver': return { bg: 'bg-gray-700', border: 'border-gray-500', text: 'text-gray-400', name: 'text-gray-300' };
        case 'bronze': return { bg: 'bg-orange-900/40', border: 'border-orange-600', text: 'text-orange-500', name: 'text-orange-400' };
        case 'level': return { bg: 'bg-sky-900/40', border: 'border-sky-500', text: 'text-sky-400', name: 'text-sky-300' };
        default: return { bg: 'bg-slate-700', border: 'border-slate-600', text: 'text-slate-500', name: 'text-slate-400' };
    }
}

const AvatarChangeModal: React.FC<{
    user: any;
    onClose: () => void;
    onSave: (newAvatar: string) => void;
}> = ({ user, onClose, onSave }) => {
    const { getStudentsInClass } = useContext(GameDataContext);
    const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);

    const studentsInClass = useMemo(() => {
        if (!user?.classCode) return [];
        return getStudentsInClass(user.classCode);
    }, [user, getStudentsInClass]);

    const usedAvatars = useMemo(() => {
        // Avatars used by OTHERS in the class
        return new Set(
            studentsInClass
                .filter(student => student.name !== user.name && student.avatar)
                .map(student => student.avatar)
        );
    }, [studentsInClass, user]);

    const handleSave = () => {
        onSave(selectedAvatar);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in-down" onClick={onClose}>
            <div className="bg-slate-800 shadow-2xl rounded-xl p-6 w-full max-w-lg text-center" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-sky-400 mb-4">Trocar Avatar</h2>
                <div className="grid grid-cols-5 md:grid-cols-6 gap-3 bg-slate-900/50 p-3 rounded-lg max-h-64 overflow-y-auto">
                    {AVATARS.map((avatarUrl) => {
                        const isTaken = usedAvatars.has(avatarUrl);
                        const isSelected = selectedAvatar === avatarUrl;
                        return (
                            <button
                                type="button"
                                key={avatarUrl}
                                onClick={() => !isTaken && setSelectedAvatar(avatarUrl)}
                                disabled={isTaken}
                                className={`w-16 h-16 rounded-full bg-cover bg-center transition-all duration-200 ease-in-out transform focus:outline-none 
                                    ${isSelected ? 'ring-4 ring-sky-400 scale-110' : ''} 
                                    ${isTaken ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
                                style={{ backgroundImage: `url(${avatarUrl})` }}
                                aria-label={`Avatar ${isTaken ? 'indisponível' : 'disponível'}`}
                            >
                                {isTaken && (
                                    <div className="w-full h-full rounded-full bg-black/60 flex items-center justify-center">
                                        <i className="fas fa-lock text-white"></i>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-6 flex gap-4 justify-center">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar</button>
                </div>
            </div>
        </div>
    );
};

const EditUsernameModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
}> = ({ isOpen, onClose, currentName }) => {
    const { changeUsername } = useContext(AuthContext);
    const [newName, setNewName] = useState(currentName);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNewName(currentName);
            setError('');
            setSuccessMessage('');
            setIsSaving(false);
        }
    }, [isOpen, currentName]);
    
    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        
        const result = await changeUsername(newName);

        if (result.status === 'success') {
            setSuccessMessage('Nome de usuário alterado! Você será desconectado. Por favor, faça o login novamente com seu novo nome.');
            // O logout é tratado dentro de changeUsername, então apenas esperamos o componente ser desmontado.
        } else {
            setError(result.message || 'Ocorreu um erro.');
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in-down" onClick={onClose}>
            <div className="bg-slate-800 shadow-2xl rounded-xl p-6 w-full max-w-md text-center" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-sky-400 mb-4">Alterar Nome de Usuário</h2>
                {successMessage ? (
                    <div className="text-green-300 p-4">
                        <i className="fas fa-check-circle text-3xl mb-2"></i>
                        <p>{successMessage}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label htmlFor="new-username" className="block text-sm font-medium text-slate-300 mb-1 text-left">Novo Nome de Usuário</label>
                            <input
                                id="new-username"
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full p-3 bg-slate-700 text-white rounded-md border-2 border-slate-600 focus:border-sky-500"
                                required
                                disabled={isSaving}
                            />
                        </div>

                         <p className="text-xs text-yellow-400 bg-yellow-900/40 p-2 rounded-md">
                            <strong>Atenção:</strong> Mudar seu nome de usuário irá te desconectar de qualquer partida em andamento (Duelos, Adedonha, etc).
                        </p>

                        {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}

                        <div className="flex gap-4 justify-center pt-2">
                            <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                                {isSaving ? <><i className="fas fa-spinner fa-spin mr-2"></i>Salvando...</> : 'Salvar'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};


export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onReturnToMenu }) => {
  const { user } = useContext(AuthContext);
  const { updateUserProfile } = useContext(ProfileContext);
  const [isAvatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  if (!user) return null;

  const handleAvatarSave = (newAvatar: string) => {
    if (newAvatar && newAvatar !== user.avatar) {
        updateUserProfile({ avatar: newAvatar });
    }
    setAvatarModalOpen(false);
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4 select-none">
      {isAvatarModalOpen && <AvatarChangeModal user={user} onClose={() => setAvatarModalOpen(false)} onSave={handleAvatarSave} />}
      <EditUsernameModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} currentName={user.name} />

      <div className="relative bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 w-full max-w-3xl">
        <button
          onClick={onReturnToMenu}
          className="absolute top-4 left-4 text-slate-400 hover:text-sky-400 transition-colors z-10 flex items-center text-sm font-medium p-2 rounded-lg hover:bg-slate-700"
          aria-label="Voltar ao menu principal"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          <span>Voltar</span>
        </button>

        <header className="text-center mb-8">
            <div className="flex flex-col items-center justify-center gap-2 mt-8 md:mt-0">
                <div className="relative group">
                     {user.avatar && user.role === 'student' ? (
                        <img src={user.avatar} alt="Seu avatar" className="w-24 h-24 rounded-full bg-slate-700 border-4 border-sky-400 shadow-lg"/>
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-slate-700 border-4 border-sky-400 shadow-lg flex items-center justify-center">
                            <i className="fas fa-user-graduate text-5xl text-sky-400"></i>
                        </div>
                    )}
                    {user.role === 'student' && (
                        <button 
                            onClick={() => setAvatarModalOpen(true)}
                            className="absolute -bottom-1 -right-1 w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white shadow-md transition-transform transform group-hover:scale-110"
                            aria-label="Trocar avatar"
                        >
                            <i className="fas fa-pencil-alt text-sm"></i>
                        </button>
                    )}
                </div>
                
                <div className="flex items-center justify-center gap-3">
                    <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                        {user.name}
                    </h1>
                    <button 
                        onClick={() => setEditModalOpen(true)}
                        className="text-slate-400 hover:text-sky-400 transition-colors p-2 rounded-full hover:bg-slate-700"
                        aria-label="Editar nome de usuário"
                    >
                        <i className="fas fa-pencil-alt text-lg"></i>
                    </button>
                </div>

                {user.role === 'student' && user.classCode && (
                    <p className="text-sm text-slate-400 mt-1">Código da Turma: <span className="font-bold bg-slate-700 px-2 py-1 rounded">{user.classCode}</span></p>
                )}
            </div>
        </header>

        <section className="mb-8 p-6 bg-slate-900/70 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-sky-300 mb-2 text-center">Meu Progresso</h2>
            <p className="text-center text-xl mb-4 font-semibold">Nível {user.level}</p>
            <XpProgressBar currentXp={user.xp} level={user.level} />
        </section>

        <section>
            <h2 className="text-2xl font-bold text-cyan-300 mb-4 text-center">Medalhas</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {ALL_BADGES.map(badge => {
                    const isEarned = user.badges.includes(badge.id);
                    const tierClass = getTierClass(badge.tier);
                    return (
                        <div 
                            key={badge.id}
                            className={`flex flex-col items-center justify-center text-center p-3 rounded-lg border-2 transition-all ${isEarned ? `${tierClass.bg} ${tierClass.border} shadow-md` : 'bg-slate-800 border-slate-700'}`}
                            title={isEarned ? badge.description : 'Continue jogando para desbloquear'}
                        >
                            <i className={`fas ${badge.icon} text-4xl mb-2 ${isEarned ? tierClass.text : 'text-slate-500'}`}></i>
                            <h3 className={`font-bold text-sm ${isEarned ? tierClass.name : 'text-slate-400'}`}>{badge.name}</h3>
                            {!isEarned && <p className="text-xs text-slate-500">(Bloqueada)</p>}
                        </div>
                    );
                })}
            </div>
        </section>
      </div>
    </div>
  );
};
