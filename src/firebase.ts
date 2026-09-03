import { initializeApp, type FirebaseApp } from "firebase/app"
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId,
  )
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null
let persistenceReady: Promise<void> | null = null

function getApp() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Add the VITE_FIREBASE_ keys and rebuild.")
  }
  if (!app) app = initializeApp(firebaseConfig)
  return app
}

export function getFirebaseAuth() {
  if (!auth) {
    const app = getApp()
    try {
      auth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      })
    } catch {
      auth = getAuth(app)
    }
    persistenceReady = Promise.resolve()
  }
  return auth
}

export function getFirebaseDb() {
  if (!db) db = getFirestore(getApp())
  return db
}

export function getFirebaseStorage() {
  if (!storage) storage = getStorage(getApp())
  return storage
}

export function whenAuthReady() {
  getFirebaseAuth()
  return persistenceReady ?? Promise.resolve()
}

export function firebaseErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
  if (code === "auth/email-already-in-use") {
    return "An educator with that email already has an account. Sign in instead."
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password is incorrect."
  }
  if (code === "auth/weak-password") return "Password must be at least 8 characters."
  if (code === "auth/invalid-email") return "Enter a valid professional email address."
  if (code === "auth/operation-not-allowed") {
    return "Email/password sign-in is not enabled in this Firebase project yet."
  }
  if (code === "auth/too-many-requests") {
    return "Too many sign-in attempts. Please wait a moment and try again."
  }
  if (code === "permission-denied") {
    return "Coursify could not read your educator profile. Check Firestore rules and try again."
  }
  if (code === "auth/network-request-failed") {
    return "Could not reach Firebase. Check your connection and try again."
  }
  if (error instanceof Error && error.message.includes("not configured")) return error.message
  return error instanceof Error ? error.message : "Something went wrong. Please try again."
}
