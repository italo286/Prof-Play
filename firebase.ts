// FIX: The firebase v9 modular API calls were causing errors. Switched to the v8 namespaced API.
import firebase from "firebase/app";
import "firebase/firestore";


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
  apiKey: "AIzaSyAyDyqJNBoWIDrmL89PaQ3Ge-vYBobcrhM",
  authDomain: "desafio-no-plano-cartesiano-2.firebaseapp.com",
  databaseURL: "https://desafio-no-plano-cartesiano-2-default-rtdb.firebaseio.com",
  projectId: "desafio-no-plano-cartesiano-2",
  storageBucket: "desafio-no-plano-cartesiano-2.firebasestorage.app",
  messagingSenderId: "153071609788",
  appId: "1:153071609788:web:21e5159ccbf50d5066edb9"
};


// Inicializa o Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}


// Exporta a instância do Firestore para ser usada em outros lugares no aplicativo
// Habilita a persistência offline para uma melhor experiência do usuário
const db = firebase.firestore();

// FIX: Switched to v8 `enablePersistence` method.
db.enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open. Persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: The current browser does not support all of the features required to enable persistence.');
    }
  });


export { db };
