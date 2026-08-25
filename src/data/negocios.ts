import { collectionGroup, getDocs, getDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { CONFIG_POR_DEFECTO, type ConfigNegocio, type Negocio, type Rol } from '../types'

/** Un negocio sin `config`, o al que le falte una clave, cae en los valores por defecto. */
export function configDe(negocio: Negocio | null | undefined): ConfigNegocio {
  return { ...CONFIG_POR_DEFECTO, ...(negocio?.config ?? {}) }
}

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
        config: data.config,
        // El rol sale de la membresía con la que encontramos el negocio.
        rol: (d.data().rol as Rol) ?? 'operador',
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
  return {
    id: snap.id,
    nombre: data.nombre ?? snap.id,
    rubro: data.rubro,
    activo: data.activo !== false,
    config: data.config,
  }
}

/**
 * Se suscribe al negocio elegido, así un cambio de nombre o de configuración se
 * ve en el momento y en todas las pantallas abiertas.
 */
export function escucharNegocio(
  id: string,
  onCambio: (datos: Pick<Negocio, 'nombre' | 'rubro' | 'config'>) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    doc(db, 'negocios', id),
    (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      onCambio({ nombre: data.nombre ?? snap.id, rubro: data.rubro, config: data.config })
    },
    onError,
  )
}

/** Datos y configuración del negocio. Es lo único que las reglas dejan tocar al dueño. */
export function guardarNegocio(
  id: string,
  cambios: { nombre?: string; rubro?: string; config?: ConfigNegocio },
) {
  return updateDoc(doc(db, 'negocios', id), cambios)
}
