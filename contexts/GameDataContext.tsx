import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import type { UserProfile, ClassData, PasswordChallenge, AdedonhaSession, AdedonhaRound, AdedonhaSubmission, CombinacaoTotalChallenge } from '../types';
import { AuthContext } from './AuthContext';

const GAME_ID_PASSWORD = 'password_unlock';
const GAME_ID_COMBINACAO = 'combinacao_total';

interface GameDataContextType {
  // Data
  allUsers: UserProfile[];
  classes: ClassData[];
  passwordChallenges: PasswordChallenge[];
  combinacaoTotalChallenges: CombinacaoTotalChallenge[];
  activeAdedonhaSession: AdedonhaSession | null;
  activeAdedonhaRound: AdedonhaRound | null;
  adedonhaSubmissions: AdedonhaSubmission[];
  onlineStudents: UserProfile[];
  offlineStudents: UserProfile[];
  
  // Getters
  getClassesForTeacher: (teacherName: string) => ClassData[];
  getStudentsInClass: (classCode: string) => UserProfile[];
  getAllUsers: () => UserProfile[];

  // Teacher Actions
  createClass: (className: string) => Promise<{ status: 'success' | 'error' | 'duplicate_name'; classCode?: string; message?: string }>;
  deleteClass: (classCode: string) => Promise<void>;
  deleteStudent: (studentName: string) => Promise<void>;
  createPasswordChallenge: (challengeData: Omit<PasswordChallenge, 'id' | 'creatorName' | 'status' | 'unlockedTimestamp'>) => Promise<{ status: 'success' | 'error', message?: string }>;
  updatePasswordChallenge: (challengeId: string, challengeData: Partial<Omit<PasswordChallenge, 'id' | 'creatorName'>>) => Promise<{ status: 'success' | 'error', message?: string }>;
  deletePasswordChallenge: (challengeId: string) => Promise<void>;
  unlockPasswordChallenge: (challengeId: string) => Promise<void>;
  lockPasswordChallenge: (challengeId: string) => Promise<void>;
  clearChallengeRanking: (challengeId: string) => Promise<void>;
  createCombinacaoTotalChallenge: (challengeData: Omit<CombinacaoTotalChallenge, 'id' | 'creatorName' | 'createdAt' | 'status' | 'unlockedTimestamp'>) => Promise<{ status: 'success' | 'error', message?: string }>;
  deleteCombinacaoTotalChallenge: (challengeId: string) => Promise<void>;
  unlockCombinacaoTotalChallenge: (challengeId: string) => Promise<void>;
  lockCombinacaoTotalChallenge: (challengeId: string) => Promise<void>;
  clearCombinacaoTotalRanking: (challengeId: string) => Promise<void>;
  createAdedonhaSession: (classCode: string) => Promise<string | null>;
  startAdedonhaRound: (sessionId: string, theme: string, letter: string, duration: number) => Promise<void>;
  endAdedonhaRoundForScoring: (roundId: string) => Promise<void>;
  updateSubmissionScore: (submissionId: string, newScore: number) => Promise<void>;
  finalizeRound: (sessionId: string, roundId: string) => Promise<void>;
  endAdedonhaSession: (sessionId: string) => Promise<void>;

  // Student Actions
  submitAdedonhaAnswer: (roundId: string, answer: string) => Promise<void>;
}

export const GameDataContext = createContext<GameDataContextType>({} as GameDataContextType);

