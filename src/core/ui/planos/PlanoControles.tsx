import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useLayout } from '../../state/layoutStore'
import { usePlanos, type CapaPlano, type HerramientaPlano, type DetalleRejillaPlano } from '../../state/planosStore'
import { nivelMaximo, normalizarCeldasEnteras } from '../../house/planoGeometria'
import { celdasConexas } from '../../house/techoCeldas'
import { zonasRepo } from '../../data/repository'
import { PropiedadGrupo } from '../editor/PropiedadGrupo'
import { useT } from '../../i18n/useT'
import { confirmarCuartoAgregar } from './planoCuartoAgregar'
import {
  esGrupoExteriorCompleto,
  seleccionPisosExteriores,
  seleccionPisosInteriores,
} from '../../house/planoPisoSeleccion'

type HerramientaCfg = { id: HerramientaPlano; labelEs: string; icon: string; color?: string }

const CAPAS: { id: CapaPlano; labelEs: string; emoji: string }[] = [
  { id: 'cuartos', labelEs: 'Cuartos', emoji: '🏠' },
  { id: 'paredes', labelEs: 'Paredes', emoji: '🧱' },
  { id: 'pisos', labelEs: 'Pisos', emoji: '🟫' },
  { id: 'techos', labelEs: 'Techos', emoji: '🔺' },
]

const HERR_CUARTOS: HerramientaCfg[] = [
  { id: 'mover', labelEs: 'Mover', icon: '✥' },
  { id: 'borrar', labelEs: 'Borrar', icon: '⌫' },
  { id: 'agregar', labelEs: 'Agregar', icon: '＋' },
  { id: 'editar-forma', labelEs: 'Editar forma', icon: '◇' },
]

const FORMAS_LOSETA: { id: import('../../house/formasLoseta').FormaLoseta; labelEs: string; icon: string }[] = [
  { id: 'cuadrado', labelEs: 'Cuadrado', icon: '▢' },
  { id: 'triangular', labelEs: 'Triangular', icon: '△' },
  { id: 'circular', labelEs: 'Circular', icon: '○' },
]

const HERR_PAREDES: HerramientaCfg[] = [
  { id: 'seleccionar', labelEs: 'Seleccionar', icon: '↖' },
  { id: 'muro', labelEs: 'Muros', icon: '▬', color: '#b45309' },
  { id: 'puerta', labelEs: 'Puertas', icon: '⌸', color: '#22c55e' },
  { id: 'ventana', labelEs: 'Ventanas', icon: '▢', color: '#38bdf8' },
]

function Chip({
  activo,
  onClick,
  children,
  accent,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
  accent?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition"
      style={
        activo
          ? {
              background: accent ? `${accent}33` : 'rgba(52,211,153,0.18)',
              boxShadow: accent
                ? `inset 0 0 0 1px ${accent}`
                : 'inset 0 0 0 1px rgba(52,211,153,0.55)',
              color: accent ?? 'rgb(167,243,208)',
            }
          : {
              background: 'rgba(255,255,255,0.05)',
              color: accent ?? 'rgba(255,255,255,0.55)',
            }
      }
    >
      {children}
    </button>
  )
}

function AccionFila({
  onClick,
  disabled,
  children,
  accent,
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  accent?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-1 py-2 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-35"
      style={{
        background: accent ? `${accent}22` : 'rgba(255,255,255,0.06)',
        color: accent ?? 'rgba(255,255,255,0.7)',
        boxShadow: accent ? `inset 0 0 0 1px ${accent}55` : 'inset 0 0 0 1px rgba(255,255,255,0.1)',
      }}
    >
      {children}
    </button>
  )
}

function IconoDetalleRejilla({
  tipo,
  activo,
  onClick,
  title,
}: {
  tipo: DetalleRejillaPlano
  activo: boolean
  onClick: () => void
  title: string
}) {
  const borde = activo ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.12)'
  const fondo = activo ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.05)'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-white/10"
      style={{ background: fondo, boxShadow: `inset 0 0 0 1px ${borde}` }}
    >
      <svg viewBox="0 0 16 16" className="h-5 w-5" aria-hidden>
        {tipo === 'celda' ? (
          <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/70" />
        ) : (
          <>
            <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/45" />
            <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="0.75" className="text-white/55" />
            <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="0.75" className="text-white/55" />
          </>
        )}
      </svg>
    </button>
  )
}

