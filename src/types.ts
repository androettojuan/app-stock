import type { Timestamp } from 'firebase/firestore'

export type Rol = 'admin' | 'operador'

export interface Negocio {
  id: string
  nombre: string
  rubro?: string
  activo: boolean
  config?: ConfigNegocio
  /** Rol del usuario que está mirando, según su documento en `miembros`. */
  rol?: Rol
}

/** Ajustes del negocio. Todo opcional: un negocio viejo sin `config` usa CONFIG_POR_DEFECTO. */
export interface ConfigNegocio {
  /** Código ISO de la moneda con que se muestran los importes. */
  moneda: string
  /** Unidad que viene puesta al cargar un producto nuevo. */
  unidadDefecto: string
  /** Mínimo que viene puesto al cargar un producto nuevo. */
  minimoDefecto: number
  /** Sugerencias para no escribirlas a mano en cada producto. */
  categorias: string[]
  unidades: string[]
}

export const CONFIG_POR_DEFECTO: ConfigNegocio = {
  moneda: 'ARS',
  unidadDefecto: 'u',
  minimoDefecto: 0,
  categorias: [],
  unidades: ['u', 'kg', 'l', 'm', 'caja'],
}

export interface Miembro {
  email: string
  nombre?: string
  rol: Rol
}

export interface Producto {
  id: string
  nombre: string
  /** URL de descarga de la foto en Storage, si le cargaron una. */
  foto?: string
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
