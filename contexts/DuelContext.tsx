import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { db } from '../firebase';
// FIX: Corrected Firebase Firestore imports for v8 namespaced API.
// FIX: Use compat import for Firebase v8 syntax.
import firebase from 'firebase/compat/app';
// FIX: Added missing firestore import for side-effects, enabling full v8 API compatibility for types and FieldValue.
import 'firebase/compat/firestore';
import type { DuelInvitation, DuelState, DuelableGameMode, DuelPasswordPlayerState, DuelPlayer, Pin, Line, ClaimedTriangle, PlayerColor } from '../types';
import { generateDuelChallenges, TOTAL_CHALLENGES } from '../data/duel';
import { AuthContext } from './AuthContext';
import { ProfileContext } from './ProfileContext';

interface DuelContextType {
  invitations: DuelInvitation[];
  activeDuel: DuelState | null;
  duelStates: DuelState[];
  sendDuelInvitation: (to: string, gameMode: DuelableGameMode) => void;
  answerDuelInvitation: (invitationId: string, answer: 'accepted' | 'declined') => void;
  cancelDuelInvitation: (invitationId: string) => void;
  updateDuelProgress: (duelId: string, progress: number) => void;
  finishDuel: (duelId: string, timeFinished: number) => void;
  clearActiveDuel: () => void;
  handleDuelError: (duelId: string, progressToSet: number) => void;
  setDuelPassword: (duelId: string, passwordData: Omit<DuelPasswordPlayerState, 'guesses' | 'ready'>) => Promise<void>;
  submitDuelGuess: (duelId: string, guess: string) => Promise<void>;
  forfeitDuel: (duelId: string) => Promise<void>;
  setDuelGarrafasOrder: (duelId: string, order: number[]) => Promise<void>;
  submitDuelGarrafasGuess: (duelId: string, guess: number[]) => Promise<void>;
  submitXadrezTurn: (duelId: string, fromPinId: string, toPinId: string) => Promise<void>;
}

export const DuelContext = createContext<DuelContextType>({} as DuelContextType);

const calculatePasswordGuess = (guess: string, password: string): number => {
    let count = 0;
    for (let i = 0; i < password.length; i++) {
        if (guess[i] === password[i]) count++;
    }
    return count;
};

const arraysEqual = (a: any[], b: any[]): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// --- XADREZ HELPERS (moved here for server-side logic) ---
const XADREZ_BOARD_RADIUS = 3;
const XADREZ_PIECES_TO_WIN = 15;

