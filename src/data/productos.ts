import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Producto, ProductoNuevo } from '../types'

const productosRef = (negocioId: string) => collection(db, 'negocios', negocioId, 'productos')

/** Se suscribe a los productos del negocio. Devuelve la función para cortar la escucha. */
export function escucharProductos(
  negocioId: string,
  onCambio: (productos: Producto[]) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    query(productosRef(negocioId), orderBy('nombre')),
    (snap) => {
      onCambio(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Producto))
    },
    onError,
  )
}

export function crearProducto(negocioId: string, producto: ProductoNuevo) {
  return addDoc(productosRef(negocioId), { ...producto, actualizado: serverTimestamp() })
}

export function editarProducto(negocioId: string, id: string, cambios: Partial<ProductoNuevo>) {
  return updateDoc(doc(db, 'negocios', negocioId, 'productos', id), {
    ...cambios,
    actualizado: serverTimestamp(),
  })
}

export function borrarProducto(negocioId: string, id: string) {
  return deleteDoc(doc(db, 'negocios', negocioId, 'productos', id))
}
