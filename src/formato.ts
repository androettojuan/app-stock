// Los importes van siempre en pesos: el negocio no elige moneda.
const formateador = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

export function formatearImporte(valor: number) {
  return formateador.format(valor)
}

/** Un producto al que no le cargaron el dato: no hay importe que mostrar. */
export function sinCargar(valor: number | undefined | null): valor is undefined {
  return valor == null || !Number.isFinite(valor) || valor === 0
}

/** Importe para mostrar, o null si el dato no está cargado. */
export function importeOpcional(valor: number | undefined | null) {
  return sinCargar(valor) ? null : formatearImporte(valor as number)
}
