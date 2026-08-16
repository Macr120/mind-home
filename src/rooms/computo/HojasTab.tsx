import { useEffect, useRef, useState } from 'react'
import type { HojaCalculo } from '../../core/data/db'
import { VACIO, hojasRepo, useHoja } from '../../core/data/repository'
import { EntradasQueUsan } from '../_shared/EntradasQueUsan'
import { useT } from '../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { intencionApp } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonIA } from './BotonIA'
import { COLS_INICIO, ESPERA_GUARDADO, FILAS_INICIO } from './constantes'
import { OP_HOJA } from './costosIA'
import type { Celdas } from './hoja'
import { hojaDesdeTexto } from './ia'
import { Rejilla } from './Rejilla'
import { useHistorial } from './useHistorial'
import { useMotor } from './useMotor'

/**
 * Las hojas de cálculo: la lista y la hoja abierta.
 *
 * Mientras se teclea, la hoja vive en memoria y se persiste con retraso: sin
 * eso, escribir un número serían tres `put` y tres entradas de `_outbox` (el
 * middleware de `db.ts` mete la cola de sync en toda transacción de escritura).
 */
export function HojasTab() {
  const t = useT()
  const { motor } = useMotor()
  const hojas = hojasRepo.useAll() ?? VACIO
  // Otra app puede pedir una hoja concreta (Biblioteca enlaza hojas como
  // material de estudio); si no, se entra a la lista.
  const [abiertaId, setAbiertaId] = useState<number | null>(() => {
    const i = intencionApp('computo')
    return i?.seccion === 'hojas' && i.dato ? Number(i.dato) || null : null
  })
  const guardada = useHoja(abiertaId)
  const [borrador, setBorrador] = useState<HojaCalculo | null>(null)
  const [idCargado, setIdCargado] = useState<number | null>(null)
  const espera = useRef<number | null>(null)
  const historial = useHistorial<Celdas>()
  const [peticion, setPeticion] = useState('')
  const [pensando, setPensando] = useState(false)
  const [errorIA, setErrorIA] = useState('')

  // La hoja guardada manda al ABRIRLA; a partir de ahí la fuente es el borrador
  // local hasta que se persiste (si no, cada `put` propio pisaría lo tecleado).
  // Ajuste durante el render, no en un efecto: es estado derivado de la hoja
  // abierta, y así no hay un render de más con la hoja anterior.
  if (guardada && guardada.id !== idCargado) {
    setIdCargado(guardada.id ?? null)
    setBorrador(guardada)
    // Cada hoja tiene su propio historial: deshacer en una no puede traer las
    // celdas de otra. Se vacía aquí, en el mismo ajuste durante el render que ya
    // existía, y no en un efecto (lint `react-hooks/set-state-in-effect`).
    historial.reiniciar()
  } else if (guardada === null && borrador) {
    setIdCargado(null)
    setBorrador(null)
    historial.reiniciar()
  }

  useEffect(() => {
    return () => {
      if (espera.current != null) window.clearTimeout(espera.current)
    }
  }, [])

  const persistir = (hoja: HojaCalculo) => {
    if (espera.current != null) window.clearTimeout(espera.current)
    espera.current = window.setTimeout(() => {
      if (hoja.id != null) {
        void hojasRepo.update(hoja.id, {
          celdas: hoja.celdas,
          filas: hoja.filas,
          cols: hoja.cols,
          anchos: hoja.anchos,
          graficas: hoja.graficas,
          actualizadoEn: new Date().toISOString(),
        })
      }
    }, ESPERA_GUARDADO)
  }

  const cambiar = (celdas: Celdas, extra?: Partial<HojaCalculo>) => {
    setBorrador((h) => {
      if (!h) return h
      const nueva = { ...h, ...extra, celdas }
      persistir(nueva)
      return nueva
    })
  }

  /** Una hoja en blanco. Las de arranque ya vienen sembradas (`siembra.ts`). */
  const crear = async () => {
    const porDefecto = t('computo.hojas.sinNombre', 'Hoja nueva')
    const nombre = await pedirTexto({
      titulo: t('computo.hojas.nueva', 'Hoja nueva'),
      mensaje: t('computo.hojas.nuevaMsg', '¿Cómo se llama?'),
      valor: porDefecto,
    })
    if (nombre == null) return
    const ahora = new Date().toISOString()
    const id = await hojasRepo.add({
      nombre: nombre.trim() || porDefecto,
      celdas: {},
      filas: FILAS_INICIO,
      cols: COLS_INICIO,
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
    setAbiertaId(id)
  }

  /** Una hoja armada por la IA: encabezados, datos de ejemplo y sus fórmulas. */
  const crearConIA = async () => {
    if (!peticion.trim()) return
    setErrorIA('')
    setPensando(true)
    try {
      const propuesta = await hojaDesdeTexto(peticion.trim())
      const ahora = new Date().toISOString()
      const id = await hojasRepo.add({
        nombre: propuesta.nombre,
        celdas: Object.fromEntries(Object.entries(propuesta.celdas).map(([ref, crudo]) => [ref, { crudo }])),
        filas: FILAS_INICIO,
        cols: COLS_INICIO,
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
      setPeticion('')
      setAbiertaId(id)
    } catch (e) {
      setErrorIA(e instanceof Error ? e.message : t('computo.ia.falloHoja', 'No se pudo armar la hoja.'))
    } finally {
      setPensando(false)
    }
  }

  const renombrar = async (h: HojaCalculo) => {
    const nombre = await pedirTexto({
      titulo: t('computo.hojas.renombrar', 'Renombrar la hoja'),
      valor: h.nombre,
    })
    if (nombre?.trim() && h.id != null) await hojasRepo.update(h.id, { nombre: nombre.trim() })
  }

  const duplicar = async (h: HojaCalculo) => {
    const ahora = new Date().toISOString()
    await hojasRepo.add({
      nombre: t('computo.hojas.copiaDe', 'Copia de {nombre}', { nombre: h.nombre }),
      celdas: structuredClone(h.celdas),
      filas: h.filas,
      cols: h.cols,
      anchos: h.anchos,
      graficas: structuredClone(h.graficas),
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
  }

  const borrar = async (h: HojaCalculo) => {
    const ok = await confirmar({
      titulo: t('computo.hojas.borrar', 'Borrar «{nombre}»', { nombre: h.nombre }),
      mensaje: t('computo.hojas.borrarMsg', 'La hoja y todo lo que tenga dentro.'),
      peligro: true,
    })
    if (ok && h.id != null) {
      await hojasRepo.remove(h.id)
      if (abiertaId === h.id) setAbiertaId(null)
    }
  }

  const exportar = async (h: HojaCalculo, formato: 'xlsx' | 'pdf') => {
    const { descargarXlsx, imprimirHoja } = await import('./exportar')
    if (formato === 'xlsx') await descargarXlsx(h, motor)
    else await imprimirHoja(h, motor)
  }

  if (borrador) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-2 pb-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAbiertaId(null)}
            className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 transition hover:bg-white/10"
            title={t('computo.hojas.volver', 'Volver a la lista')}
            aria-label={t('computo.hojas.volver', 'Volver a la lista')}
          >
            <Icono nombre="atras" />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{borrador.nombre}</h2>
          <div className="flex shrink-0 gap-1" data-tut="computo.hojas.exportar">
            <BotonHoja
              icono="descargar"
              etiqueta={t('computo.hojas.aExcel', 'Exportar a Excel')}
              onClick={() => void exportar(borrador, 'xlsx')}
            />
            <BotonHoja
              icono="imprimir"
              etiqueta={t('computo.hojas.aPdf', 'Imprimir o guardar en PDF')}
              onClick={() => void exportar(borrador, 'pdf')}
            />
            <BotonHoja
              icono="editar"
              etiqueta={t('computo.hojas.renombrar', 'Renombrar la hoja')}
              onClick={() => void renombrar(borrador)}
            />
          </div>
        </div>

        <EntradasQueUsan tipo="hoja" id={abiertaId} />

        <Rejilla hoja={borrador} motor={motor} onCambiar={cambiar} historial={historial} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 pb-4">
      <section className="space-y-2" data-tut="computo.hojas.lista">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-white/45">
            {t('computo.hojas.mias', 'Mis hojas')}
          </h2>
          <button
            type="button"
            onClick={() => void crear()}
            className="ui-accent-bg shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
          >
            <Icono nombre="agregar" /> {t('computo.hojas.nueva', 'Hoja nueva')}
          </button>
        </div>
        {/* Describir la hoja en vez de armarla a mano. */}
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
          <input
            value={peticion}
            onChange={(e) => setPeticion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void crearConIA()
            }}
            placeholder={t('computo.ia.hojaPlaceholder', 'Descríbela: «control de gastos del mes»')}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
          <BotonIA
            op={OP_HOJA}
            etiqueta={t('computo.ia.armarHoja', 'Armarla con IA')}
            generando={pensando}
            deshabilitado={!peticion.trim()}
            error={errorIA}
            onClick={() => void crearConIA()}
          />
        </div>

        {hojas.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">
            {t('computo.hojas.vacio', 'Todavía no hay hojas. Crea una con el botón de arriba.')}
          </p>
        )}
        {hojas.map((h) => (
          <div key={h.id} className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setAbiertaId(h.id ?? null)}
              className="flex min-w-0 flex-1 items-center gap-2 py-1 text-start"
            >
              <Icono nombre="hoja" />
              <span className="min-w-0 flex-1 truncate text-sm">{h.nombre}</span>
              <span className="shrink-0 text-[11px] text-white/35">
                {t('computo.hojas.celdas', '{n} celdas', { n: String(Object.keys(h.celdas).length) })}
              </span>
            </button>
            <BotonHoja icono="duplicar" etiqueta={t('computo.hojas.duplicar', 'Duplicar')} onClick={() => void duplicar(h)} />
            <BotonHoja icono="basura" etiqueta={t('computo.hojas.borrarCorto', 'Borrar')} onClick={() => void borrar(h)} />
          </div>
        ))}
      </section>
    </div>
  )
}

function BotonHoja({
  icono,
  etiqueta,
  onClick,
}: {
  icono: Parameters<typeof Icono>[0]['nombre']
  etiqueta: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={etiqueta}
      aria-label={etiqueta}
      className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
    >
      <Icono nombre={icono} />
    </button>
  )
}
