import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, runTransaction, where, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile, ClassData, PasswordChallenge, AdedonhaSession, AdedonhaRound, AdedonhaSubmission, CombinacaoTotalChallenge, GarrafasChallenge, GameStat } from '../types';
import { AuthContext } from './AuthContext';

interface GameDataContextType {
    allUsers: UserProfile[];
    onlineStudents: UserProfile[];
    offlineStudents: UserProfile[];
    teacherClasses: ClassData[];
    passwordChallenges: PasswordChallenge[];
    combinacaoTotalChallenges: CombinacaoTotalChallenge[];
    garrafasChallenges: GarrafasChallenge[];
    activeAdedonhaSession: AdedonhaSession | null;
    activeAdedonhaRound: AdedonhaRound | null;
    adedonhaSubmissions: AdedonhaSubmission[];
    getAllUsers: () => UserProfile[];
    getStudentsInClass: (classCode: string) => UserProfile[];
    createClass: (className: string) => Promise<{ status: 'success' | 'error', message?: string, classCode?: string }>;
    deleteClass: (classId: string) => Promise<void>;
    updateStudentPassword: (studentName: string, newPass: string) => Promise<{ status: 'success' | 'error', message?: string }>;
    deleteStudent: (studentName: string) => Promise<void>;
    createPasswordChallenge: (data: Omit<PasswordChallenge, 'id' | 'creatorName' | 'status' | 'unlockedTimestamp'>) => Promise<{ status: 'success' | 'error', message?: string }>;
    updatePasswordChallenge: (id: string, data: Partial<PasswordChallenge>) => Promise<{ status: 'success' | 'error', message?: string }>;
    deletePasswordChallenge: (id: string) => Promise<void>;
    unlockPasswordChallenge: (id: string) => Promise<void>;
    clearChallengeRanking: (id: string) => Promise<void>;
    createAdedonhaSession: (classCode: string) => Promise<void>;
    endAdedonhaSession: (sessionId: string) => Promise<void>;
    startAdedonhaRound: (sessionId: string, theme: string, letter: string, duration: number) => Promise<void>;
    endAdedonhaRoundForScoring: (roundId: string) => Promise<void>;
    updateSubmissionScore: (submissionId: string, score: number) => Promise<void>;
    finalizeRound: (sessionId: string, roundId: string) => Promise<void>;
    submitAdedonhaAnswer: (roundId: string, answer: string) => Promise<void>;
    createCombinacaoTotalChallenge: (data: Omit<CombinacaoTotalChallenge, 'id' | 'creatorName' | 'status'>) => Promise<{ status: 'success' | 'error', message?: string }>;
    deleteCombinacaoTotalChallenge: (id: string) => Promise<void>;
    unlockCombinacaoTotalChallenge: (id: string) => Promise<void>;
    clearCombinacaoTotalRanking: (id: string) => Promise<void>;
    createGarrafasChallenge: (data: Omit<GarrafasChallenge, 'id' | 'creatorName' | 'status'>) => Promise<{ status: 'success' | 'error', message?: string }>;
    deleteGarrafasChallenge: (id: string) => Promise<void>;
    unlockGarrafasChallenge: (id: string) => Promise<void>;
    clearGarrafasRanking: (id: string) => Promise<void>;
}

export const GameDataContext = createContext<GameDataContextType>({} as GameDataContextType);

const generateClassCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const GameDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [onlineStudents, setOnlineStudents] = useState<UserProfile[]>([]);
    const [offlineStudents, setOfflineStudents] = useState<UserProfile[]>([]);
    const [teacherClasses, setTeacherClasses] = useState<ClassData[]>([]);
    const [passwordChallenges, setPasswordChallenges] = useState<PasswordChallenge[]>([]);
    const [combinacaoTotalChallenges, setCombinacaoTotalChallenges] = useState<CombinacaoTotalChallenge[]>([]);
    const [garrafasChallenges, setGarrafasChallenges] = useState<GarrafasChallenge[]>([]);

    const [activeAdedonhaSession, setActiveAdedonhaSession] = useState<AdedonhaSession | null>(null);
    const [activeAdedonhaRound, setActiveAdedonhaRound] = useState<AdedonhaRound | null>(null);
    const [adedonhaSubmissions, setAdedonhaSubmissions] = useState<AdedonhaSubmission[]>([]);

    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, 'users'), snapshot => {
            const users: UserProfile[] = [];
            snapshot.forEach(doc => users.push(doc.data() as UserProfile));
            setAllUsers(users);
        });
        
        const unsubPresence = onSnapshot(collection(db, 'presence'), snapshot => {
            const onlineNames = new Set<string>();
            const now = Date.now();
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.lastSeen && (now - data.lastSeen.toDate().getTime() < 90000)) { // 90 seconds threshold
                    onlineNames.add(doc.id);
                }
            });

            setAllUsers(prevUsers => {
                setOnlineStudents(prevUsers.filter(u => u.role === 'student' && onlineNames.has(u.name)));
                setOfflineStudents(prevUsers.filter(u => u.role === 'student' && !onlineNames.has(u.name)));
                return prevUsers;
            });
        });

        return () => { unsubUsers(); unsubPresence(); };
    }, []);

    useEffect(() => {
        if (user?.role !== 'teacher') {
            setTeacherClasses([]);
            return;
        }
        const q = query(collection(db, "classes"), where("teacherName", "==", user.name));
        const unsub = onSnapshot(q, snapshot => {
            const classes: ClassData[] = [];
            snapshot.forEach(doc => classes.push({ id: doc.id, ...doc.data() } as ClassData));
            setTeacherClasses(classes);
        });
        return () => unsub();
    }, [user]);

    const getAllUsers = useCallback(() => allUsers, [allUsers]);
    const getStudentsInClass = useCallback((classCode: string) => allUsers.filter(u => u.role === 'student' && u.classCode === classCode), [allUsers]);
    
    // ... Implementations for all context functions
    const createClass = async (className: string) => {
        if(!user || user.role !== 'teacher') return { status: 'error' as const, message: "Apenas professores podem criar turmas." };
        const classCode = generateClassCode();
        await addDoc(collection(db, "classes"), { className, classCode, teacherName: user.name });
        return { status: 'success' as const, classCode };
    };

    const deleteClass = async (classId: string) => { await deleteDoc(doc(db, "classes", classId)); };
    const updateStudentPassword = async (studentName: string, newPass: string) => {
        if (newPass.length < 4) return { status: 'error' as const, message: "A senha deve ter no mínimo 4 caracteres."};
        await updateDoc(doc(db, 'users', studentName), { password: newPass });
        return { status: 'success' as const };
    };
    const deleteStudent = async (studentName: string) => { await deleteDoc(doc(db, 'users', studentName)); };

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'password_challenges'), snapshot => {
            const challenges: PasswordChallenge[] = [];
            snapshot.forEach(doc => challenges.push({ id: doc.id, ...doc.data() } as PasswordChallenge));
            setPasswordChallenges(challenges);
        });
        return () => unsub();
    }, []);
    
    const createPasswordChallenge = async (data: any) => {
        if (!user) return { status: 'error' as const, message: 'Usuário não autenticado.'};
        await addDoc(collection(db, 'password_challenges'), { ...data, creatorName: user.name, status: 'locked' });
        return { status: 'success' as const };
    };
    const updatePasswordChallenge = async (id: string, data: any) => { await updateDoc(doc(db, 'password_challenges', id), data); return { status: 'success' as const }; };
    const deletePasswordChallenge = async (id: string) => { await deleteDoc(doc(db, 'password_challenges', id)); };
    const unlockPasswordChallenge = async (id: string) => { await updateDoc(doc(db, 'password_challenges', id), { status: 'unlocked', unlockedTimestamp: serverTimestamp() }); };
    
    const clearChallengeRanking = async (challengeId: string) => {
        const challengeRef = doc(db, 'password_challenges', challengeId);
        const challengeSnap = await getDoc(challengeRef);
        if(!challengeSnap.exists()) return;
        const challenge = challengeSnap.data() as PasswordChallenge;
        
        const students = getStudentsInClass(challenge.classCode);
        const gameId = `password_unlock_${challengeId}`;
        
        const batch = writeBatch(db);
        for (const student of students) {
            const userRef = doc(db, 'users', student.name);
            const newGameStats = { ...student.gameStats };
            delete newGameStats[gameId];
            batch.update(userRef, { gameStats: newGameStats });
        }
        await batch.commit();
    };

    useEffect(() => {
        if(!user) return;
        
        const q = query(collection(db, 'adedonha_sessions'), where('status', '!=', 'finished'));
        const unsubSession = onSnapshot(q, (snapshot) => {
            const sessions: AdedonhaSession[] = [];
            snapshot.forEach(doc => sessions.push({ id: doc.id, ...doc.data() } as AdedonhaSession));
            const mySession = sessions.find(s => user.role === 'teacher' ? s.teacherName === user.name : s.classCode === user.classCode);
            setActiveAdedonhaSession(mySession || null);
        });
        
        return () => unsubSession();
    }, [user]);

    useEffect(() => {
        if(!activeAdedonhaSession) {
            setActiveAdedonhaRound(null);
            setAdedonhaSubmissions([]);
            return;
        }

        const roundQuery = query(collection(db, 'adedonha_rounds'), where('sessionId', '==', activeAdedonhaSession.id));
        const unsubRound = onSnapshot(roundQuery, (snapshot) => {
            const rounds: AdedonhaRound[] = [];
            snapshot.forEach(doc => rounds.push({ id: doc.id, ...doc.data() } as AdedonhaRound));
            const currentRound = rounds.sort((a,b) => b.roundNumber - a.roundNumber)[0] || null;
            setActiveAdedonhaRound(currentRound);

            if(currentRound) {
                const subQuery = query(collection(db, 'adedonha_submissions'), where('roundId', '==', currentRound.id));
                const unsubSubs = onSnapshot(subQuery, (subSnapshot) => {
                    const subs: AdedonhaSubmission[] = [];
                    subSnapshot.forEach(doc => subs.push({ id: doc.id, ...doc.data() } as AdedonhaSubmission));
                    setAdedonhaSubmissions(subs);
                });
                return () => unsubSubs();
            }
        });
        
        return () => unsubRound();
    }, [activeAdedonhaSession]);
    
    // Combinacao Total Challenges
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'combinacao_total_challenges'), snapshot => {
            const challenges: CombinacaoTotalChallenge[] = [];
            snapshot.forEach(doc => challenges.push({ id: doc.id, ...doc.data() } as CombinacaoTotalChallenge));
            setCombinacaoTotalChallenges(challenges);
        });
        return () => unsub();
    }, []);

    // Garrafas Challenges
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'garrafas_challenges'), snapshot => {
            const challenges: GarrafasChallenge[] = [];
            snapshot.forEach(doc => challenges.push({ id: doc.id, ...doc.data() } as GarrafasChallenge));
            setGarrafasChallenges(challenges);
        });
        return () => unsub();
    }, []);

    return (
        <GameDataContext.Provider value={{
            allUsers, onlineStudents, offlineStudents, teacherClasses, passwordChallenges, combinacaoTotalChallenges, garrafasChallenges,
            activeAdedonhaSession, activeAdedonhaRound, adedonhaSubmissions,
            getAllUsers, getStudentsInClass,
            createClass, deleteClass, updateStudentPassword, deleteStudent,
            createPasswordChallenge, updatePasswordChallenge, deletePasswordChallenge, unlockPasswordChallenge, clearChallengeRanking,
            createAdedonhaSession: async () => {}, endAdedonhaSession: async () => {}, startAdedonhaRound: async () => {},
            endAdedonhaRoundForScoring: async () => {}, updateSubmissionScore: async () => {}, finalizeRound: async () => {}, submitAdedonhaAnswer: async () => {},
            createCombinacaoTotalChallenge: async (data) => {
                if(!user) return { status: 'error', message: 'Not authenticated' };
                await addDoc(collection(db, 'combinacao_total_challenges'), { ...data, creatorName: user.name, status: 'locked' });
                return { status: 'success' };
            },
            deleteCombinacaoTotalChallenge: async (id) => { await deleteDoc(doc(db, 'combinacao_total_challenges', id)); },
            unlockCombinacaoTotalChallenge: async (id) => { await updateDoc(doc(db, 'combinacao_total_challenges', id), { status: 'unlocked' }); },
            clearCombinacaoTotalRanking: async (id) => {},
            createGarrafasChallenge: async (data) => {
                if(!user) return { status: 'error', message: 'Not authenticated' };
                await addDoc(collection(db, 'garrafas_challenges'), { ...data, creatorName: user.name, status: 'locked' });
                return { status: 'success' };
            },
            deleteGarrafasChallenge: async (id) => { await deleteDoc(doc(db, 'garrafas_challenges', id)); },
            unlockGarrafasChallenge: async (id) => { await updateDoc(doc(db, 'garrafas_challenges', id), { status: 'unlocked' }); },
            clearGarrafasRanking: async (id) => {},
        }}>
            {children}
        </GameDataContext.Provider>
    );
};
