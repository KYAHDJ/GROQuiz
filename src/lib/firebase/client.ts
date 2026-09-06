"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  type FirebaseStorage,
} from "firebase/storage";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  type Firestore,
  type DocumentData,
} from "firebase/firestore";
import type { HistoryRecord, SavedGame } from "@/lib/types";

const firebaseConfig = {
  apiKey: "AIzaSyBhIMEEx9RbE91ee2yJefp4fvTWGwA5xDs",
  authDomain: "groquiz.firebaseapp.com",
  projectId: "groquiz",
  storageBucket: "groquiz.firebasestorage.app",
  messagingSenderId: "640486560095",
  appId: "1:640486560095:web:b06a806dd23ec758a7e6ea",
  measurementId: "G-J4SFFR8TV9",
};

interface FirebaseClient {
  app: FirebaseApp;
  auth: ReturnType<typeof getAuth>;
  storage: FirebaseStorage;
  db: Firestore;
}

function createClient(): FirebaseClient | null {
  if (typeof window === "undefined") return null;
  try {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const storage = getStorage(app);
    const db = getFirestore(app);
    return { app, auth, storage, db };
  } catch (err) {
    console.warn("GROQuiz: Firebase init failed, using local storage:", err);
    return null;
  }
}

const client = createClient();
export const IS_FIREBASE_ENABLED = Boolean(client);

let currentUser: User | null = null;
const userWaiters: Array<(u: User | null) => void> = [];
let authStarted = false;

export interface FbUser {
  uid: string;
  email: string | null;
  anonymous: boolean;
}

type FbListener = (u: FbUser | null) => void;
const fbListeners = new Set<FbListener>();

function toFbUser(u: User | null): FbUser | null {
  if (!u) return null;
  return { uid: u.uid, email: u.email, anonymous: u.isAnonymous };
}

function emitChange(): void {
  const u = toFbUser(currentUser);
  fbListeners.forEach((cb) => cb(u));
}

export function onFirebaseUser(cb: FbListener): () => void {
  if (!client) return () => {};
  fbListeners.add(cb);
  cb(toFbUser(currentUser));
  return () => {
    fbListeners.delete(cb);
  };
}

function startAuth(client_: FirebaseClient): void {
  if (authStarted) return;
  authStarted = true;
  try {
    onAuthStateChanged(client_.auth, (u) => {
      currentUser = u;
      userWaiters.splice(0).forEach((fn) => fn(u));
      emitChange();
    });
    signInAnonymously(client_.auth).catch(() => {
      signInAnonymously(client_.auth).catch(() => {});
    });
  } catch {
    currentUser = null;
    userWaiters.splice(0).forEach((fn) => fn(null));
    emitChange();
  }
}

export function getFirebaseUser(): Promise<User | null> {
  if (!client) return Promise.resolve(null);
  if (currentUser) return Promise.resolve(currentUser);
  startAuth(client);
  if (currentUser) return Promise.resolve(currentUser);
  return new Promise((resolve) => userWaiters.push(resolve));
}

export function signInEmail(email: string, password: string): Promise<void> {
  if (!client) return Promise.reject(new Error("Firebase is unavailable"));
  return signInWithEmailAndPassword(client.auth, email, password).then(() => {});
}

export function signUpEmail(email: string, password: string): Promise<void> {
  if (!client) return Promise.reject(new Error("Firebase is unavailable"));
  return createUserWithEmailAndPassword(client.auth, email, password).then(() => {});
}

export function signInGoogle(): Promise<void> {
  if (!client) return Promise.reject(new Error("Firebase is unavailable"));
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(client.auth, provider).then(() => {});
}

export async function signOutFb(): Promise<void> {
  if (!client) return;
  await firebaseSignOut(client.auth);
}

function makeSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

const safeName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_");

export async function uploadPdfForProcessing(
  file: File,
  sessionId: string
): Promise<string | null> {
  if (!client) return null;
  try {
    const storageRef = ref(
      client.storage,
      `uploads/${sessionId}/${Date.now()}_${safeName(file.name)}`
    );
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (err) {
    console.warn("GROQuiz: PDF upload failed:", err);
    return null;
  }
}

export async function deletePdfUpload(url: string): Promise<void> {
  if (!client) return;
  try {
    const storageRef = ref(client.storage, url);
    await deleteObject(storageRef);
  } catch {
    // ignore cleanup errors
  }
}

export async function deleteUploadSession(sessionId: string): Promise<void> {
  if (!client) return;
  try {
    const dirRef = ref(client.storage, `uploads/${sessionId}`);
    const res = await listAll(dirRef);
    await Promise.all(res.items.map((s) => deleteObject(s)));
  } catch {
    // ignore cleanup errors
  }
}

export async function saveHistoryToFirebase(
  records: HistoryRecord[]
): Promise<void> {
  if (!client) return;
  const user = await getFirebaseUser();
  if (!user) return;
  try {
    const col = collection(client.db, "users", user.uid, "history");
    for (const record of records) {
      await setDoc(doc(col, record.id), record as DocumentData);
    }
  } catch (err) {
    console.warn("GROQuiz: history save to Firebase failed:", err);
  }
}

export async function loadHistoryFromFirebase(): Promise<HistoryRecord[] | null> {
  if (!client) return null;
  const user = await getFirebaseUser();
  if (!user) return null;
  try {
    const col = collection(client.db, "users", user.uid, "history");
    const snap = await getDocs(col);
    const out: HistoryRecord[] = snap.docs.map(
      (d) => d.data() as unknown as HistoryRecord
    );
    out.sort((a, b) => b.date - a.date);
    return out;
  } catch (err) {
    console.warn("GROQuiz: history load from Firebase failed:", err);
    return null;
  }
}

export async function deleteHistoryFromFirebase(id: string): Promise<void> {
  if (!client) return;
  const user = await getFirebaseUser();
  if (!user) return;
  try {
    await deleteDoc(doc(client.db, "users", user.uid, "history", id));
  } catch (err) {
    console.warn("GROQuiz: history delete from Firebase failed:", err);
  }
}

export async function saveGameToFirebase(save: SavedGame | null): Promise<void> {
  if (!client) return;
  const user = await getFirebaseUser();
  if (!user) return;
  try {
    const ref = doc(client.db, "users", user.uid, "save", "current");
    if (!save) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, save as DocumentData);
    }
  } catch (err) {
    console.warn("GROQuiz: save sync to Firebase failed:", err);
  }
}

export async function loadGameFromFirebase(): Promise<SavedGame | null> {
  if (!client) return null;
  const user = await getFirebaseUser();
  if (!user) return null;
  try {
    const snap = await getDocs(collection(client.db, "users", user.uid, "save"));
    if (snap.empty) return null;
    return snap.docs[0]?.data() as unknown as SavedGame;
  } catch (err) {
    console.warn("GROQuiz: save load from Firebase failed:", err);
    return null;
  }
}

export { makeSessionId };