import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { db } from '../firebase';
import type { UserProfile, Badge, NotificationItem, GameStat, CombinacaoTotalStat, CombinacaoTotalChallenge, GarrafasStat, GarrafasChallenge } from '../types';
import { ALL_BADGES_MAP } from '../data/achievements';
import { AuthContext } from './AuthContext';
// FIX: Corrected Firebase Firestore imports for v8 namespaced API.
// FIX: Use compat import for Firebase v8 syntax.
import firebase from 'firebase/compat/app';
// FIX: Added missing firestore import for side-effects, enabling full v8 API compatibility for types and FieldValue.
import 'firebase/compat/firestore';


// --- Leveling Logic ---
const BASE_XP = 100;
const GROWTH_FACTOR = 1.5;
export const getXpForNextLevel = (level: number): number => {
    if (level < 1) return BASE_XP;
    return Math.floor(BASE_XP * Math.pow(level, GROWTH_FACTOR));
};

export const getLevelColor = (level: number): string => {
    if (level < 5) return 'from-slate-500 to-sky-600';
    if (level < 10) return 'from-sky-500 to-cyan-500';
    if (level < 15) return 'from-cyan-500 to-blue-500';
    return 'from-blue-500 to-indigo-500';
};

interface ProfileContextType {
  addXp: (amount: number) => Promise<void>;
  earnBadge: (badgeId: string) => Promise<void>;
  finalizeStandardGame: (gameId: string, sessionStats: { firstTry: number; other: number; errors: number; xp: number; medalId?: string; }) => Promise<void>;
  finalizePasswordChallenge: (challengeId: string, errorCount: number, wasFirstTry: boolean) => Promise<void>;
  finalizeCombinacaoTotalChallenge: (challengeId: string, foundCombinations: string[]) => Promise<void>;
  finalizeGarrafasChallenge: (challengeId: string, attempts: number) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  notifications: NotificationItem[];
  dismissCurrentNotification: () => void;
}

