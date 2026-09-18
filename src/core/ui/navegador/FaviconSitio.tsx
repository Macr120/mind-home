import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { sitioDe } from '../../navegador/dominio'
import { Icono } from '../iconos/Icono'

/** Favicon guardado del sitio de `url` (lo bajó el shell); el icono de enlace si aún no hay. */
export function FaviconSitio({ url, className = 'h-4 w-4' }: { url: string; className?: string }) {
  const sitio = sitioDe(url)
  const favicon = useLiveQuery(async () => (await db.sitiosWeb.where('host').equals(sitio).first())?.favicon ?? null, [sitio])
  if (!favicon) {
    return (
      <span className="shrink-0 text-sm leading-none text-white/50">
        <Icono nombre="vincular" />
      </span>
    )
  }
  return <img src={favicon} alt="" aria-hidden draggable={false} className={`${className} shrink-0 rounded`} />
}
