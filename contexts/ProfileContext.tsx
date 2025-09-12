import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { db } from '../firebase';
import type { UserProfile, Badge, NotificationItem, GameStat, CombinacaoTotalStat, CombinacaoTotalChallenge, GarrafasStat, GarrafasChallenge } from '../types';
import { ALL_BADGES_MAP } from '../data/achievements';
import { AuthContext } from './AuthContext';
// FIX: Corrected Firebase Firestore imports for v8 namespaced API.
import firebase from 'firebase/app';


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
  logAttempt: (gameId: string, success: boolean, firstTry: boolean) => Promise<void>;
  logCombinacaoTotalAttempt: (challengeId: string, combination: string) => Promise<void>;
  logGarrafasAttempt: (challengeId: string, attempts: number, isCorrect: boolean) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  notifications: NotificationItem[];
  dismissCurrentNotification: () => void;
}

export const ProfileContext = createContext<ProfileContextType>({
  addXp: async () => {},
  earnBadge: async () => {},
  logAttempt: async () => {},
  logCombinacaoTotalAttempt: async () => {},
  logGarrafasAttempt: async () => {},
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

  const logAttempt = useCallback(async (gameId: string, success: boolean, firstTry: boolean) => {
      if (!user) return;
      // FIX: Switched to v8 syntax for doc()
      const userRef = db.doc(`users/${user.name}`);
      
      const gameStats = user.gameStats || {};
      const currentStats: GameStat = gameStats[gameId] || { successFirstTry: 0, successOther: 0, errors: 0 };

      if (success) {
          if (firstTry) currentStats.successFirstTry++;
          else currentStats.successOther++;

          if (gameId.startsWith('password_unlock_') && currentStats.successFirstTry + currentStats.successOther === 1) {
              // FIX: Switched to v8 syntax for serverTimestamp()
              currentStats.completionTimestamp = firebase.firestore.FieldValue.serverTimestamp();
          }

      } else {
          currentStats.errors++;
      }
      
      // FIX: Switched to v8 syntax for updateDoc()
      await userRef.update({
        [`gameStats.${gameId}`]: currentStats
      });
  }, [user]);

  const logCombinacaoTotalAttempt = useCallback(async (challengeId: string, combination: string) => {
    if (!user) return;
    // FIX: Switched to v8 syntax for doc()
    const userRef = db.doc(`users/${user.name}`);
    const challengeDocRef = db.doc(`combinacao_total_challenges/${challengeId}`);
    
    try {
        // FIX: Switched to v8 syntax for getDoc()
        const challengeDoc = await challengeDocRef.get();
        if (!challengeDoc.exists) return;
        const challenge = challengeDoc.data() as CombinacaoTotalChallenge;
        if (!challenge) return;

        // FIX: Switched to v8 syntax for runTransaction()
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return;

            const profile = userDoc.data() as UserProfile;
            const existingStats = profile.combinacaoTotalStats || [];
            const statIndex = existingStats.findIndex(s => s.challengeId === challengeId);
            let newStats: CombinacaoTotalStat[];

            if (statIndex > -1) {
                const oldStat = existingStats[statIndex];
                if (oldStat.foundCombinations.includes(combination)) return;
                const updatedStat = { ...oldStat, foundCombinations: [...oldStat.foundCombinations, combination].sort() };
                if (updatedStat.foundCombinations.length >= challenge.totalCombinations) {
                    updatedStat.isComplete = true;
                    if (!updatedStat.completionTimestamp) updatedStat.completionTimestamp = new Date();
                }
                newStats = [...existingStats];
                newStats[statIndex] = updatedStat;
            } else {
                const newStat: CombinacaoTotalStat = { challengeId, foundCombinations: [combination], isComplete: false };
                if (newStat.foundCombinations.length >= challenge.totalCombinations) {
                    newStat.isComplete = true;
                    newStat.completionTimestamp = new Date();
                }
                newStats = [...existingStats, newStat];
            }
            transaction.update(userRef, { combinacaoTotalStats: newStats });
        });
    } catch (e) {
        console.error("Error logging combination total attempt:", e);
    }
  }, [user]);

  const logGarrafasAttempt = useCallback(async (challengeId: string, attempts: number, isCorrect: boolean) => {
    if (!user) return;
    // FIX: Switched to v8 syntax for doc()
    const userRef = db.doc(`users/${user.name}`);

    try {
        // FIX: Switched to v8 syntax for runTransaction()
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return;

            const profile = userDoc.data() as UserProfile;
            const existingStats = profile.garrafasStats || [];
            const statIndex = existingStats.findIndex(s => s.challengeId === challengeId);
            let newStats: GarrafasStat[];

            if (statIndex > -1) {
                const oldStat = existingStats[statIndex];
                if (oldStat.isComplete) return; // Already completed
                const updatedStat = { ...oldStat, attempts };
                 if (isCorrect) {
                    updatedStat.isComplete = true;
                    // FIX: Switched to v8 syntax for serverTimestamp()
                    updatedStat.completionTimestamp = firebase.firestore.FieldValue.serverTimestamp();
                }
                newStats = [...existingStats];
                newStats[statIndex] = updatedStat;
            } else {
                const newStat: GarrafasStat = { challengeId, attempts, isComplete: false };
                if (isCorrect) {
                    newStat.isComplete = true;
                    // FIX: Switched to v8 syntax for serverTimestamp()
                    newStat.completionTimestamp = firebase.firestore.FieldValue.serverTimestamp();
                }
                newStats = [...existingStats, newStat];
            }
            transaction.update(userRef, { garrafasStats: newStats });
        });
    } catch (e) {
        console.error("Error logging garrafas attempt:", e);
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
      logAttempt,
      logCombinacaoTotalAttempt,
      logGarrafasAttempt,
      updateUserProfile,
      notifications,
      dismissCurrentNotification,
    }}>
      {children}
    </ProfileContext.Provider>
  );
};
