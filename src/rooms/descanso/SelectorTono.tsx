import { useEffect, useRef, useState } from 'react'
import { pistasMusicaRepo } from '../../core/data/repository'
import type { PerfilSueno } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { idPistaDeTono, probarTono, TONO_DEFAULT, tonoDePista, TONOS } from './tonos'

/** Tope del audio subido, el mismo que la biblioteca de música. */
const MAX_MB = 25

/**
 * Tono del despertador: los del catálogo y los audios propios del usuario.
 * Las pistas son las MISMAS de Configuraciones › Música (tabla `pistasMusica`),
 * así que subir aquí un ringtone también lo deja disponible como música: una
 * sola biblioteca de audio en toda la casa. Elegir un tono lo prueba en el acto.
 */
export function SelectorTono({
  tono,
  volumen,
  onCambio,
}: {
  tono: string | undefined
  volumen: number
  onCambio: (cambios: Partial<PerfilSueno>) => void
}) {
  const t = useT()
  const pistas = pistasMusicaRepo.useAll() ?? []
  const inputRef = useRef<HTMLInputElement>(null)
  const parar = useRef<() => void>(() => {})
  const [aviso, setAviso] = useState('')

  // Al cerrar la app la prueba no debe quedarse sonando.
  useEffect(() => () => parar.current(), [])

  const pistaDe = (valor: string) => {
    const id = idPistaDeTono(valor)
    return id == null ? undefined : pistas.find((p) => p.id === id)
  }

  // Si el tono era una pista que ya se borró, se marca el del catálogo que sonará.
  const activo = idPistaDeTono(tono) != null && !pistaDe(tono ?? '') ? TONO_DEFAULT : tono ?? TONO_DEFAULT

  const elegir = (valor: string) => {
    parar.current()
    onCambio({ tono: valor })
    parar.current = probarTono(valor, volumen, pistaDe(valor))
  }

  const subir = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setAviso(t('descanso.tono.grande', 'Archivo muy grande (máx. {n} MB).', { n: MAX_MB }))
      return
    }
    setAviso('')
    const id = await pistasMusicaRepo.add({
      nombre: file.name.replace(/\.[^.]+$/, ''),
      blob: file,
      creadoEn: new Date().toISOString(),
    })
    // Lo recién subido es lo que el usuario quiere oír: queda elegido.
    onCambio({ tono: tonoDePista(id) })
  }

  const chip = (valor: string, icono: React.ReactNode, texto: string) => (
    <button
      key={valor}
      type="button"
      onClick={() => elegir(valor)}
      className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
        activo === valor
          ? 'border-amber-400/60 bg-amber-400/15 text-amber-300'
          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
      }`}
      title={t('descanso.tono.probar', 'Elegir y escuchar')}
    >
      {icono}
      <span className="min-w-0 truncate">{texto}</span>
    </button>
  )

  return (
    <div className="space-y-2 rounded-lg bg-black/25 px-3 py-2.5">
      <p className="text-xs font-semibold text-white/60">
        <Icono nombre="bocina" /> {t('descanso.tono.titulo', 'Tono del despertador')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TONOS.map((x) =>
          chip(x.id, <Icono nombre={x.icono} />, t(`descanso.tono.${x.id}`, x.nombre)),
        )}
        {pistas.map((p) =>
          p.id == null ? null : chip(tonoDePista(p.id), <Icono nombre="musica" />, p.nombre),
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-dashed border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/10"
        >
          <Icono nombre="subir" /> {t('descanso.tono.subir', 'Subir audio')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void subir(file)
            e.target.value = ''
          }}
        />
      </div>
      {aviso && <p className="text-[11px] leading-snug text-amber-300/80">{aviso}</p>}
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-xs text-white/50">{t('descanso.tono.volumen', 'Volumen')}</span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={volumen}
          onChange={(e) => onCambio({ volumenAlarma: parseFloat(e.target.value) })}
          className="min-w-0 flex-1"
          style={{ accentColor: 'var(--ui-accent)' }}
          aria-label={t('descanso.tono.volumen', 'Volumen')}
        />
        <span className="w-9 text-right text-[10px] tabular-nums text-white/40">
          {Math.round(volumen * 100)}%
        </span>
      </div>
    </div>
  )
}
