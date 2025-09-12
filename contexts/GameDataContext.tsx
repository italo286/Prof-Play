import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { db } from '../firebase';
// FIX: Corrected and consolidated Firebase Firestore imports for v8 namespaced API.
// FIX: Use compat import for Firebase v8 syntax.
import firebase from 'firebase/compat/app';
// FIX: Added missing firestore import for side-effects, enabling full v8 API compatibility for types and FieldValue.
import 'firebase/compat/firestore';
import type { UserProfile, ClassData, PasswordChallenge, AdedonhaSession, AdedonhaRound, AdedonhaSubmission, CombinacaoTotalChallenge, GarrafasChallenge } from '../types';
import { AuthContext } from './AuthContext';

const GAME_ID_PASSWORD = 'password_unlock';
const GAME_ID_COMBINACAO = 'combinacao_total';

interface GameDataContextType {
  // Data
  allUsers: UserProfile[];
  classes: ClassData[];
  passwordChallenges: PasswordChallenge[];
  combinacaoTotalChallenges: CombinacaoTotalChallenge[];
  garrafasChallenges: GarrafasChallenge[];
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
  updateStudentPassword: (studentName: string, newPassword: string) => Promise<{ status: 'success' | 'error', message?: string }>;
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
  createAdedonhaSession: (classCode: string, type: 'simples' | 'tapple') => Promise<string | null>;
  startAdedonhaRound: (sessionId: string, theme: string, letter: string, duration: number) => Promise<void>;
  endAdedonhaRoundForScoring: (roundId: string) => Promise<void>;
  updateSubmissionScore: (submissionId: string, newScore: number) => Promise<void>;
  finalizeRound: (sessionId: string, roundId: string, submissions: AdedonhaSubmission[]) => Promise<void>;
  endAdedonhaSession: (sessionId: string) => Promise<void>;
  createGarrafasChallenge: (challengeData: Omit<GarrafasChallenge, 'id' | 'creatorName' | 'createdAt' | 'status' | 'unlockedTimestamp'>) => Promise<{ status: 'success' | 'error', message?: string }>;
  deleteGarrafasChallenge: (challengeId: string) => Promise<void>;
  unlockGarrafasChallenge: (challengeId: string) => Promise<void>;
  clearGarrafasRanking: (challengeId: string) => Promise<void>;

  // Student Actions
  submitAdedonhaAnswer: (roundId: string, answer: string) => Promise<boolean>;
}

export const GameDataContext = createContext<GameDataContextType>({} as GameDataContextType);

