import { useDiseño, esObjetoMapa } from '../state/disenoStore'
import { useHouse } from '../state/houseStore'
import { useMontura } from '../state/monturaStore'
import { playerPos } from '../state/playerPosition'
import { useHerramienta, type Herramienta } from '../state/herramientaStore'
import { esVehiculo, vehiculoDe, type TipoVehiculo } from '../house/vehiculos'
import { puntoLibreCerca } from '../house/Character'
import { usePortales } from '../house/portales'
import { lanzarCohete } from '../house/fuegos'
import { useGrafitis } from '../state/grafitiStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

const FICHAS = {
  saltar: { emoji: '🦘', clave: 'herr.saltar', fallback: 'Saltar' },
  correr: { emoji: '🏃', clave: 'herr.correr', fallback: 'Correr' },
  bailar: { emoji: '💃', clave: 'herr.bailar', fallback: 'Bailar' },
  cuerda: { emoji: '🪢', clave: 'herr.cuerda', fallback: 'Saltar la cuerda' },
  mortal: { emoji: '🤸', clave: 'herr.mortal', fallback: 'Mortal' },
  saludar: { emoji: '👋', clave: 'herr.saludar', fallback: 'Saludar' },
  laser: { emoji: '🔫', clave: 'herr.laser', fallback: 'Láser' },
  portales: { emoji: '🌀', clave: 'herr.portales', fallback: 'Portales' },
  fuegos: { emoji: '🎆', clave: 'herr.fuegos', fallback: 'Fuegos' },
  burbujas: { emoji: '🫧', clave: 'herr.burbujas', fallback: 'Burbujas' },
  grafiti: { emoji: '🎨', clave: 'herr.grafiti', fallback: 'Grafiti' },
} as const

/** Trae la instancia del mapa de ese tipo al jugador (o la crea) y la monta. */
async function invocar(tipo: TipoVehiculo) {
  const d = useDiseño.getState()
  let inst = d.objetos.find((o) => esObjetoMapa(o) && o.tipo === tipo)
  if (!inst) {
    await d.addObjetoMapa(tipo, vehiculoDe(tipo).defaultColor)
    inst = useDiseño
      .getState()
      .objetos.filter((o) => esObjetoMapa(o) && o.tipo === tipo)
      .at(-1)
  }
  if (!inst || inst.id == null) return
  const rotY = inst.rotY ?? 0
  // Buscar un hueco libre para el radio del vehículo: si nace solapado con otro
  // objeto o un muro, la conducción queda bloqueada (el auto era el más afectado).
  const nivel = useHouse.getState().playerLevel
  const libre = puntoLibreCerca(playerPos.x, playerPos.z, nivel, vehiculoDe(tipo).radio)
  await d.setObjetoPose(inst.id, libre.x, libre.z, rotY)
  useMontura.getState().montar({ ...inst, x: libre.x, z: libre.z, rotY })
}

/** Marco de un panel: encabezado con la herramienta y ✕ para desequiparla. */
function Panel({ h, emoji, etiqueta, children }: { h: Herramienta; emoji: string; etiqueta: string; children: React.ReactNode }) {
  const t = useT()
  const equipar = useHerramienta((s) => s.equipar)
  return (
    <div className="ui-hud ui-pop flex w-full flex-col gap-1 rounded-lg border border-white/10 p-2">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/50">
        <span>
          <Icono emoji={emoji} /> {etiqueta}
        </span>
        <button
          type="button"
          onClick={() => equipar(h)}
          title={t('herr.quitar', 'Quitar herramienta')}
          className="rounded px-1 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>
      {children}
    </div>
  )
}

const btn = 'flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border transition active:scale-90'
const btnClaro = `${btn} border-white/10 bg-white/10 text-white hover:bg-white/20`
const btnVerde = `${btn} border-emerald-400/60 bg-emerald-600 texto-cta`

