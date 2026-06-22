import { useState, useEffect } from 'react'
import { db } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'

// ─── Inventario (próximamente) ─────────────────────────────────────────────────

function InventarioTab() {
  const t = useT()
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
      <div className="text-5xl mb-3">📦</div>
      <h3 className="text-lg font-bold">{t('bodega.inv.titulo', 'Inventario de la bodega')}</h3>
      <p className="mt-2 text-sm text-white/50 leading-relaxed">
        {t('bodega.inv.desc', 'Aquí guardarás objetos, suministros y cosas que no usas a diario. Próximamente podrás catalogar y buscar todo lo que tengas almacenado.')}
      </p>
    </div>
  )
}

// ─── Archivo y respaldo ───────────────────────────────────────────────────────

/** Respaldo leído del archivo, validado y a la espera de confirmación. */
interface RespaldoPendiente {
  nombre: string
  datos: Record<string, unknown[]>
  filas: number
  /** Tablas del archivo que esta versión de la app no conoce (se omiten). */
  ignoradas: string[]
}

function ArchivoTab() {
  const t = useT()
  const [stats, setStats] = useState<{ tabla: string; filas: number }[]>([])
  const [confirmando, setConfirmando] = useState(false)
  const [borrado, setBorrado] = useState(false)
  const [pendiente, setPendiente] = useState<RespaldoPendiente | null>(null)
  const [avisoImport, setAvisoImport] = useState<string | null>(null)

  useEffect(() => {
    const tablas = [
      'transacciones', 'sueno', 'anecdotas', 'metas', 'presupuestos',
      'registrosComida', 'planComidas', 'registrosAgua', 'alimentosFavoritos',
      'sesionesEjercicio', 'seriesFuerza', 'mediaArchivo', 'juegosMesa',
      'progresoTema', 'noticias', 'viajes', 'actividadesViaje',
      'sesionesMindfulness', 'registroAnimo', 'gratitudDiaria',
      'vehiculos', 'registrosMantenimiento',
    ] as const
    Promise.all(
      tablas.map(async (tabla) => ({
        tabla,
        filas: await (db as unknown as Record<string, { count(): Promise<number> }>)[tabla].count(),
      }))
    ).then((r) => setStats(r.filter((s) => s.filas > 0)))
  }, [borrado])

  const exportar = async () => {
    const tablas = Object.keys(db._dbSchema) as string[]
    const datos: Record<string, unknown[]> = {}
    for (const tabla of tablas) {
      datos[tabla] = await (db as unknown as Record<string, { toArray(): Promise<unknown[]> }>)[tabla].toArray()
    }
    const json = JSON.stringify(datos, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mind-home-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Lee y valida el archivo de respaldo SIN tocar la base de datos.
   * Solo si el JSON tiene la forma esperada ({ tabla: [filas] }) se pasa a
   * confirmación; las tablas desconocidas se omiten (respaldo de otra versión).
   */
  const leerArchivo = async (file: File) => {
    setAvisoImport(null)
    setPendiente(null)
    try {
      const json: unknown = JSON.parse(await file.text())
      if (typeof json !== 'object' || json === null || Array.isArray(json)) throw new Error()
      const tablasValidas = new Set(db.tables.map((tabla) => tabla.name))
      const datos: Record<string, unknown[]> = {}
      const ignoradas: string[] = []
      let filas = 0
      for (const [tabla, contenido] of Object.entries(json)) {
        if (!Array.isArray(contenido)) throw new Error()
        if (!tablasValidas.has(tabla)) {
          ignoradas.push(tabla)
          continue
        }
        datos[tabla] = contenido
        filas += contenido.length
      }
      if (filas === 0) {
        setAvisoImport(t('bodega.sinRegistros', 'El archivo no contiene registros para restaurar.'))
        return
      }
      setPendiente({ nombre: file.name, datos, filas, ignoradas })
    } catch {
      setAvisoImport(t('bodega.archivoInvalido', 'El archivo no es un respaldo válido de Mind Home.'))
    }
  }

  /**
   * Restaura el respaldo como FOTO COMPLETA: vacía todas las tablas y carga las
   * del archivo, en una sola transacción (si algo falla, no se toca nada).
   * `bulkAdd` conserva los ids originales, así las relaciones entre tablas
   * (sesionId, viajeId, vehiculoId…) quedan intactas. Al final se recarga la
   * página porque los stores de la casa (layout, diseño) solo leen al arrancar.
   */
  const restaurar = async () => {
    if (!pendiente) return
    try {
      await db.transaction('rw', db.tables, async () => {
        for (const tabla of db.tables) {
          await tabla.clear()
          const filas = pendiente.datos[tabla.name]
          if (filas?.length) await tabla.bulkAdd(filas)
        }
      })
      setPendiente(null)
      setAvisoImport(t('bodega.restaurado', `✓ Respaldo restaurado (${pendiente.filas} registros). Recargando…`, { n: String(pendiente.filas) }))
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      setAvisoImport(t('bodega.errorRestaura', 'No se pudo restaurar; tus datos actuales no se modificaron.'))
    }
  }

  const borrarTodo = async () => {
    const tablas = Object.keys(db._dbSchema) as string[]
    await Promise.all(
      tablas.map((tabla) => (db as unknown as Record<string, { clear(): Promise<void> }>)[tabla].clear())
    )
    setBorrado(true)
    setConfirmando(false)
    setStats([])
  }

  const total = stats.reduce((a, s) => a + s.filas, 0)

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-1">{t('bodega.arch.titulo', 'Archivo de la bodega')}</p>
        <p className="text-xs text-white/45 mb-3">
          {t('bodega.arch.desc', 'Exporta o borra los datos guardados en tu dispositivo.')}
        </p>
        {stats.length === 0 ? (
          <p className="text-sm text-white/40">{t('bodega.arch.sinDatos', 'Aún no hay datos guardados.')}</p>
        ) : (
          <>
            <div className="space-y-2">
              {stats.map((s) => (
                <div key={s.tabla} className="flex justify-between text-sm">
                  <span className="text-white/60 capitalize">
                    {s.tabla.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="font-semibold text-white/90">{s.filas}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3 flex justify-between font-bold">
              <span>{t('bodega.arch.total', 'Total de registros')}</span>
              <span className="text-amber-400">{total}</span>
            </div>
          </>
        )}
      </div>

      <button
        onClick={exportar}
        className="w-full rounded-xl bg-amber-500 py-3 font-bold text-black hover:bg-amber-400 transition"
      >
        {t('bodega.arch.exportar', '⬇️ Exportar todo como JSON')}
      </button>

      <label className="block w-full cursor-pointer rounded-xl border border-amber-500/40 bg-amber-500/10 py-3 text-center font-bold text-amber-400 hover:bg-amber-500/20 transition">
        {t('bodega.arch.restaurar', '⬆️ Restaurar desde respaldo')}
        <input
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) leerArchivo(file)
            e.target.value = '' // permite reelegir el mismo archivo
          }}
        />
      </label>

      {pendiente && (
        <div className="rounded-xl bg-white/5 p-4 border border-amber-500/30 space-y-3">
          <p className="text-sm font-semibold text-amber-400">{t('bodega.confirm.titulo', 'Confirmar restauración')}</p>
          <p className="text-xs text-white/60 leading-relaxed">
            {t('bodega.confirm.desc', `${pendiente.nombre} contiene ${pendiente.filas} registros. Restaurar reemplazará todos los datos actuales y dejará la casa tal como estaba al momento de exportar.`, { nombre: pendiente.nombre, n: String(pendiente.filas) })}
          </p>
          {pendiente.ignoradas.length > 0 && (
            <p className="text-xs text-white/40">
              {t('bodega.confirm.omitir', `Se omitirán tablas que esta versión no conoce: ${pendiente.ignoradas.join(', ')}.`, { tablas: pendiente.ignoradas.join(', ') })}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setPendiente(null)}
              className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold hover:bg-white/20 transition"
            >
              {t('bodega.confirm.cancelar', 'Cancelar')}
            </button>
            <button
              onClick={restaurar}
              className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-bold text-black hover:bg-amber-400 transition"
            >
              {t('bodega.confirm.restaurar', 'Restaurar respaldo')}
            </button>
          </div>
        </div>
      )}

      {avisoImport && (
        <p className={`text-center text-xs ${avisoImport.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
          {avisoImport}
        </p>
      )}

      <div className="rounded-xl bg-white/5 p-4 border border-red-500/20 space-y-3">
        <p className="text-sm font-semibold text-red-400">{t('bodega.danger.titulo', 'Zona de peligro')}</p>
        <p className="text-xs text-white/50">
          {t('bodega.danger.desc', 'Esto borrará TODOS tus datos de Mind Home de forma permanente.')}
        </p>
        {!confirmando ? (
          <button
            onClick={() => setConfirmando(true)}
            className="w-full rounded-lg bg-red-400/10 border border-red-400/30 py-2 text-sm font-semibold text-red-400 hover:bg-red-400/20 transition"
          >
            {t('bodega.danger.btn', 'Vaciar la bodega (borrar datos)')}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-bold text-red-400 text-center">{t('bodega.danger.confirmar', '¿Estás seguro?')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold hover:bg-white/20 transition"
              >
                {t('bodega.danger.cancelar', 'Cancelar')}
              </button>
              <button
                onClick={borrarTodo}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white hover:bg-red-400 transition"
              >
                {t('bodega.danger.borrar', 'Sí, borrar todo')}
              </button>
            </div>
          </div>
        )}
        {borrado && (
          <p className="text-center text-xs text-green-400">{t('bodega.borrado', '✓ Datos borrados correctamente.')}</p>
        )}
      </div>
    </div>
  )
}

// ─── Orquestador ──────────────────────────────────────────────────────────────

type Tab = 'inventario' | 'archivo'
const TABS: { id: Tab; labelEs: string }[] = [
  { id: 'inventario', labelEs: '📦 Inventario' },
  { id: 'archivo', labelEs: '🗄️ Archivo' },
]

export function BodegaApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('inventario')
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-sm text-white/50 text-center">
        {t('bodega.desc', 'Tu espacio de almacenamiento: guarda cosas y respalda tus datos.')}
      </p>
      <div className="flex gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'bg-amber-500 text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t(`bodega.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>
      {tab === 'inventario' && <InventarioTab />}
      {tab === 'archivo' && <ArchivoTab />}
    </div>
  )
}