export const ProfileContext = createContext<ProfileContextType>({
  addXp: async () => {},
  earnBadge: async () => {},
  finalizeStandardGame: async () => {},
  finalizePasswordChallenge: async () => {},
  finalizeCombinacaoTotalChallenge: async () => {},
  finalizeGarrafasChallenge: async () => {},
  updateUserProfile: async () => {},
  notifications: [],
  dismissCurrentNotification: () => {},
});

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((notification: NotificationItem) => {
    setNotifications(current => [...current, notification]);
  }, []);

  const dismissCurrentNotification = useCallback(() => {
    setNotifications(current => current.slice(1));
  }, []);

  const checkAndAwardLevelBadges = useCallback((newLevel: number, currentBadges: string[]) => {
      const awardedBadges: string[] = [];
      if (newLevel >= 5 && !currentBadges.includes('level_5')) awardedBadges.push('level_5');
      if (newLevel >= 10 && !currentBadges.includes('level_10')) awardedBadges.push('level_10');
      return awardedBadges;
  }, []);
  
  const addXp = useCallback(async (amount: number) => {
    if (!user) return;
    // FIX: Switched to v8 syntax for doc()
    const userRef = db.doc(`users/${user.name}`);

    const newXp = user.xp + amount;
    let newLevel = user.level;
    let newBadges = [...(user.badges || [])];
    let xpForNext = getXpForNextLevel(newLevel);
    
    let leveledUp = false;
    let levelBadges: string[] = [];

    while (newXp >= xpForNext) {
      newLevel++;
      leveledUp = true;
      const awarded = checkAndAwardLevelBadges(newLevel, newBadges);
      levelBadges.push(...awarded);
      newBadges.push(...awarded);
      xpForNext = getXpForNextLevel(newLevel);
    }
    
    if (leveledUp) {
      addNotification({ type: 'level', payload: { from: user.level, to: newLevel } });
      levelBadges.forEach(badgeId => {
          const badgeInfo = ALL_BADGES_MAP.get(badgeId);
          if (badgeInfo) addNotification({ type: 'badge', payload: badgeInfo });
      });
    }
    
    // FIX: Switched to v8 syntax for updateDoc()
    await userRef.update({ xp: newXp, level: newLevel, badges: newBadges });

  }, [addNotification, checkAndAwardLevelBadges, user]);

  const earnBadge = useCallback(async (badgeId: string) => {
    if (!user || (user.badges || []).includes(badgeId)) return;
    
    const badgeInfo = ALL_BADGES_MAP.get(badgeId);
    if (!badgeInfo) return;
    
    let updatedBadges = [...(user.badges || [])];
    const badgePrefix = badgeId.substring(0, badgeId.lastIndexOf('_'));
    
    if(badgeId === 'duelist') {
        if(!updatedBadges.includes(badgeId)) updatedBadges.push(badgeId);
    } else if (badgeInfo.tier === 'gold') {
        updatedBadges = updatedBadges.filter(b => b !== `${badgePrefix}_silver` && b !== `${badgePrefix}_bronze`);
    } else if (badgeInfo.tier === 'silver') {
        updatedBadges = updatedBadges.filter(b => b !== `${badgePrefix}_bronze`);
    }
    
    if(!user.badges.includes(badgeId)) updatedBadges.push(badgeId);

    // FIX: Switched to v8 syntax for doc() and updateDoc()
    const userRef = db.doc(`users/${user.name}`);
    await userRef.update({ badges: updatedBadges });
    
    addNotification({ type: 'badge', payload: badgeInfo });

  }, [addNotification, user]);

  const finalizeStandardGame = useCallback(async (
    gameId: string,
    sessionStats: { firstTry: number; other: number; errors: number; xp: number; medalId?: string; }
  ) => {
    if (!user) return;
    const userRef = db.doc(`users/${user.name}`);

    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(userRef);
            if (!doc.exists) return;
            const profile = doc.data() as UserProfile;

            // 1. Update GameStats
            const gameStats = { ...profile.gameStats };
            const currentStats: GameStat = gameStats[gameId] || { successFirstTry: 0, successOther: 0, errors: 0 };
            currentStats.successFirstTry += sessionStats.firstTry;
            currentStats.successOther += sessionStats.other;
            currentStats.errors += sessionStats.errors;
            gameStats[gameId] = currentStats;

            // 2. Update XP and Level
            const newXp = profile.xp + sessionStats.xp;
            let newLevel = profile.level;
            let leveledUp = false;
            let levelBadges: string[] = [];
            let xpForNext = getXpForNextLevel(newLevel);
            const initialLevel = profile.level;

            while (newXp >= xpForNext) {
                newLevel++;
                leveledUp = true;
                const awarded = checkAndAwardLevelBadges(newLevel, profile.badges || []);
                levelBadges.push(...awarded);
                xpForNext = getXpForNextLevel(newLevel);
            }

            // 3. Update Badges
            let newBadges = [...(profile.badges || [])];
            if (sessionStats.medalId && !newBadges.includes(sessionStats.medalId)) {
                const badgeInfo = ALL_BADGES_MAP.get(sessionStats.medalId);
                if (badgeInfo) {
                    const prefix = sessionStats.medalId.substring(0, sessionStats.medalId.lastIndexOf('_'));
                    if (badgeInfo.tier === 'gold') newBadges = newBadges.filter(b => !b.startsWith(prefix) || b === `${prefix}_hard` || b === `${prefix}_medium` || b === `${prefix}_easy`);
                    else if (badgeInfo.tier === 'silver') newBadges = newBadges.filter(b => b !== `${prefix}_bronze`);
                    newBadges.push(sessionStats.medalId);
                }
            }
            newBadges.push(...levelBadges);
            newBadges = [...new Set(newBadges)];

            // 4. Perform transaction update
            transaction.update(userRef, {
                gameStats,
                xp: newXp,
                level: newLevel,
                badges: newBadges
            });

            // 5. Trigger notifications after transaction is committed
            setTimeout(() => {
                if (leveledUp) addNotification({ type: 'level', payload: { from: initialLevel, to: newLevel } });
                
                if (sessionStats.medalId && !profile.badges.includes(sessionStats.medalId)) {
                    const badgeInfo = ALL_BADGES_MAP.get(sessionStats.medalId);
                    if(badgeInfo) addNotification({ type: 'badge', payload: badgeInfo });
                }
                
                levelBadges.forEach(bId => {
                    if (!profile.badges.includes(bId)) {
                        const bInfo = ALL_BADGES_MAP.get(bId);
                        if(bInfo) addNotification({ type: 'badge', payload: bInfo });
                    }
                });
            }, 0);
        });
    } catch (e) {
        console.error("Game finalization transaction failed: ", e);
    }
  }, [user, addNotification, checkAndAwardLevelBadges]);

  const finalizePasswordChallenge = useCallback(async (challengeId: string, errorCount: number, wasFirstTry: boolean) => {
    if (!user) return;
    const userRef = db.doc(`users/${user.name}`);
    const gameId = `password_unlock_${challengeId}`;
    const stats: GameStat = {
        successFirstTry: wasFirstTry ? 1 : 0,
        successOther: wasFirstTry ? 0 : 1,
        errors: errorCount,
        completionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await userRef.update({ [`gameStats.${gameId}`]: stats });
  }, [user]);

  const finalizeCombinacaoTotalChallenge = useCallback(async (challengeId: string, foundCombinations: string[]) => {
    if (!user) return;
    const userRef = db.doc(`users/${user.name}`);
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User document does not exist!");
            }

            const profile = userDoc.data() as UserProfile;
            const existingStats = profile.combinacaoTotalStats || [];
            const statIndex = existingStats.findIndex(s => s.challengeId === challengeId);
            
            const finalStat: CombinacaoTotalStat = {
                challengeId,
                foundCombinations,
                isComplete: true,
                completionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            };

            if (statIndex > -1) {
                // Do not update if already complete to preserve original completion time
                if (existingStats[statIndex].isComplete) return;
                existingStats[statIndex] = finalStat;
            } else {
                existingStats.push(finalStat);
            }
            transaction.update(userRef, { combinacaoTotalStats: existingStats });
        });
    } catch (e) {
        console.error("Error finalizing combination challenge:", e);
    }
  }, [user]);

  const finalizeGarrafasChallenge = useCallback(async (challengeId: string, attempts: number) => {
    if (!user) return;
    const userRef = db.doc(`users/${user.name}`);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User document does not exist!");
            }

            const profile = userDoc.data() as UserProfile;
            const existingStats = profile.garrafasStats || [];
            const statIndex = existingStats.findIndex(s => s.challengeId === challengeId);
            
            const finalStat: GarrafasStat = {
                challengeId,
                attempts,
                isComplete: true,
                completionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            };

            if (statIndex > -1) {
                // Do not update if already complete
                if (existingStats[statIndex].isComplete) return;
                existingStats[statIndex] = finalStat;
            } else {
                existingStats.push(finalStat);
            }
            transaction.update(userRef, { garrafasStats: existingStats });
        });
    } catch (e) {
        console.error("Error finalizing garrafas challenge:", e);
    }
  }, [user]);

  const updateUserProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) return;
    // FIX: Switched to v8 syntax for doc() and updateDoc()
    const userRef = db.doc(`users/${user.name}`);
    await userRef.update(data);
  }, [user]);

  return (
    <ProfileContext.Provider value={{
      addXp,
      earnBadge,
      finalizeStandardGame,
      finalizePasswordChallenge,
      finalizeCombinacaoTotalChallenge,
      finalizeGarrafasChallenge,
      updateUserProfile,
      notifications,
      dismissCurrentNotification,
    }}>
      {children}
    </ProfileContext.Provider>
  );
};