const generatePins = (radius: number): Map<string, Pin> => {
    const pins = new Map<string, Pin>();
    for (let q = -radius; q <= radius; q++) {
        for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
            const id = `${q},${r}`;
            pins.set(id, { id, q, r });
        }
    }
    return pins;
};
const getHexDistance = (p1: Pin, p2: Pin): number => (Math.abs(p1.q - p2.q) + Math.abs(p1.r - p2.r) + Math.abs(p1.q + p1.r - (p2.q + p2.r))) / 2;
const getPinsOnLine = (startPin: Pin, endPin: Pin, allPins: Map<string, Pin>): Pin[] => {
    const distance = getHexDistance(startPin, endPin);
    if (distance === 0) return [startPin];
    const results: Pin[] = [];
    for (let i = 0; i <= distance; i++) {
        const t = i / distance;
        const q = startPin.q * (1 - t) + endPin.q * t;
        const r = startPin.r * (1 - t) + endPin.r * t;
        const s = (-startPin.q - startPin.r) * (1-t) + (-endPin.q - endPin.r) * t;
        let rq = Math.round(q); let rr = Math.round(r); let rs = Math.round(s);
        const q_diff = Math.abs(rq - q); const r_diff = Math.abs(rr - r); const s_diff = Math.abs(rs - s);
        if (q_diff > r_diff && q_diff > s_diff) rq = -rr - rs;
        else if (r_diff > s_diff) rr = -rq - rs;
        const pin = allPins.get(`${rq},${rr}`);
        if (pin) results.push(pin);
    }
    return results;
};
const checkNewTriangles = (newLine: Omit<Line, 'player'> & {player: string}, allLines: Array<Omit<Line, 'player'> & {player: string}>, allPins: Map<string, Pin>): Array<Omit<ClaimedTriangle, 'owner'> & {owner: string}> => {
  const [p1Id, p2Id] = [newLine.from, newLine.to];
  const newTriangles: Array<Omit<ClaimedTriangle, 'owner'> & {owner: string}> = [];
  const p1 = allPins.get(p1Id);
  const p2 = allPins.get(p2Id);
  if (!p1 || !p2) return [];
  for (const p3 of allPins.values()) {
    if (p3.id === p1Id || p3.id === p2Id) continue;
    const sideAExists = allLines.some(l => (l.from === p1Id && l.to === p3.id) || (l.from === p3.id && l.to === p1Id));
    const sideBExists = allLines.some(l => (l.from === p2Id && l.to === p3.id) || (l.from === p3.id && l.to === p2Id));
    if (sideAExists && sideBExists && getHexDistance(p1, p3) === 1 && getHexDistance(p2, p3) === 1) {
        const vertices = [p1Id, p2Id, p3.id].sort() as [string, string, string];
        newTriangles.push({ id: vertices.join(';'), vertices, owner: newLine.player });
    }
  }
  return newTriangles;
};
// --- END XADREZ HELPERS ---


