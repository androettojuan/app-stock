import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../firebase/config'

const proveedor = new GoogleAuthProvider()
// Que siempre pregunte con qué cuenta entrar: es común tener más de una.
proveedor.setCustomParameters({ prompt: 'select_account' })

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
    entrar: () => signInWithPopup(auth, proveedor),
    salir: () => signOut(auth),
  }
}
