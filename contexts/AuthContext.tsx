import React, { createContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import type { UserProfile } from '../types';
// FIX: Corrected Firebase Firestore imports for v9+ modular SDK.
import { doc, getDoc, setDoc, collection, onSnapshot, query, where, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';

const CURRENT_USER_STORAGE_KEY = 'prof-play-currentUser';

const createNewProfile = (name: string, password: string, role: 'student' | 'teacher', classCode?: string, avatar?: string): UserProfile => ({
    name,
    password,
    role,
    ...(role === 'student' && { classCode, avatar }),
    ...(role === 'teacher' && { classes: [] }),
    xp: 0,
    level: 1,
    badges: [],
    gameStats: {},
});

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (name: string, pass: string) => Promise<'success' | 'not_found' | 'wrong_pass'>;
  register: (name: string, pass: string, role: 'student' | 'teacher', classCode?: string, avatar?: string) => Promise<{ status: 'success' | 'user_exists' | 'class_not_found' | 'invalid_role' | 'avatar_taken', message?: string }>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => 'not_found',
  register: async () => ({ status: 'invalid_role' }),
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const usersCollection = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
        const profiles: UserProfile[] = [];
        snapshot.forEach(doc => profiles.push(doc.data() as UserProfile));

        const storedUserName = sessionStorage.getItem(CURRENT_USER_STORAGE_KEY);
        if (storedUserName) {
            const userProfile = profiles.find(p => p.name === storedUserName);
            if (userProfile) {
                const presenceRef = doc(db, 'presence', userProfile.name);
                setDoc(presenceRef, { lastSeen: serverTimestamp() });
                setUser(userProfile);
            } else {
                sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
                setUser(null);
            }
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Heartbeat effect to keep presence updated
  useEffect(() => {
    if (!user) return;

    const heartbeatInterval = setInterval(() => {
        const presenceRef = doc(db, 'presence', user.name);
        setDoc(presenceRef, {
            lastSeen: serverTimestamp()
        });
    }, 60000); // Update every 60 seconds

    return () => clearInterval(heartbeatInterval);
  }, [user]);

  // Presence management for tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
        if (user) {
            const presenceRef = doc(db, 'presence', user.name);
            deleteDoc(presenceRef);
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const login = useCallback(async (name: string, pass: string) => {
    const userDocRef = doc(db, "users", name);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) return 'not_found';
    
    const profile = userDoc.data() as UserProfile;
    if (profile.password !== pass) return 'wrong_pass';

    const presenceRef = doc(db, 'presence', name);
    await setDoc(presenceRef, { lastSeen: serverTimestamp() });
    setUser(profile);
    sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, name);
    return 'success';
  }, []);
  
  const register = useCallback(async (name: string, pass: string, role: 'student' | 'teacher', classCode?: string, avatar?: string): Promise<{ status: 'success' | 'user_exists' | 'class_not_found' | 'invalid_role' | 'avatar_taken', message?: string }> => {
    const userDocRef = doc(db, "users", name);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return { status: 'user_exists', message: 'Este nome de usuário já existe.' };
    }
    
    if (role === 'student') {
      if (!classCode) return { status: 'class_not_found', message: 'Código da turma é obrigatório.'}
      const q = query(collection(db, "classes"), where("classCode", "==", classCode.toUpperCase()));
      const classDocs = await getDocs(q);
      if (classDocs.empty) {
        return { status: 'class_not_found', message: 'Código da turma inválido ou não encontrado.' };
      }
      if (!avatar) {
          return { status: 'invalid_role', message: 'É necessário escolher um avatar.'};
      }
      
      const studentsInClassQuery = query(collection(db, "users"), where("classCode", "==", classCode.toUpperCase()));
      const studentsInClassSnapshot = await getDocs(studentsInClassQuery);
      const studentsInClass = studentsInClassSnapshot.docs.map(d => d.data() as UserProfile);

      if (studentsInClass.some(s => s.avatar === avatar)) {
          return { status: 'avatar_taken', message: 'Este avatar já foi escolhido. Por favor, selecione outro.' };
      }
    }
    
    const newProfile = createNewProfile(name, pass, role, classCode, avatar);
    await setDoc(userDocRef, newProfile);
    
    const presenceRef = doc(db, 'presence', name);
    await setDoc(presenceRef, { lastSeen: serverTimestamp() });
    setUser(newProfile);
    sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, name);
    return { status: 'success' };
  }, []);

  const logout = useCallback(async () => {
      if (user) {
          const presenceRef = doc(db, 'presence', user.name);
          await deleteDoc(presenceRef);
      }
      sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      setUser(null);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
