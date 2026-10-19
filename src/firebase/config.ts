import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export const usaEmulador = import.meta.env.VITE_USE_EMULATOR === '1'

// Los puertos de siempre, salvo que se pidan otros (npm run capturas usa los
// suyos para no chocar con otros emuladores abiertos).
const puerto = (nombre: string, defecto: number) =>
  Number(import.meta.env[`VITE_PUERTO_${nombre}`] ?? defecto)

if (usaEmulador) {
  connectAuthEmulator(auth, `http://127.0.0.1:${puerto('AUTH', 9099)}`, { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', puerto('FIRESTORE', 8080))
  connectStorageEmulator(storage, '127.0.0.1', puerto('STORAGE', 9199))
  // El emulador acepta un token de Google sin firmar: así un script entra como
  // cualquier cuenta sin pasar por el popup. Nunca existe fuera del emulador.
  Object.assign(window, {
    stockiaEntrar: (email: string, nombre: string) =>
      signInWithCredential(
        auth,
        GoogleAuthProvider.credential(
          JSON.stringify({ sub: email, email, name: nombre, email_verified: true }),
        ),
      ),
  })
}
