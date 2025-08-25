// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-wl_O0bvU-vJoylqNAjo9NPoupZEoBws",
  authDomain: "recipe-remixer-kdvyi.firebaseapp.com",
  projectId: "recipe-remixer-kdvyi",
  storageBucket: "recipe-remixer-kdvyi.appspot.com",
  messagingSenderId: "131586924581",
  appId: "1:131586924581:web:33bd31ee9aa3837615dfcc"
};

// Initialize Firebase for SSR
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
