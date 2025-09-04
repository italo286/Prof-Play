import React, { createContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import type { UserProfile } from '../types';
import firebase from 'firebase/compat/app';

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
    const unsubscribe = db.collection('users').onSnapshot((snapshot) => {
        const profiles = snapshot.docs.map(d => ({ ...d.data() } as UserProfile));

        const storedUserName = sessionStorage.getItem(CURRENT_USER_STORAGE_KEY);
        if (storedUserName) {
            const userProfile = profiles.find(p => p.name === storedUserName);
            if (userProfile) {
                db.collection('presence').doc(userProfile.name).set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
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
        db.collection('presence').doc(user.name).set({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    }, 60000); // Update every 60 seconds

    return () => clearInterval(heartbeatInterval);
  }, [user]);

  // Presence management for tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
        if (user) {
            db.collection('presence').doc(user.name).delete();
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const login = useCallback(async (name: string, pass: string) => {
    const userDocRef = db.collection("users").doc(name);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) return 'not_found';
    
    const profile = userDoc.data() as UserProfile;
    if (profile.password !== pass) return 'wrong_pass';

    await db.collection('presence').doc(name).set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    setUser(profile);
    sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, name);
    return 'success';
  }, []);
  
  const register = useCallback(async (name: string, pass: string, role: 'student' | 'teacher', classCode?: string, avatar?: string): Promise<{ status: 'success' | 'user_exists' | 'class_not_found' | 'invalid_role' | 'avatar_taken', message?: string }> => {
    const userDocRef = db.collection("users").doc(name);
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      return { status: 'user_exists', message: 'Este nome de usuário já existe.' };
    }
    
    if (role === 'student') {
      if (!classCode) return { status: 'class_not_found', message: 'Código da turma é obrigatório.'}
      const q = db.collection("classes").where("classCode", "==", classCode.toUpperCase());
      const classDocs = await q.get();
      if (classDocs.empty) {
        return { status: 'class_not_found', message: 'Código da turma inválido ou não encontrado.' };
      }
      if (!avatar) {
          return { status: 'invalid_role', message: 'É necessário escolher um avatar.'};
      }
      
      const studentsInClassSnapshot = await db.collection("users").where("classCode", "==", classCode.toUpperCase()).get();
      const studentsInClass = studentsInClassSnapshot.docs.map(d => d.data() as UserProfile);

      if (studentsInClass.some(s => s.avatar === avatar)) {
          return { status: 'avatar_taken', message: 'Este avatar já foi escolhido. Por favor, selecione outro.' };
      }
    }
    
    const newProfile = createNewProfile(name, pass, role, classCode, avatar);
    await userDocRef.set(newProfile);
    
    await db.collection('presence').doc(name).set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    setUser(newProfile);
    sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, name);
    return { status: 'success' };
  }, []);

  const logout = useCallback(async () => {
      if (user) {
          await db.collection('presence').doc(user.name).delete();
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