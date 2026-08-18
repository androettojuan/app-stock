import type { Timestamp } from 'firebase/firestore'

export type Rol = 'admin' | 'operador'

export interface Negocio {
  id: string
  nombre: string
  rubro?: string
  activo: boolean
}

export interface Miembro {
  email: string
  nombre?: string
  rol: Rol
}

export interface Producto {
  id: string
  nombre: string
  sku?: string
  categoria?: string
  unidad: string
  stock: number
  minimo: number
  costo: number
  precio: number
  activo: boolean
}

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'

export interface Movimiento {
  id: string
  productoId: string
  nombre: string
  tipo: TipoMovimiento
  /** Cantidad siempre positiva; el signo lo define `tipo`. */
  cantidad: number
  costo?: number
  motivo?: string
  usuario: string
  fecha: string
  ts?: Timestamp
}

/** Datos que se cargan desde el formulario, sin los campos que pone el sistema. */
export type ProductoNuevo = Omit<Producto, 'id'>
