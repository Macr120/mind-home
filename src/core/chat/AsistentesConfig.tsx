import { useState } from 'react'
import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { MASCOTAS, COLOR_FORMA, type Asistente } from './mascotas'
import { iaActiva, generarModelo3D } from './ia'
import { getPlantilla } from '../registry'
import { appsAsignadas } from './dispatcher'
import { useT } from '../i18n/useT'

/** Nombre corto de la app (sin el "· algo"). */
const nombreCorto = (roomId: string) => getPlantilla(roomId)?.nombre.split(' · ')[0] ?? roomId

/**
 * Panel ⚙️ de gestión de asistentes: crear y eliminar, personalizar su
 * aspecto (nombre, emoji, color, forma 3D) y carácter (personalidad, saludo),
 * y ponerlos o quitarlos del mapa como personajes 3D.
 */
export function AsistentesConfig({ onCerrar }: { onCerrar: () => void }) {
  const t = useT()
  const lista = useAsistentes((s) => s.lista)
  const ocultos = useAsistentes((s) => s.ocultos)
  const guardar = useAsistentes((s) => s.guardar)
  const eliminar = useAsistentes((s) => s.eliminar)
  const restaurar = useAsistentes((s) => s.restaurar)
  const mascotaId = useMascota((s) => s.mascota)
  const [editando, setEditando] = useState<string | null>(null)

  const crear = async () => {
    const id = `custom-${Date.now()}`
    await guardar({
      id,
      nombre: t('chat.config.nuevoNombre', 'Nuevo asistente'),
      emoji: '✨',
      forma: 'mago',
      historia: '',
      personalidad: '',
      saludo: t('chat.config.nuevoSaludo', '¡Hola! Soy tu nuevo asistente.'),
      cuartos: [],
      enMapa: false,
    })
    setEditando(id)
  }

  return (
    <div className="ui-panel-glass mb-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 px-1 pb-2">
        <span className="text-sm">⚙️</span>
        <span className="flex-1 text-[11px] font-semibold text-white/50">
          {t('chat.config.titulo', 'Tus asistentes')}
        </span>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded px-2 py-0.5 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title={t('chat.conv.cerrar', 'Cerrar')}
        >
          ✕
        </button>
      </div>

      {lista.map((a) => {
        const activo = a.id === mascotaId
        const enEdicion = editando === a.id
        return (
          <div key={a.id}>
            <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-lg">
                {a.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/85">
                  {a.nombre}
                  {activo && (
                    <span className="ml-1.5 text-[10px] font-semibold text-emerald-400">
                      ● {t('chat.config.activo', 'activo')}
                    </span>
                  )}
                </p>
                <p className="truncate text-[10px] text-white/35">
                  {a.cuartos.length > 0
                    ? `🗂️ ${a.cuartos.map(nombreCorto).join(', ')}`
                    : t('chat.config.archivaTodo', '🗂️ Archiva en todos los cuartos')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => guardar({ ...a, enMapa: !a.enMapa })}
                className={`rounded px-1 py-0.5 text-sm transition hover:bg-white/10 ${
                  a.enMapa || activo ? 'opacity-100' : 'opacity-25 grayscale'
                }`}
                title={
                  activo && !a.enMapa
                    ? t('chat.config.activoMapa', 'El asistente activo siempre está en el mapa')
                    : a.enMapa
                    ? t('chat.config.enMapa', 'Quitar del mapa')
                    : t('chat.config.ponerMapa', 'Poner en el mapa')
                }
              >
                🗺️
              </button>
              <button
                type="button"
                onClick={() => setEditando(enEdicion ? null : a.id)}
                className={`rounded px-1 py-0.5 text-[12px] transition hover:bg-white/10 ${
                  enEdicion ? 'text-white/80' : 'text-white/30 hover:text-white/70'
                }`}
                title={t('chat.config.editar', 'Personalizar')}
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => eliminar(a.id)}
                disabled={lista.length <= 1}
                className="rounded px-1 py-0.5 text-[12px] text-white/20 transition hover:bg-white/10 hover:text-white/60 disabled:opacity-20"
                title={t('chat.config.eliminar', 'Eliminar asistente')}
              >
                ✕
              </button>
            </div>
            {enEdicion && <FormAsistente a={a} guardar={guardar} />}
          </div>
        )
      })}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/10 px-1 pt-2">
        <button
          type="button"
          onClick={crear}
          className="flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
        >
          ➕ {t('chat.config.nuevo', 'Crear asistente')}
        </button>
        {ocultos.length > 0 && (
          <>
            <span className="ml-1 text-[10px] text-white/35">
              {t('chat.config.restaurar', 'Restaurar:')}
            </span>
            {ocultos.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => restaurar(a.id)}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/15"
                title={`${t('chat.config.restaurarUno', 'Restaurar a')} ${a.nombre}`}
              >
                {a.emoji} {a.nombre}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

/** Formulario de personalización: los cambios se guardan al instante. */
function FormAsistente({
  a,
  guardar,
}: {
  a: Asistente
  guardar: (a: Asistente) => Promise<void>
}) {
  const t = useT()
  const [descForma, setDescForma] = useState('')
  const [generando, setGenerando] = useState(false)
  const [errorForma, setErrorForma] = useState<string | null>(null)
  const inputCls =
    'rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none'

  const tieneModeloPropio = !!a.modeloGlb || (a.modelo3d?.length ?? 0) > 0

  /** La IA construye el personaje (piezas primitivas) desde la descripción. */
  const generarForma = async () => {
    if (!descForma.trim() || generando) return
    setGenerando(true)
    setErrorForma(null)
    try {
      const piezas = await generarModelo3D(descForma.trim())
      await guardar({ ...a, modelo3d: piezas, modeloGlb: undefined })
      setDescForma('')
    } catch (err) {
      console.warn('[Mind Home] No se pudo generar la forma 3D:', err)
      setErrorForma(t('chat.config.formaError', 'No pude crear la forma. Revisa el modelo de IA e inténtalo de nuevo.'))
    } finally {
      setGenerando(false)
    }
  }

  /** Modelo .glb del usuario: se guarda como blob en el propio asistente. */
  const subirGlb = (file: File) => {
    guardar({ ...a, modeloGlb: file, modelo3d: undefined })
  }

  return (
    <div className="mb-1 ml-10 space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-2">
      <div className="flex gap-1.5">
        <input
          value={a.nombre}
          onChange={(e) => guardar({ ...a, nombre: e.target.value })}
          placeholder={t('chat.config.nombre', 'Nombre')}
          className={`${inputCls} min-w-0 flex-1`}
        />
        <input
          value={a.emoji}
          onChange={(e) => guardar({ ...a, emoji: e.target.value })}
          maxLength={4}
          className={`${inputCls} w-14 text-center`}
          title={t('chat.config.emoji', 'Emoji del asistente')}
        />
      </div>
      <textarea
        value={a.historia}
        onChange={(e) => guardar({ ...a, historia: e.target.value })}
        placeholder={t(
          'chat.config.historiaPh',
          'Historia y contexto: ej. "Viejo lobo de mar que cuidó un faro 40 años; ahora cuida tu casa"',
        )}
        rows={2}
        className={`${inputCls} w-full resize-none`}
        title={t('chat.config.historia', 'Historia y contexto del personaje')}
      />
      <textarea
        value={a.personalidad}
        onChange={(e) => guardar({ ...a, personalidad: e.target.value })}
        placeholder={t(
          'chat.config.caracterPh',
          'Carácter: ej. "Hablas como pirata, bromista y directo, cierras con 🏴‍☠️"',
        )}
        rows={2}
        className={`${inputCls} w-full resize-none`}
      />

      {/* Cuartos de los que es responsable de archivar (vacío = todos) */}
      <div className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-1.5">
        <p className="px-0.5 text-[10px] text-white/40">
          {t('chat.config.cuartos', 'Asignar apps')}
          <span className="ml-1 text-white/25">
            {a.cuartos.length === 0
              ? t('chat.config.cuartosTodos', '(ninguna marcada = todas)')
              : `(${a.cuartos.length})`}
          </span>
        </p>
        <div className="flex flex-wrap gap-1">
          {appsAsignadas().map((r) => {
            const activo = a.cuartos.includes(r.id)
            return (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  guardar({
                    ...a,
                    cuartos: activo
                      ? a.cuartos.filter((c) => c !== r.id)
                      : [...a.cuartos, r.id],
                  })
                }
                title={r.nombre}
                className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[11px] transition ${
                  activo
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-white/90'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                }`}
                style={activo ? { borderColor: `${r.color}66` } : undefined}
              >
                <span>{r.icon}</span>
                <span>{nombreCorto(r.id)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Forma 3D: base integrada, descrita a la IA, o modelo .glb propio */}
      <div className="space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/35">{t('chat.config.forma', 'Forma 3D:')}</span>
          {MASCOTAS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => guardar({ ...a, forma: f.id, modelo3d: undefined, modeloGlb: undefined })}
              title={f.nombre}
              className={`grid h-7 w-7 place-items-center rounded-lg text-base transition ${
                a.forma === f.id && !tieneModeloPropio
                  ? 'bg-emerald-500/20 ring-1 ring-emerald-400/50'
                  : 'hover:bg-white/10'
              }`}
            >
              {f.emoji}
            </button>
          ))}
          <input
            type="color"
            value={a.color || COLOR_FORMA[a.forma]}
            onChange={(e) => guardar({ ...a, color: e.target.value })}
            className="ml-auto h-7 w-9 cursor-pointer rounded border border-white/10 bg-transparent"
            title={t('chat.config.color', 'Color del personaje')}
          />
        </div>

        {/* Describir la forma y que la construya la IA */}
        <div className="flex gap-1.5">
          <input
            value={descForma}
            onChange={(e) => setDescForma(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generarForma()}
            placeholder={
              iaActiva()
                ? t('chat.config.formaPh', 'Descríbelo: "dragón verde con lentes y chaleco"')
                : t('chat.config.formaSinIa', 'Describir la forma requiere IA (elige modelo en la barra)')
            }
            disabled={!iaActiva() || generando}
            className={`${inputCls} min-w-0 flex-1 disabled:opacity-40`}
          />
          <button
            type="button"
            onClick={generarForma}
            disabled={!iaActiva() || generando || !descForma.trim()}
            className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-30"
            title={t('chat.config.formaGenerar', 'Crear la forma con IA')}
          >
            {generando ? <span className="animate-pulse">…</span> : '✨'}
          </button>
        </div>
        {errorForma && <p className="px-1 text-[10px] text-red-300/80">{errorForma}</p>}

        {/* Subir un .glb propio / quitar el modelo personalizado */}
        <div className="flex items-center gap-1.5">
          <label className="cursor-pointer rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/15">
            📦 {t('chat.config.subirGlb', 'Subir modelo .glb')}
            <input
              type="file"
              accept=".glb,.gltf,model/gltf-binary"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) subirGlb(f)
                e.target.value = ''
              }}
            />
          </label>
          {tieneModeloPropio && (
            <button
              type="button"
              onClick={() => guardar({ ...a, modelo3d: undefined, modeloGlb: undefined })}
              className="rounded-md px-2 py-1 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-white/75"
            >
              {a.modeloGlb
                ? `✕ ${t('chat.config.quitarGlb', 'Quitar modelo subido')}`
                : `✕ ${t('chat.config.quitarFormaIa', 'Quitar forma creada por IA')}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
