import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Ito na ang TOTOONG keys mo para sa MediQueue
const firebaseConfig = {
  apiKey: "AIzaSyB7ybP1z7hg3WcGI8CK8D49z4G9lMBRafM",
  authDomain: "mediqueue-bf2f1.firebaseapp.com",
  databaseURL: "https://mediqueue-bf2f1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mediqueue-bf2f1",
  storageBucket: "mediqueue-bf2f1.firebasestorage.app",
  messagingSenderId: "69927221287",
  appId: "1:69927221287:web:f73a8f07f4763294f03602",
  measurementId: "G-B2PPXV72ZS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// I-export ang auth at database
export const auth = getAuth(app);
export const database = getDatabase(app);