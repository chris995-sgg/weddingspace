import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBEquD6-nod1C9JDPMvyY9WnrULMr5vfS4",
  authDomain: "hochzeitsplatform.firebaseapp.com",
  projectId: "hochzeitsplatform",
  storageBucket: "hochzeitsplatform.firebasestorage.app",
  messagingSenderId: "213128616705",
  appId: "1:213128616705:web:0764952457238c8d695900"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);