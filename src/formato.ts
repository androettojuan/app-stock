/** Monedas ofrecidas en la configuración del negocio. */
export const MONEDAS = [
  { codigo: 'ARS', nombre: 'Peso argentino' },
  { codigo: 'USD', nombre: 'Dólar' },
  { codigo: 'EUR', nombre: 'Euro' },
  { codigo: 'BRL', nombre: 'Real' },
  { codigo: 'CLP', nombre: 'Peso chileno' },
  { codigo: 'UYU', nombre: 'Peso uruguayo' },
  { codigo: 'PYG', nombre: 'Guaraní' },
  { codigo: 'BOB', nombre: 'Boliviano' },
  { codigo: 'PEN', nombre: 'Sol' },
  { codigo: 'COP', nombre: 'Peso colombiano' },
  { codigo: 'MXN', nombre: 'Peso mexicano' },
]

// Armar un Intl.NumberFormat no es gratis y esto se llama por cada celda.
const cache = new Map<string, Intl.NumberFormat>()

function formateador(moneda: string) {
  const guardado = cache.get(moneda)
  if (guardado) return guardado
  let f: Intl.NumberFormat
  try {
    f = new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda })
  } catch {
    // Código de moneda desconocido: al menos mostramos el número prolijo.
    f = new Intl.NumberFormat('es-AR')
  }
  cache.set(moneda, f)
  return f
}

export function formatearImporte(valor: number, moneda: string) {
  return formateador(moneda).format(valor)
}
