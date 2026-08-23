import { useT } from '../i18n/useT'
import { esProbar } from '../edicion'
import { esencialDeApp, flujosDeApp, lanzarEsencial, lanzarFlujo } from './registro'
import { Icono } from '../ui/iconos/Icono'

/**
 * La lista de tutoriales de UNA app en sus dos tipos: arriba «Lo esencial»
 * (corre en la casa real, recorre los menús) y debajo los «Ejemplos · casa
 * demo» (los flujos sobre el año de Pep@). La consumen el selector "?", el "?"
 * de la app abierta y Configuraciones › Tutoriales; también resuelve claves del
 * núcleo (el calendario) y la infraestructura (que solo tiene ejemplos).
 */
export function ListaToursApp({
  plantillaId,
  montada = false,
  alLanzar,
}: {
  plantillaId: string
  /** La app ya está en pantalla: el esencial no vuelve a abrir su cuarto. */
  montada?: boolean
  /** Cierra al contenedor (selector, menú del "?") antes de arrancar el tour. */
  alLanzar?: () => void
}) {
  const t = useT()
  const esencial = esencialDeApp(plantillaId)
  // En modo probar la casa demo no se ofrece (es de la app con cuenta y pago).
  const ejemplos = esProbar() ? [] : flujosDeApp(plantillaId)

  const claseBoton =
    'flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-start text-xs font-semibold text-white/75 transition hover:bg-white/10'

  return (
    <div className="space-y-1">
      {esencial && (
        <button
          type="button"
          onClick={() => {
            alLanzar?.()
            void lanzarEsencial(plantillaId, { montada })
          }}
          className={claseBoton}
        >
          <span className="min-w-0 flex-1 truncate">
            {t(esencial.titulo.clave, esencial.titulo.es)}
          </span>
          <Icono nombre="play" />
        </button>
      )}
      {ejemplos.length > 0 && (
        <>
          <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('tut.tipo.ejemplos', 'Ejemplos · casa demo')}
          </p>
          {ejemplos.map((def) => (
            <button
              key={def.id}
              type="button"
              onClick={() => {
                alLanzar?.()
                void lanzarFlujo(plantillaId, def, { montada })
              }}
              className={claseBoton}
            >
              <span className="min-w-0 flex-1 truncate">{t(def.titulo.clave, def.titulo.es)}</span>
              <Icono nombre="play" />
            </button>
          ))}
        </>
      )}
    </div>
  )
}
