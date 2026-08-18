import {
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Movimiento, TipoMovimiento } from '../types'

const movimientosRef = (negocioId: string) => collection(db, 'negocios', negocioId, 'movimientos')

export function escucharMovimientos(
  negocioId: string,
  onCambio: (movimientos: Movimiento[]) => void,
  onError?: (e: Error) => void,
  tope = 100,
) {
  return onSnapshot(
    query(movimientosRef(negocioId), orderBy('ts', 'desc'), limit(tope)),
    (snap) => {
      onCambio(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Movimiento))
    },
    onError,
  )
}

export interface AltaMovimiento {
  productoId: string
  nombre: string
  tipo: TipoMovimiento
  /** Positiva siempre; en 'ajuste' es el stock final que queda. */
  cantidad: number
  costo?: number
  motivo?: string
  usuario: string
}

/**
 * Registra el movimiento y corrige el stock del producto en la misma
 * transacción, para que no se pisen dos cargas simultáneas.
 */
export async function registrarMovimiento(negocioId: string, mov: AltaMovimiento) {
  const productoRef = doc(db, 'negocios', negocioId, 'productos', mov.productoId)
  const nuevoMovRef = doc(movimientosRef(negocioId))

  await runTransaction(db, async (tx) => {
    const productoSnap = await tx.get(productoRef)
    if (!productoSnap.exists()) throw new Error('El producto ya no existe')

    const stockActual: number = productoSnap.data().stock ?? 0
    if (mov.tipo === 'salida' && mov.cantidad > stockActual) {
      throw new Error(`No hay stock suficiente: quedan ${stockActual}`)
    }

    tx.update(
      productoRef,
      mov.tipo === 'ajuste'
        ? { stock: mov.cantidad, actualizado: serverTimestamp() }
        : {
            stock: increment(mov.tipo === 'entrada' ? mov.cantidad : -mov.cantidad),
            actualizado: serverTimestamp(),
          },
    )

    tx.set(nuevoMovRef, {
      ...mov,
      // En un ajuste guardamos la diferencia real contra el stock que había.
      cantidad: mov.tipo === 'ajuste' ? mov.cantidad - stockActual : mov.cantidad,
      fecha: new Date().toISOString().slice(0, 10),
      ts: serverTimestamp(),
    })
  })
}
