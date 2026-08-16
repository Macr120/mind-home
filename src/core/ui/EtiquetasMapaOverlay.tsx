import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { VACIO, cultivosRepo, animalesRepo, corralesRepo } from '../data/repository'
import { ESPECIES, estadoCultivo, celdasRegadas } from '../house/cultivos'
import {
  estaHambriento,
  estaEnfermo,
  corralSucio,
  diasParaMorir,
  barraComida,
  barraAnimo,
} from '../state/granjaStore'
import { useAnimalSel } from '../state/animalSelStore'
import { useContexto } from '../state/contextoStore'
import { useDiseño, objetoPorId } from '../state/disenoStore'
import { barraComidaVida, barraAnimoVida } from '../state/vidaObjetoStore'
import { cellToWorld } from '../house/walls'
import { registrarAncla, quitarAncla, registrarDom, quitarDom } from '../house/etiquetasMapa'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'
import type { AnimalGranja, Corral, CultivoCelda, ObjetoCuarto } from '../data/db'

/**
 * Etiquetas flotantes del mapa: cada parcela sembrada muestra su siembra,
 * cuenta regresiva y cosechas; cada animal muestra su nombre. El proyector
 * de etiquetasMapa.ts posiciona los nodos por frame (aquí solo el contenido).
 */
export function EtiquetasMapaOverlay() {
  const editMode = useLayout((s) => s.editMode)
  const activeRoom = useHouse((s) => s.activeRoom)
  if (editMode || activeRoom) return null
  return <EtiquetasActivas />
}

function EtiquetasActivas() {
  const filas = cultivosRepo.useAll() ?? VACIO
  const animales = animalesRepo.useAll() ?? VACIO
  const corrales = corralesRepo.useAll() ?? VACIO
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const regadas = useMemo(() => celdasRegadas(filas), [filas])

  // Tick de 1 s para la cuenta regresiva, solo mientras algo crece.
  const [ahora, setAhora] = useState(() => Date.now())
  const creciendo = filas.some((f) => {
    const e = estadoCultivo(f, ahora, regadas.get(`${f.col},${f.row}`))
    return e != null && e.etapa !== 'listo' && e.etapa !== 'marchito'
  })
  useEffect(() => {
    if (!creciendo) return
    const id = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [creciendo])

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {filas
        .filter((f) => f.especie && f.col < gridCols && f.row < gridRows)
        .map((f) => (
          <EtiquetaParcela
            key={`${f.col},${f.row}`}
            fila={f}
            ahora={ahora}
            regadaDesde={regadas.get(`${f.col},${f.row}`)}
          />
        ))}
      {/* Tarjeta del animal seleccionado (nombre + barras); se oculta sola. */}
      <TarjetaAnimalSel animales={animales} corrales={corrales} ahora={ahora} />
      {/* Barras del objeto «con vida» que tienes al lado (mientras estés cerca). */}
      <TarjetaObjetoVivo />
    </div>
  )
}

/**
 * Objeto con el preset «Dale vida» al alcance: sus barras de comida y ánimo. No
 * necesita store de selección — se monta para el que ofrece «Acariciar» en
 * `contextoStore`, que es exactamente el que tienes delante.
 */
function TarjetaObjetoVivo() {
  const objetoId = useContexto((s) => s.acciones.find((a) => a.tipo === 'acariciarObjeto')?.id)
  if (objetoId == null) return null
  return <EtiquetaObjetoVivo key={objetoId} objetoId={objetoId} />
}

function EtiquetaObjetoVivo({ objetoId }: { objetoId: number }) {
  const t = useT()
  // `objetoPorId` es O(1) (índice memoizado): tres `.find()` por etiqueta
  // barrían el array entero en cada cambio del store.
  const nombre = useDiseño((s) => objetoPorId(s.objetos, objetoId)?.nombre)
  const comidaEn = useDiseño((s) => objetoPorId(s.objetos, objetoId)?.vidaComidaEn)
  const mimoEn = useDiseño((s) => objetoPorId(s.objetos, objetoId)?.vidaMimoEn)

  // Hambre y ánimo decaen en horas: medio minuto de resolución sobra.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const fila = { vidaComidaEn: comidaEn, vidaMimoEn: mimoEn } as ObjetoCuarto
  const comida = barraComidaVida(fila, ahora)
  return (
    <div
      ref={(el) => {
        const id = `vida:${objetoId}`
        if (el) registrarDom(id, el)
        else quitarDom(id)
      }}
      className="absolute start-0 top-0"
      style={{ display: 'none' }}
    >
      <div className="ui-hud pointer-events-none flex -translate-x-1/2 -translate-y-full flex-col gap-1 whitespace-nowrap rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white">
        {nombre && <span className={comida <= 0 ? 'text-amber-300' : undefined}>{nombre}</span>}
        <Barra
          icono="alimentar"
          titulo={t('granja.barra.comida', 'Comida')}
          nivel={comida}
          color={comida <= 0.4 ? '#f59e0b' : '#84cc16'}
        />
        <Barra
          icono="mimar"
          titulo={t('granja.barra.animo', 'Ánimo')}
          nivel={barraAnimoVida(fila, ahora)}
          color="#f472b6"
        />
      </div>
    </div>
  )
}