export const DuelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { earnBadge } = useContext(ProfileContext);

  const [invitations, setInvitations] = useState<DuelInvitation[]>([]);
  const [duelStates, setDuelStates] = useState<DuelState[]>([]);
  const [activeDuel, setActiveDuel] = useState<DuelState | null>(null);

  useEffect(() => {
    // FIX: Switched to v8 syntax
    const unsubInvites = db.collection('invitations').onSnapshot(snapshot => {
      const invites: DuelInvitation[] = [];
      snapshot.forEach(d => invites.push({ id: d.id, ...d.data() } as DuelInvitation));
      setInvitations(invites);
    });
    const unsubDuels = db.collection('duels').onSnapshot(snapshot => {
      const duels: DuelState[] = [];
      snapshot.forEach(d => duels.push({ id: d.id, ...d.data() } as DuelState));
      setDuelStates(duels);
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
      // If no active duel, check for the MOST RECENT finished one to show results
      const finishedDuels = duelStates.filter(
        (d) =>
          d && Array.isArray(d.players) &&
          d.players.some((p) => p?.name === user.name) &&
          d.status === 'finished'
      );
      
      if (finishedDuels.length > 0) {
        // Sort by creation time descending to get the most recent one
        finishedDuels.sort((a, b) => {
            const timeA = a.createdAt?.seconds ?? 0;
            const timeB = b.createdAt?.seconds ?? 0;
            // Fallback to ID sort if timestamps are missing/equal
            if (timeB === timeA) {
                return b.id.localeCompare(a.id);
            }
            return timeB - timeA;
        });
        setActiveDuel(finishedDuels[0]);
      } else {
        setActiveDuel(null);
      }
    }
  }, [duelStates, user]);
  
  const sendDuelInvitation = useCallback(async (to: string, gameMode: DuelableGameMode) => {
    if (!user) return;
    const duelId = `duel-${Date.now()}`;
    // FIX: Switched to v8 syntax
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
    // FIX: Switched to v8 syntax
    const inviteRef = db.doc(`invitations/${invitationId}`);
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
    
    const isSetupGame = ['descubra-a-senha', 'jogo-das-garrafas', 'xadrez-de-triangulos'].includes(invitation.gameMode);

    const newDuel: Omit<DuelState, 'id'> = {
        players,
        gameMode: invitation.gameMode,
        challenges,
        status: isSetupGame ? 'playing' : 'starting', // xadrez starts immediately
        winner: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (invitation.gameMode === 'descubra-a-senha') {
        newDuel.status = 'setup'; // password still needs setup
        newDuel.passwordGameState = {
            [invitation.from]: { password: '', rules: [], digitCount: 0, guesses: [], ready: false },
            [invitation.to]: { password: '', rules: [], digitCount: 0, guesses: [], ready: false }
        }
    }
    if (invitation.gameMode === 'jogo-das-garrafas') {
        newDuel.status = 'setup'; // garrafas still needs setup
        newDuel.garrafasGameState = {
            [invitation.from]: { correctOrder: [], guesses: [], ready: false },
            [invitation.to]: { correctOrder: [], guesses: [], ready: false }
        }
    }
    if (invitation.gameMode === 'xadrez-de-triangulos') {
        newDuel.xadrezGameState = {
            lines: [],
            claimedTriangles: [],
            currentPlayer: invitation.from,
        }
    }
    await db.doc(`duels/${invitation.duelId}`).set(newDuel);
  }, []);

  const cancelDuelInvitation = useCallback(async (invitationId: string) => {
    // FIX: Switched to v8 syntax
    await db.doc(`invitations/${invitationId}`).delete();
  }, []);

  const updateDuelProgress = useCallback(async (duelId: string, progress: number) => {
    if (!user) return;
    // FIX: Switched to v8 syntax
    const duelRef = db.doc(`duels/${duelId}`);
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
    const duelRef = db.doc(`duels/${duelId}`);
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(duelRef);
        if (!doc.exists) throw new Error("Duel not found");
        const duel = doc.data() as DuelState;

        // Prevent re-finishing
        if (duel.status === 'finished') return;

        const playerIndex = duel.players.findIndex(p => p.name === user.name);
        if (playerIndex === -1 || duel.players[playerIndex].timeFinished !== null) return;

        const newPlayers = [...duel.players] as [DuelPlayer, DuelPlayer];
        newPlayers[playerIndex].timeFinished = timeFinished;
        newPlayers[playerIndex].progress = TOTAL_CHALLENGES; // Ensure progress is maxed

        const opponent = newPlayers[1 - playerIndex];
        
        let newStatus: DuelState['status'] = 'playing';
        let newWinner: string | null = null;
        
        if (opponent.timeFinished !== null) { // Opponent already finished
            newStatus = 'finished';
            newWinner = opponent.timeFinished < timeFinished ? opponent.name : user.name;
        } else if (duel.winner) { // Password game winner was already declared
            newStatus = 'finished';
            newWinner = duel.winner;
        }
        
        if (newWinner === user.name) {
            // This transaction ensures earnBadge is only called once a winner is confirmed.
            // earnBadge itself will handle not awarding duplicates.
            setTimeout(() => earnBadge('duelist'), 0);
        }
        
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
    // FIX: Switched to v8 syntax
    const duelRef = db.doc(`duels/${duelId}`);
    const docSnap = await duelRef.get();
    if (!docSnap.exists) return;
    const duel = docSnap.data() as DuelState;
    const playerIndex = duel.players.findIndex(p => p.name === user.name);
    if (playerIndex > -1) {
        const newPlayers = [...duel.players];
        newPlayers[playerIndex].progress = progressToSet;
        await duelRef.update({ players: newPlayers });
    }
  }, [user]);

  const setDuelPassword = useCallback(async (duelId: string, passwordData: any) => {
    if (!user) return;
    // FIX: Switched to v8 syntax
    const duelRef = db.doc(`duels/${duelId}`);
    const key = `passwordGameState.${user.name}`;
    await duelRef.update({
        [key]: { ...passwordData, guesses: [], ready: true }
    });
    // Check if both are ready to start
    const duelDoc = await duelRef.get();
    const duel = duelDoc.data() as DuelState;
    const opponentName = duel.players.find(p => p.name !== user.name)?.name;
    if (opponentName && duel.passwordGameState?.[opponentName].ready) {
        await duelRef.update({ status: 'playing' });
    }
  }, [user]);
  
  const submitDuelGuess = useCallback(async (duelId: string, guess: string) => {
    if (!user) return;
    const duelRef = db.doc(`duels/${duelId}`);
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(duelRef);
        if (!doc.exists) throw new Error("Duel not found");
        const duel = doc.data() as DuelState;
        if (!duel.passwordGameState) throw new Error("Password game state not found");

        const opponentName = duel.players.find(p => p.name !== user.name)?.name;
        if (!opponentName) throw new Error("Opponent not found");
        
        const opponentState = duel.passwordGameState[opponentName];
        const correctCount = calculatePasswordGuess(guess, opponentState.password);
        
        const selfKey = `passwordGameState.${user.name}.guesses`;
        const newGuesses = firebase.firestore.FieldValue.arrayUnion({ guess, correctCount });

        if (guess === opponentState.password) {
            transaction.update(duelRef, { [selfKey]: newGuesses, winner: user.name, status: 'finished' });
            setTimeout(() => earnBadge('duelist'), 0);
        } else {
            transaction.update(duelRef, { [selfKey]: newGuesses });
        }
    });
  }, [user, earnBadge]);

  const forfeitDuel = useCallback(async (duelId: string) => {
      if (!user) return;
      const duelRef = db.doc(`duels/${duelId}`);
      const doc = await duelRef.get();
      if (!doc.exists) return;
      const duel = doc.data() as DuelState;
      const opponentName = duel.players.find(p => p.name !== user.name)?.name;
      if (opponentName) {
        await duelRef.update({ winner: opponentName, status: 'finished' });
      }
  }, [user]);

  const setDuelGarrafasOrder = useCallback(async (duelId: string, order: number[]) => {
      if (!user) return;
      const duelRef = db.doc(`duels/${duelId}`);
      const key = `garrafasGameState.${user.name}`;
      await duelRef.update({
          [`${key}.correctOrder`]: order,
          [`${key}.guesses`]: [],
          [`${key}.ready`]: true
      });
      // Check if both are ready to start
      const duelDoc = await duelRef.get();
      const duel = duelDoc.data() as DuelState;
      const opponentName = duel.players.find(p => p.name !== user.name)?.name;
      if (opponentName && duel.garrafasGameState?.[opponentName].ready) {
          await duelRef.update({ status: 'playing' });
      }
  }, [user]);
  
  const submitDuelGarrafasGuess = useCallback(async (duelId: string, guess: number[]) => {
      if (!user) return;
      const duelRef = db.doc(`duels/${duelId}`);
      await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(duelRef);
          if (!doc.exists) return;
          const duel = doc.data() as DuelState;
          if (!duel.garrafasGameState) return;
          const opponentName = duel.players.find(p => p.name !== user.name)?.name;
          if (!opponentName) return;
          
          const opponentState = duel.garrafasGameState[opponentName];
          const isCorrect = arraysEqual(guess, opponentState.correctOrder);
          
          const selfKey = `garrafasGameState.${user.name}.guesses`;
          let correctCount = 0;
          for(let i=0; i<guess.length; i++) {
              if (guess[i] === opponentState.correctOrder[i]) correctCount++;
          }
          const newGuesses = firebase.firestore.FieldValue.arrayUnion({ guess, correctCount });
          
          if (isCorrect) {
              transaction.update(duelRef, { [selfKey]: newGuesses, winner: user.name, status: 'finished' });
              setTimeout(() => earnBadge('duelist'), 0);
          } else {
              transaction.update(duelRef, { [selfKey]: newGuesses });
          }
      });
  }, [user, earnBadge]);

  const submitXadrezTurn = useCallback(async (duelId: string, fromPinId: string, toPinId: string) => {
    if (!user) return;
    const duelRef = db.doc(`duels/${duelId}`);
    
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(duelRef);
        if (!doc.exists) throw new Error("Duel not found");
        const duel = doc.data() as DuelState;
        if (!duel.xadrezGameState) throw new Error("Game state missing");
        if (duel.status !== 'playing') throw new Error("Duel is not active");
        if (duel.xadrezGameState.currentPlayer !== user.name) throw new Error("Not your turn");

        // If toPinId is empty, it's just a selection, not a move. We don't need to save this.
        if (!toPinId) return;

        const allPins = generatePins(XADREZ_BOARD_RADIUS);
        const fromPin = allPins.get(fromPinId);
        const toPin = allPins.get(toPinId);
        if (!fromPin || !toPin) throw new Error("Invalid pins");

        // Validate move
        const areCollinear = fromPin.q === toPin.q || fromPin.r === toPin.r || (fromPin.q + fromPin.r === toPin.q + toPin.r);
        if (!areCollinear) throw new Error("Pins are not collinear");

        const path = getPinsOnLine(fromPin, toPin, allPins);
        let pathIsBlocked = false;
        for (let i = 0; i < path.length - 1; i++) {
            if (duel.xadrezGameState.lines.some(l => (l.from === path[i].id && l.to === path[i+1].id) || (l.from === path[i+1].id && l.to === path[i].id))) {
                pathIsBlocked = true;
                break;
            }
        }
        if (pathIsBlocked) throw new Error("Path is blocked");

        const newLines = [];
        for (let i = 0; i < path.length - 1; i++) {
            newLines.push({ from: path[i].id, to: path[i+1].id, player: user.name });
        }
        
        const allLinesAfterMove = [...duel.xadrezGameState.lines, ...newLines];
        const allNewTriangles = new Map<string, Omit<ClaimedTriangle, 'owner'> & { owner: string }>();
        const existingTriangleIds = new Set(duel.xadrezGameState.claimedTriangles.map(t => t.id));

        for (const lineSegment of newLines) {
            const triangles = checkNewTriangles(lineSegment, allLinesAfterMove, allPins);
            for (const tri of triangles) {
                if (!existingTriangleIds.has(tri.id)) {
                    allNewTriangles.set(tri.id, tri);
                }
            }
        }
        
        const updatedTriangles = [...duel.xadrezGameState.claimedTriangles, ...Array.from(allNewTriangles.values())];
        const player1Name = duel.players[0].name;
        const player2Name = duel.players[1].name;
        
        const piecesPlacedByP1 = updatedTriangles.filter(t => t.owner === player1Name).length;
        const piecesPlacedByP2 = updatedTriangles.filter(t => t.owner === player2Name).length;

        let newWinner = null;
        let newStatus: DuelState['status'] = 'playing';
        if (piecesPlacedByP1 >= XADREZ_PIECES_TO_WIN) {
            newWinner = player1Name;
            newStatus = 'finished';
            setTimeout(() => { if (user.name === newWinner) earnBadge('duelist'); }, 0);
        } else if (piecesPlacedByP2 >= XADREZ_PIECES_TO_WIN) {
            newWinner = player2Name;
            newStatus = 'finished';
            setTimeout(() => { if (user.name === newWinner) earnBadge('duelist'); }, 0);
        }

        const opponentName = duel.players.find(p => p.name !== user.name)?.name || '';
        const updatedGameState = {
            lines: allLinesAfterMove,
            claimedTriangles: updatedTriangles,
            currentPlayer: opponentName,
        };

        transaction.update(duelRef, {
            xadrezGameState: updatedGameState,
            winner: newWinner,
            status: newStatus,
        });
    });
  }, [user, earnBadge]);

  const value = {
    invitations, activeDuel, duelStates,
    sendDuelInvitation, answerDuelInvitation, cancelDuelInvitation,
    updateDuelProgress, finishDuel, clearActiveDuel, handleDuelError,
    setDuelPassword, submitDuelGuess, forfeitDuel,
    setDuelGarrafasOrder, submitDuelGarrafasGuess,
    submitXadrezTurn
  };

  return <DuelContext.Provider value={value}>{children}</DuelContext.Provider>;
};