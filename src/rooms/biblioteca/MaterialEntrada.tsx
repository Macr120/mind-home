import { Suspense, useEffect, useState } from 'react'
import type { MaterialEntrada as Enlace, TipoMaterial } from '../../core/data/db'
import { VACIO, materialEntradaRepo, useMaterialDeEntrada } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'
import {
  CAMPO_ID_MATERIAL,
  abrirMaterial,
  proveedorMaterial,
  tiposMaterialDisponibles,
  type ContextoMaterial,
} from '../../core/materialApps'
import { pedirTexto } from '../../core/state/confirmarStore'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { OP_MATERIAL } from './costosIA'

const ICONO: Record<TipoMaterial, NombreIcono> = { hoja: 'hoja', mapa: 'nodos', idea: 'foco' }

const idDe = (e: Enlace): number | undefined => e[CAMPO_ID_MATERIAL[e.tipo]]

/** Id estable del enlace; fuera del componente porque `Date.now` es impuro. */
function nuevoMaterialId(): string {
  return `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Material de estudio enlazado a una entrada: hojas de cálculo de la sala de
 * cómputo, mapas conceptuales y otras ideas.
 *
 * Se puede crear vacío, GENERAR con IA a partir de lo que dice la entrada o
 * enlazar algo que ya tengas, y cada pieza se VE aquí mismo (▾) sin salir de
 * la entrada. Editarla sí es cosa de su cuarto: Biblioteca no duplica editores.
 * Quitar el enlace no borra nada; si el material desapareció, la fila se apaga.
 */
export function MaterialEntrada({
  entradaId,
  contexto,
}: {
  entradaId: number
  /** Lo que dice la entrada: es lo que lee la IA al generar material. */
  contexto: ContextoMaterial
}) {
  const t = useT()
  // `VACIO` y no `[]`: un array nuevo por render dispararía el efecto de abajo
  // en bucle (es justo para lo que existe esa constante en repository.ts).
  const enlaces: Enlace[] = useMaterialDeEntrada(entradaId) ?? VACIO
  const [menu, setMenu] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [generando, setGenerando] = useState<TipoMaterial | null>(null)
  /** Enlaces con la vista previa desplegada. */
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(new Set())
  /** Nombre vigente por enlace; null = el material ya no existe. */
  const [nombres, setNombres] = useState<Record<string, string | null>>({})

  // El título guardado es el del momento de enlazar: se refresca contra la app
  // dueña para que renombrar una hoja se note también desde aquí.
  useEffect(() => {
    let vivo = true
    void Promise.all(
      enlaces.map(async (e) => {
        const id = idDe(e)
        const p = proveedorMaterial(e.tipo)
        if (id == null || !p) return [e.materialId, null] as const
        return [e.materialId, await p.nombre(id)] as const
      }),
    ).then((pares) => {
      if (vivo) setNombres(Object.fromEntries(pares))
    })
    return () => {
      vivo = false
    }
  }, [enlaces])

  const tipos = tiposMaterialDisponibles()
  if (tipos.length === 0 && enlaces.length === 0) return null

  const etiqueta: Record<TipoMaterial, string> = {
    hoja: t('biblioteca.mat.hoja', 'Hoja de cálculo'),
    mapa: t('biblioteca.mat.mapa', 'Mapa o diagrama'),
    idea: t('biblioteca.mat.idea', 'Idea'),
  }
  // Cada tipo trae su propia frase en vez de componer «Nuevo {tipo}»: en
  // español el género lo pone el sustantivo (una hoja, un mapa).
  const etiquetaNueva: Record<TipoMaterial, string> = {
    hoja: t('biblioteca.mat.nuevaHoja', 'Nueva hoja de cálculo'),
    mapa: t('biblioteca.mat.nuevoMapa', 'Nuevo mapa o diagrama'),
    idea: t('biblioteca.mat.nuevaIdea', 'Nueva idea'),
  }

  const enlazar = async (tipo: TipoMaterial, id: number, titulo: string) => {
    const materialId = nuevoMaterialId()
    await materialEntradaRepo.add({
      materialId,
      entradaId,
      tipo,
      [CAMPO_ID_MATERIAL[tipo]]: id,
      titulo,
      orden: enlaces.length,
      creadoEn: new Date().toISOString(),
    })
    setMenu(false)
    return materialId
  }

  const crear = async (tipo: TipoMaterial) => {
    const p = proveedorMaterial(tipo)
    if (!p) return
    const nombre = await pedirTexto({
      titulo: t('biblioteca.mat.crearTit', 'Nuevo: {tipo}', { tipo: etiqueta[tipo] }),
      valor: contexto.titulo,
      textoOk: t('biblioteca.enc.crear', 'Crear'),
    })
    if (!nombre?.trim()) return
    await enlazar(tipo, await p.crear(nombre.trim()), nombre.trim())
  }

  /** ✨: la IA lo arma con el título y el resumen de la entrada. */
  const generar = async (tipo: TipoMaterial) => {
    const p = proveedorMaterial(tipo)
    if (!p?.generar || generando) return
    setGenerando(tipo)
    setAviso(null)
    try {
      const r = await p.generar(contexto)
      // Lo recién generado se enseña abierto: es lo primero que quieres ver.
      const materialId = await enlazar(tipo, r.id, r.nombre)
      setAbiertos((prev) => new Set(prev).add(materialId))
    } catch (e) {
      setAviso(e instanceof Error ? e.message : t('biblioteca.mat.falloIA', 'La IA no pudo generar el material.'))
    } finally {
      setGenerando(null)
    }
  }

  const abrir = (e: Enlace) => {
    const id = idDe(e)
    if (id == null) return
    if (!abrirMaterial(e.tipo, id)) {
      setAviso(
        t('biblioteca.mat.sinCuarto', 'Coloca el cuarto de esa app en tu casa para poder abrir su material.'),
      )
    }
  }

  const alternar = (materialId: string) =>
    setAbiertos((prev) => {
      const s = new Set(prev)
      if (s.has(materialId)) s.delete(materialId)
      else s.add(materialId)
      return s
    })

  return (
    <div className="space-y-2 border-t border-white/10 pt-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wide text-white/40">
          {t('biblioteca.mat.titulo', 'Material')}
        </p>
        {tipos.length > 0 && (
          <button
            type="button"
            onClick={() => setMenu((x) => !x)}
            className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/60 transition hover:bg-white/10"
            title={t('biblioteca.mat.agregar', 'Generar o enlazar material')}
            aria-label={t('biblioteca.mat.agregar', 'Generar o enlazar material')}
          >
            <Icono nombre="agregar" />
          </button>
        )}
      </div>

      {enlaces.length === 0 && !menu && (
        <p className="text-[11px] leading-relaxed text-white/35">
          {t('biblioteca.mat.vacio2', 'Genera aquí un mapa o unas notas de este tema con la IA, o engancha las hojas y mapas que ya uses para estudiarlo.')}
        </p>
      )}

      <ul className="space-y-1">
        {enlaces.map((e) => {
          const nombre = nombres[e.materialId]
          const roto = e.materialId in nombres && nombre === null
          const id = idDe(e)
          const Vista = proveedorMaterial(e.tipo)?.Vista
          const desplegado = abiertos.has(e.materialId)
          return (
            <li key={e.materialId} className="rounded-lg bg-black/20 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                {Vista && !roto && id != null ? (
                  <button
                    type="button"
                    onClick={() => alternar(e.materialId)}
                    className="shrink-0 text-xs text-white/40 transition hover:text-white/80"
                    title={t('biblioteca.mat.ver', 'Ver aquí mismo')}
                    aria-label={t('biblioteca.mat.ver', 'Ver aquí mismo')}
                  >
                    {desplegado ? '▾' : '▸'}
                  </button>
                ) : (
                  <span className="w-3 shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => abrir(e)}
                  disabled={roto}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs transition disabled:cursor-not-allowed"
                  title={t('biblioteca.mat.abrirEn', 'Abrir en su cuarto para editarlo')}
                >
                  <span className={roto ? 'text-white/25' : 'text-white/60'}>
                    <Icono nombre={ICONO[e.tipo]} />
                  </span>
                  <span className={`min-w-0 truncate ${roto ? 'text-white/30 line-through' : 'text-white/80'}`}>
                    {nombre ?? e.titulo}
                  </span>
                  {roto && (
                    <span className="shrink-0 text-[10px] text-white/30">
                      {t('biblioteca.mat.roto', 'ya no existe')}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => e.id != null && materialEntradaRepo.remove(e.id)}
                  className="shrink-0 text-white/25 transition hover:text-white/70"
                  title={t('biblioteca.mat.quitar', 'Quitar el enlace (no borra el material)')}
                  aria-label={t('biblioteca.mat.quitar', 'Quitar el enlace (no borra el material)')}
                >
                  <Icono nombre="cerrar" />
                </button>
              </div>
              {desplegado && Vista && id != null && (
                <div className="mt-1.5 overflow-x-auto rounded-lg bg-black/20 p-2">
                  <Suspense fallback={<p className="text-[10px] text-white/30">…</p>}>
                    <Vista id={id} />
                  </Suspense>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {menu && (
        <div className="space-y-1 rounded-xl border border-white/10 bg-black/20 p-2">
          {tipos.map((tipo) => {
            const conIA = iaActiva() && !!proveedorMaterial(tipo)?.generar
            return (
              <div key={tipo} className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => void crear(tipo)}
                  className="flex-1 rounded-lg bg-white/5 px-2 py-1.5 text-left text-xs text-white/75 transition hover:bg-white/10"
                >
                  <Icono nombre={ICONO[tipo]} /> {etiquetaNueva[tipo]}
                </button>
                {conIA && (
                  <button
                    type="button"
                    onClick={() => void generar(tipo)}
                    disabled={generando != null}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/75 transition hover:bg-white/10 disabled:opacity-40"
                    title={t('biblioteca.mat.generarTip', 'Que la IA lo arme con lo que dice esta entrada')}
                  >
                    <Icono nombre={generando === tipo ? 'reloj-arena' : 'brillo'} />
                    <Creditos op={OP_MATERIAL} />
                  </button>
                )}
                <ElegirExistente tipo={tipo} etiqueta={etiqueta[tipo]} onElegir={enlazar} />
              </div>
            )
          })}
        </div>
      )}

      {aviso && (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-200/90">
          {aviso}
        </p>
      )}
    </div>
  )
}

/** Desplegable con lo que ya tienes de ese tipo (se pide al abrirlo). */
function ElegirExistente({
  tipo,
  etiqueta,
  onElegir,
}: {
  tipo: TipoMaterial
  etiqueta: string
  onElegir: (tipo: TipoMaterial, id: number, titulo: string) => Promise<unknown>
}) {
  const t = useT()
  const [lista, setLista] = useState<{ id: number; nombre: string }[] | null>(null)

  return (
    <select
      value=""
      onFocus={() => {
        if (lista) return
        void proveedorMaterial(tipo)?.listar().then(setLista)
      }}
      onChange={(e) => {
        const id = Number(e.target.value)
        const item = lista?.find((x) => x.id === id)
        if (item) void onElegir(tipo, item.id, item.nombre)
      }}
      className="w-24 shrink-0 rounded-lg border border-white/10 bg-black/30 px-1.5 py-1.5 text-xs outline-none"
      title={t('biblioteca.mat.existente', 'Enlazar {tipo} que ya tengo', { tipo: etiqueta.toLowerCase() })}
    >
      <option value="">{t('biblioteca.mat.enlazar', '— Enlazar —')}</option>
      {(lista ?? []).map((x) => (
        <option key={x.id} value={x.id}>
          {x.nombre}
        </option>
      ))}
    </select>
  )
}
