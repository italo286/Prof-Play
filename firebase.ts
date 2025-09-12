import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAyDyqJNBoWIDrmL89PaQ3Ge-vYBobcrhM",
  authDomain: "desafio-no-plano-cartesiano-2.firebaseapp.com",
  databaseURL: "https://desafio-no-plano-cartesiano-2-default-rtdb.firebaseio.com",
  projectId: "desafio-no-plano-cartesiano-2",
  storageBucket: "desafio-no-plano-cartesiano-2.firebasestorage.app",
  messagingSenderId: "153071609788",
  appId: "1:153071609788:web:21e5159ccbf50d5066edb9"
};


// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta a instância do Firestore para ser usada em outros lugares no aplicativo
const db = getFirestore(app);
// Habilita a persistência offline para uma melhor experiência do usuário
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open. Persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: The current browser does not support all of the features required to enable persistence.');
    }
  });


export { db };
