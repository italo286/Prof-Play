import React, { createContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import type { UserProfile } from '../types';
// FIX: Corrected Firebase Firestore imports for v8 namespaced API.
import firebase from 'firebase/app';


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
    // FIX: Switched to v8 syntax for collection and onSnapshot
    const usersCollection = db.collection('users');
    const unsubscribe = usersCollection.onSnapshot((snapshot) => {
        const profiles: UserProfile[] = [];
        snapshot.forEach(doc => profiles.push(doc.data() as UserProfile));

        const storedUserName = sessionStorage.getItem(CURRENT_USER_STORAGE_KEY);
        if (storedUserName) {
            const userProfile = profiles.find(p => p.name === storedUserName);
            if (userProfile) {
                // FIX: Switched to v8 syntax for doc and setDoc
                const presenceRef = db.doc(`presence/${userProfile.name}`);
                presenceRef.set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
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
        // FIX: Switched to v8 syntax for doc and setDoc
        const presenceRef = db.doc(`presence/${user.name}`);
        presenceRef.set({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    }, 60000); // Update every 60 seconds

    return () => clearInterval(heartbeatInterval);
  }, [user]);

  // Presence management for tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
        if (user) {
            // FIX: Switched to v8 syntax for doc and deleteDoc
            const presenceRef = db.doc(`presence/${user.name}`);
            presenceRef.delete();
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const login = useCallback(async (name: string, pass: string) => {
    // FIX: Switched to v8 syntax for doc and getDoc
    const userDocRef = db.doc(`users/${name}`);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) return 'not_found';
    
    const profile = userDoc.data() as UserProfile;
    if (profile.password !== pass) return 'wrong_pass';

    // FIX: Switched to v8 syntax for doc, setDoc, and serverTimestamp
    const presenceRef = db.doc(`presence/${name}`);
    await presenceRef.set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    setUser(profile);
    sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, name);
    return 'success';
  }, []);
  
  const register = useCallback(async (name: string, pass: string, role: 'student' | 'teacher', classCode?: string, avatar?: string): Promise<{ status: 'success' | 'user_exists' | 'class_not_found' | 'invalid_role' | 'avatar_taken', message?: string }> => {
    // FIX: Switched to v8 syntax for doc and getDoc
    const userDocRef = db.doc(`users/${name}`);
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      return { status: 'user_exists', message: 'Este nome de usuário já existe.' };
    }
    
    if (role === 'student') {
      if (!classCode) return { status: 'class_not_found', message: 'Código da turma é obrigatório.'}
      // FIX: Switched to v8 syntax for query, collection, where, and getDocs
      const q = db.collection("classes").where("classCode", "==", classCode.toUpperCase());
      const classDocs = await q.get();
      if (classDocs.empty) {
        return { status: 'class_not_found', message: 'Código da turma inválido ou não encontrado.' };
      }
      if (!avatar) {
          return { status: 'invalid_role', message: 'É necessário escolher um avatar.'};
      }
      
      // FIX: Switched to v8 syntax for query, collection, where, and getDocs
      const studentsInClassQuery = db.collection("users").where("classCode", "==", classCode.toUpperCase());
      const studentsInClassSnapshot = await studentsInClassQuery.get();
      const studentsInClass = studentsInClassSnapshot.docs.map(d => d.data() as UserProfile);

      if (studentsInClass.some(s => s.avatar === avatar)) {
          return { status: 'avatar_taken', message: 'Este avatar já foi escolhido. Por favor, selecione outro.' };
      }
    }
    
    const newProfile = createNewProfile(name, pass, role, classCode, avatar);
    // FIX: Switched to v8 syntax for setDoc
    await userDocRef.set(newProfile);
    
    // FIX: Switched to v8 syntax for doc, setDoc, and serverTimestamp
    const presenceRef = db.doc(`presence/${name}`);
    await presenceRef.set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    setUser(newProfile);
    sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, name);
    return { status: 'success' };
  }, []);

  const logout = useCallback(async () => {
      if (user) {
          // FIX: Switched to v8 syntax for doc and deleteDoc
          const presenceRef = db.doc(`presence/${user.name}`);
          await presenceRef.delete();
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
