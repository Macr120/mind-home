import { useState } from 'react'
import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { confirmar } from '../state/confirmarStore'
import {
  MASCOTAS,
  COLOR_FORMA,
  VOZ_FORMA,
  nombreAsistente,
  nombreForma,
  saludoAsistente,
  type Asistente,
} from './mascotas'
import { hayVoz, hablarComoAsistente, vocesDisponibles, langVoz } from '../audio/voz'
import { VOCES_IA } from '../audio/vozIA'
import { iaActiva, generarModelo3D } from './ia'
import { iaHabilitada } from '../edicion'
import { Creditos } from '../ui/Creditos'
import { OP_ASISTENTE_3D, OP_ASISTENTE_VOZ } from '../cuenta/catalogoNucleo'
import { getPlantilla } from '../registry'
import { appsAsignadas } from './dispatcher'
import { useT } from '../i18n/useT'
import { Icono } from '../ui/iconos/Icono'

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
        <span className="text-sm"><Icono nombre="ajustes" /></span>
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
            {/* La fila entera abre su editor: el lápiz de antes era un blanco
                diminuto y el ✕ de borrar vivía justo al lado. */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setEditando(enEdicion ? null : a.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setEditando(enEdicion ? null : a.id)
                }
              }}
              title={t('chat.config.editar', 'Personalizar')}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-white/5 ${
                enEdicion ? 'bg-white/5' : ''
              }`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-lg">
                <Icono emoji={a.emoji} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/85">
                  {nombreAsistente(t, a)}
                  {activo && (
                    <span className="ml-1.5 text-[10px] font-semibold text-accent">
                      ● {t('chat.config.activo', 'activo')}
                    </span>
                  )}
                </p>
                <p className="truncate text-[10px] text-white/35">
                  <Icono nombre="archivador" />{' '}
                  {a.cuartos.length > 0
                    ? a.cuartos.map(nombreCorto).join(', ')
                    : t('chat.config.archivaTodo', 'Archiva en todos los cuartos')}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation() // acción rápida: no debe abrir el editor
                  guardar({ ...a, enMapa: !a.enMapa })
                }}
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
                <Icono nombre="mapa" />
              </button>
              <span className="shrink-0 px-1 text-xs text-white/30">
                <Icono nombre={enEdicion ? 'subir' : 'bajar'} />
              </span>
            </div>
            {enEdicion && (
              <FormAsistente
                a={a}
                guardar={guardar}
                eliminar={eliminar}
                puedeEliminar={lista.length > 1}
                onEliminado={() => setEditando(null)}
              />
            )}
          </div>
        )
      })}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/10 px-1 pt-2">
        <button
          type="button"
          onClick={crear}
          className="flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent/20"
        >
          <Icono nombre="agregar" /> {t('chat.config.nuevo', 'Crear asistente')}
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
                title={`${t('chat.config.restaurarUno', 'Restaurar a')} ${nombreAsistente(t, a)}`}
              >
                <Icono emoji={a.emoji} /> {nombreAsistente(t, a)}
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
  eliminar,
  puedeEliminar,
  onEliminado,
}: {
  a: Asistente
  guardar: (a: Asistente) => Promise<void>
  eliminar: (id: string) => Promise<void>
  /** Falso con un solo asistente en la lista: siempre debe quedar uno. */
  puedeEliminar: boolean
  onEliminado: () => void
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
      const { piezas } = await generarModelo3D(descForma.trim())
      await guardar({ ...a, modelo3d: piezas, modeloGlb: undefined })
      setDescForma('')
    } catch (err) {
      console.warn('[MPH] No se pudo generar la forma 3D:', err)
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
                    ? 'border-accent/40 bg-accent/15 text-white/90'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                }`}
                style={activo ? { borderColor: `${r.color}66` } : undefined}
              >
                <span><Icono emoji={r.icon} /></span>
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
              title={nombreForma(t, f)}
              className={`grid h-7 w-7 place-items-center rounded-lg text-base transition ${
                a.forma === f.id && !tieneModeloPropio
                  ? 'bg-accent/20 ring-1 ring-accent/50'
                  : 'hover:bg-white/10'
              }`}
            >
              <Icono emoji={f.emoji} />
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

        {/* Describir la forma con IA: cuesta créditos. Subir un .glb propio es gratis. */}
        {iaHabilitada() && (
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
            className="rounded-md border border-accent/30 bg-accent/10 px-2.5 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:opacity-30"
            title={t('chat.config.formaGenerar', 'Crear la forma con IA')}
          >
            {generando ? <span className="animate-pulse">…</span> : <Icono nombre="brillo" />}
          </button>
          <Creditos op={OP_ASISTENTE_3D} />
        </div>
        )}
        {errorForma && <p className="px-1 text-[10px] text-red-400/80">{errorForma}</p>}

        {/* Subir un .glb propio / quitar el modelo personalizado */}
        <div className="flex items-center gap-1.5">
          <label className="cursor-pointer rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/15">
            <Icono nombre="cuarto-bodega" /> {t('chat.config.subirGlb', 'Subir modelo .glb')}
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

      {/* Voz TTS: leer o no lo que dice + nativa del sistema, o con IA (OpenAI) */}
      <div className="space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-1.5">
        <button
          type="button"
          onClick={() => guardar({ ...a, vozLeer: !a.vozLeer })}
          disabled={!hayVoz() && !a.vozIA}
          className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold transition disabled:opacity-30 ${
            a.vozLeer
              ? 'ui-accent-bg border-transparent'
              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
          }`}
        >
          <span className="shrink-0 text-[11px]">{a.vozLeer ? '✓' : '○'}</span>
          <span className="min-w-0 flex-1 truncate">
            {t('chat.config.vozLeer', 'Leer en voz alta lo que dice')}
          </span>
        </button>

        {iaHabilitada() && (
          <button
            type="button"
            onClick={() => guardar({ ...a, vozIA: !a.vozIA })}
            className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold transition ${
              a.vozIA
                ? 'ui-accent-bg border-transparent'
                : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            <span className="shrink-0 text-[11px]">{a.vozIA ? '✓' : '○'}</span>
            <span className="min-w-0 flex-1 truncate">
              {t('chat.config.vozIA', 'Voz con IA (OpenAI, más natural)')}
            </span>
            <Creditos op={OP_ASISTENTE_VOZ} />
          </button>
        )}

        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-[10px] text-white/35">
            {t('chat.config.voz', 'Voz:')}
          </span>
          {a.vozIA ? (
            <select
              value={a.vozIaVoz ?? 'alloy'}
              onChange={(e) => guardar({ ...a, vozIaVoz: e.target.value })}
              className={`${inputCls} min-w-0 flex-1`}
            >
              {VOCES_IA.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={a.vozNombre ?? ''}
              onChange={(e) => guardar({ ...a, vozNombre: e.target.value || undefined })}
              disabled={!hayVoz()}
              className={`${inputCls} min-w-0 flex-1 disabled:opacity-40`}
            >
              <option value="">{t('chat.config.vozAuto', 'Automática (por idioma)')}</option>
              {vocesDisponibles(langVoz()).map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => void hablarComoAsistente(saludoAsistente(t, a), a)}
            disabled={!hayVoz() && !a.vozIA}
            className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/15 disabled:opacity-30"
            title={t('chat.config.vozProbar', 'Probar la voz')}
          >
            <Icono nombre="bocina" />
          </button>
        </div>

        {!a.vozIA && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[10px] text-white/40">
                {t('chat.config.vozTono', 'Tono')}
              </span>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={a.vozPitch ?? VOZ_FORMA[a.forma].pitch}
                onChange={(e) => guardar({ ...a, vozPitch: parseFloat(e.target.value) })}
                className="min-w-0 flex-1"
                style={{ accentColor: 'var(--ui-accent)' }}
              />
              <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-white/40">
                ×{(a.vozPitch ?? VOZ_FORMA[a.forma].pitch).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[10px] text-white/40">
                {t('chat.config.vozVelocidad', 'Velocidad')}
              </span>
              <input
                type="range"
                min={0.6}
                max={1.4}
                step={0.05}
                value={a.vozRate ?? VOZ_FORMA[a.forma].rate}
                onChange={(e) => guardar({ ...a, vozRate: parseFloat(e.target.value) })}
                className="min-w-0 flex-1"
                style={{ accentColor: 'var(--ui-accent)' }}
              />
              <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-white/40">
                ×{(a.vozRate ?? VOZ_FORMA[a.forma].rate).toFixed(2)}
              </span>
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[10px] text-white/40">
            {t('chat.config.vozVolumen', 'Volumen')}
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={a.vozVolumen ?? 1}
            onChange={(e) => guardar({ ...a, vozVolumen: parseFloat(e.target.value) })}
            className="min-w-0 flex-1"
            style={{ accentColor: 'var(--ui-accent)' }}
          />
          <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-white/40">
            {Math.round((a.vozVolumen ?? 1) * 100)}%
          </span>
        </div>
      </div>

      {/* Comentarios espontáneos: si los hace y qué tan seguido */}
      <div className="space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-1.5">
        <button
          type="button"
          onClick={() => guardar({ ...a, espontaneo: a.espontaneo === false })}
          className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold transition ${
            a.espontaneo !== false
              ? 'ui-accent-bg border-transparent'
              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
          }`}
        >
          <span className="shrink-0 text-[11px]">{a.espontaneo !== false ? '✓' : '○'}</span>
          <span className="min-w-0 flex-1 truncate">
            {t('chat.config.espontaneo', 'Comentarios espontáneos')}
          </span>
        </button>
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] text-white/40">
            <Icono nombre="corazon" /> {t('chat.config.corazon', 'Corazón (espontaneidad)')}
          </span>
          <span className="text-[10px] font-semibold text-white/55">
            {a.espontaneo === false
              ? t('chat.config.corazonOff', 'Apagados')
              : etiquetaCorazon(a.corazon ?? 0.5, t)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={a.corazon ?? 0.5}
          onChange={(e) => guardar({ ...a, corazon: parseFloat(e.target.value) })}
          disabled={a.espontaneo === false}
          className="w-full disabled:opacity-30"
          style={{ accentColor: 'var(--ui-accent)' }}
        />
      </div>

      {/* Borrar el asistente: al final de SU editor, no en la fila de la lista
          (ahí era un ✕ pegado al resto de botones y se pulsaba sin querer). */}
      <div className="border-t border-white/10 pt-2">
        <button
          type="button"
          disabled={!puedeEliminar}
          onClick={async () => {
            const ok = await confirmar({
              titulo: t('chat.config.eliminar', 'Eliminar asistente'),
              mensaje: t('chat.config.eliminarConfirma', '¿Eliminar a {n}? Sus conversaciones se quedan.', {
                n: nombreAsistente(t, a),
              }),
              textoOk: t('chat.config.eliminarOk', 'Eliminar'),
              peligro: true,
            })
            if (!ok) return
            await eliminar(a.id)
            onEliminado()
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-30"
          title={
            puedeEliminar
              ? t('chat.config.eliminar', 'Eliminar asistente')
              : t('chat.config.eliminarUltimo', 'Debe quedar al menos un asistente')
          }
        >
          <Icono nombre="basura" /> {t('chat.config.eliminar', 'Eliminar asistente')}
        </button>
      </div>
    </div>
  )
}

/** Etiqueta humana del nivel de corazón (0..1). */
function etiquetaCorazon(v: number, t: ReturnType<typeof useT>): string {
  if (v <= 0) return t('corazon.nivel.0', 'Callado')
  if (v < 0.35) return t('corazon.nivel.1', 'Tranquilo')
  if (v < 0.7) return t('corazon.nivel.2', 'Hablador')
  return t('corazon.nivel.3', 'Parlanchín')
}
