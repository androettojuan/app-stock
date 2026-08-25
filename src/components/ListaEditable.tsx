import { useState, type KeyboardEvent } from 'react'

interface Props {
  titulo: string
  ayuda?: string
  valores: string[]
  onCambiar: (valores: string[]) => void
  soloLectura?: boolean
  placeholder?: string
}

/** Lista de textos cortos (categorías, unidades) que se agregan y se sacan de a uno. */
export function ListaEditable({ titulo, ayuda, valores, onCambiar, soloLectura, placeholder }: Props) {
  const [nuevo, setNuevo] = useState('')

  function agregar() {
    const limpio = nuevo.trim()
    if (!limpio) return
    // Sin repetidos, comparando sin distinguir mayúsculas.
    if (valores.some((v) => v.toLowerCase() === limpio.toLowerCase())) return setNuevo('')
    onCambiar([...valores, limpio])
    setNuevo('')
  }

  // Esto vive dentro del formulario de configuración, así que no puede ser otro
  // <form>: Enter agrega el valor en vez de guardar toda la configuración.
  function onTecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    agregar()
  }

  return (
    <div className="lista-editable">
      <h4>{titulo}</h4>
      {ayuda && <p className="dato">{ayuda}</p>}
      <ul className="chips">
        {valores.map((v) => (
          <li key={v} className="chip">
            {v}
            {!soloLectura && (
              <button
                type="button"
                className="chip-quitar"
                onClick={() => onCambiar(valores.filter((x) => x !== v))}
                aria-label={`Quitar ${v}`}
              >
                ×
              </button>
            )}
          </li>
        ))}
        {valores.length === 0 && <li className="dato">Todavía no hay ninguna.</li>}
      </ul>
      {!soloLectura && (
        <div className="barra">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={onTecla}
            placeholder={placeholder}
          />
          <button type="button" className="secundario" onClick={agregar}>Agregar</button>
        </div>
      )}
    </div>
  )
}
