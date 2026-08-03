import { useState } from 'react'
import { plantillasInfraestructura, DESCRIPCIONES } from '../registry'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'
import { VACIO, caminosRepo, cultivosRepo, animalesRepo } from '../data/repository'
import { useDiseño } from '../state/disenoStore'
import { useCaminos } from '../state/caminosStore'
import { useCanchas, esCancha, CANCHAS, type ClaseCancha } from '../state/canchasStore'
import { useGranja } from '../state/granjaStore'
import { useHuerto } from '../state/huertoStore'
import { usePaintball, leerMarcadorPaintball } from '../state/paintballStore'

interface SubOpcion {
  id: string
  etiqueta: string
  icono?: NombreIcono
  emoji?: string
  accion: () => void
}

/** Atajos de cada tarjeta: entran directo al editor con el tipo ya elegido. */
function subOpcionesDe(id: string, t: ReturnType<typeof useT>): SubOpcion[] {
  switch (id) {
    case 'caminos':
      return [
        {
          id: 'pista',
          etiqueta: t('caminos.tipo.pista', 'Pista de carreras'),
          icono: 'pista',
          accion: () => {
            useCaminos.getState().iniciar()
            useCaminos.getState().setTipo('pista')
          },
        },
        {
          id: 'coaster',
          etiqueta: t('caminos.tipo.coaster', 'Montaña rusa'),
          icono: 'montana-rusa',
          accion: () => {
            useCaminos.getState().iniciar()
            useCaminos.getState().setTipo('coaster')
          },
        },
        {
          id: 'riel',
          etiqueta: t('caminos.tipo.riel', 'Riel de tren'),
          icono: 'riel',
          accion: () => {
            useCaminos.getState().iniciar()
            useCaminos.getState().setTipo('riel')
          },
        },
      ]
    case 'canchas':
      return (Object.keys(CANCHAS) as ClaseCancha[]).map((c) => ({
        id: c,
        etiqueta: t(`canchas.clase.${c}`, CANCHAS[c].corto),
        emoji: CANCHAS[c].icon,
        accion: () => {
          useCanchas.getState().iniciar()
          useCanchas.getState().setClase(c)
        },
      }))
    case 'granja':
      return [
        {
          id: 'granja',
          etiqueta: t('infra.sub.animales', 'Animales'),
          icono: 'animal',
          accion: () => useGranja.getState().iniciar(),
        },
        {
          id: 'huerto',
          etiqueta: t('room.huerto.nombre', 'Comida'),
          icono: 'sembrar',
          accion: () => useHuerto.getState().iniciar(),
        },
      ]
    case 'paintball':
      return [
        {
          id: '1v1',
          etiqueta: t('paintball.m1v1', '1 vs 1'),
          icono: 'paintball',
          accion: () => usePaintball.getState().iniciar('1v1'),
        },
        {
          id: '2v2',
          etiqueta: t('paintball.m2v2', '2 vs 2'),
          icono: 'paintball',
          accion: () => usePaintball.getState().iniciar('2v2'),
        },
        {
          id: 'royale',
          etiqueta: t('paintball.mRoyale', 'Batalla campal'),
          icono: 'paintball',
          accion: () => usePaintball.getState().iniciar('royale'),
        },
      ]
    default:
      return []
  }
}

/**
 * Catálogo de plantillas de Complementos: no se asignan a cuartos, se
 * construyen sobre el mapa 3D con su propio editor (Circuitos, Canchas, Granja).
 * Cada tarjeta se puede desplegar para elegir un tipo concreto (p. ej. Circuitos
 * → circuito de carreras / montaña rusa / riel) y entrar directo a construirlo.
 */
export function InfraestructuraCatalogo({ alConstruir }: { alConstruir: () => void }) {
  const t = useT()
  const caminos = caminosRepo.useAll() ?? VACIO
  const cultivos = cultivosRepo.useAll() ?? VACIO
  const animales = animalesRepo.useAll() ?? VACIO
  const objetos = useDiseño((s) => s.objetos)
  // Piezas construidas por plantilla (tramos / canchas / animales + parcelas).
  const conteos: Record<string, number> = {
    caminos: caminos.length,
    canchas: objetos.filter((o) => esCancha(o.tipo)).length,
    granja: animales.length + cultivos.length,
  }
  // Comida y Granja comparten editor: una sola tarjeta (Granja) lo abre y
  // desde sus pestañas se salta a Comida.
  const lista = plantillasInfraestructura().filter((p) => p.id !== 'huerto')

  const [abiertas, setAbiertas] = useState<Set<string>>(new Set())
  const alternar = (id: string) =>
    setAbiertas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div className="space-y-2 px-1">
      <p className="px-1 text-[11px] leading-snug text-white/45">
        {t('infra.ayuda', 'Estas plantillas no viven en un cuarto: se construyen sobre el mapa 3D con su propio editor.')}
      </p>
      {lista.map((p) => {
        const subOpciones = subOpcionesDe(p.id, t)
        const abierta = abiertas.has(p.id)
        return (
          <section key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl"
                style={{ background: `${p.color}33` }}
              >
                <Icono emoji={p.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white/90">
                  {t(`room.${p.id}.nombre`, p.nombre)}
                </div>
                <div className="text-[10px] text-white/40">
                  {p.id === 'paintball'
                    ? `${t('paintball.marcador', 'Victorias')}: ${leerMarcadorPaintball().victorias}`
                    : `${t('infra.construidas', 'Construidas')}: ${conteos[p.id] ?? 0}`}
                </div>
              </div>
              {subOpciones.length > 0 && (
                <button
                  type="button"
                  onClick={() => alternar(p.id)}
                  title={abierta ? t('infra.plegar', 'Ocultar opciones') : t('infra.desplegar', 'Elegir tipo')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white/80"
                >
                  <Icono nombre="siguiente" className={`transition-transform ${abierta ? 'rotate-90' : ''}`} />
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-white/55">
              {t(`room.${p.id}.desc`, DESCRIPCIONES[p.id] ?? '')}
            </p>
            {abierta && subOpciones.length > 0 ? (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {subOpciones.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    data-tut={`infra.construir.${p.id}.${o.id}`}
                    onClick={() => {
                      alConstruir()
                      o.accion()
                    }}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-semibold text-white/85 transition hover:bg-white/15 active:scale-95"
                  >
                    {o.icono ? <Icono nombre={o.icono} /> : <Icono emoji={o.emoji} />}
                    <span className="truncate">{o.etiqueta}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                data-tut={`infra.construir.${p.id}`}
                onClick={() => {
                  alConstruir()
                  p.construir?.()
                }}
                className="mt-2 h-8 w-full rounded-lg text-xs font-bold text-white transition hover:brightness-110"
                style={{ background: `${p.color}cc` }}
              >
                {p.id === 'paintball' ? (
                  <>
                    <Icono nombre="paintball" /> {t('paintball.jugar', 'Jugar en el mapa')}
                  </>
                ) : (
                  <>
                    <Icono nombre="construir" /> {t('infra.construir', 'Construir en el mapa')}
                  </>
                )}
              </button>
            )}
          </section>
        )
      })}
    </div>
  )
}
