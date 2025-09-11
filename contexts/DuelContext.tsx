import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import type { DuelInvitation, DuelState, DuelableGameMode, DuelPasswordPlayerState, DuelPlayer } from '../types';
import { generateDuelChallenges, TOTAL_CHALLENGES } from '../data/duel';
import { AuthContext } from './AuthContext';
import { ProfileContext } from './ProfileContext';

interface DuelContextType {
  invitations: DuelInvitation[];
  activeDuel: DuelState | null;
  sendDuelInvitation: (to: string, gameMode: DuelableGameMode) => void;
  answerDuelInvitation: (invitationId: string, answer: 'accepted' | 'declined') => void;
  cancelDuelInvitation: (invitationId: string) => void;
  updateDuelProgress: (duelId: string, progress: number) => void;
  finishDuel: (duelId: string, timeFinished: number) => void;
  clearActiveDuel: () => void;
  handleDuelError: (duelId: string, progressToSet: number) => void;
  setDuelPassword: (duelId: string, passwordData: Omit<DuelPasswordPlayerState, 'guesses' | 'ready'>) => Promise<void>;
  submitDuelGuess: (duelId: string, guess: string) => Promise<void>;
}

export const DuelContext = createContext<DuelContextType>({} as DuelContextType);

const calculatePasswordGuess = (guess: string, password: string): number => {
    let count = 0;
    for (let i = 0; i < password.length; i++) {
        if (guess[i] === password[i]) count++;
    }
    return count;
};

