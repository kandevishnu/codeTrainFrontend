import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  updateProfile,
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAL8Viyn-zi_LXmZxuEuuR1gYnsyMZwMu4",
  authDomain: "codetrain-40b2c.firebaseapp.com",
  projectId: "codetrain-40b2c",
  storageBucket: "codetrain-40b2c.appspot.com",
  messagingSenderId: "174063254444",
  appId: "1:174063254444:web:7a44527d37b106a60b9809",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

/* ✅ Signup with Email/Password (no gender, no role) */
export const registerWithEmailPassword = async (name, email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name,
      email,
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    }, { merge: true });

    return user;
  } catch (error) {
    throw error;
  }
};

/* ✅ Login with Email/Password */
export const loginWithEmailPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      lastLoginAt: serverTimestamp(),
    }, { merge: true });

    return user;
  } catch (error) {
    throw error;
  }
};

/* ✅ Google Sign-In (includes lastLoginAt + provider) */
export const signInWithGoogle = async () => {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    const user = res.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // New Google user: create their record
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        provider: "google",
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      // Existing Google user: just update login time
      await setDoc(userRef, {
        lastLoginAt: serverTimestamp(),
      }, { merge: true });
    }

    return user;
  } catch (err) {
    console.error("Google Sign-In Error:", err);
    throw err;
  }
};

/* ✅ Logout */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};
