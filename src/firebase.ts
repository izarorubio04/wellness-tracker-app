// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjeWVBJid4FSQ_eJ_-siFS6qW2TQDF-_0",
  authDomain: "wellness-tracker-1.firebaseapp.com",
  projectId: "wellness-tracker-1",
  storageBucket: "wellness-tracker-1.firebasestorage.app",
  messagingSenderId: "106975287564",
  appId: "1:106975287564:web:56b1acae00bec0ae169129"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);
// Exportamos la base de datos para usarla en la app
export const db = getFirestore(app);