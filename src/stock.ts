import { sinCargar } from './formato'
import type { Producto } from './types'

/**
 * Un producto está bajo mínimo cuando su stock no supera el mínimo que le
 * cargaron. Al que no tiene mínimo no se le puede reclamar nada: sin ese dato
 * no hay forma de saber si le falta o le sobra.
 */
export function estaBajoMinimo(p: Producto) {
  if (sinCargar(p.minimo)) return false
  return (p.stock ?? 0) <= p.minimo
}
