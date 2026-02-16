// server/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = { 
  apiKey: "AIzaSyDuPGA26OuooEZXytT1ooEj_sjqZYr2UcE",
  authDomain: "nikesite-a5b3f.firebaseapp.com",
  projectId: "nikesite-a5b3f",
  storageBucket: "nikesite-a5b3f.firebasestorage.app",
  messagingSenderId: "948784526156",
  appId: "1:948784526156:web:758caf4a76082f9b3595e9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;