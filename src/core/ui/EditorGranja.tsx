import { useState } from 'react'
import { useGranja, ANIMALES, capacidadCorral, type HerramientaGranja } from '../state/granjaStore'
import { ESPECIES } from '../house/cultivos'
import { VACIO, cestaRepo, animalesRepo, corralesRepo } from '../data/repository'
import type { TipoAccesorio, TipoAnimal } from '../data/db'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'
import { MarcoEditorInfra } from './MarcoEditorInfra'
import { PestanasCampo } from './PestanasCampo'

// `min-w-0`: sin él, un item de grid no encoge bajo el ancho de su propio
// contenido y el texto largo ("Alimentar") desborda la columna en vez de
// achicarse con ella. El label va en su propio span truncado para que, si aun
// así no cabe, se corte con "…" en lugar de salirse del botón.
const btn =
  'flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 text-xs font-semibold text-white transition active:scale-95'

/** Pastilla horizontal de la lista de juguetes (una sola línea, sin dato extra). */
const pastilla =
  'flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold text-white transition active:scale-95'

/** Tarjeta de animal: icono+nombre y las horas de hambre en su propia línea, para
 * que quepa en columnas angostas (móvil) sin partir palabras a media línea. */
const tarjetaAnimal =
  'flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 text-[11px] font-semibold text-white transition active:scale-95'

// Nombre corto: en la pastilla del editor no cabe "Charco de lodo" sin
// truncarse; el nombre completo sigue en el manual del chat.
const ACCESORIOS: Record<TipoAccesorio, { nombre: string; icon: string }> = {
  lodo: { nombre: 'Lodo', icon: '🟫' },
  tina: { nombre: 'Tina', icon: '🛁' },
  pelota: { nombre: 'Pelota', icon: '⚽' },
}

/**
 * Overlay del editor de la Granja: construyes corrales rectangulares (toca una
 * celda pegada para agrandarlos), añades varios animales con nombre, los
 * alimentas con la cesta del huerto, los mimas y les pones juguetes
 * (GranjaController aplica el clic por celda).
 */
