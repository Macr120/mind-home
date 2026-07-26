import { useState, useEffect } from 'react'
import { db } from '../../data/db'
import { exportarRespaldo, fechaUltimoRespaldo } from '../../data/respaldo'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/** Respaldo leído del archivo, validado y a la espera de confirmación. */
interface RespaldoPendiente {
  nombre: string
  datos: Record<string, unknown[]>
  filas: number
  /** Tablas del archivo que esta versión de la app no conoce (se omiten). */
  ignoradas: string[]
}

/**
 * Sección del editor (pestaña Configuraciones): respaldo de datos.
 * Exportar todo como JSON, restaurar desde un respaldo y borrar los datos
 * del dispositivo. Antes vivía en el cuarto Bodega (pestaña Archivo).
 */
export function EditorRespaldoSection({
  embed,
  sinTitulo,
}: { embed?: boolean; sinTitulo?: boolean } = {}) {
  const t = useT()
  const [stats, setStats] = useState<{ tabla: string; filas: number }[]>([])
  const [confirmando, setConfirmando] = useState(false)
  const [borrado, setBorrado] = useState(false)
  const [pendiente, setPendiente] = useState<RespaldoPendiente | null>(null)
  const [avisoImport, setAvisoImport] = useState<string | null>(null)
  const [ultimo, setUltimo] = useState(fechaUltimoRespaldo)
  const [persistente, setPersistente] = useState<boolean | null>(null)

  // Estado real del permiso de persistencia (pedido en main.tsx al arrancar).
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersistente)
  }, [])

  useEffect(() => {
    const tablas = [
      'transacciones', 'sueno', 'anecdotas', 'metas', 'presupuestos',
      'registrosComida', 'registrosAgua',
      'sesionesEjercicio', 'seriesFuerza', 'mediaArchivo', 'juegosMesa',
      'conversacionesBiblio', 'entradasBiblio', 'sesionesEstudio', 'noticias',
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
    await exportarRespaldo()
    setUltimo(fechaUltimoRespaldo())
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
        if (!tablasValidas.has(tabla) || tabla.startsWith('_')) {
          ignoradas.push(tabla)
          continue
        }
        datos[tabla] = contenido
        filas += contenido.length
      }
      if (filas === 0) {
        setAvisoImport(t('respaldo.sinRegistros', 'El archivo no contiene registros para restaurar.'))
        return
      }
      setPendiente({ nombre: file.name, datos, filas, ignoradas })
    } catch {
      setAvisoImport(t('respaldo.archivoInvalido', 'El archivo no es un respaldo válido de Mind Planner Home.'))
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
          // Internas de sync: el outbox sobrevive para que el clear() de las
          // demás tablas propague sus tombstones al servidor.
          if (tabla.name.startsWith('_')) continue
          await tabla.clear()
          const filas = pendiente.datos[tabla.name]
          if (filas?.length) await tabla.bulkAdd(filas)
        }
      })
      setPendiente(null)
      setAvisoImport(t('respaldo.restaurado', `✓ Respaldo restaurado (${pendiente.filas} registros). Recargando…`, { n: String(pendiente.filas) }))
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      setAvisoImport(t('respaldo.errorRestaura', 'No se pudo restaurar; tus datos actuales no se modificaron.'))
    }
  }

  const borrarTodo = async () => {
    // Se conservan las internas de sync: los tombstones del borrado viajan.
    const tablas = Object.keys(db._dbSchema).filter((t) => !t.startsWith('_'))
    await Promise.all(
      tablas.map((tabla) => (db as unknown as Record<string, { clear(): Promise<void> }>)[tabla].clear())
    )
    setBorrado(true)
    setConfirmando(false)
    setStats([])
  }

  const total = stats.reduce((a, s) => a + s.filas, 0)

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!sinTitulo && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('respaldo.titulo', 'Respaldo de datos')}
        </p>
      )}
      <p className="text-xs text-white/45">
        {t('respaldo.desc', 'Exporta, restaura o borra los datos guardados en este dispositivo.')}
      </p>

      <div className="space-y-1 text-xs">
        {persistente !== null && (
          <p className={persistente ? 'text-green-400' : 'text-amber-400'}>
            {persistente
              ? t('respaldo.persistente.si', '✓ Almacenamiento protegido: el navegador no borrará tus datos por falta de espacio')
              : t('respaldo.persistente.no', '⚠ Almacenamiento NO persistente: el navegador podría liberar tus datos; respalda seguido')}
          </p>
        )}
        <p className="text-white/45">
          {ultimo
            ? t('respaldo.ultimo', `Último respaldo: ${ultimo}`, { fecha: ultimo })
            : t('respaldo.sinRespaldo', 'Aún no has exportado un respaldo.')}
        </p>
      </div>

      {stats.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
          <div className="space-y-1">
            {stats.map((s) => (
              <div key={s.tabla} className="flex justify-between text-xs">
                <span className="text-white/60 capitalize">
                  {s.tabla.replace(/([A-Z])/g, ' $1')}
                </span>
                <span className="font-semibold text-white/90">{s.filas}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-white/10 pt-2 flex justify-between text-xs font-bold">
            <span>{t('respaldo.total', 'Total de registros')}</span>
            <span className="text-amber-400">{total}</span>
          </div>
        </div>
      )}

      <button
        onClick={exportar}
        className="w-full rounded-lg bg-amber-600 py-2 text-sm font-bold texto-cta hover:brightness-110 transition"
      >
        <Icono nombre="bajar" /> {t('respaldo.exportar', 'Exportar todo como JSON')}
      </button>

      <label className="block w-full cursor-pointer rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 text-center text-sm font-bold text-amber-400 hover:bg-amber-500/20 transition">
        <Icono nombre="subir" /> {t('respaldo.restaurar', 'Restaurar desde respaldo')}
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
        <div className="rounded-lg bg-white/5 p-3 border border-amber-500/30 space-y-2">
          <p className="text-sm font-semibold text-amber-400">{t('respaldo.confirm.titulo', 'Confirmar restauración')}</p>
          <p className="text-xs text-white/60 leading-relaxed">
            {t('respaldo.confirm.desc', `${pendiente.nombre} contiene ${pendiente.filas} registros. Restaurar reemplazará todos los datos actuales y dejará la casa tal como estaba al momento de exportar.`, { nombre: pendiente.nombre, n: String(pendiente.filas) })}
          </p>
          {pendiente.ignoradas.length > 0 && (
            <p className="text-xs text-white/40">
              {t('respaldo.confirm.omitir', `Se omitirán tablas que esta versión no conoce: ${pendiente.ignoradas.join(', ')}.`, { tablas: pendiente.ignoradas.join(', ') })}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setPendiente(null)}
              className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-semibold hover:bg-white/20 transition"
            >
              {t('respaldo.confirm.cancelar', 'Cancelar')}
            </button>
            <button
              onClick={restaurar}
              className="flex-1 rounded-lg bg-amber-600 py-1.5 text-xs font-bold texto-cta hover:brightness-110 transition"
            >
              {t('respaldo.confirm.restaurar', 'Restaurar respaldo')}
            </button>
          </div>
        </div>
      )}

      {avisoImport && (
        <p className={`text-center text-xs ${avisoImport.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
          {avisoImport}
        </p>
      )}

      <div className="rounded-lg bg-white/5 p-3 border border-red-500/20 space-y-2">
        <p className="text-sm font-semibold text-red-400">{t('respaldo.danger.titulo', 'Zona de peligro')}</p>
        <p className="text-xs text-white/50">
          {t('respaldo.danger.desc', 'Esto borrará TODOS tus datos de Mind Planner Home de forma permanente.')}
        </p>
        {!confirmando ? (
          <button
            onClick={() => setConfirmando(true)}
            className="w-full rounded-lg bg-red-400/10 border border-red-400/30 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-400/20 transition"
          >
            {t('respaldo.danger.btn', 'Borrar todos los datos')}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-bold text-red-400 text-center">{t('respaldo.danger.confirmar', '¿Estás seguro?')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-semibold hover:bg-white/20 transition"
              >
                {t('respaldo.danger.cancelar', 'Cancelar')}
              </button>
              <button
                onClick={borrarTodo}
                className="flex-1 rounded-lg bg-red-600 py-1.5 text-xs font-bold texto-cta hover:brightness-110 transition"
              >
                {t('respaldo.danger.borrar', 'Sí, borrar todo')}
              </button>
            </div>
          </div>
        )}
        {borrado && (
          <p className="text-center text-xs text-green-400">{t('respaldo.borrado', '✓ Datos borrados correctamente.')}</p>
        )}
      </div>
    </div>
  )
}
