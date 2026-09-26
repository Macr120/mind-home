import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { EnlaceObjetoApp, ObjetoCuarto } from '../data/db'
import { textoEnlace } from '../enlaceApp'
import type { NodoEntidadApp } from '../grafoApps'
import {
  acomodarEntradas,
  colocarEntrada,
  crearEstante,
  entradaDeNodo,
  formaPara,
  modulosDe,
  mueblesParaAcomodar,
  nombreEstante,
  refrescarEntradas,
  TEMATICOS,
  type FormaElegida,
  type MotivoLleno,
} from '../house/acomodarEntradas'
import { claveEntrada, mismaEntrada, type TipoEstante } from '../house/formasEntrada'
import { esMueblePrincipal } from '../house/muebles'
import { useT, type TFunc } from '../i18n/useT'
import { getCuarto } from '../state/cuartosStore'
import { objetosDeCuartoIdx, useDiseño } from '../state/disenoStore'
import { useEditorUi } from '../state/editorUiStore'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { nombreObjeto } from './editor/EditorObjetosSection'
import { Icono } from './iconos/Icono'

/** Tope de entradas por «Acomodar todas»: un librero lleno ronda las 60. */
const TOPE_ACOMODAR = 80

/** Los nodos del grafo (una vez por apertura); de paso pone al día los objetos de entrada. */
function useNodos(): NodoEntidadApp[] {
  const [nodos, setNodos] = useState<NodoEntidadApp[]>([])
  useEffect(() => {
    let vivo = true
    void import('../grafoApps').then(async ({ nodosDeApps, refrescarNodosDeApps }) => {
      // Recién abierto: lo último de la app (un récord nuevo, una receta renombrada).
      refrescarNodosDeApps()
      const n = await nodosDeApps()
      if (!vivo) return
      setNodos(n)
      await refrescarEntradas(n)
    })
    return () => {
      vivo = false
    }
  }, [])
  return nodos
}

const NOMBRE_FORMA: Record<FormaElegida, [string, string]> = {
  libro: ['room.acomodar.libro', 'Libro'],
  caja: ['room.acomodar.caja', 'Caja'],
  mancuerna: ['room.acomodar.mancuerna', 'Mancuerna'],
  frasco: ['room.acomodar.frasco', 'Frasco'],
  trofeo: ['room.acomodar.trofeo', 'Trofeo'],
  marco: ['room.acomodar.marco', 'Portarretratos'],
  obra: ['room.acomodar.segunObra', 'Según la obra'],
}

/** Lo que frenó al estante, dicho para el aviso. */
function textoMotivo(t: TFunc, m: MotivoLleno): string {
  switch (m.tipo) {
    case 'muro':
      return t('room.acomodar.muro', 'El estante llegó al muro')
    case 'puerta':
      return t('room.acomodar.puerta', 'El estante llegó a una puerta')
    case 'objeto':
      return t('room.acomodar.objeto', 'El estante llegó a «{objeto}»: muévelo para que siga creciendo', {
        objeto: m.nombre ?? t('objetos.nombreGenerico', 'Objeto'),
      })
    default:
      return t('room.acomodar.sinSitio', 'Ya no cabe nada en ese mueble')
  }
}

/**
 * El desplegable de «Enlazar a un objeto» (encabezado del cuarto). Una entrada
 * vive en UN objeto de la casa (enlazarla aquí la quita de donde estaba). Dos
 * maneras:
 * - ligarla a un objeto que ya está en el cuarto (quedan fuera el principal y
 *   los que tienen una app entera, como en la pulsación larga);
 * - CREAR su objeto (libro, caja o el de la app: mancuerna, frasco, trofeo,
 *   portarretratos) en un mueble —o en un librero, estante o estante especial
 *   nuevos, que crecen con las entradas hasta el muro— y hasta acomodarlas todas.
 * Va aparte y en diferido porque el nombre de los objetos es el del editor.
 */