/**
 * Avisos que el usuario guardó al oprimirlos: "col,row" → clave del aviso
 * oculto (siembra + etapa). Vive fuera del componente para que sobrevivan a
 * entrar y salir de un cuarto; una siembra o etapa nueva vuelve a mostrarlos.
 */
const avisosGuardados = new Map<string, string>()

const cuentaRegresiva = (restanteMs: number): string => {
  const s = Math.max(0, Math.ceil(restanteMs / 1000))
  if (s < 3600) return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`
}

function EtiquetaParcela({
  fila,
  ahora,
  regadaDesde,
}: {
  fila: CultivoCelda
  ahora: number
  regadaDesde?: number
}) {
  const t = useT()
  // El detalle (contador + cosechas) se despliega con un clic y se repliega solo.
  const [expandida, setExpandida] = useState(false)
  // Repinta al guardar un aviso: sin nada creciendo el mapa no tiene tick.
  const [, repintar] = useState(0)
  const ancla = useRef<THREE.Vector3 | null>(null)
  if (ancla.current == null) {
    // El chip se posa sobre la tablita de la estaca (mitad del borde de arriba).
    const [x, , z] = cellToWorld(fila.col, fila.row)
    ancla.current = new THREE.Vector3(x, 1.5, z - 2.35)
  }
  useEffect(() => {
    const id = `parcela:${fila.col},${fila.row}`
    registrarAncla(id, () => ancla.current)
    return () => quitarAncla(id)
  }, [fila.col, fila.row])

  useEffect(() => {
    if (!expandida) return
    const id = window.setTimeout(() => setExpandida(false), 6000)
    return () => window.clearTimeout(id)
  }, [expandida])

  const def = ESPECIES[fila.especie!]
  const est = estadoCultivo(fila, ahora, regadaDesde)
  if (!est) return null
  const cubierta = regadaDesde != null && regadaDesde <= ahora
  const restante = (fila.plantadoEn ?? 0) + def.duracionMin * 60_000 - ahora
  // Las alertas (listo/marchito) salen completas hasta que el usuario las
  // guarda oprimiéndolas: entonces queda solo el icono, como las que crecen.
  const alerta = est.etapa === 'listo' || est.etapa === 'marchito'
  const celda = `${fila.col},${fila.row}`
  const claveAviso = `${fila.plantadoEn ?? 0}|${est.etapa}`
  const guardado = avisosGuardados.get(celda) === claveAviso
  const abierto = expandida || (alerta && !guardado)

  return (
    <div
      ref={(el) => {
        const id = `parcela:${fila.col},${fila.row}`
        if (el) registrarDom(id, el)
        else quitarDom(id)
      }}
      className="absolute start-0 top-0"
      style={{ display: 'none' }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          // Aviso a la vista: se guarda. Lo demás (o un aviso ya guardado)
          // despliega el detalle, que se repliega solo a los 6 s.
          if (alerta && !guardado) {
            avisosGuardados.set(celda, claveAviso)
            setExpandida(false)
            repintar((n) => n + 1)
          } else setExpandida((v) => !v)
        }}
        aria-label={t(`huerto.especie.${fila.especie}`, def.nombre)}
        title={
          alerta && !guardado
            ? t('huerto.etiqueta.guardar', 'Guardar aviso')
            : t('huerto.etiqueta.ver', 'Ver detalle')
        }
        className="ui-hud pointer-events-auto flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white transition active:scale-95"
      >
        <Icono emoji={def.icon} />
        {abierto && (
          <>
            <span>{t(`huerto.especie.${fila.especie}`, def.nombre)}</span>
            {est.etapa === 'listo' ? (
              <span className="animate-pulse text-emerald-300">✓ {t('huerto.etiqueta.listo', 'Listo')}</span>
            ) : est.etapa === 'marchito' ? (
              <span className="text-amber-200/80">{t('huerto.etiqueta.marchito', 'Marchito')}</span>
            ) : (
              <span className="font-normal tabular-nums text-white/80">{cuentaRegresiva(restante)}</span>
            )}
            {cubierta && est.etapa !== 'marchito' && (
              <span className="text-sky-300/80" title={t('huerto.aspersor.auto', 'Riego automático')}>
                <Icono nombre="aspersor" />
              </span>
            )}
            {(fila.cosechas ?? 0) > 0 && <span className="font-normal text-white/60">×{fila.cosechas}</span>}
          </>
        )}
        {/* La alerta de sed se ve aunque esté plegado (no se puede esconder). */}
        {est.sediento && (
          <span className="text-sky-300" title={t('huerto.herr.regar', 'Regar')}>
            <Icono nombre="regadera" />
          </span>
        )}
      </button>
    </div>
  )
}

/** Monta la tarjeta solo para el animal seleccionado y gestiona su ocultado. */
function TarjetaAnimalSel({
  animales,
  corrales,
  ahora,
}: {
  animales: AnimalGranja[]
  corrales: Corral[]
  ahora: number
}) {
  const animalId = useAnimalSel((s) => s.animalId)
  const limpiar = useAnimalSel((s) => s.limpiar)
  const fila = animales.find((a) => a.id === animalId)

  // Se oculta sola a los ~6 s, o antes al tocar en cualquier otro lado. El
  // listener de window se registra diferido para que el clic que seleccionó
  // no la cierre al instante (flush síncrono de React 19, como InteractOverlay).
  useEffect(() => {
    if (animalId == null) return
    const timer = window.setTimeout(limpiar, 6000)
    const fuera = () => limpiar()
    const registro = window.setTimeout(() => window.addEventListener('click', fuera), 0)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(registro)
      window.removeEventListener('click', fuera)
    }
  }, [animalId, limpiar])

  // El animal ya no existe (lo quitaron): cerrar la tarjeta.
  useEffect(() => {
    if (animalId != null && !fila) limpiar()
  }, [animalId, fila, limpiar])

  if (!fila || fila.id == null) return null
  const corral = corrales.find((c) => c.id === fila.corralId)
  return <EtiquetaAnimal fila={fila} sucio={corral != null && corralSucio(corral, ahora)} ahora={ahora} />
}

function EtiquetaAnimal({ fila, sucio, ahora }: { fila: AnimalGranja; sucio: boolean; ahora: number }) {
  const t = useT()
  const hambriento = estaHambriento(fila, ahora)
  const enfermo = estaEnfermo(fila, ahora)
  const comida = barraComida(fila, ahora)
  return (
    <div
      ref={(el) => {
        const id = `animal:${fila.id}`
        if (el) registrarDom(id, el)
        else quitarDom(id)
      }}
      className="absolute start-0 top-0"
      style={{ display: 'none' }}
    >
      <div className="ui-hud pointer-events-none flex -translate-x-1/2 -translate-y-full flex-col gap-1 whitespace-nowrap rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white">
        <span className={enfermo ? 'text-red-300' : hambriento ? 'text-amber-300' : undefined}>
          {fila.nombre}
        </span>
        {enfermo && fila.enfermoDesde != null && (
          <span className="flex items-center gap-1 text-red-300">
            <Icono nombre="curar" />
            {t('granja.etiqueta.enfermo', 'Enfermo')} ·{' '}
            {t('granja.etiqueta.dias', '{n} d', { n: diasParaMorir(fila, ahora) })}
          </span>
        )}
        <Barra
          icono="alimentar"
          titulo={t('granja.barra.comida', 'Comida')}
          nivel={comida}
          color={enfermo ? '#ef4444' : comida <= 0.4 ? '#f59e0b' : '#84cc16'}
        />
        <Barra
          icono="mimar"
          titulo={t('granja.barra.animo', 'Ánimo')}
          nivel={barraAnimo(fila, ahora, sucio)}
          color="#f472b6"
        />
      </div>
    </div>
  )
}

/** Mini barra de estado de la tarjeta (icono + nivel 0–1). */
function Barra({ icono, titulo, nivel, color }: { icono: NombreIcono; titulo: string; nivel: number; color: string }) {
  return (
    <span className="flex items-center gap-1" title={titulo}>
      <Icono nombre={icono} />
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.round(nivel * 100)}%`, backgroundColor: color }}
        />
      </span>
    </span>
  )
}