export function EditorGranja() {
  const t = useT()
  const activo = useGranja((s) => s.activo)
  const herramienta = useGranja((s) => s.herramienta)
  const tipo = useGranja((s) => s.tipo)
  const accesorio = useGranja((s) => s.accesorio)
  const corralSel = useGranja((s) => s.corralSel)
  const aviso = useGranja((s) => s.aviso)
  const cesta = (cestaRepo.useAll() ?? VACIO).filter((c) => c.cantidad > 0)
  if (!activo) return null
  const g = useGranja.getState()

  const herrBtn = (h: HerramientaGranja, icono: NombreIcono, etiqueta: string) => (
    <button
      type="button"
      data-tut={`granja.herr.${h}`}
      onClick={() => g.setHerramienta(h)}
      title={etiqueta}
      aria-label={etiqueta}
      className={`${btn} ${herramienta === h ? 'border-emerald-400/60 bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
    >
      <Icono nombre={icono} />
      <span className="min-w-0 truncate">{etiqueta}</span>
    </button>
  )

  return (
    <MarcoEditorInfra
      icono="granja"
      titulo={t('room.granja.nombre', 'Granja')}
      tut="granja"
      onSalir={() => g.salir()}
      ancho="max-w-full"
      pestanas={<PestanasCampo activa="granja" />}
    >
      {herramienta === 'animal' && (
            <div data-tut="granja.animales" className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {(Object.keys(ANIMALES) as TipoAnimal[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  data-tut={`granja.animal.${a}`}
                  onClick={() => g.setTipo(a)}
                  title={`${t(`granja.animal.${a}`, ANIMALES[a].nombre)} · ${t('granja.come', 'come cada')} ${ANIMALES[a].horasHambre} h`}
                  aria-label={`${t(`granja.animal.${a}`, ANIMALES[a].nombre)} · ${t('granja.come', 'come cada')} ${ANIMALES[a].horasHambre} h`}
                  className={`${tarjetaAnimal} ${
                    tipo === a
                      ? 'border-emerald-400/60 bg-emerald-600'
                      : 'border-white/10 bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1 leading-none">
                    <span className="text-sm leading-none">
                      <Icono emoji={ANIMALES[a].icon} />
                    </span>
                    <span className="truncate">{t(`granja.animal.${a}`, ANIMALES[a].nombre)}</span>
                  </span>
                  <span className="text-[10px] font-normal leading-none text-white/55">
                    {ANIMALES[a].horasHambre} h
                  </span>
                </button>
              ))}
            </div>
          )}
          {herramienta === 'accesorio' && (
            <div data-tut="granja.accesorios" className="grid grid-cols-3 gap-1.5">
              {(Object.keys(ACCESORIOS) as TipoAccesorio[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  data-tut={`granja.accesorio.${a}`}
                  onClick={() => g.setAccesorio(a)}
                  title={t(`granja.accesorio.${a}`, ACCESORIOS[a].nombre)}
                  aria-label={t(`granja.accesorio.${a}`, ACCESORIOS[a].nombre)}
                  className={`${pastilla} ${
                    accesorio === a
                      ? 'border-emerald-400/60 bg-emerald-600'
                      : 'border-white/10 bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="text-base leading-none">
                    <Icono emoji={ACCESORIOS[a].icon} />
                  </span>
                  <span className="min-w-0 truncate">{t(`granja.accesorio.${a}`, ACCESORIOS[a].nombre)}</span>
                </button>
              ))}
            </div>
          )}
          {herramienta === 'mover' && (
            <p data-tut="granja.mover.pista" className="text-center text-[11px] text-white/60">
              {corralSel == null
                ? t('infra.mover.elegir', 'Toca lo que quieras mover.')
                : t('infra.mover.destino', 'Ahora toca su sitio nuevo (o toca otro para cambiar).')}
            </p>
          )}
          {herramienta === 'nombrar' &&
            (corralSel == null ? (
              <p data-tut="granja.nombrar.elegir" className="text-center text-[11px] text-white/60">
                {t('granja.nombrar.elegir', 'Toca un corral para ver sus animales.')}
              </p>
            ) : (
              <PanelNombrar corralId={corralSel} />
            ))}
          {/* 3 columnas en móvil (como en Comida): a 4 el texto largo ("Alimentar")
              no cabía y desbordaba el botón. */}
          <div data-tut="granja.herramientas" className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {herrBtn('corral', 'granja', t('granja.herr.corral', 'Corral'))}
            {herrBtn('animal', 'animal', t('granja.herr.animal', 'Animal'))}
            {herrBtn('alimentar', 'alimentar', t('granja.herr.alimentar', 'Alimentar'))}
            {herrBtn('mimar', 'mimar', t('granja.herr.mimar', 'Mimar'))}
            {herrBtn('curar', 'curar', t('granja.herr.curar', 'Curar'))}
            {herrBtn('limpiar', 'escoba', t('granja.herr.limpiar', 'Limpiar'))}
            {herrBtn('accesorio', 'accesorio', t('granja.herr.accesorio', 'Juguetes'))}
            {herrBtn('nombrar', 'etiqueta', t('granja.herr.nombrar', 'Nombrar'))}
            {herrBtn('mover', 'mover', t('planos.herr.mover', 'Mover'))}
            {herrBtn('quitar', 'basura', t('granja.herr.quitar', 'Quitar'))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <div
              data-tut="granja.cesta"
              className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-white/60"
            >
              <Icono nombre="cosechar" /> {t('huerto.cesta', 'Cesta')}:
              {cesta.length === 0 ? (
                <span className="text-white/40">{t('granja.cestaVacia', 'vacía — cosecha en Comida')}</span>
              ) : (
                cesta.map((c) => (
                  <span key={c.especie} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-semibold">
                    <Icono emoji={ESPECIES[c.especie].icon} /> {c.cantidad}
                  </span>
                ))
              )}
            </div>
          </div>
          {aviso === 'sinComida' && (
            <p className="text-center text-[11px] font-semibold text-amber-300">
              {t('granja.sinComida', 'No hay nada en la cesta: cosecha en Comida para alimentar.')}
            </p>
          )}
          {aviso === 'corralLleno' && (
            <p className="text-center text-[11px] font-semibold text-amber-300">
              {t('granja.corralLleno', 'El corral está lleno: agrándalo o construye otro.')}
            </p>
          )}
          {aviso === 'noCabe' && (
            <p className="text-center text-[11px] font-semibold text-amber-300">
              {t('granja.noCabe', 'Ahí no cabe: se sale del mapa o pisa otro corral.')}
            </p>
          )}
          {aviso === 'noCabeGanado' && (
            <p className="text-center text-[11px] font-semibold text-amber-300">
              {t('granja.noCabeGanado', 'No cabe el ganado: saca animales antes de encogerlo.')}
            </p>
          )}
          {aviso === 'hayEnfermos' && (
            <p className="text-center text-[11px] font-semibold text-amber-300">
              {t('granja.hayEnfermos', 'Hay animales enfermos: cúralos para que vuelvan a comer.')}
            </p>
          )}
          {aviso === 'sinEnfermos' && (
            <p className="text-center text-[11px] font-semibold text-amber-300">
              {t('granja.sinEnfermos', 'Ninguno está enfermo en ese corral.')}
            </p>
          )}
          {aviso === 'yaLimpio' && (
            <p className="text-center text-[11px] font-semibold text-amber-300">
              {t('granja.yaLimpio', 'Ese corral ya estaba limpio; la semana empieza de nuevo.')}
            </p>
          )}
    </MarcoEditorInfra>
  )
}

/** Lista de animales del corral elegido: tocar uno permite renombrarlo. */
function PanelNombrar({ corralId }: { corralId: number }) {
  const t = useT()
  const animales = (animalesRepo.useAll() ?? VACIO).filter((a) => a.corralId === corralId)
  const corral = (corralesRepo.useAll() ?? VACIO).find((c) => c.id === corralId)
  const renombrar = useGranja((s) => s.renombrar)
  const [editando, setEditando] = useState<number | null>(null)
  const [texto, setTexto] = useState('')

  const guardar = (id: number) => {
    void renombrar(id, texto)
    setEditando(null)
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-center text-[11px] text-white/60">
        {t('granja.nombrar.titulo', 'Toca un animal para cambiarle el nombre')}
        {corral && (
          <span className="ms-1 text-white/40">
            · {t('granja.capacidad', 'Capacidad')} {animales.length}/{capacidadCorral(corral)}
          </span>
        )}
      </p>
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {animales.map((a) =>
          editando === a.id ? (
            <div key={a.id} className="flex items-center gap-1.5">
              <span className="text-base leading-none">
                <Icono emoji={ANIMALES[a.tipo].icon} />
              </span>
              <input
                autoFocus
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') guardar(a.id!)
                  if (e.key === 'Escape') setEditando(null)
                }}
                maxLength={18}
                placeholder={t('granja.nombrar.placeholder', 'Nombre')}
                className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs text-white outline-none focus:border-emerald-400/60"
              />
              <button
                type="button"
                onClick={() => guardar(a.id!)}
                className={`${btn} h-7 bg-emerald-600 px-2`}
              >
                {t('granja.nombrar.guardar', 'Guardar')}
              </button>
            </div>
          ) : (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setEditando(a.id!)
                setTexto(a.nombre ?? '')
              }}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-start text-xs font-semibold text-white transition hover:bg-white/15 active:scale-[0.98]"
            >
              <span className="text-base leading-none">
                <Icono emoji={ANIMALES[a.tipo].icon} />
              </span>
              {a.nombre ?? t(`granja.animal.${a.tipo}`, ANIMALES[a.tipo].nombre)}
            </button>
          ),
        )}
        {animales.length === 0 && (
          <p className="text-center text-[11px] text-white/40">
            {t('granja.nombrar.vacio', 'Este corral no tiene animales.')}
          </p>
        )}
      </div>
    </div>
  )
}
