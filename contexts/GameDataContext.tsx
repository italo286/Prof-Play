import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { db } from '../firebase';
import { 
    collection, onSnapshot, query, where, orderBy, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, 
    writeBatch, serverTimestamp, arrayUnion, arrayRemove, deleteField, runTransaction, getDocs
} from 'firebase/firestore';
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
      onSnapshot(collection(db, 'users'), snapshot => {
          const data: UserProfile[] = [];
          snapshot.forEach(doc => data.push(doc.data() as UserProfile));
          setAllUsers(data);
      }),
      onSnapshot(collection(db, 'classes'), snapshot => {
          const data: ClassData[] = [];
          snapshot.forEach(doc => data.push(doc.data() as ClassData));
          setClasses(data);
      }),
      onSnapshot(query(collection(db, 'password_challenges'), orderBy('title')), snapshot => {
          const data: PasswordChallenge[] = [];
          snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as PasswordChallenge));
          setPasswordChallenges(data);
      }),
      onSnapshot(query(collection(db, 'combinacao_total_challenges'), orderBy('createdAt', 'desc')), snapshot => {
          const data: CombinacaoTotalChallenge[] = [];
          snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as CombinacaoTotalChallenge));
          setCombinacaoTotalChallenges(data);
      }),
      onSnapshot(collection(db, 'presence'), snapshot => {
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
    let sessionQuery;
    if (user.role === 'teacher') sessionQuery = query(collection(db, 'adedonhaSessions'), where('teacherName', '==', user.name));
    else if (user.classCode) sessionQuery = query(collection(db, 'adedonhaSessions'), where('classCode', '==', user.classCode));
    else return;

    const sessionUnsub = onSnapshot(sessionQuery, snapshot => {
        const sessions: AdedonhaSession[] = [];
        snapshot.forEach(doc => sessions.push({ id: doc.id, ...doc.data() } as AdedonhaSession));
        const activeSession = sessions.find(session => session.status === 'active');
        setActiveAdedonhaSession(activeSession || null);
    });
    return () => sessionUnsub();
  }, [user]);

  useEffect(() => {
    if (!activeAdedonhaSession) { setActiveAdedonhaRound(null); return; }
    const roundQuery = query(collection(db, 'adedonhaRounds'), where('sessionId', '==', activeAdedonhaSession.id));
    const roundUnsub = onSnapshot(roundQuery, snapshot => {
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
    const submissionsQuery = query(collection(db, 'adedonhaSubmissions'), where('roundId', '==', activeAdedonhaRound.id));
    const submissionsUnsub = onSnapshot(submissionsQuery, snapshot => {
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
        const existingClass = await getDoc(doc(db, 'classes', newClassCode)); // Simplified check
        if (!existingClass.exists()) {
            isUnique = true;
        }
    }

    const newClass: ClassData = {
        classCode: newClassCode,
        className,
        teacherName: user.name,
    };
    
    await setDoc(doc(db, 'classes', newClassCode), newClass);
    await updateDoc(doc(db, 'users', user.name), {
      classes: arrayUnion(newClassCode)
    });
    
    return { status: 'success', classCode: newClassCode };
  }, [user, classes]);

  const deleteClass = useCallback(async (classCode: string) => {
    if (!user || user.role !== 'teacher') return;
    const batch = writeBatch(db);
    
    // 1. Unlink students
    const studentsInClass = getStudentsInClass(classCode);
    studentsInClass.forEach(student => {
        const studentRef = doc(db, 'users', student.name);
        batch.update(studentRef, { classCode: deleteField() });
    });
    
    // 2. Remove class from teacher's list
    const teacherRef = doc(db, 'users', user.name);
    batch.update(teacherRef, { classes: arrayRemove(classCode) });

    // 3. Delete class document
    const classRef = doc(db, 'classes', classCode);
    batch.delete(classRef);

    await batch.commit();
  }, [user, getStudentsInClass]);
  
  const deleteStudent = useCallback(async (studentName: string) => {
    if (!user || user.role !== 'teacher') return;
    const batch = writeBatch(db);
    const studentRef = doc(db, 'users', studentName);
    const presenceRef = doc(db, 'presence', studentName);

    batch.delete(studentRef);
    batch.delete(presenceRef);
    
    await batch.commit();
  }, [user]);

  const updateStudentPassword = useCallback(async (studentName: string, newPassword: string): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Ação não permitida.' };
    if (!newPassword || newPassword.length < 4) return { status: 'error', message: 'A senha deve ter pelo menos 4 caracteres.' };

    const studentRef = doc(db, 'users', studentName);
    try {
        await updateDoc(studentRef, { password: newPassword });
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
    await addDoc(collection(db, 'password_challenges'), newChallenge);
    return { status: 'success' };
  }, [user]);

  const updatePasswordChallenge = useCallback(async (id: string, data: any): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Ação não permitida.' };
    await updateDoc(doc(db, 'password_challenges', id), data);
    return { status: 'success' };
  }, [user]);

  const deletePasswordChallenge = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'password_challenges', id));
  }, []);

  const unlockPasswordChallenge = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'password_challenges', id), {
        status: 'unlocked',
        unlockedTimestamp: serverTimestamp()
    });
  }, []);
  
  const lockPasswordChallenge = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'password_challenges', id), {
        status: 'locked'
    });
  }, []);

  const clearChallengeRanking = useCallback(async (id: string) => {
    const challenge = passwordChallenges.find(c => c.id === id);
    if (!challenge) return;
    const students = getStudentsInClass(challenge.classCode);
    const gameId = `${GAME_ID_PASSWORD}_${id}`;
    const batch = writeBatch(db);
    students.forEach(student => {
        if (student.gameStats?.[gameId]) {
            const userRef = doc(db, 'users', student.name);
            batch.update(userRef, { [`gameStats.${gameId}`]: deleteField() });
        }
    });
    await batch.commit();
  }, [passwordChallenges, getStudentsInClass]);

  const createCombinacaoTotalChallenge = useCallback(async (data: any): Promise<{ status: 'success' | 'error', message?: string }> => {
    if (!user || user.role !== 'teacher') return { status: 'error', message: 'Apenas professores podem criar desafios.' };
    const newChallenge = { ...data, creatorName: user.name, status: 'locked', createdAt: serverTimestamp() };
    await addDoc(collection(db, 'combinacao_total_challenges'), newChallenge);
    return { status: 'success' };
  }, [user]);

  const deleteCombinacaoTotalChallenge = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'combinacao_total_challenges', id));
  }, []);

  const unlockCombinacaoTotalChallenge = useCallback(async (id: string) => {
     await updateDoc(doc(db, 'combinacao_total_challenges', id), {
        status: 'unlocked',
        unlockedTimestamp: serverTimestamp()
    });
  }, []);
  
  const lockCombinacaoTotalChallenge = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'combinacao_total_challenges', id), { status: 'locked' });
  }, []);
  
  const clearCombinacaoTotalRanking = useCallback(async (id: string) => {
    const challenge = combinacaoTotalChallenges.find(c => c.id === id);
    if (!challenge) return;
    const students = getStudentsInClass(challenge.classCode);
    const batch = writeBatch(db);
    students.forEach(student => {
        const userRef = doc(db, 'users', student.name);
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
        createdAt: serverTimestamp(),
        scores: initialScores,
    };
    const docRef = await addDoc(collection(db, 'adedonhaSessions'), newSession);
    return docRef.id;
  }, [user, getStudentsInClass]);

  const startAdedonhaRound = useCallback(async (sessionId: string, theme: string, letter: string, duration: number) => {
    if (!activeAdedonhaSession) return;
    const newRoundNumber = activeAdedonhaRound ? activeAdedonhaRound.roundNumber + 1 : 1;
    const newRound = {
        sessionId, roundNumber: newRoundNumber, theme, letter, duration,
        status: 'playing',
        startTime: serverTimestamp(),
    };
    await addDoc(collection(db, 'adedonhaRounds'), newRound);
  }, [activeAdedonhaSession, activeAdedonhaRound]);

  const endAdedonhaRoundForScoring = useCallback(async (roundId: string) => {
    const roundRef = doc(db, 'adedonhaRounds', roundId);
    await updateDoc(roundRef, { status: 'scoring' });
  }, []);

  const updateSubmissionScore = useCallback(async (subId: string, score: number) => {
    await updateDoc(doc(db, 'adedonhaSubmissions', subId), { finalScore: score });
  }, []);

  const finalizeRound = useCallback(async (sessionId: string, roundId: string) => {
    const sessionRef = doc(db, 'adedonhaSessions', sessionId);
    const roundRef = doc(db, 'adedonhaRounds', roundId);

    try {
        // Otimização: Ler todas as submissões fora da transação.
        // Isso evita que a leitura de muitos documentos seja repetida se a transação falhar e precisar ser tentada novamente,
        // o que provavelmente estava causando o erro 'resource-exhausted'.
        const submissionsQuery = query(collection(db, 'adedonhaSubmissions'), where('roundId', '==', roundId));
        const submissionsSnapshot = await getDocs(submissionsQuery);

        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists()) {
                throw new Error("Sessão não encontrada!");
            }

            const sessionData = sessionDoc.data() as AdedonhaSession;
            const newScores = { ...sessionData.scores };
            
            // Agora, usamos os dados pré-carregados para calcular os novos placares.
            submissionsSnapshot.forEach(doc => {
                 const sub = doc.data() as AdedonhaSubmission;
                 newScores[sub.studentName] = (newScores[sub.studentName] || 0) + sub.finalScore;
            });
            
            // A transação agora só faz uma leitura (sessionDoc) e duas escritas.
            transaction.update(sessionRef, { scores: newScores });
            transaction.update(roundRef, { status: 'finished' });
        });
    } catch (e) {
        console.error("Erro ao finalizar rodada:", e);
    }
  }, []);

  const endAdedonhaSession = useCallback(async (sessionId: string) => {
    await updateDoc(doc(db, 'adedonhaSessions', sessionId), { status: 'finished' });
  }, []);
  
  // Student Actions
  const submitAdedonhaAnswer = useCallback(async (roundId: string, answer: string) => {
    if (!user || user.role !== 'student' || !activeAdedonhaSession) return;
    const existingSubmission = adedonhaSubmissions.find(s => s.roundId === roundId && s.studentName === user.name);
    if (existingSubmission) {
        await updateDoc(doc(db, 'adedonhaSubmissions', existingSubmission.id), { answer });
    } else {
        const newSubmission: Omit<AdedonhaSubmission, 'id'> = {
            roundId, studentName: user.name, answer, finalScore: 0, isValid: null
        };
        await addDoc(collection(db, 'adedonhaSubmissions'), newSubmission);
    }
  }, [user, adedonhaSubmissions, activeAdedonhaSession]);
  
  const value: GameDataContextType = {
    allUsers: allUsers,
    classes: classes,
    passwordChallenges: passwordChallenges,
    combinacaoTotalChallenges: combinacaoTotalChallenges,
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
    submitAdedonhaAnswer: submitAdedonhaAnswer,
  };

  return <GameDataContext.Provider value={value}>{children}</GameDataContext.Provider>;
};