/** Panel de una herramienta equipada (botón one-shot, toggle o vehículo). */
function PanelHerramienta({ h }: { h: Herramienta }) {
  const t = useT()
  const correr = useHerramienta((s) => s.correr)
  const bailando = useHerramienta((s) => s.bailando)
  const cuerda = useHerramienta((s) => s.cuerda)
  const burbujas = useHerramienta((s) => s.burbujas)
  const avisoGrafiti = useGrafitis((s) => s.aviso)
  const montadoId = useMontura((s) => s.instanciaId)
  const nivel = useHouse((s) => s.playerLevel)

  if (esVehiculo(h)) {
    const def = vehiculoDe(h)
    return (
      <Panel h={h} emoji={def.icono} etiqueta={t(`herr.veh.${def.tipo}`, def.nombre)}>
        {montadoId != null ? (
          <button type="button" onClick={() => useMontura.getState().solicitarDesmontar()} className={btnVerde}>
            <span className="text-2xl leading-none"><Icono emoji={def.icono} /></span>
            <span className="text-xs font-semibold">{t('veh.bajarte', 'Bajarte')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void invocar(h)}
            disabled={nivel > 0}
            title={nivel > 0 ? t('herr.soloPlantaBaja', 'Baja a la planta baja para invocarlo') : undefined}
            className={`${btnClaro} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <span className="text-2xl leading-none"><Icono emoji={def.icono} /></span>
            <span className="text-xs font-semibold">{t('herr.invocar', 'Invocar')}</span>
          </button>
        )}
      </Panel>
    )
  }

  const f = FICHAS[h]
  return (
    <Panel h={h} emoji={f.emoji} etiqueta={t(f.clave, f.fallback)}>
      {h === 'saltar' && (
        <button type="button" onClick={() => useHerramienta.getState().saltar()} className={btnClaro}>
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">{t('herr.saltarBtn', '¡Saltar!')}</span>
        </button>
      )}
      {h === 'correr' && (
        <button
          type="button"
          onClick={() => useHerramienta.getState().setCorrer(!correr)}
          className={correr ? btnVerde : btnClaro}
        >
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">
            {correr ? t('herr.corriendo', 'Corriendo') : t('herr.correr', 'Correr')}
          </span>
        </button>
      )}
      {h === 'bailar' && (
        <button
          type="button"
          onClick={() => useHerramienta.getState().setBailando(!bailando)}
          className={bailando ? btnVerde : btnClaro}
        >
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">
            {bailando ? t('herr.bailando', 'Bailando') : t('herr.bailar', 'Bailar')}
          </span>
        </button>
      )}
      {h === 'cuerda' && (
        <button
          type="button"
          onClick={() => useHerramienta.getState().setCuerda(!cuerda)}
          className={cuerda ? btnVerde : btnClaro}
        >
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">
            {cuerda ? t('herr.cuerdaOn', 'Saltando la cuerda') : t('herr.cuerda', 'Saltar la cuerda')}
          </span>
        </button>
      )}
      {h === 'mortal' && (
        <button type="button" onClick={() => useHerramienta.getState().mortal()} className={btnClaro}>
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">{t('herr.mortalBtn', '¡Mortal!')}</span>
        </button>
      )}
      {h === 'saludar' && (
        <button type="button" onClick={() => useHerramienta.getState().saludar()} className={btnClaro}>
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">{t('herr.saludarBtn', '¡Hola!')}</span>
        </button>
      )}
      {h === 'laser' && (
        <button type="button" onClick={() => useHerramienta.getState().disparar()} className={btnClaro}>
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">{t('herr.disparar', 'Disparar')}</span>
        </button>
      )}
      {h === 'portales' && (
        <>
          <button
            type="button"
            onClick={() => useHerramienta.getState().colocarPortal()}
            disabled={nivel > 0}
            title={nivel > 0 ? t('herr.soloPlantaBaja', 'Baja a la planta baja para invocarlo') : undefined}
            className={`${btnClaro} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
            <span className="text-xs font-semibold">{t('herr.portalColocar', 'Colocar portal')}</span>
          </button>
          <button
            type="button"
            onClick={() => usePortales.getState().limpiar()}
            className="h-8 w-full rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 transition hover:bg-white/15 active:scale-95"
          >
            {t('herr.portalQuitar', 'Quitar portales')}
          </button>
        </>
      )}
      {h === 'fuegos' && (
        <button
          type="button"
          onClick={() => lanzarCohete(playerPos.x, playerPos.y, playerPos.z)}
          className={btnClaro}
        >
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">{t('herr.fuegosBtn', '¡Lanzar!')}</span>
        </button>
      )}
      {h === 'burbujas' && (
        <button
          type="button"
          onClick={() => useHerramienta.getState().setBurbujas(!burbujas)}
          className={burbujas ? btnVerde : btnClaro}
        >
          <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
          <span className="text-xs font-semibold">
            {burbujas ? t('herr.burbujasOn', 'Soplando burbujas') : t('herr.burbujas', 'Burbujas')}
          </span>
        </button>
      )}
      {h === 'grafiti' && (
        <>
          <button type="button" onClick={() => useHerramienta.getState().pintarGrafiti()} className={btnClaro}>
            <span className="text-2xl leading-none"><Icono emoji={f.emoji} /></span>
            <span className="text-xs font-semibold">{t('herr.grafitiPintar', 'Pintar pared')}</span>
          </button>
          {avisoGrafiti && (
            <div className="rounded px-1 text-center text-[10px] font-semibold text-amber-300">
              {avisoGrafiti === 'sinMuro'
                ? t('herr.grafitiSinMuro', 'Acércate a una pared')
                : avisoGrafiti === 'curvo'
                  ? t('herr.grafitiMuroCurvo', 'Los muros curvos no se pintan')
                  : t('herr.grafitiMuroPuerta', 'Los muros con puerta no se pintan')}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

/**
 * Pila de controles de las herramientas equipadas (máx 3): ocupa el hueco del
 * cubo de vistas en `NavControls`. Cada panel tiene su ✕ para desequipar.
 */
export function ControlHerramienta() {
  const equipadas = useHerramienta((s) => s.equipadas)
  if (equipadas.length === 0) return null
  return (
    <div className="flex w-full flex-col gap-1">
      {equipadas.map((h) => (
        <PanelHerramienta key={h} h={h} />
      ))}
    </div>
  )
}
