import { initializeApp } from "firebase/app";
// FIX: The initializeFirestore, persistentLocalCache, and memoryLocalCache exports are deprecated.
// Use getFirestore and enableIndexedDbPersistence for Firebase v9+ modular SDK.
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// --- CONFIGURAÇÃO DO FIREBASE ---
//
// INSTRUÇÕES:
// 1. Vá para o console do Firebase (https://console.firebase.google.com/).
// 2. Crie um novo projeto ou selecione um existente.
// 3. Nas configurações do projeto (ícone de engrenagem), vá para a seção "Geral".
// 4. Role para baixo até "Seus apps" e crie um novo "App da Web" (ícone </_>).
// 5. O Firebase fornecerá um objeto de configuração como este.
// 6. Copie os valores e cole-os no objeto `firebaseConfig` abaixo.
//
// IMPORTANTE:
// Após configurar, vá para a seção "Firestore Database" no console do Firebase:
// 1. Crie um novo banco de dados.
// 2. Comece no "modo de produção".
// 3. Vá para a aba "Regras" e atualize as regras para permitir leitura/escrita.
//    Para desenvolvimento, você pode usar as seguintes regras (NÃO USE EM PRODUÇÃO REAL):
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /{document=**} {
//          allow read, write: if true;
//        }
//      }
//    }
//
const firebaseConfig = {
  apiKey: "AIzaSyBIxBC7ogp38lAEMvKKYO4S92fbBud9zSw",
  authDomain: "oficial5-0.firebaseapp.com",
  projectId: "oficial5-0",
  storageBucket: "oficial5-0.firebasestorage.app",
  messagingSenderId: "1025175183650",
  appId: "1:1025175183650:web:f236fd89dd454d2831457b"
};


// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta a instância do Firestore para ser usada em outros lugares no aplicativo
// Habilita a persistência offline para uma melhor experiência do usuário
const db = getFirestore(app);
// FIX: Use enableIndexedDbPersistence() to enable offline capabilities.
// The SDK will fall back to in-memory persistence if IndexedDB is not available or fails.
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open. Persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: The current browser does not support all of the features required to enable persistence.');
    }
  });


export { db };
