import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { GameDataContext } from '../../contexts/GameDataContext';
import { DuelContext } from '../../contexts/DuelContext';
import type { UserProfile, DuelableGameMode } from '../../types';
import { ALL_GAMES_MAP } from '../../data/games';

const duelableGameModes = [
    { id: 'encontrar-pontos', name: 'Encontrar Pontos' },
    { id: 'reconhecer-pontos', name: 'Reconhecer Pontos' },
    { id: 'simetria-pontos', name: 'Simetria de Pontos' },
    { id: 'coordenadas-geograficas', name: 'Coordenadas Geográficas' },
    { id: 'descubra-a-senha', name: 'Descubra a Senha' },
];

const getGameNameById = (id: DuelableGameMode) => duelableGameModes.find(g => g.id === id)?.name || id;

const ChallengeModal: React.FC<{...}> = ({ ... }) => { /* ... */ return null; };

export const DuelLobby: React.FC = () => {
    const { user } = useContext(AuthContext);
    const { getAllUsers } = useContext(GameDataContext);
    const { invitations, sendDuelInvitation, answerDuelInvitation, cancelDuelInvitation } = useContext(DuelContext);
    const [challengeModalOpen, setChallengeModalOpen] = useState(false);
    const [challengingUser, setChallengingUser] = useState<UserProfile | null>(null);

    if (!user) return null;

    // ... (rest of the lobby logic remains similar but uses the new contexts)

    return (
        <div className="w-full max-w-3xl">
            {/* ... Modal and Lobby UI ... */}
        </div>
    );
};
