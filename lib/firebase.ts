
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * CONFIGURAÇÃO FIREBASE
 * Substitua os valores abaixo pelas credenciais do seu projeto no Console do Firebase.
 * Acesse: Configurações do Projeto > Geral > Seus Aplicativos > Configuração do SDK.
 */
const firebaseConfig = {
   apiKey: "AIzaSyDvsaszMoUcrVcybp_ei9y5PMoUCIF_aSQ",
  authDomain: "financas-4afe5.firebaseapp.com",
  projectId: "financas-4afe5",
  storageBucket: "financas-4afe5.firebasestorage.app",
  messagingSenderId: "26468596772",
  appId: "1:26468596772:web:1a10925adea9e7a964acb1"
};

// Inicialização segura: evita erro se as chaves forem inválidas durante o desenvolvimento
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase Initialization Error: Verifique suas chaves no arquivo lib/firebase.ts", error);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
