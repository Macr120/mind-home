import { useState } from 'react'
import { useDiseño, AVATAR_DEFAULT } from '../../state/disenoStore'
import { ColorPicker } from './ColorPicker'
import { useT } from '../../i18n/useT'
import { iaActiva, generarModelo3D } from '../../chat/ia'

/** Personalización del personaje 3D (modo editar mapa). */
export function EditorAvatarSection({ embed }: { embed?: boolean } = {}) {
  const t = useT()
  const { avatar, setAvatarColor, resetAvatar, setAvatarModelo3d, setAvatarGlb, quitarAvatarModelo } =
    useDiseño()
  const [parte, setParte] = useState<'cabeza' | 'torso' | 'piernas'>('cabeza')
  const [descForma, setDescForma] = useState('')
  const [generando, setGenerando] = useState(false)
  const [errorForma, setErrorForma] = useState<string | null>(null)

  const partes: { id: typeof parte; label: string }[] = [
    { id: 'cabeza', label: t('editor.avatar.cabeza', '🟡 Cabeza') },
    { id: 'torso', label: t('editor.avatar.torso', '🔴 Torso') },
    { id: 'piernas', label: t('editor.avatar.piernas', '🔵 Piernas') },
  ]

  const esDefault =
    avatar.cabeza === AVATAR_DEFAULT.cabeza &&
    avatar.torso === AVATAR_DEFAULT.torso &&
    avatar.piernas === AVATAR_DEFAULT.piernas

  const tieneModeloPropio = !!avatar.modeloGlb || (avatar.modelo3d?.length ?? 0) > 0

  /** La IA construye el avatar (piezas primitivas) desde la descripción. */
  const generarForma = async () => {
    if (!descForma.trim() || generando) return
    setGenerando(true)
    setErrorForma(null)
    try {
      const piezas = await generarModelo3D(descForma.trim())
      await setAvatarModelo3d(piezas)
      setDescForma('')
    } catch (err) {
      console.warn('[Mind Home] No se pudo generar la forma 3D del avatar:', err)
      setErrorForma(t('editor.avatar.formaError', 'No pude crear la forma. Revisa el modelo de IA e inténtalo de nuevo.'))
    } finally {
      setGenerando(false)
    }
  }

  const inputCls =
    'rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none'

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3'}>
      {!embed && <p className="mb-3 text-sm font-semibold">{t('editor.avatar.titulo', 'Avatar del personaje')}</p>}
      <div className="flex justify-center py-3">
        <div className="flex flex-col items-center gap-0.5">
          <div
            className="w-9 h-9 rounded-lg"
            style={{ background: avatar.cabeza, boxShadow: `0 2px 8px ${avatar.cabeza}88` }}
          />
          <div className="flex items-center gap-0.5">
            <div className="w-3.5 h-7 rounded-sm" style={{ background: avatar.torso }} />
            <div className="w-7 h-9 rounded-lg" style={{ background: avatar.torso }} />
            <div className="w-3.5 h-7 rounded-sm" style={{ background: avatar.torso }} />
          </div>
          <div className="flex gap-0.5">
            <div className="w-3.5 h-8 rounded-b-md" style={{ background: avatar.piernas }} />
            <div className="w-3.5 h-8 rounded-b-md" style={{ background: avatar.piernas }} />
          </div>
        </div>
      </div>

      {tieneModeloPropio && (
        <p className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200/90">
          {avatar.modeloGlb
            ? t('editor.avatar.usandoGlb', 'Usando un modelo .glb propio. Los colores no aplican a este modelo.')
            : t('editor.avatar.usandoIa', 'Usando una forma creada por IA. Los colores no aplican a esta forma.')}
        </p>
      )}

      <div className="flex gap-1.5 mb-3">
        {partes.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setParte(p.id)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              parte === p.id ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <ColorPicker value={avatar[parte]} onChange={(c) => setAvatarColor(parte, c)} />

      {/* Forma 3D personalizada: descrita a la IA o modelo .glb propio */}
      <div className="mt-3 space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {t('editor.avatar.forma3d', 'Forma 3D personalizada')}
        </p>

        {/* Describir la forma y que la construya la IA */}
        <div className="flex gap-1.5">
          <input
            value={descForma}
            onChange={(e) => setDescForma(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generarForma()}
            placeholder={
              iaActiva()
                ? t('editor.avatar.formaPh', 'Descríbelo: "robot azul con capa roja"')
                : t('editor.avatar.formaSinIa', 'Describir la forma requiere IA (elige modelo en la barra)')
            }
            disabled={!iaActiva() || generando}
            className={`${inputCls} min-w-0 flex-1 disabled:opacity-40`}
          />
          <button
            type="button"
            onClick={generarForma}
            disabled={!iaActiva() || generando || !descForma.trim()}
            className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-30"
            title={t('editor.avatar.formaGenerar', 'Crear la forma con IA')}
          >
            {generando ? <span className="animate-pulse">…</span> : '✨'}
          </button>
        </div>
        {errorForma && <p className="px-1 text-[10px] text-red-300/80">{errorForma}</p>}

        {/* Subir un .glb propio / quitar el modelo personalizado */}
        <div className="flex items-center gap-1.5">
          <label className="cursor-pointer rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/15">
            📦 {t('editor.avatar.subirGlb', 'Subir modelo .glb')}
            <input
              type="file"
              accept=".glb,.gltf,model/gltf-binary"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void setAvatarGlb(f)
                e.target.value = ''
              }}
            />
          </label>
          {tieneModeloPropio && (
            <button
              type="button"
              onClick={() => void quitarAvatarModelo()}
              className="rounded-md px-2 py-1 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-white/75"
            >
              {avatar.modeloGlb
                ? `✕ ${t('editor.avatar.quitarGlb', 'Quitar modelo subido')}`
                : `✕ ${t('editor.avatar.quitarFormaIa', 'Quitar forma creada por IA')}`}
            </button>
          )}
        </div>
      </div>

      {(!esDefault || tieneModeloPropio) && (
        <button
          type="button"
          onClick={resetAvatar}
          className="mt-3 w-full rounded-lg bg-white/5 py-2 text-xs text-white/50 hover:bg-white/10 transition"
        >
          {t('editor.avatar.reset', '↺ Restaurar avatar original')}
        </button>
      )}
    </div>
  )
}
