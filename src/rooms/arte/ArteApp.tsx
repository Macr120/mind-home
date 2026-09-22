import { useEffect, useState } from 'react'
import { useAjustes } from '../../core/state/ajustesStore'
import { intencionApp } from '../../core/state/intencionApp'
import { EditorDibujo } from './EditorDibujo'
import { GaleriaDibujos } from './GaleriaDibujos'
import { retraducirArte, sembrarArte } from './seed'

/** El dibujo al que hay que entrar directo (`dibujo:<id>` del enlace compartido). */
function dibujoPedido(): number | null {
  const dato = intencionApp('arte')?.dato
  if (!dato?.startsWith('dibujo:')) return null
  const id = Number(dato.slice('dibujo:'.length))
  return Number.isInteger(id) && id > 0 ? id : null
}

/** Studio de arte: la galería de dibujos y, al abrir uno, su editor. */
export function ArteApp() {
  const [abierto, setAbierto] = useState<number | null>(dibujoPedido)

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