/** Controles de plano (nivel, capa, herramienta) con estilo del editor de mapa. */
export function PlanoControles() {
  const t = useT()
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const accesos = useLayout((s) => s.accesos)
  const nivel = usePlanos((s) => s.nivel)
  const capa = usePlanos((s) => s.capa)
  const herramienta = usePlanos((s) => s.herramienta)
  const celdasMarcadas = usePlanos((s) => s.celdasMarcadas)
  const setNivel = usePlanos((s) => s.setNivel)
  const setCapa = usePlanos((s) => s.setCapa)
  const detalleRejilla = usePlanos((s) => s.detalleRejilla)
  const setDetalleRejilla = usePlanos((s) => s.setDetalleRejilla)
  const setHerramienta = usePlanos((s) => s.setHerramienta)
  const formaLoseta = usePlanos((s) => s.formaLoseta)
  const setFormaLoseta = usePlanos((s) => s.setFormaLoseta)
  const limpiarMarcadas = usePlanos((s) => s.limpiarMarcadas)
  const deshacerMarcada = usePlanos((s) => s.deshacerMarcada)
  const setAviso = usePlanos((s) => s.setAviso)
  const setSeleccion = usePlanos((s) => s.setSeleccion)
  const seleccion = usePlanos((s) => s.seleccion)

  const zonas = zonasRepo.useAll() ?? []

  const maxNivel = useMemo(
    () => nivelMaximo(placed, niveles, accesos),
    [placed, niveles, accesos],
  )

  const herramientas: HerramientaCfg[] =
    capa === 'paredes'
      ? HERR_PAREDES
      : capa === 'cuartos'
        ? HERR_CUARTOS
        : [{ id: 'seleccionar', labelEs: 'Seleccionar', icon: '↖' }]

  const enAgregar = capa === 'cuartos' && herramienta === 'agregar'
  const enEditarForma = capa === 'cuartos' && herramienta === 'editar-forma'
  const enPisosSeleccion = capa === 'pisos' && herramienta === 'seleccionar'
  const grupoInteriorActivo = seleccion?.tipo === 'pisos-interiores'
  const grupoExteriorActivo = esGrupoExteriorCompleto(seleccion, nivel, zonas)
  const puedeConfirmar =
    enAgregar &&
    normalizarCeldasEnteras(celdasMarcadas).length > 0 &&
    celdasConexas(normalizarCeldasEnteras(celdasMarcadas))

  const confirmar = () => {
    void confirmarCuartoAgregar({
      celdasMarcadas,
      nivel,
      placed,
      cells,
      footprints,
      niveles,
      zonas,
      setAviso,
      limpiarMarcadas,
      setSeleccion,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <PropiedadGrupo titulo={t('planos.nivel', 'Nivel')}>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: maxNivel + 1 }, (_, i) => (
                <Chip key={i} activo={nivel === i} onClick={() => setNivel(i)}>
                  {i}
                </Chip>
              ))}
            </div>
          </PropiedadGrupo>
        </div>
        <div className="shrink-0">
          {!enAgregar && !enEditarForma && (
            <PropiedadGrupo titulo={t('planos.detalle.titulo', 'Detalle')}>
              <div className="flex gap-1">
                <IconoDetalleRejilla
                  tipo="celda"
                  activo={detalleRejilla === 'celda'}
                  onClick={() => setDetalleRejilla('celda')}
                  title={t('planos.detalle.celda', 'Rejilla normal (1 celda)')}
                />
                <IconoDetalleRejilla
                  tipo="subcelda"
                  activo={detalleRejilla === 'subcelda'}
                  onClick={() => setDetalleRejilla('subcelda')}
                  title={t('planos.detalle.subcelda', 'Rejilla fina (solo mover cuartos)')}
                />
              </div>
            </PropiedadGrupo>
          )}
        </div>
      </div>

      <PropiedadGrupo titulo={t('planos.capa.titulo', 'Capa')}>
        <div className="grid grid-cols-2 gap-1.5">
          {CAPAS.map((c) => (
            <Chip key={c.id} activo={capa === c.id} onClick={() => setCapa(c.id)}>
              {c.emoji} {t(`planos.capa.${c.id}`, c.labelEs)}
            </Chip>
          ))}
        </div>
      </PropiedadGrupo>

      <PropiedadGrupo titulo={t('planos.herr.titulo', 'Herramienta')}>
        <div className="flex flex-col gap-1">
          {herramientas.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setHerramienta(h.id)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition"
              style={
                herramienta === h.id
                  ? {
                      background: h.color ? `${h.color}33` : 'rgba(52,211,153,0.18)',
                      boxShadow: h.color
                        ? `inset 0 0 0 1px ${h.color}`
                        : 'inset 0 0 0 1px rgba(52,211,153,0.55)',
                      color: h.color ?? 'rgb(167,243,208)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.05)',
                      color: h.color ?? 'rgba(255,255,255,0.55)',
                    }
              }
            >
              <span className="w-4 shrink-0 text-center">{h.icon}</span>
              {t(`planos.herr.${h.id}`, h.labelEs)}
            </button>
          ))}
          {enPisosSeleccion && (
            <div className="mt-1 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setSeleccion(seleccionPisosInteriores())}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition"
                style={
                  grupoInteriorActivo
                    ? {
                        background: 'rgba(52,211,153,0.18)',
                        boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.55)',
                        color: 'rgb(167,243,208)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.55)',
                      }
                }
              >
                <span className="w-4 shrink-0 text-center">🏠</span>
                {t('planos.grupo.interiores', 'Pisos interiores')}
              </button>
              <button
                type="button"
                onClick={() => setSeleccion(seleccionPisosExteriores(nivel, zonas))}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition"
                style={
                  grupoExteriorActivo
                    ? {
                        background: 'rgba(52,211,153,0.18)',
                        boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.55)',
                        color: 'rgb(167,243,208)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.55)',
                      }
                }
              >
                <span className="w-4 shrink-0 text-center">🌿</span>
                {t('planos.grupo.exteriores', 'Pisos exteriores')}
              </button>
            </div>
          )}
          {enEditarForma && (
            <div className="mt-2 space-y-2">
              <p className="text-[10px] leading-snug text-white/45">
                {t(
              'planos.forma.hint',
              'Toca una celda: triángulo = diagonal; circular = cuarto de círculo en esquina. Repite para rotar.',
            )}
              </p>
              <div className="grid grid-cols-3 gap-1">
                {FORMAS_LOSETA.map((f) => (
                  <Chip
                    key={f.id}
                    activo={formaLoseta === f.id}
                    onClick={() => setFormaLoseta(f.id)}
                  >
                    {f.icon} {t(`planos.forma.${f.id}`, f.labelEs)}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {enAgregar && (
            <p className="mt-2 text-[10px] leading-snug text-white/45">
              {t(
                'planos.agregar.hint',
                'Marca celdas unidas: el área es el espacio interior y el perímetro genera paredes con puertas.',
              )}
            </p>
          )}
          {capa === 'cuartos' && (
            <div className="mt-1 grid grid-cols-3 gap-1">
              <AccionFila
                onClick={deshacerMarcada}
                disabled={!enAgregar || celdasMarcadas.length === 0}
              >
                ↩ {t('planos.accion.regresar', 'Regresar')}
              </AccionFila>
              <AccionFila
                onClick={limpiarMarcadas}
                disabled={!enAgregar || celdasMarcadas.length === 0}
              >
                ✕ {t('planos.accion.cambios', 'Cambios')}
              </AccionFila>
              <AccionFila onClick={confirmar} disabled={!puedeConfirmar} accent="#34d399">
                ✓ {t('planos.accion.confirmar', 'Confirmar')}
              </AccionFila>
            </div>
          )}
        </div>
      </PropiedadGrupo>
    </div>
  )
}
