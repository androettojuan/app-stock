import { collectionGroup, getDocs, getDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Negocio } from '../types'

/**
 * Negocios donde el usuario figura como miembro. Se busca por collection group
 * sobre `miembros`, así una sola consulta cubre todos los negocios.
 */
export async function negociosDelUsuario(email: string): Promise<Negocio[]> {
  const snap = await getDocs(
    query(collectionGroup(db, 'miembros'), where('email', '==', email)),
  )

  const negocios: (Negocio | null)[] = await Promise.all(
    snap.docs.map(async (d) => {
      const negocioRef = d.ref.parent.parent
      if (!negocioRef) return null
      const negocioSnap = await getDoc(negocioRef)
      if (!negocioSnap.exists()) return null
      const data = negocioSnap.data()
      return {
        id: negocioSnap.id,
        nombre: data.nombre ?? negocioSnap.id,
        rubro: data.rubro,
        activo: data.activo !== false,
      } satisfies Negocio
    }),
  )

  return negocios
    .filter((n): n is Negocio => n !== null && n.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export async function negocio(id: string): Promise<Negocio | null> {
  const snap = await getDoc(doc(db, 'negocios', id))
  if (!snap.exists()) return null
  const data = snap.data()
  return { id: snap.id, nombre: data.nombre ?? snap.id, rubro: data.rubro, activo: data.activo !== false }
}