export const GameDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext);

  // Raw Data State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [passwordChallenges, setPasswordChallenges] = useState<PasswordChallenge[]>([]);
  const [combinacaoTotalChallenges, setCombinacaoTotalChallenges] = useState<CombinacaoTotalChallenge[]>([]);
  const [garrafasChallenges, setGarrafasChallenges] = useState<GarrafasChallenge[]>([]);
  const [presenceData, setPresenceData] = useState<Map<string, { lastSeen: any }>>(new Map());


  // Adedonha State
  const [activeAdedonhaSession, setActiveAdedonhaSession] = useState<AdedonhaSession | null>(null);
  const [activeAdedonhaRound, setActiveAdedonhaRound] = useState<AdedonhaRound | null>(null);
  const [adedonhaSubmissions, setAdedonhaSubmissions] = useState<AdedonhaSubmission[]>([]);

  useEffect(() => {
    // FIX: Switched to v8 syntax
    const unsubscribes = [
      db.collection('users').onSnapshot(snapshot => {
          const data: UserProfile[] = [];
          snapshot.forEach(doc => data.push(doc.data() as UserProfile));
          setAllUsers(data);
      }),
      db.collection('classes').onSnapshot(snapshot => {
          const data: ClassData[] = [];
          snapshot.forEach(doc => data.push(doc.data() as ClassData));
          setClasses(data);
      }),
      db.collection('password_challenges').orderBy('title').onSnapshot(snapshot => {
          const data: PasswordChallenge[] = [];
          snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as PasswordChallenge));
          setPasswordChallenges(data);
      }),
      db.collection('combinacao_total_challenges').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
          const data: CombinacaoTotalChallenge[] = [];
          snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as CombinacaoTotalChallenge));
          setCombinacaoTotalChallenges(data);
      }),
       db.collection('garrafas_challenges').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
          const data: GarrafasChallenge[] = [];
          snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as GarrafasChallenge));
          setGarrafasChallenges(data);
      }),
      db.collection('presence').onSnapshot(snapshot => {
        const data = new Map<string, { lastSeen: any }>();
        snapshot.forEach(doc => {
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
    // FIX: Switched to v8 syntax
    let sessionQuery;
    if (user.role === 'teacher') sessionQuery = db.collection('adedonhaSessions').where('teacherName', '==', user.name);
    else if (user.classCode) sessionQuery = db.collection('adedonhaSessions').where('classCode', '==', user.classCode);
    else return;

    const sessionUnsub = sessionQuery.onSnapshot(snapshot => {
        const sessions: AdedonhaSession[] = [];
        snapshot.forEach(doc => sessions.push({ id: doc.id, ...doc.data() } as AdedonhaSession));
        const activeSession = sessions.find(session => session.status === 'active');
        setActiveAdedonhaSession(activeSession || null);
    });
    return () => sessionUnsub();
  }, [user]);

  useEffect(() => {
    if (!activeAdedonhaSession) { setActiveAdedonhaRound(null); return; }
    // FIX: Switched to v8 syntax
    const roundQuery = db.collection('adedonhaRounds').where('sessionId', '==', activeAdedonhaSession.id);
    const roundUnsub = roundQuery.onSnapshot(snapshot => {
        if (snapshot.size > 0) {
            const rounds: AdedonhaRound[] = [];
            snapshot.forEach(doc => rounds.push({ id: doc.id, ...doc.data() } as AdedonhaRound));
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
    // FIX: Switched to v8 syntax
    const submissionsQuery = db.collection('adedonhaSubmissions').where('roundId', '==', activeAdedonhaRound.id);
    const submissionsUnsub = submissionsQuery.onSnapshot(snapshot => {
        const submissions: AdedonhaSubmission[] = [];
        snapshot.forEach(doc => submissions.push({ id: doc.id, ...doc.data() } as AdedonhaSubmission));
        setAdedonhaSubmissions(submissions);
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
        // FIX: Switched to v8 syntax
        const existingClass = await db.doc(`classes/${newClassCode}`).get();
        if (!existingClass.exists) {
            isUnique = true;
        }
    }

    const newClass: ClassData = {
        classCode: newClassCode,
        className,
        teacherName: user.name,
    };
    
    // FIX: Switched to v8 syntax
    await db.doc(`classes/${newClassCode}`).set(newClass);
    await db.doc(`users/${user.name}`).update({
      classes: firebase.firestore.FieldValue.arrayUnion(newClassCode)
    });
    
    return { status: 'success', classCode: newClassCode };
  }, [user, classes]);

  const deleteClass = useCallback(async (classCode: string) => {
    if (!user || user.role !== 'teacher') return;
    // FIX: Switched to v8 syntax
    const batch = db.batch();
    
    // 1. Unlink students
    const studentsInClass = getStudentsInClass(classCode);
    studentsInClass.forEach(student => {
        const studentRef = db.doc(`users/${student.name}`);
        batch.update(studentRef, { classCode: firebase.firestore.FieldValue.delete() });
    });
    
    // 2. Remove class from teacher's list
    const teacherRef = db.doc(`users/${user.name}`);
    batch.update(teacherRef, { classes: firebase.firestore.FieldValue.arrayRemove(classCode) });

    // 3. Delete class document
    const classRef = db.doc(`classes/${classCode}`);
    batch.delete(classRef);

    await batch.commit();
  }, [user, getStudentsInClass]);
  
  const deleteStudent = useCallback(async (studentName: string) => {
    if (!user || user.role !== 'teacher') return;
    // FIX: Switched to v8 syntax
    const batch = db.batch();
    const studentRef = db.doc(`users/${studentName}`);
    const presenceRef = db.doc(`presence/${studentName}`);

    batch.delete(studentRef);
    batch.delete(presenceRef);
    
    await batch.commit();
  }, [user]);

  const updateStudentPassword = useCallback(async (studentName: string, newPassword: string): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Ação não permitida.' };
    if (!newPassword || newPassword.length < 4) return { status: 'error', message: 'A senha deve ter pelo menos 4 caracteres.' };

    // FIX: Switched to v8 syntax
    const studentRef = db.doc(`users/${studentName}`);
    try {
        await studentRef.update({ password: newPassword });
        return { status: 'success' };
    } catch (e) {
        console.error("Error updating password:", e);
        return { status: 'error', message: 'Falha ao atualizar a senha no banco de dados.' };
    }
  }, [user]);

  const createPasswordChallenge = useCallback(async (challengeData: any): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Apenas professores podem criar desafios.' };
    const newChallenge = {
        ...challengeData,
        creatorName: user.name,
        status: 'locked',
    };
    // FIX: Switched to v8 syntax
    await db.collection('password_challenges').add(newChallenge);
    return { status: 'success' };
  }, [user]);

  const updatePasswordChallenge = useCallback(async (id: string, data: any): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Ação não permitida.' };
    // FIX: Switched to v8 syntax
    await db.doc(`password_challenges/${id}`).update(data);
    return { status: 'success' };
  }, [user]);

  const deletePasswordChallenge = useCallback(async (id: string) => {
    // FIX: Switched to v8 syntax
    await db.doc(`password_challenges/${id}`).delete();
  }, []);

  const unlockPasswordChallenge = useCallback(async (id: string) => {
    // FIX: Switched to v8 syntax
    await db.doc(`password_challenges/${id}`).update({
        status: 'unlocked',
        unlockedTimestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }, []);
  
  const lockPasswordChallenge = useCallback(async (id: string) => {
    // FIX: Switched to v8 syntax
    await db.doc(`password_challenges/${id}`).update({
        status: 'locked'
    });
  }, []);

  const clearChallengeRanking = useCallback(async (id: string) => {
    const challenge = passwordChallenges.find(c => c.id === id);
    if (!challenge) return;
    const students = getStudentsInClass(challenge.classCode);
    const gameId = `${GAME_ID_PASSWORD}_${id}`;
    // FIX: Switched to v8 syntax
    const batch = db.batch();
    students.forEach(student => {
        if (student.gameStats?.[gameId]) {
            const userRef = db.doc(`users/${student.name}`);
            batch.update(userRef, { [`gameStats.${gameId}`]: firebase.firestore.FieldValue.delete() });
        }
    });
    await batch.commit();
  }, [passwordChallenges, getStudentsInClass]);

  const createCombinacaoTotalChallenge = useCallback(async (data: any): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Apenas professores podem criar desafios.' };
    // FIX: Switched to v8 syntax
    const newChallenge = { ...data, creatorName: user.name, status: 'locked', createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    await db.collection('combinacao_total_challenges').add(newChallenge);
    return { status: 'success' };
  }, [user]);

  const deleteCombinacaoTotalChallenge = useCallback(async (id: string) => {
    // FIX: Switched to v8 syntax
    await db.doc(`combinacao_total_challenges/${id}`).delete();
  }, []);

  const unlockCombinacaoTotalChallenge = useCallback(async (id: string) => {
    // FIX: Switched to v8 syntax
     await db.doc(`combinacao_total_challenges/${id}`).update({
        status: 'unlocked',
        unlockedTimestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }, []);
  
  const lockCombinacaoTotalChallenge = useCallback(async (id: string) => {
    // FIX: Switched to v8 syntax
    await db.doc(`combinacao_total_challenges/${id}`).update({ status: 'locked' });
  }, []);
  
  const clearCombinacaoTotalRanking = useCallback(async (id: string) => {
    const challenge = combinacaoTotalChallenges.find(c => c.id === id);
    if (!challenge) return;
    const students = getStudentsInClass(challenge.classCode);
    // FIX: Switched to v8 syntax
    const batch = db.batch();
    students.forEach(student => {
        const userRef = db.doc(`users/${student.name}`);
        batch.update(userRef, { 
            combinacaoTotalStats: student.combinacaoTotalStats?.filter(s => s.challengeId !== id) || []
        });
    });
    await batch.commit();
  }, [combinacaoTotalChallenges, getStudentsInClass]);

  // --- Adedonha Actions Implementation ---
  const createAdedonhaSession = useCallback(async (classCode: string, type: 'simples' | 'tapple') => {
    if (!user || user.role !== 'teacher') return null;
    const students = getStudentsInClass(classCode);
    const initialScores = students.reduce((acc, student) => {
        acc[student.name] = 0;
        return acc;
    }, {} as { [key: string]: number });
    
    // FIX: Switched to v8 syntax
    const newSession = {
        classCode,
        teacherName: user.name,
        status: 'active',
        type,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        scores: initialScores,
    };
    const docRef = await db.collection('adedonhaSessions').add(newSession);
    return docRef.id;
  }, [user, getStudentsInClass]);

  const startAdedonhaRound = useCallback(async (sessionId: string, theme: string, letter: string, duration: number) => {
    if (!activeAdedonhaSession) return;
    const newRoundNumber = activeAdedonhaRound ? activeAdedonhaRound.roundNumber + 1 : 1;
    // FIX: Switched to v8 syntax
    const newRound: Omit<AdedonhaRound, 'id'> = {
        sessionId, roundNumber: newRoundNumber, theme, duration,
        status: 'playing',
        startTime: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (activeAdedonhaSession.type === 'simples') {
        newRound.letter = letter;
    }
    if (activeAdedonhaSession.type === 'tapple') {
        newRound.usedLetters = [];
    }
    await db.collection('adedonhaRounds').add(newRound);
  }, [activeAdedonhaSession, activeAdedonhaRound]);

  const endAdedonhaRoundForScoring = useCallback(async (roundId: string) => {
    // FIX: Switched to v8 syntax
    const roundRef = db.doc(`adedonhaRounds/${roundId}`);
    await roundRef.update({ status: 'scoring' });
  }, []);

  const updateSubmissionScore = useCallback(async (subId: string, score: number) => {
    // FIX: Switched to v8 syntax
    await db.doc(`adedonhaSubmissions/${subId}`).update({ finalScore: score, isValid: score > 0 });
  }, []);

  const finalizeRound = useCallback(async (sessionId: string, roundId: string, submissions: AdedonhaSubmission[]) => {
    const sessionRef = db.doc(`adedonhaSessions/${sessionId}`);
    const roundRef = db.doc(`adedonhaRounds/${roundId}`);
    try {
        await db.runTransaction(async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists) throw new Error("Sessão não encontrada!");

            const sessionData = sessionDoc.data() as AdedonhaSession;
            const newScores = { ...sessionData.scores };
            
            submissions.forEach(sub => {
                 if (sub.roundId === roundId) {
                    newScores[sub.studentName] = (newScores[sub.studentName] || 0) + sub.finalScore;
                 }
            });
            
            transaction.update(sessionRef, { scores: newScores });
            transaction.update(roundRef, { status: 'finished' });
        });
    } catch (e) {
        console.error("Erro ao finalizar rodada:", e);
    }
  }, []);

  const endAdedonhaSession = useCallback(async (sessionId: string) => {
    // FIX: Switched to v8 syntax
    await db.doc(`adedonhaSessions/${sessionId}`).update({ status: 'finished' });
  }, []);
  
  // --- Garrafas Actions ---
  const createGarrafasChallenge = useCallback(async (data: any): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Apenas professores podem criar desafios.' };
    // FIX: Switched to v8 syntax
    const newChallenge = { ...data, creatorName: user.name, status: 'locked', createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    await db.collection('garrafas_challenges').add(newChallenge);
    return { status: 'success' };
  }, [user]);

  const deleteGarrafasChallenge = useCallback(async (id: string) => {
    // FIX: Switched to v8 syntax
    await db.doc(`garrafas_challenges/${id}`).delete();
  }, []);

  const unlockGarrafasChallenge = useCallback(async (id: string) => {
    // FIX: Switched to v8 syntax
     await db.doc(`garrafas_challenges/${id}`).update({
        status: 'unlocked',
        unlockedTimestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }, []);
  
  const clearGarrafasRanking = useCallback(async (id: string) => {
    const challenge = garrafasChallenges.find(c => c.id === id);
    if (!challenge) return;
    const students = getStudentsInClass(challenge.classCode);
    // FIX: Switched to v8 syntax
    const batch = db.batch();
    students.forEach(student => {
        const userRef = db.doc(`users/${student.name}`);
        batch.update(userRef, { 
            garrafasStats: student.garrafasStats?.filter(s => s.challengeId !== id) || []
        });
    });
    await batch.commit();
  }, [garrafasChallenges, getStudentsInClass]);

  // Student Actions
  const submitAdedonhaAnswer = useCallback(async (roundId: string, answer: string): Promise<boolean> => {
    if (!user || user.role !== 'student' || !activeAdedonhaSession || !activeAdedonhaRound) return false;

    if (activeAdedonhaSession.type === 'tapple') {
        const firstLetter = answer.trim().charAt(0).toUpperCase();
        if (!firstLetter) return false;

        const roundRef = db.doc(`adedonhaRounds/${roundId}`);
        // FIX: Refactored Tapple submission to correctly use Firebase v8 transaction patterns.
        // The transaction now only handles the atomic check and update of the shared 'usedLetters' resource.
        // The user's submission document is created/updated separately after the transaction succeeds.
        try {
            await db.runTransaction(async (transaction) => {
                const roundDoc = await transaction.get(roundRef);
                if (!roundDoc.exists) throw new Error("Round not found");
                
                const roundData = roundDoc.data() as AdedonhaRound;
                if (roundData.usedLetters?.includes(firstLetter)) {
                    throw new Error("Letter already used by another player.");
                }
                
                const newUsedLetters = [...(roundData.usedLetters || []), firstLetter];
                transaction.update(roundRef, { usedLetters: newUsedLetters });
            });
            
            // After successfully reserving the letter, create/update the submission.
            const subsQuery = db.collection('adedonhaSubmissions').where('roundId', '==', roundId).where('studentName', '==', user.name);
            const subsDocs = await subsQuery.get();

            if (subsDocs.empty) {
                const newSubRef = db.collection('adedonhaSubmissions').doc();
                await newSubRef.set({ roundId, studentName: user.name, answer, finalScore: 0, isValid: null });
            } else {
                const subRef = subsDocs.docs[0].ref;
                await subRef.update({ answer });
            }
            return true;
        } catch (error) {
            console.error("Tapple submission transaction failed: ", error);
            return false;
        }
    } else { // 'simples' mode
        const existingSubmission = adedonhaSubmissions.find(s => s.roundId === roundId && s.studentName === user.name);
        if (existingSubmission) {
            await db.doc(`adedonhaSubmissions/${existingSubmission.id}`).update({ answer });
        } else {
            const newSubmission: Omit<AdedonhaSubmission, 'id'> = {
                roundId, studentName: user.name, answer, finalScore: 0, isValid: null
            };
            await db.collection('adedonhaSubmissions').add(newSubmission);
        }
        return true;
    }
  }, [user, adedonhaSubmissions, activeAdedonhaSession, activeAdedonhaRound]);
  
  const value: GameDataContextType = {
    allUsers: allUsers,
    classes: classes,
    passwordChallenges: passwordChallenges,
    combinacaoTotalChallenges: combinacaoTotalChallenges,
    garrafasChallenges: garrafasChallenges,
    activeAdedonhaSession: activeAdedonhaSession,
    activeAdedonhaRound: activeAdedonhaRound,
    adedonhaSubmissions: adedonhaSubmissions,
    onlineStudents: onlineStudents,
    offlineStudents: offlineStudents,
    getClassesForTeacher: getClassesForTeacher,
    getStudentsInClass: getStudentsInClass,
    getAllUsers: getAllUsers,
    createClass: createClass,
    deleteClass: deleteClass,
    deleteStudent: deleteStudent,
    updateStudentPassword: updateStudentPassword,
    createPasswordChallenge: createPasswordChallenge,
    updatePasswordChallenge: updatePasswordChallenge,
    deletePasswordChallenge: deletePasswordChallenge,
    unlockPasswordChallenge: unlockPasswordChallenge,
    lockPasswordChallenge: lockPasswordChallenge,
    clearChallengeRanking: clearChallengeRanking,
    createCombinacaoTotalChallenge: createCombinacaoTotalChallenge,
    deleteCombinacaoTotalChallenge: deleteCombinacaoTotalChallenge,
    unlockCombinacaoTotalChallenge: unlockCombinacaoTotalChallenge,
    lockCombinacaoTotalChallenge: lockCombinacaoTotalChallenge,
    clearCombinacaoTotalRanking: clearCombinacaoTotalRanking,
    createAdedonhaSession: createAdedonhaSession,
    startAdedonhaRound: startAdedonhaRound,
    endAdedonhaRoundForScoring: endAdedonhaRoundForScoring,
    updateSubmissionScore: updateSubmissionScore,
    finalizeRound: finalizeRound,
    endAdedonhaSession: endAdedonhaSession,
    createGarrafasChallenge,
    deleteGarrafasChallenge,
    unlockGarrafasChallenge,
    clearGarrafasRanking,
    submitAdedonhaAnswer: submitAdedonhaAnswer,
  };

  return <GameDataContext.Provider value={value}>{children}</GameDataContext.Provider>;
};
