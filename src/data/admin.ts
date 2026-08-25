import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Miembro, Rol } from '../types'

const miembrosRef = (negocioId: string) => collection(db, 'negocios', negocioId, 'miembros')

/**
 * La colección `superAdmins` se carga a mano desde la consola y cada usuario
 * solo puede leer su propia entrada, así que esto es un simple "¿soy yo?".
 */
export async function esSuperAdmin(email: string) {
  try {
    const snap = await getDoc(doc(db, 'superAdmins', email))
    return snap.exists()
  } catch {
    // Sin permiso de lectura la respuesta es la misma: no es super admin.
    return false
  }
}

/**
 * Crea el negocio y deja a quien lo crea como miembro, en un solo lote: un
 * negocio sin miembros no lo vería nadie, ni siquiera su autor.
 */
export async function crearNegocio(datos: { nombre: string; rubro?: string }, email: string) {
  const ref = doc(collection(db, 'negocios'))
  const lote = writeBatch(db)
  lote.set(ref, {
    nombre: datos.nombre,
    rubro: datos.rubro ?? '',
    activo: true,
    creado: serverTimestamp(),
  })
  lote.set(doc(miembrosRef(ref.id), email), {
    email,
    rol: 'admin' satisfies Rol,
    creado: serverTimestamp(),
  })
  await lote.commit()
  return ref.id
}

export function renombrarNegocio(negocioId: string, datos: { nombre: string; rubro?: string }) {
  return updateDoc(doc(db, 'negocios', negocioId), {
    nombre: datos.nombre,
    rubro: datos.rubro ?? '',
  })
}

/** Se suscribe a los miembros del negocio. Devuelve la función para cortar la escucha. */
export function escucharMiembros(
  negocioId: string,
  onCambio: (miembros: Miembro[]) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    query(miembrosRef(negocioId), orderBy('email')),
    (snap) => onCambio(snap.docs.map((d) => d.data() as Miembro)),
    onError,
  )
}

/**
 * El id del documento es el email, que es con lo que las reglas resuelven el
 * acceso. Se normaliza a minúsculas porque Google devuelve el mail así.
 */
export function agregarMiembro(negocioId: string, datos: { email: string; nombre?: string; rol: Rol }) {
  const email = datos.email.trim().toLowerCase()
  return setDoc(doc(miembrosRef(negocioId), email), {
    email,
    nombre: datos.nombre?.trim() ?? '',
    rol: datos.rol,
    creado: serverTimestamp(),
  })
}

export function quitarMiembro(negocioId: string, email: string) {
  return deleteDoc(doc(miembrosRef(negocioId), email))
}
