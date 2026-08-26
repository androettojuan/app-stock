import { useState } from 'react'
import { IconoLuna, IconoSol } from './iconos'

interface Props {
  entrar: () => Promise<unknown>
  tema: 'claro' | 'oscuro'
  onCambiarTema: () => void
}

export function Login({ entrar, tema, onCambiarTema }: Props) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function onClick() {
    setError('')
    setEnviando(true)
    try {
      await entrar()
    } catch (e) {
      const codigo = (e as { code?: string }).code
      // Cerrar el popup a mano no es un error que valga la pena mostrar.
      if (codigo !== 'auth/popup-closed-by-user' && codigo !== 'auth/cancelled-popup-request') {
        setError('No pudimos entrar con Google. Probá de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <div className="login-titulo">
        <img className="logo" src="/icon-192.png" alt="" width="40" height="40" />
        <h1>Stockia</h1>
        <button
          type="button"
          className="secundario icono"
          onClick={onCambiarTema}
          title={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          aria-label={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          {tema === 'oscuro' ? <IconoSol /> : <IconoLuna />}
        </button>
      </div>
      <p className="login-texto">Entrá con tu cuenta de Google para ver tus negocios.</p>
      {error && <p className="error">{error}</p>}
      <button type="button" onClick={onClick} disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar con Google'}
      </button>
    </div>
  )
}