export const DuelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { earnBadge } = useContext(ProfileContext);

  const [invitations, setInvitations] = useState<DuelInvitation[]>([]);
  const [duelStates, setDuelStates] = useState<DuelState[]>([]);
  const [activeDuel, setActiveDuel] = useState<DuelState | null>(null);

  useEffect(() => {
    const unsubInvites = db.collection('invitations').onSnapshot(snapshot => {
      setInvitations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DuelInvitation)));
    });
    const unsubDuels = db.collection('duels').onSnapshot(snapshot => {
      setDuelStates(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DuelState)));
    });
    return () => {
      unsubInvites();
      unsubDuels();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setActiveDuel(null);
      return;
    }
    // Find a duel that is NOT finished
    const currentActiveDuel = duelStates.find(
      (d) =>
        d && Array.isArray(d.players) &&
        d.players.some((p) => p?.name === user.name) &&
        ['starting', 'setup', 'playing'].includes(d.status)
    );
    if (currentActiveDuel) {
      setActiveDuel(currentActiveDuel);
    } else {
      // If no active duel, check for a recently finished one to show results
      const finishedDuel = duelStates.find(
        (d) =>
          d && Array.isArray(d.players) &&
          d.players.some((p) => p?.name === user.name) &&
          d.status === 'finished'
      );
      setActiveDuel(finishedDuel || null);
    }
  }, [duelStates, user]);
  
  const sendDuelInvitation = useCallback(async (to: string, gameMode: DuelableGameMode) => {
    if (!user) return;
    const duelId = `duel-${Date.now()}`;
    const newInvitation = { 
        from: user.name, 
        to, 
        status: 'pending', 
        duelId, 
        gameMode,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() 
    };
    await db.collection('invitations').add(newInvitation);
  }, [user]);

  const answerDuelInvitation = useCallback(async (invitationId: string, answer: 'accepted' | 'declined') => {
    const inviteRef = db.collection('invitations').doc(invitationId);
    const inviteDoc = await inviteRef.get();
    if (!inviteDoc.exists) return;
    const invitation = inviteDoc.data() as DuelInvitation;
    if (answer === 'declined') {
        await inviteRef.update({ status: 'declined' });
        return;
    }
    // Create Duel
    await inviteRef.update({ status: 'accepted' });
    const challenges = generateDuelChallenges(invitation.gameMode);
    const players: [DuelPlayer, DuelPlayer] = [
        { name: invitation.from, progress: 0, timeFinished: null },
        { name: invitation.to, progress: 0, timeFinished: null }
    ];
    
    const newDuel: Omit<DuelState, 'id'> = {
        players,
        gameMode: invitation.gameMode,
        challenges,
        status: invitation.gameMode === 'descubra-a-senha' ? 'setup' : 'starting',
        winner: null,
    };
    if (invitation.gameMode === 'descubra-a-senha') {
        newDuel.passwordGameState = {
            [invitation.from]: { password: '', rules: [], digitCount: 0, guesses: [], ready: false },
            [invitation.to]: { password: '', rules: [], digitCount: 0, guesses: [], ready: false }
        }
    }
    await db.collection('duels').doc(invitation.duelId).set(newDuel);
  }, []);

  const cancelDuelInvitation = useCallback(async (invitationId: string) => {
    await db.collection('invitations').doc(invitationId).delete();
  }, []);

  const updateDuelProgress = useCallback(async (duelId: string, progress: number) => {
    if (!user) return;
    const duelRef = db.collection('duels').doc(duelId);
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(duelRef);
        if (!doc.exists) return;
        const duel = doc.data() as DuelState;
        const playerIndex = duel.players.findIndex(p => p.name === user.name);
        if (playerIndex > -1) {
            const newPlayers = [...duel.players];
            newPlayers[playerIndex].progress = progress;
            transaction.update(duelRef, { players: newPlayers, status: 'playing' });
        }
    });
  }, [user]);

  const finishDuel = useCallback(async (duelId: string, timeFinished: number) => {
    if (!user) return;
    const duelRef = db.collection('duels').doc(duelId);
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(duelRef);
        if (!doc.exists) return;
        const duel = doc.data() as DuelState;
        const playerIndex = duel.players.findIndex(p => p.name === user.name);
        if (playerIndex === -1 || duel.players[playerIndex].timeFinished !== null) return;

        const newPlayers = [...duel.players];
        newPlayers[playerIndex].timeFinished = timeFinished;
        newPlayers[playerIndex].progress = TOTAL_CHALLENGES; // Ensure progress is maxed

        const opponentIndex = 1 - playerIndex;
        const opponent = newPlayers[opponentIndex];
        
        let newStatus: DuelState['status'] = 'playing';
        let newWinner: string | null = null;
        
        if (opponent.timeFinished !== null) { // Opponent already finished
            newStatus = 'finished';
            newWinner = opponent.timeFinished < timeFinished ? opponent.name : user.name;
        } else if (duel.winner) { // Password game winner was already declared
            newStatus = 'finished';
            newWinner = duel.winner;
        }
        
        if (newWinner === user.name) earnBadge('duelist');
        
        transaction.update(duelRef, { players: newPlayers, status: newStatus, winner: newWinner });
    });
  }, [user, earnBadge]);
  
  const clearActiveDuel = useCallback(async () => {
    if (activeDuel && activeDuel.status === 'finished') {
        // Optional: Can delete the duel from DB after a while
    }
    setActiveDuel(null);
  }, [activeDuel]);

  const handleDuelError = useCallback(async (duelId: string, progressToSet: number) => {
     if (!user) return;
    const duelRef = db.collection('duels').doc(duelId);
    const doc = await duelRef.get();
    if (!doc.exists) return;
    const duel = doc.data() as DuelState;
    const playerIndex = duel.players.findIndex(p => p.name === user.name);
    if (playerIndex > -1) {
        const newPlayers = [...duel.players];
        newPlayers[playerIndex].progress = progressToSet;
        await duelRef.update({ players: newPlayers });
    }
  }, [user]);

  const setDuelPassword = useCallback(async (duelId: string, passwordData: any) => {
    if (!user) return;
    const key = `passwordGameState.${user.name}`;
    await db.collection('duels').doc(duelId).update({
        [key]: { ...passwordData, guesses: [], ready: true }
    });
    // Check if both are ready to start
    const duelDoc = await db.collection('duels').doc(duelId).get();
    const duel = duelDoc.data() as DuelState;
    const opponentName = duel.players.find(p => p.name !== user.name)?.name;
    if (opponentName && duel.passwordGameState?.[opponentName].ready) {
        await db.collection('duels').doc(duelId).update({ status: 'playing' });
    }
  }, [user]);
  
  const submitDuelGuess = useCallback(async (duelId: string, guess: string) => {
    if (!user) return;
    const duelRef = db.collection('duels').doc(duelId);
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(duelRef);
        if (!doc.exists) return;
        const duel = doc.data() as DuelState;
        if (!duel.passwordGameState) return;

        const opponentName = duel.players.find(p => p.name !== user.name)?.name;
        if (!opponentName) return;
        
        const opponentState = duel.passwordGameState[opponentName];
        const correctCount = calculatePasswordGuess(guess, opponentState.password);
        
        const selfKey = `passwordGameState.${user.name}.guesses`;
        const newGuesses = firebase.firestore.FieldValue.arrayUnion({ guess, correctCount });

        if (guess === opponentState.password) {
            transaction.update(duelRef, { [selfKey]: newGuesses, winner: user.name, status: 'finished' });
            earnBadge('duelist');
        } else {
            transaction.update(duelRef, { [selfKey]: newGuesses });
        }
    });
  }, [user, earnBadge]);

  const value = {
    invitations, activeDuel,
    sendDuelInvitation, answerDuelInvitation, cancelDuelInvitation,
    updateDuelProgress, finishDuel, clearActiveDuel, handleDuelError,
    setDuelPassword, submitDuelGuess,
  };

  return <DuelContext.Provider value={value}>{children}</DuelContext.Provider>;
};