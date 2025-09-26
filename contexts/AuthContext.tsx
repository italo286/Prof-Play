import React, { createContext, useState, useEffect, useCallback } from 'react';
import { db, rtdb } from '../firebase';
import type { UserProfile } from '../types';
// FIX: Corrected Firebase Firestore imports for v8 namespaced API.
// FIX: Use compat import for Firebase v8 syntax.
import firebase from 'firebase/compat/app';
// FIX: Added missing firestore import for side-effects, enabling full v8 API compatibility for types and FieldValue.
import 'firebase/compat/firestore';


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
    const storedUserName = sessionStorage.getItem(CURRENT_USER_STORAGE_KEY);
    let unsubscribe = () => {};

    if (storedUserName) {
      const userRef = db.doc(`users/${storedUserName}`);
      unsubscribe = userRef.onSnapshot((doc) => {
        if (doc.exists) {
          const userProfile = doc.data() as UserProfile;
          setUser(userProfile);
        } else {
          // User was deleted or logged out from another tab
          sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
          setUser(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error listening to user document:", error);
        setLoading(false);
        setUser(null);
        sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      });
    } else {
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);
  
  // Realtime Database Presence Management
  useEffect(() => {
    if (!user) return;

    const userStatusDatabaseRef = rtdb.ref(`/status/${user.name}`);

    const isOnlineForDatabase = {
        state: 'online',
        last_changed: firebase.database.ServerValue.TIMESTAMP,
        name: user.name,
        avatar: user.avatar,
        classCode: user.classCode,
    };

    const isOfflineForDatabase = {
        state: 'offline',
        last_changed: firebase.database.ServerValue.TIMESTAMP,
    };
    
    // Using on 'value' is the standard way to check for connection status with RTDB
    rtdb.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === false) {
            return;
        }

        userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => {
            userStatusDatabaseRef.set(isOnlineForDatabase);
        });
    });
   
    return () => {
        userStatusDatabaseRef.set(isOfflineForDatabase);
        rtdb.ref('.info/connected').off();
    }
  }, [user]);
  
  const login = useCallback(async (name: string, pass: string) => {
    // FIX: Switched to v8 syntax for doc and getDoc
    const userDocRef = db.doc(`users/${name}`);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) return 'not_found';
    
    const profile = userDoc.data() as UserProfile;
    if (profile.password !== pass) return 'wrong_pass';

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
    
    setUser(newProfile);
    sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, name);
    return { status: 'success' };
  }, []);

  const logout = useCallback(async () => {
    try {
        if (user) {
            const userStatusDatabaseRef = rtdb.ref(`/status/${user.name}`);
            await userStatusDatabaseRef.set({
                state: 'offline',
                last_changed: firebase.database.ServerValue.TIMESTAMP,
            });
        }
    } catch (error) {
        console.error("Failed to clear presence on logout:", error);
    } finally {
        sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
        setUser(null);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};