import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User as FirebaseUser
} from "firebase/auth";

// Firebase configuration with provided values
const firebaseConfig = {
  apiKey: "AIzaSyBWAwN87Lg2InNx6Hp_K70vqSc7cj5wuKE",
  authDomain: "tele-storage-f4064.firebaseapp.com",
  projectId: "tele-storage-f4064",
  storageBucket: "tele-storage-f4064.firebasestorage.app",
  messagingSenderId: "756673574606",
  appId: "1:756673574606:web:fa24f4e6fb3e726f2e429f",
  measurementId: "G-9246XWZEFW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const loginWithEmailPassword = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmailPassword = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const logoutUser = () => {
  return signOut(auth);
};

export const getCurrentUser = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return user.getIdToken();
};

export { auth, app, onAuthStateChanged };
export type { FirebaseUser };
