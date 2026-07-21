import { useState } from 'react'
import { useGranja, ANIMALES, capacidadCorral, type HerramientaGranja } from '../state/granjaStore'
import { ESPECIES } from '../house/cultivos'
import { cestaRepo, animalesRepo, corralesRepo } from '../data/repository'
import type { TipoAccesorio, TipoAnimal } from '../data/db'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

const btn =
  'flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-white transition active:scale-95'

/** Juguetes colocables en un corral (uno por celda). */
const ACCESORIOS: Record<TipoAccesorio, { nombre: string; icon: string }> = {
  lodo: { nombre: 'Charco de lodo', icon: '🟫' },
  tina: { nombre: 'Tina de baño', icon: '🛁' },
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
  const cesta = (cestaRepo.useAll() ?? []).filter((c) => c.cantidad > 0)
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
      <Icono nombre={icono} /> {etiqueta}
    </button>
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* Encabezado. */}
      <div className="absolute left-0 right-0 top-3 flex items-start justify-center">
        <div
          data-tut="granja.header"
          className="ui-hud ui-pop pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Icono nombre="granja" /> {t('room.granja.nombre', 'Granja')}
          <button
            type="button"
            data-tut="granja.salir"
            onClick={() => g.salir()}
            title={t('infra.salirEditor', 'Salir del editor')}
            aria-label={t('infra.salirEditor', 'Salir del editor')}
            className="ml-2 rounded px-1 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
      </div>

      {/* Barra de herramientas, selectores y cesta. */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center px-2">
        <div
          data-tut="granja.barra"
          data-tut-zona="app:granja"
          className="ui-hud ui-pop pointer-events-auto flex max-w-md flex-col gap-2 rounded-xl border border-white/10 p-2"
        >
          {herramienta === 'animal' && (
            <div data-tut="granja.animales" className="flex flex-wrap items-center justify-center gap-1.5">
              {(Object.keys(ANIMALES) as TipoAnimal[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  data-tut={`granja.animal.${a}`}
                  onClick={() => g.setTipo(a)}
                  title={t(`granja.animal.${a}`, ANIMALES[a].nombre)}
                  aria-label={t(`granja.animal.${a}`, ANIMALES[a].nombre)}
                  className={`flex flex-col items-center rounded-lg border px-2 py-1 text-[10px] font-semibold text-white transition active:scale-95 ${
                    tipo === a
                      ? 'border-emerald-400/60 bg-emerald-600'
                      : 'border-white/10 bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="text-base leading-none">
                    <Icono emoji={ANIMALES[a].icon} />
                  </span>
                  {t(`granja.animal.${a}`, ANIMALES[a].nombre)}
                  <span className="font-normal text-white/60">
                    {t('granja.come', 'come cada')} {ANIMALES[a].horasHambre} h
                  </span>
                </button>
              ))}
            </div>
          )}
          {herramienta === 'accesorio' && (
            <div data-tut="granja.accesorios" className="flex flex-wrap items-center justify-center gap-1.5">
              {(Object.keys(ACCESORIOS) as TipoAccesorio[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  data-tut={`granja.accesorio.${a}`}
                  onClick={() => g.setAccesorio(a)}
                  title={t(`granja.accesorio.${a}`, ACCESORIOS[a].nombre)}
                  aria-label={t(`granja.accesorio.${a}`, ACCESORIOS[a].nombre)}
                  className={`flex flex-col items-center rounded-lg border px-2 py-1 text-[10px] font-semibold text-white transition active:scale-95 ${
                    accesorio === a
                      ? 'border-emerald-400/60 bg-emerald-600'
                      : 'border-white/10 bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="text-base leading-none">
                    <Icono emoji={ACCESORIOS[a].icon} />
                  </span>
                  {t(`granja.accesorio.${a}`, ACCESORIOS[a].nombre)}
                </button>
              ))}
            </div>
          )}
          {herramienta === 'nombrar' &&
            (corralSel == null ? (
              <p data-tut="granja.nombrar.elegir" className="text-center text-[11px] text-white/60">
                {t('granja.nombrar.elegir', 'Toca un corral para ver sus animales.')}
              </p>
            ) : (
              <PanelNombrar corralId={corralSel} />
            ))}
          <div data-tut="granja.herramientas" className="flex flex-wrap items-center justify-center gap-1.5">
            {herrBtn('corral', 'granja', t('granja.herr.corral', 'Corral'))}
            {herrBtn('animal', 'animal', t('granja.herr.animal', 'Animal'))}
            {herrBtn('alimentar', 'alimentar', t('granja.herr.alimentar', 'Alimentar'))}
            {herrBtn('mimar', 'mimar', t('granja.herr.mimar', 'Mimar'))}
            {herrBtn('accesorio', 'accesorio', t('granja.herr.accesorio', 'Juguetes'))}
            {herrBtn('nombrar', 'etiqueta', t('granja.herr.nombrar', 'Nombrar'))}
            {herrBtn('quitar', 'basura', t('granja.herr.quitar', 'Quitar'))}
          </div>
          <div
            data-tut="granja.cesta"
            className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-white/60"
          >
            <Icono nombre="cosechar" /> {t('huerto.cesta', 'Cesta')}:
            {cesta.length === 0 ? (
              <span className="text-white/40">{t('granja.cestaVacia', 'vacía — cosecha el huerto')}</span>
            ) : (
              cesta.map((c) => (
                <span key={c.especie} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-semibold">
                  <Icono emoji={ESPECIES[c.especie].icon} /> {c.cantidad}
                </span>
              ))
            )}
          </div>
          {aviso === 'sinComida' && (
            <p className="text-center text-[11px] font-semibold text-amber-300">
              {t('granja.sinComida', 'No hay nada en la cesta: cosecha el huerto para alimentar.')}
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
          <p className="max-w-md text-center text-[10px] leading-tight text-white/50">
            {t(
              'granja.ayuda',
              'Corral crea corrales y los agranda tocando una celda pegada. Añade varios animales, aliméntalos con tus cosechas, mímalos y ponles juguetes.',
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Lista de animales del corral elegido: tocar uno permite renombrarlo. */
function PanelNombrar({ corralId }: { corralId: number }) {
  const t = useT()
  const animales = (animalesRepo.useAll() ?? []).filter((a) => a.corralId === corralId)
  const corral = (corralesRepo.useAll() ?? []).find((c) => c.id === corralId)
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
          <span className="ml-1 text-white/40">
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
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-left text-xs font-semibold text-white transition hover:bg-white/15 active:scale-[0.98]"
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
