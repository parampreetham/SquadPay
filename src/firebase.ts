// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your real config from Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyCjJJYffWslhDjfq82_BT57qsh1ykQqc2I",
  authDomain: "squadpay-3117f.firebaseapp.com",
  projectId: "squadpay-3117f",
  storageBucket: "squadpay-3117f.firebasestorage.app",
  messagingSenderId: "924248627582",
  appId: "1:924248627582:web:d81b1b5b6f349cb2197b2f",
  measurementId: "G-60GK57NLEX"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
