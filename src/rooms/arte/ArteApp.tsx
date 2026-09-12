import { useEffect, useState } from 'react'
import { useAjustes } from '../../core/state/ajustesStore'
import { EditorDibujo } from './EditorDibujo'
import { GaleriaDibujos } from './GaleriaDibujos'
import { retraducirArte, sembrarArte } from './seed'

/** Studio de arte: la galería de dibujos y, al abrir uno, su editor. */
export function ArteApp() {
  const [abierto, setAbierto] = useState<number | null>(null)

  // Los dibujos de fábrica salen en el idioma activo, y al CAMBIAR de idioma
  // los que nadie tocó se reescriben en el nuevo (retraducirArte).
  const idioma = useAjustes((s) => s.idioma)
  useEffect(() => {
    void sembrarArte().then(retraducirArte)
  }, [idioma])

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
