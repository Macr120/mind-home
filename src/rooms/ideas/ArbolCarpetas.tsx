import { useMemo, useState } from 'react'
import type { CarpetaIdea } from '../../core/data/db'
import { borrarCarpetaIdea, carpetasIdeaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'

/** Carpeta con sus hijas resueltas y cuántas ideas cuelgan de ella. */
interface NodoCarpeta {
  carpeta: CarpetaIdea
  /** Ideas propias + las de sus descendientes (es el número de la píldora). */
  total: number
  propias: number
  hijas: NodoCarpeta[]
}

/** Id estable de una carpeta; el mismo molde que `nod-…` de los mapas. */
export function nuevaCarpetaId(): string {
  return `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * El diario en carpetas anidables. `Archivador` no sirve aquí: ese agrupa por
 * fecha y es plano; esto es un árbol que ordena el usuario.
 *
 * Ninguna operación pierde ideas: borrar una carpeta las sube a la de arriba
 * salvo que pidas lo contrario.
 */
export function ArbolCarpetas({
  carpetas,
  conteos,
  actual,
  onElegir,
}: {
  carpetas: CarpetaIdea[]
  /** Ideas por `carpetaId`; la clave '' son las que están en la raíz. */
  conteos: Map<string, number>
  /** Carpeta abierta ('' = raíz del diario). */
  actual: string
  onElegir: (carpetaId: string) => void
}) {
  const t = useT()
  const [plegadas, setPlegadas] = useState<ReadonlySet<string>>(new Set())

  const arbol = useMemo<NodoCarpeta[]>(() => {
    const hijasDe = new Map<string, CarpetaIdea[]>()
    for (const c of carpetas) {
      const clave = c.padreId ?? ''
      const lista = hijasDe.get(clave) ?? []
      lista.push(c)
      hijasDe.set(clave, lista)
    }
    for (const lista of hijasDe.values()) lista.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))

    // Recursión acotada por `vistas`: una carpeta cuyo padre acabe apuntándola
    // (fusión rara de dos dispositivos) colgaría infinito sin esto.
    const vistas = new Set<string>()
    const armar = (c: CarpetaIdea): NodoCarpeta => {
      vistas.add(c.carpetaId)
      const hijas = (hijasDe.get(c.carpetaId) ?? []).filter((h) => !vistas.has(h.carpetaId)).map(armar)
      const propias = conteos.get(c.carpetaId) ?? 0
      return { carpeta: c, propias, total: propias + hijas.reduce((a, h) => a + h.total, 0), hijas }
    }
    return (hijasDe.get('') ?? []).map(armar)
  }, [carpetas, conteos])

  const crear = async (padreId: string | null) => {
    const nombre = await pedirTexto({
      titulo: padreId
        ? t('ideas.carp.nuevaSub', 'Nueva subcarpeta')
        : t('ideas.carp.nueva', 'Nueva carpeta'),
      textoOk: t('ideas.carp.crear', 'Crear'),
    })
    if (!nombre?.trim()) return
    const hermanas = carpetas.filter((c) => (c.padreId ?? null) === padreId)
    await carpetasIdeaRepo.add({
      carpetaId: nuevaCarpetaId(),
      padreId,
      nombre: nombre.trim(),
      orden: hermanas.length,
      creadoEn: new Date().toISOString(),
    })
  }

  const filaBase =
    'group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition'

  const pintar = (n: NodoCarpeta, prof: number) => {
    const abierta = !plegadas.has(n.carpeta.carpetaId)
    const activa = actual === n.carpeta.carpetaId
    return (
      <div key={n.carpeta.carpetaId}>
        <div
          className={`${filaBase} ${activa ? 'text-black' : 'text-white/75 hover:bg-white/10'}`}
          style={{ paddingLeft: `${0.5 + prof * 0.85}rem`, background: activa ? COLOR : undefined }}
        >
          {n.hijas.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                setPlegadas((prev) => {
                  const s = new Set(prev)
                  if (s.has(n.carpeta.carpetaId)) s.delete(n.carpeta.carpetaId)
                  else s.add(n.carpeta.carpetaId)
                  return s
                })
              }
              className="w-3 shrink-0 text-center opacity-60 transition hover:opacity-100"
              title={t('ideas.carp.plegar', 'Plegar')}
              aria-label={t('ideas.carp.plegar', 'Plegar')}
            >
              {abierta ? '▾' : '▸'}
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <button
            type="button"
            onClick={() => onElegir(n.carpeta.carpetaId)}
            className="flex min-w-0 flex-1 items-center gap-1.5"
          >
            <Icono emoji={n.carpeta.emoji ?? '📁'} />
            <span className="min-w-0 truncate">{n.carpeta.nombre}</span>
            {n.total > 0 && (
              <span className={`shrink-0 text-[10px] ${activa ? 'text-black/60' : 'text-white/35'}`}>
                {n.total}
              </span>
            )}
          </button>

          <Acciones
            activa={activa}
            onSub={() => void crear(n.carpeta.carpetaId)}
            onRenombrar={async () => {
              const nombre = await pedirTexto({
                titulo: t('ideas.carp.renombrar', 'Renombrar carpeta'),
                valor: n.carpeta.nombre,
                textoOk: t('ideas.diario.listo', 'Listo'),
              })
              if (nombre?.trim() && n.carpeta.id != null) {
                await carpetasIdeaRepo.update(n.carpeta.id, { nombre: nombre.trim() })
              }
            }}
            onBorrar={async () => {
              const ok = await confirmar({
                titulo: t('ideas.carp.borrarTit', '¿Borrar «{n}»?', { n: n.carpeta.nombre }),
                mensaje: t(
                  'ideas.carp.borrarMsg',
                  'Se borran también sus subcarpetas. Las ideas NO se pierden: suben a la carpeta de arriba.',
                ),
                textoOk: t('ideas.borrar', 'Borrar'),
                peligro: true,
              })
              if (!ok) return
              await borrarCarpetaIdea(n.carpeta.carpetaId, { borrarIdeas: false })
              if (activa) onElegir('')
            }}
          />
        </div>
        {abierta && n.hijas.length > 0 && <div>{n.hijas.map((h) => pintar(h, prof + 1))}</div>}
      </div>
    )
  }

  const enRaiz = conteos.get('') ?? 0

  return (
    <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-2">
      <button
        type="button"
        onClick={() => onElegir('')}
        className={`${filaBase} ${actual === '' ? 'text-black' : 'text-white/75 hover:bg-white/10'}`}
        style={actual === '' ? { background: COLOR } : undefined}
      >
        <span className="w-3 shrink-0" />
        <Icono nombre="lluvia" />
        <span className="min-w-0 flex-1 truncate font-semibold">
          {t('ideas.carp.todas', 'Todas las ideas')}
        </span>
        {enRaiz > 0 && (
          <span className={`shrink-0 text-[10px] ${actual === '' ? 'text-black/60' : 'text-white/35'}`}>
            {enRaiz}
          </span>
        )}
      </button>

      {arbol.map((n) => pintar(n, 0))}

      <button
        type="button"
        onClick={() => void crear(null)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/45 transition hover:bg-white/10 hover:text-white/80"
      >
        <span className="w-3 shrink-0" />
        <Icono nombre="agregar" /> {t('ideas.carp.nueva', 'Nueva carpeta')}
      </button>
    </div>
  )
}

/** Los tres botones de una carpeta; se ven al pasar por encima o si está abierta. */
function Acciones({
  activa,
  onSub,
  onRenombrar,
  onBorrar,
}: {
  activa: boolean
  onSub: () => void
  onRenombrar: () => void
  onBorrar: () => void
}) {
  const t = useT()
  const btn = `shrink-0 rounded px-1 py-0.5 text-[11px] transition ${
    activa ? 'text-black/50 hover:bg-black/10 hover:text-black' : 'text-white/25 hover:bg-white/10 hover:text-white/80'
  }`
  return (
    <span className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
      <button type="button" onClick={onSub} className={btn} title={t('ideas.carp.nuevaSub', 'Nueva subcarpeta')} aria-label={t('ideas.carp.nuevaSub', 'Nueva subcarpeta')}>
        <Icono nombre="agregar" />
      </button>
      <button type="button" onClick={onRenombrar} className={btn} title={t('ideas.editar', 'Editar')} aria-label={t('ideas.editar', 'Editar')}>
        <Icono nombre="editar" />
      </button>
      <button type="button" onClick={onBorrar} className={btn} title={t('ideas.borrar', 'Borrar')} aria-label={t('ideas.borrar', 'Borrar')}>
        <Icono nombre="basura" />
      </button>
    </span>
  )
}
