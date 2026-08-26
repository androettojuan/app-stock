import { useEffect, useState } from 'react'

const CONSULTA = '(max-width: 720px)'

/**
 * La lista de productos no es la misma tabla achicada: en el teléfono es una
 * tarjeta con otra disposición, así que hace falta saber en cuál estamos.
 */
export function useEsMovil() {
  const [esMovil, setEsMovil] = useState(() => matchMedia(CONSULTA).matches)

  useEffect(() => {
    const media = matchMedia(CONSULTA)
    const alCambiar = (e: MediaQueryListEvent) => setEsMovil(e.matches)
    media.addEventListener('change', alCambiar)
    return () => media.removeEventListener('change', alCambiar)
  }, [])

  return esMovil
}