export const GameDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext);

  // Raw Data State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [passwordChallenges, setPasswordChallenges] = useState<PasswordChallenge[]>([]);
  const [combinacaoTotalChallenges, setCombinacaoTotalChallenges] = useState<CombinacaoTotalChallenge[]>([]);
  const [presenceData, setPresenceData] = useState<Map<string, { lastSeen: any }>>(new Map());


  // Adedonha State
  const [activeAdedonhaSession, setActiveAdedonhaSession] = useState<AdedonhaSession | null>(null);
  const [activeAdedonhaRound, setActiveAdedonhaRound] = useState<AdedonhaRound | null>(null);
  const [adedonhaSubmissions, setAdedonhaSubmissions] = useState<AdedonhaSubmission[]>([]);

  useEffect(() => {
    const unsubscribes = [
      db.collection('users').onSnapshot(snapshot => setAllUsers(snapshot.docs.map(d => d.data() as UserProfile))),
      db.collection('classes').onSnapshot(snapshot => setClasses(snapshot.docs.map(d => d.data() as ClassData))),
      db.collection('password_challenges').orderBy('title').onSnapshot(snapshot => setPasswordChallenges(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PasswordChallenge)))),
      db.collection('combinacao_total_challenges').orderBy('createdAt', 'desc').onSnapshot(snapshot => setCombinacaoTotalChallenges(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CombinacaoTotalChallenge)))),
      db.collection('presence').onSnapshot(snapshot => {
        const data = new Map<string, { lastSeen: any }>();
        snapshot.docs.forEach(doc => {
            data.set(doc.id, doc.data() as { lastSeen: any });
        });
        setPresenceData(data);
      }),
    ];
    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // Adedonha Listeners
  useEffect(() => {
    if (!user) { setActiveAdedonhaSession(null); return; }
    let query;
    if (user.role === 'teacher') query = db.collection('adedonhaSessions').where('teacherName', '==', user.name);
    else if (user.classCode) query = db.collection('adedonhaSessions').where('classCode', '==', user.classCode);
    else return;

    const sessionUnsub = query.onSnapshot(snapshot => {
        const activeSession = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdedonhaSession)).find(session => session.status === 'active');
        setActiveAdedonhaSession(activeSession || null);
    });
    return () => sessionUnsub();
  }, [user]);

  useEffect(() => {
    if (!activeAdedonhaSession) { setActiveAdedonhaRound(null); return; }
    const roundUnsub = db.collection('adedonhaRounds').where('sessionId', '==', activeAdedonhaSession.id).onSnapshot(snapshot => {
        if (!snapshot.empty) {
            const rounds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdedonhaRound));
            rounds.sort((a, b) => b.roundNumber - a.roundNumber);
            setActiveAdedonhaRound(rounds[0]);
        } else {
            setActiveAdedonhaRound(null);
        }
    });
    return () => roundUnsub();
  }, [activeAdedonhaSession]);
  
   useEffect(() => {
    if (!activeAdedonhaRound) { setAdedonhaSubmissions([]); return; }
    const submissionsUnsub = db.collection('adedonhaSubmissions').where('roundId', '==', activeAdedonhaRound.id).onSnapshot(snapshot => {
        setAdedonhaSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdedonhaSubmission)));
    });
    return () => submissionsUnsub();
  }, [activeAdedonhaRound]);

  // Derived/Memoized Data
  const getClassesForTeacher = useCallback((teacherName: string) => classes.filter(c => c.teacherName === teacherName), [classes]);
  const getStudentsInClass = useCallback((classCode: string) => allUsers.filter(p => p.role === 'student' && p.classCode === classCode), [allUsers]);
  const getAllUsers = useCallback(() => allUsers.filter(p => p.role === 'student'), [allUsers]);
  
  const onlineStudents = useMemo(() => {
    if (!user || user.role !== 'teacher' || !user.classes) return [];
    
    const myClassCodes = new Set(user.classes);
    const ninetySecondsAgo = Date.now() - 90 * 1000;

    return allUsers.filter(p => {
        if (p.role !== 'student' || !p.classCode || !myClassCodes.has(p.classCode)) {
            return false;
        }

        const presenceInfo = presenceData.get(p.name);
        if (!presenceInfo || !presenceInfo.lastSeen) {
            return false;
        }

        const lastSeenDate = presenceInfo.lastSeen.toDate ? presenceInfo.lastSeen.toDate() : new Date(presenceInfo.lastSeen.seconds * 1000);
        
        return lastSeenDate.getTime() > ninetySecondsAgo;
    });
  }, [presenceData, allUsers, user]);

  const offlineStudents = useMemo(() => {
    if (!user || user.role !== 'teacher' || !user.classes) return [];
    
    const myClassCodes = new Set(user.classes);
    const allMyStudents = allUsers.filter(p => 
        p.role === 'student' && p.classCode && myClassCodes.has(p.classCode)
    );

    const onlineStudentNames = new Set(onlineStudents.map(s => s.name));

    return allMyStudents
        .filter(s => !onlineStudentNames.has(s.name))
        .sort((a,b) => a.name.localeCompare(b.name));
  }, [allUsers, onlineStudents, user]);

  // --- Teacher Actions Implementation ---
  const createClass = useCallback(async (className: string): Promise<{ status: 'success' | 'error' | 'duplicate_name'; classCode?: string; message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Apenas professores podem criar turmas.' };
    
    if (classes.some(c => c.teacherName === user.name && c.className.toLowerCase() === className.toLowerCase())) {
        return { status: 'duplicate_name', message: 'Você já possui uma turma com este nome.' };
    }

    let newClassCode = '';
    let isUnique = false;
    while (!isUnique) {
        newClassCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const existingClass = await db.collection('classes').where('classCode', '==', newClassCode).get();
        if (existingClass.empty) {
            isUnique = true;
        }
    }

    const newClass: ClassData = {
        classCode: newClassCode,
        className,
        teacherName: user.name,
    };
    
    await db.collection('classes').doc(newClassCode).set(newClass);
    await db.collection('users').doc(user.name).update({
      classes: firebase.firestore.FieldValue.arrayUnion(newClassCode)
    });
    
    return { status: 'success', classCode: newClassCode };
  }, [user, classes]);

  const deleteClass = useCallback(async (classCode: string) => {
    if (!user || user.role !== 'teacher') return;
    const batch = db.batch();
    
    // 1. Unlink students
    const studentsInClass = getStudentsInClass(classCode);
    studentsInClass.forEach(student => {
        const studentRef = db.collection('users').doc(student.name);
        batch.update(studentRef, { classCode: firebase.firestore.FieldValue.delete() });
    });
    
    // 2. Remove class from teacher's list
    const teacherRef = db.collection('users').doc(user.name);
    batch.update(teacherRef, { classes: firebase.firestore.FieldValue.arrayRemove(classCode) });

    // 3. Delete class document
    const classRef = db.collection('classes').doc(classCode);
    batch.delete(classRef);

    await batch.commit();
  }, [user, getStudentsInClass]);
  
  const deleteStudent = useCallback(async (studentName: string) => {
    if (!user || user.role !== 'teacher') return;
    const batch = db.batch();
    const studentRef = db.collection('users').doc(studentName);
    const presenceRef = db.collection('presence').doc(studentName);

    batch.delete(studentRef);
    batch.delete(presenceRef);
    
    await batch.commit();
  }, [user]);

  const createPasswordChallenge = useCallback(async (challengeData: any): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Apenas professores podem criar desafios.' };
    const newChallenge = {
        ...challengeData,
        creatorName: user.name,
        status: 'locked',
    };
    await db.collection('password_challenges').add(newChallenge);
    return { status: 'success' };
  }, [user]);

  const updatePasswordChallenge = useCallback(async (id: string, data: any): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Ação não permitida.' };
    await db.collection('password_challenges').doc(id).update(data);
    return { status: 'success' };
  }, [user]);

  const deletePasswordChallenge = useCallback(async (id: string) => {
    await db.collection('password_challenges').doc(id).delete();
  }, []);

  const unlockPasswordChallenge = useCallback(async (id: string) => {
    await db.collection('password_challenges').doc(id).update({
        status: 'unlocked',
        unlockedTimestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }, []);
  
  const lockPasswordChallenge = useCallback(async (id: string) => {
    await db.collection('password_challenges').doc(id).update({
        status: 'locked'
    });
  }, []);

  const clearChallengeRanking = useCallback(async (id: string) => {
    const challenge = passwordChallenges.find(c => c.id === id);
    if (!challenge) return;
    const students = getStudentsInClass(challenge.classCode);
    const gameId = `${GAME_ID_PASSWORD}_${id}`;
    const batch = db.batch();
    students.forEach(student => {
        if (student.gameStats?.[gameId]) {
            const userRef = db.collection('users').doc(student.name);
            batch.update(userRef, { [`gameStats.${gameId}`]: firebase.firestore.FieldValue.delete() });
        }
    });
    await batch.commit();
  }, [passwordChallenges, getStudentsInClass]);

  const createCombinacaoTotalChallenge = useCallback(async (data: any): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Apenas professores podem criar desafios.' };
    const newChallenge = { ...data, creatorName: user.name, status: 'locked', createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    await db.collection('combinacao_total_challenges').add(newChallenge);
    return { status: 'success' };
  }, [user]);

  const deleteCombinacaoTotalChallenge = useCallback(async (id: string) => {
    await db.collection('combinacao_total_challenges').doc(id).delete();
  }, []);

  const unlockCombinacaoTotalChallenge = useCallback(async (id: string) => {
     await db.collection('combinacao_total_challenges').doc(id).update({
        status: 'unlocked',
        unlockedTimestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }, []);
  
  const lockCombinacaoTotalChallenge = useCallback(async (id: string) => {
    await db.collection('combinacao_total_challenges').doc(id).update({ status: 'locked' });
  }, []);
  
  const clearCombinacaoTotalRanking = useCallback(async (id: string) => {
    const challenge = combinacaoTotalChallenges.find(c => c.id === id);
    if (!challenge) return;
    const students = getStudentsInClass(challenge.classCode);
    const batch = db.batch();
    students.forEach(student => {
        const userRef = db.collection('users').doc(student.name);
        batch.update(userRef, { 
            combinacaoTotalStats: student.combinacaoTotalStats?.filter(s => s.challengeId !== id) || []
        });
    });
    await batch.commit();
  }, [combinacaoTotalChallenges, getStudentsInClass]);

  // --- Adedonha Actions Implementation ---
  const createAdedonhaSession = useCallback(async (classCode: string) => {
    if (!user || user.role !== 'teacher') return null;
    const students = getStudentsInClass(classCode);
    const initialScores = students.reduce((acc, student) => {
        acc[student.name] = 0;
        return acc;
    }, {} as { [key: string]: number });
    
    const newSession = {
        classCode,
        teacherName: user.name,
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        scores: initialScores,
    };
    const docRef = await db.collection('adedonhaSessions').add(newSession);
    return docRef.id;
  }, [user, getStudentsInClass]);

  const startAdedonhaRound = useCallback(async (sessionId: string, theme: string, letter: string, duration: number) => {
    if (!activeAdedonhaSession) return;
    const newRoundNumber = activeAdedonhaRound ? activeAdedonhaRound.roundNumber + 1 : 1;
    const newRound = {
        sessionId, roundNumber: newRoundNumber, theme, letter, duration,
        status: 'playing',
        startTime: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('adedonhaRounds').add(newRound);
  }, [activeAdedonhaSession, activeAdedonhaRound]);

  const endAdedonhaRoundForScoring = useCallback(async (roundId: string) => {
    await db.collection('adedonhaRounds').doc(roundId).update({ status: 'scoring' });
  }, []);

  const updateSubmissionScore = useCallback(async (subId: string, score: number) => {
    await db.collection('adedonhaSubmissions').doc(subId).update({ finalScore: score });
  }, []);

  const finalizeRound = useCallback(async (sessionId: string, roundId: string) => {
    const sessionRef = db.collection('adedonhaSessions').doc(sessionId);
    const roundRef = db.collection('adedonhaRounds').doc(roundId);

    try {
        await db.runTransaction(async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists) throw new Error("Sessão não encontrada!");
            const sessionData = sessionDoc.data() as AdedonhaSession;
            const newScores = { ...sessionData.scores };
            adedonhaSubmissions.forEach(sub => {
                newScores[sub.studentName] = (newScores[sub.studentName] || 0) + sub.finalScore;
            });
            transaction.update(sessionRef, { scores: newScores });
            transaction.update(roundRef, { status: 'finished' });
        });
    } catch (e) { console.error("Erro ao finalizar rodada:", e); }
  }, [adedonhaSubmissions]);

  const endAdedonhaSession = useCallback(async (sessionId: string) => {
    await db.collection('adedonhaSessions').doc(sessionId).update({ status: 'finished' });
  }, []);
  
  // Student Actions
  const submitAdedonhaAnswer = useCallback(async (roundId: string, answer: string) => {
    if (!user || user.role !== 'student') return;
    // Check if submission already exists
    const existingSubmission = adedonhaSubmissions.find(s => s.roundId === roundId && s.studentName === user.name);
    if (existingSubmission) {
        await db.collection('adedonhaSubmissions').doc(existingSubmission.id).update({ answer });
    } else {
        const newSubmission = {
            roundId, studentName: user.name, answer, rawScore: 0, finalScore: 0, sessionId: activeAdedonhaSession?.id
        };
        await db.collection('adedonhaSubmissions').add(newSubmission);
    }
  }, [user, adedonhaSubmissions, activeAdedonhaSession]);
  
  const value: GameDataContextType = {
    allUsers, classes, passwordChallenges, combinacaoTotalChallenges, activeAdedonhaSession, activeAdedonhaRound, adedonhaSubmissions, onlineStudents, offlineStudents,
    getClassesForTeacher, getStudentsInClass, getAllUsers,
    createClass, deleteClass, deleteStudent, createPasswordChallenge, updatePasswordChallenge, deletePasswordChallenge, unlockPasswordChallenge, lockPasswordChallenge, clearChallengeRanking,
    createCombinacaoTotalChallenge, deleteCombinacaoTotalChallenge, unlockCombinacaoTotalChallenge, lockCombinacaoTotalChallenge, clearCombinacaoTotalRanking,
    createAdedonhaSession, startAdedonhaRound, endAdedonhaRoundForScoring, updateSubmissionScore, finalizeRound, endAdedonhaSession,
    submitAdedonhaAnswer,
  };

  return <GameDataContext.Provider value={value}>{children}</GameDataContext.Provider>;
};