import { useState } from 'react'
import { EditorDibujo } from './EditorDibujo'
import { GaleriaDibujos } from './GaleriaDibujos'

/** Studio de arte: la galería de dibujos y, al abrir uno, su editor. */
export function ArteApp() {
  const [abierto, setAbierto] = useState<number | null>(null)

  return (
    <div className="h-full">
      {abierto == null ? (
        <GaleriaDibujos onAbrir={setAbierto} />
      ) : (
        <EditorDibujo id={abierto} alCerrar={() => setAbierto(null)} />
      )}
    </div>
  )
}
