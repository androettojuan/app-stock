import { useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../firebase/config'

export function useAuth() {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUsuario(u)
    setCargando(false)
  }), [])

  return {
    usuario,
    cargando,
    entrar: (email: string, clave: string) => signInWithEmailAndPassword(auth, email, clave),
    salir: () => signOut(auth),
  }
}
