import { useRef, useState } from 'react'
import type { Documento } from '../../core/data/db'
import { documentosRepo, historiasRepo, relacionesLibroRepo, VACIO } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPeligro, BotonSecundario, Vacio } from '../_shared/ui'
import { notaDeRelacion } from './fichas'
import { textoPlano } from './sanitizarHtml'

type Seleccion = { tipo: 'nodo'; id: number } | { tipo: 'arista'; id: number } | null

/**
 * Diagrama libre de relaciones entre los personajes de un libro: cada personaje
 * es un nodo arrastrable; tocar uno y luego otro los une con una etiqueta libre
 * y estrena la NOTA de la conexión (un documento que se lee en pequeño en la
 * tarjeta de abajo o en grande en la hoja). Las posiciones viven en el propio
 * personaje (`Documento.relX/relY`) y las aristas en `relacionesLibro`.
 */
export function DiagramaRelaciones({
  historiaId,
  alCerrar,
  onAbrirDoc,
}: {
  historiaId: number
  alCerrar: () => void
  /** Abrir en la hoja: la ficha del personaje o la nota de una conexión. */
  onAbrirDoc: (id: number) => void
}) {
  const t = useT()
  const libro = (historiasRepo.useAll() ?? VACIO).find((h) => h.id === historiaId)
  const docsLibro = (documentosRepo.useAll() ?? VACIO).filter((d) => d.historiaId === historiaId)
  const personajes = docsLibro.filter((d) => d.seccion === 'personaje')
  const aristas = (relacionesLibroRepo.useAll() ?? VACIO).filter((r) => r.historiaId === historiaId)

  const lienzoRef = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState<Seleccion>(null)
  /** El nodo en arrastre (posición provisional hasta soltar). */
  const [enMano, setEnMano] = useState<{ id: number; x: number; y: number } | null>(null)
  const gestoRef = useRef<{ id: number; x0: number; y0: number; movio: boolean } | null>(null)

  const nombreDe = (id?: number) => docsLibro.find((d) => d.id === id)?.titulo ?? ''
  const arSel = sel?.tipo === 'arista' ? aristas.find((r) => r.id === sel.id) : undefined

  /** Posición del personaje: la guardada, la del arrastre en curso, o un lugar del círculo inicial. */
  const posDe = (d: Documento, i: number): { x: number; y: number } => {
    if (enMano && enMano.id === d.id) return enMano
    if (d.relX != null && d.relY != null) return { x: d.relX, y: d.relY }
    const ang = (2 * Math.PI * i) / Math.max(1, personajes.length)
    return { x: 0.5 + 0.35 * Math.cos(ang), y: 0.5 + 0.35 * Math.sin(ang) }
  }

  const relDeEvento = (e: React.PointerEvent): { x: number; y: number } | null => {
    const r = lienzoRef.current?.getBoundingClientRect()
    if (!r || r.width === 0) return null
    return {
      x: Math.min(0.96, Math.max(0.04, (e.clientX - r.left) / r.width)),
      y: Math.min(0.94, Math.max(0.06, (e.clientY - r.top) / r.height)),
    }
  }

  const conectar = async (aId: number, bId: number) => {
    const texto = await pedirTexto({
      titulo: t('escritura.relaciones.etiqueta', '¿Qué relación tienen?'),
      mensaje: t('escritura.relaciones.etiquetaMsg', 'Hermanos, rivales, se deben dinero…'),
    })
    if (!texto) return
    const ahora = new Date().toISOString()
    // La nota de la conexión nace con ella; se desarrolla en la hoja.
    const docId = await documentosRepo.add({
      titulo: `${nombreDe(aId)} ↔ ${nombreDe(bId)}`,
      contenido: '',
      palabras: 0,
      historiaId,
      seccion: 'relacion',
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
    const rid = await relacionesLibroRepo.add({ historiaId, aId, bId, texto, docId, creadoEn: ahora })
    setSel({ tipo: 'arista', id: rid })
  }

  const tocarNodo = (d: Documento) => {
    if (d.id == null) return
    if (sel?.tipo === 'nodo' && sel.id !== d.id) {
      const aId = sel.id
      setSel(null)
      void conectar(aId, d.id)
      return
    }
    setSel(sel?.tipo === 'nodo' && sel.id === d.id ? null : { tipo: 'nodo', id: d.id })
  }

  const renombrarArista = async () => {
    if (!arSel?.id) return
    const texto = await pedirTexto({
      titulo: t('escritura.relaciones.renombrar', 'Cambiar la relación'),
      valor: arSel.texto,
    })
    if (texto && texto !== arSel.texto) await relacionesLibroRepo.update(arSel.id, { texto })
  }

  const borrarArista = async () => {
    if (!arSel?.id) return
    const ok = await confirmar({
      titulo: t('escritura.relaciones.borrar', 'Borrar relación'),
      mensaje: t('escritura.relaciones.borrarMsg', 'Su nota también se borra.'),
      peligro: true,
    })
    if (!ok) return
    setSel(null)
    if (arSel.docId != null) await documentosRepo.remove(arSel.docId)
    await relacionesLibroRepo.remove(arSel.id)
  }

  const abrirNota = async () => {
    if (!arSel) return
    onAbrirDoc(await notaDeRelacion(arSel, `${nombreDe(arSel.aId)} ↔ ${nombreDe(arSel.bId)}`))
  }

  const notaSel = arSel ? textoPlano(docsLibro.find((d) => d.id === arSel.docId)?.contenido ?? '') : ''

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <BotonSecundario pequeno onClick={alCerrar} aria-label={t('escritura.editor.volver', 'Volver')}>
          <Icono nombre="volver" /> {t('escritura.editor.volver', 'Volver')}
        </BotonSecundario>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {t('escritura.relaciones.titulo', 'Relaciones')}
          {libro ? ` · ${libro.titulo}` : ''}
        </p>
        {sel?.tipo === 'nodo' && (
          <BotonSecundario pequeno onClick={() => onAbrirDoc(sel.id)}>
            <Icono nombre="editar" /> {t('escritura.relaciones.abrirFicha', 'Abrir ficha')}
          </BotonSecundario>
        )}
      </div>

      {personajes.length === 0 ? (
        <Vacio
          icono="vinculo"
          titulo={t('escritura.relaciones.vacio', 'Aún no hay personajes')}
          sub={t(
            'escritura.relaciones.vacioSub',
            'Crea personajes en las carpetas del libro y aquí dibujas cómo se relacionan.',
          )}
        />
      ) : (
        <>
          <p className="shrink-0 text-xs text-white/45">
            {sel?.tipo === 'nodo'
              ? t('escritura.relaciones.eligeOtro', 'Ahora toca al otro personaje para unirlos.')
              : t(
                  'escritura.relaciones.ayuda',
                  'Arrastra a los personajes para acomodarlos; toca uno y luego otro para unirlos.',
                )}
          </p>
          <div
            ref={lienzoRef}
            className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/20"
            style={{ touchAction: 'none' }}
          >
            <svg className="absolute inset-0 h-full w-full">
              {aristas.map((r) => {
                const ia = personajes.findIndex((d) => d.id === r.aId)
                const ib = personajes.findIndex((d) => d.id === r.bId)
                if (ia < 0 || ib < 0) return null
                const a = posDe(personajes[ia], ia)
                const b = posDe(personajes[ib], ib)
                const activa = sel?.tipo === 'arista' && sel.id === r.id
                return (
                  <g
                    key={r.id}
                    onClick={() => r.id != null && setSel(activa ? null : { tipo: 'arista', id: r.id })}
                    className="cursor-pointer"
                  >
                    {/* Trazo ancho invisible: sin él la línea es imposible de tocar en móvil. */}
                    <line
                      x1={`${a.x * 100}%`}
                      y1={`${a.y * 100}%`}
                      x2={`${b.x * 100}%`}
                      y2={`${b.y * 100}%`}
                      stroke="transparent"
                      strokeWidth={16}
                    />
                    <line
                      x1={`${a.x * 100}%`}
                      y1={`${a.y * 100}%`}
                      x2={`${b.x * 100}%`}
                      y2={`${b.y * 100}%`}
                      stroke={activa ? 'var(--ui-accent)' : 'rgba(255,255,255,0.3)'}
                      strokeWidth={activa ? 2.5 : 1.5}
                    />
                    <text
                      x={`${((a.x + b.x) / 2) * 100}%`}
                      y={`${((a.y + b.y) / 2) * 100}%`}
                      dy={-5}
                      textAnchor="middle"
                      className="select-none"
                      fill={activa ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)'}
                      fontSize={11}
                    >
                      {r.texto}
                    </text>
                  </g>
                )
              })}
            </svg>
            {personajes.map((d, i) => {
              const p = posDe(d, i)
              const activo = sel?.tipo === 'nodo' && sel.id === d.id
              return (
                <button
                  key={d.id}
                  type="button"
                  onPointerDown={(e) => {
                    if (d.id == null) return
                    gestoRef.current = { id: d.id, x0: e.clientX, y0: e.clientY, movio: false }
                    // El capture mantiene el arrastre aunque el dedo salga del chip; si el
                    // puntero ya no está activo (clic automatizado) el tap sigue valiendo.
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId)
                    } catch {
                      /* sin capture */
                    }
                  }}
                  onPointerMove={(e) => {
                    const g = gestoRef.current
                    if (!g || g.id !== d.id) return
                    if (!g.movio && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 6) return
                    g.movio = true
                    const rel = relDeEvento(e)
                    if (rel) setEnMano({ id: g.id, ...rel })
                  }}
                  onPointerUp={() => {
                    const g = gestoRef.current
                    gestoRef.current = null
                    if (!g || g.id !== d.id) return
                    if (g.movio && enMano && enMano.id === d.id) {
                      // Sin tocar `actualizadoEn`: acomodar el diagrama no reordena nada.
                      void documentosRepo.update(d.id!, { relX: enMano.x, relY: enMano.y })
                      setEnMano(null)
                    } else {
                      setEnMano(null)
                      tocarNodo(d)
                    }
                  }}
                  className={`absolute max-w-36 -translate-x-1/2 -translate-y-1/2 cursor-grab truncate rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    activo
                      ? 'border-accent bg-accent/25 font-semibold text-white'
                      : 'border-white/20 bg-white/10 text-white/80 hover:bg-white/15'
                  }`}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                >
                  {d.titulo}
                </button>
              )
            })}
          </div>

          {/* La nota de la conexión seleccionada, en pequeño aquí mismo. */}
          {arSel && (
            <div className="shrink-0 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="truncate text-sm font-semibold">
                {nombreDe(arSel.aId)} ↔ {nombreDe(arSel.bId)}
                <span className="font-normal text-white/50"> · {arSel.texto}</span>
              </p>
              <p className="line-clamp-3 whitespace-pre-wrap text-xs text-white/60">
                {notaSel || t('escritura.relaciones.sinNota', 'Sin nota aún: ábrela en la hoja y escríbela.')}
              </p>
              <div className="flex flex-wrap gap-2">
                <BotonSecundario pequeno onClick={() => void abrirNota()}>
                  <Icono nombre="expandir" /> {t('escritura.relaciones.abrirHoja', 'Abrir en la hoja')}
                </BotonSecundario>
                <BotonSecundario pequeno onClick={() => void renombrarArista()}>
                  <Icono nombre="editar" /> {t('escritura.relaciones.renombrar', 'Cambiar la relación')}
                </BotonSecundario>
                <BotonPeligro pequeno onClick={() => void borrarArista()}>
                  <Icono nombre="basura" /> {t('escritura.relaciones.borrar', 'Borrar relación')}
                </BotonPeligro>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
