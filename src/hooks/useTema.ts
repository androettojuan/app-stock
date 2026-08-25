import { useEffect, useState } from 'react'

export type Tema = 'claro' | 'oscuro'

const CLAVE = 'app-stock:tema'

function temaInicial(): Tema {
  const guardado = localStorage.getItem(CLAVE)
  if (guardado === 'claro' || guardado === 'oscuro') return guardado
  // Sin elección previa seguimos lo que tenga configurado el sistema.
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    localStorage.setItem(CLAVE, tema)
  }, [tema])

  return {
    tema,
    alternar: () => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro')),
  }
}