export default function EnlazarObjetoPanel({
  roomId,
  entrada,
  onCerrar,
}: {
  roomId: string
  entrada: EnlaceObjetoApp
  onCerrar: () => void
}) {
  const t = useT()
  const delCuarto = useDiseño(useShallow((s) => objetosDeCuartoIdx(s.objetos, roomId)))
  const todos = useDiseño((s) => s.objetos)
  const objetos = delCuarto.filter((o) => !esMueblePrincipal(o) && !o.plantillaId)
  const muebles = mueblesParaAcomodar(delCuarto, roomId)
  const setObjetoEnlaceApp = useDiseño((s) => s.setObjetoEnlaceApp)
  const { app, seccion } = textoEnlace(entrada)
  const destino = entrada.titulo ?? seccion ?? app?.nombre ?? ''
  const tematico = TEMATICOS[entrada.plantillaId]
  const nodos = useNodos()

  const [forma, setForma] = useState<FormaElegida>(tematico?.forma ?? 'libro')
  const [muebleId, setMuebleId] = useState<number | null>(null)
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const mueble = muebles.find((m) => m.id === muebleId) ?? muebles[0] ?? null

  // La entrada abierta con lo que dice su nodo (la clase de la obra, el peso del ejercicio).
  const nodo = entrada.ref ? nodos.find((n) => n.ref === entrada.ref) : undefined
  const entradaRica: EnlaceObjetoApp = nodo
    ? {
        ...entradaDeNodo(entrada.plantillaId, nodo),
        ...(entrada.seccion ? { seccion: entrada.seccion } : {}),
        ...(entrada.dato ? { dato: entrada.dato } : {}),
      }
    : entrada
  // Dónde vive ya esta entrada (una entrada, un objeto).
  const duenio = claveEntrada(entrada) ? todos.find((o) => mismaEntrada(o.enlaceApp, entrada)) : undefined

  // Las entradas de la app que aún no están en ningún objeto de la casa.
  const pendientes = useMemo(() => {
    const puestas = new Set(todos.map((o) => claveEntrada(o.enlaceApp)).filter(Boolean))
    const soloTipo = tematico && forma === tematico.forma ? tematico.tipoNodo : null
    return nodos
      .filter(
        (n) =>
          !n.abrir &&
          (tematico?.todasLasApps ? n.tipo === tematico.tipoNodo : n.appId === entrada.plantillaId) &&
          (!soloTipo || n.tipo === soloTipo) &&
          !puestas.has(n.ref),
      )
      .sort((a, b) =>
        a.pesoKg != null || b.pesoKg != null
          ? (a.pesoKg ?? 0) - (b.pesoKg ?? 0)
          : a.titulo.localeCompare(b.titulo),
      )
      .slice(0, TOPE_ACOMODAR)
      .map((n) => entradaDeNodo(entrada.plantillaId, n))
  }, [nodos, todos, tematico, forma, entrada.plantillaId])

  const conMueble = async (fn: (m: ObjetoCuarto) => Promise<void>) => {
    if (!mueble || ocupado) return
    setOcupado(true)
    try {
      await fn(mueble)
    } finally {
      setOcupado(false)
    }
  }
  const crearUna = () =>
    conMueble(async (m) => {
      const r = await colocarEntrada(m, entradaRica, formaPara(forma, entradaRica))
      setAviso(r.id == null ? textoMotivo(t, r.motivo) : r.movido ? t('room.acomodar.movida', 'Se mudó a este mueble') : '')
    })
  const crearTodas = () =>
    conMueble(async (m) => {
      const { n, motivo } = await acomodarEntradas(m, pendientes, forma)
      setAviso(
        !motivo
          ? t('room.acomodar.hechas', '{n} acomodadas', { n })
          : motivo.tipo === 'lleno'
            ? t('room.acomodar.cupieron', 'Cupieron {n}: el mueble se llenó', { n })
            : t('room.acomodar.cupieronMotivo', 'Cupieron {n}. {motivo}', { n, motivo: textoMotivo(t, motivo) }),
      )
    })
  const nuevoEstante = async (tipo: TipoEstante) => {
    if (ocupado) return
    setOcupado(true)
    try {
      const e = await crearEstante(roomId, tipo)
      if (e?.id != null) setMuebleId(e.id)
      // El estante especial trae su forma (el rack, mancuernas); un librero o un
      // estante respetan la elegida (en Entretenimiento, «según la obra»).
      if (tematico?.estante === tipo) setForma(tematico.forma)
      setAviso('')
    } finally {
      setOcupado(false)
    }
  }
  // Las herramientas de objetos: el editor en «Crear»; el objeto nuevo sale
  // después en la lista de arriba para enlazarlo.
  const abrirEditor = () => {
    onCerrar()
    useHouse.getState().closeRoom()
    useLayout.getState().setEditMode(true)
    const ui = useEditorUi.getState()
    ui.setTab('objetos')
    ui.setObjRaiz('crear')
    ui.setObjCrear('crear')
  }

  const chip = (activo: boolean) =>
    `rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
      activo ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200' : 'border-white/15 text-white/60 hover:text-white'
    }`
  const formas: FormaElegida[] = ['libro', 'caja', ...(tematico && tematico.forma !== 'libro' && tematico.forma !== 'caja' ? [tematico.forma] : [])]
  const nuevos: TipoEstante[] = ['librero', 'estante', ...(tematico?.estante ? [tematico.estante] : [])]
  const nombreMueble = (m: ObjetoCuarto) => {
    const n = modulosDe(todos, m).length
    return n > 1 ? `${nombreObjeto(m, t)} ×${n}` : nombreObjeto(m, t)
  }

  return (
    <>
      {/* Cierra al tocar fuera. */}
      <div className="fixed inset-0 z-40" onClick={onCerrar} aria-hidden />
      <div className="ui-panel ui-pop absolute end-0 top-full z-50 mt-2 max-h-[75vh] w-80 overflow-y-auto rounded-xl border border-white/10 p-3 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {t('room.enlazarObjeto.titulo', '¿Qué objeto del cuarto abre esto?')}
        </p>
        <p className="truncate text-sm font-bold text-white/90">{destino}</p>
        {duenio && (
          <p className="mb-1 flex items-center gap-1 truncate text-[11px] text-emerald-300/80">
            <Icono nombre="vincular" />
            {t('room.enlazarObjeto.ahoraEn', 'Ahora en {objeto} · {cuarto}', {
              objeto: nombreObjeto(duenio, t),
              cuarto: getCuarto(duenio.roomId)?.nombre ?? '',
            })}
          </p>
        )}
        <div className="mb-2" />
        {objetos.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-white/45">
            {t('room.enlazarObjeto.vacio', 'No hay objetos libres en este cuarto: el principal y los que llevan una app no se enlazan.')}
          </p>
        ) : (
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {objetos.map((o) => {
              const enlazado = mismaEntrada(o.enlaceApp, entrada)
              // Tiene otro destino: enlazarlo aquí lo reemplaza (un solo destino por objeto).
              const otro = !enlazado && Boolean(o.enlaceApp || o.enlaceUrl || o.programa)
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => void setObjetoEnlaceApp(o.id!, enlazado ? null : entradaRica)}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-start text-xs transition ${
                    enlazado
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                      : 'border-white/10 text-white/75 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <Icono nombre={enlazado ? 'confirmar' : 'vincular'} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{nombreObjeto(o, t)}</span>
                  {enlazado ? (
                    <span className="shrink-0 text-[10px] text-white/55">{t('room.enlazarObjeto.quitar', 'Quitar')}</span>
                  ) : (
                    otro && (
                      <span className="shrink-0 text-[10px] text-amber-300/80">
                        {t('room.enlazarObjeto.reemplaza', 'Reemplaza su enlace')}
                      </span>
                    )
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Crear y acomodar en un librero o estante ── */}
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('room.acomodar.titulo', 'Crear y acomodar en un mueble')}
          </p>
          <div className="flex flex-wrap gap-1">
            {formas.map((f) => (
              <button key={f} type="button" onClick={() => setForma(f)} className={chip(forma === f)}>
                {t(NOMBRE_FORMA[f][0], NOMBRE_FORMA[f][1])}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {muebles.map((m) => (
              <button key={m.id} type="button" onClick={() => setMuebleId(m.id!)} className={chip(m.id === mueble?.id)}>
                {nombreMueble(m)}
              </button>
            ))}
            {nuevos.map((tipo) => (
              <button key={tipo} type="button" disabled={ocupado} onClick={() => void nuevoEstante(tipo)} className={chip(false)}>
                + {nombreEstante(tipo)}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={!mueble || ocupado}
              onClick={() => void crearUna()}
              className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-40"
            >
              {duenio?.formaEntrada ? t('room.acomodar.mover', 'Mover aquí') : t('room.acomodar.crear', 'Crear para esto')}
            </button>
            {pendientes.length > 0 && (
              <button
                type="button"
                disabled={!mueble || ocupado}
                onClick={() => void crearTodas()}
                className="rounded-lg border border-white/15 bg-white/5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-40"
              >
                {t('room.acomodar.todas', 'Acomodar todas las entradas ({n})', { n: pendientes.length })}
              </button>
            )}
          </div>
          {aviso && <p className="text-[11px] text-amber-300/85">{aviso}</p>}
          <button
            type="button"
            onClick={abrirEditor}
            className="flex items-center gap-1 text-[11px] font-semibold text-white/55 transition hover:text-white"
          >
            <Icono nombre="editar" />
            {t('room.acomodar.editor', 'Diseñar otro objeto en el editor')}
          </button>
        </div>
      </div>
    </>
  )
}
