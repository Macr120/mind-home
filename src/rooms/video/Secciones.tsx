import { useState, type ReactNode } from 'react'
import { useVozGenerando } from '../../core/audio/vozIA'
import { CREDITOS, opImagen } from '../../core/cuenta/costos'
import type { AnimacionTexto, EstiloTexto, FiltroEscena, FuenteTexto, FuenteVisual, MedioVideo } from '../../core/data/db'
import { mediosVideoRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { generarImagen, imagenIaActiva } from '../../core/imagenIA'
import { useAjustes } from '../../core/state/ajustesStore'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonSecundario, Campo, INPUT, Spinner } from '../_shared/ui'
import { type AspectoVideo, PALETA_VIDEO } from './constantes'
import { OP_NARRACION } from './costosIA'
import { gruposVoz, hablarConVoz, usaDispositivo, vozDejaArchivo, vozValida, type GrupoVoces } from './voces'

/** Trozos del panel del clip compartidos por varias pistas (vienen del panel de escena anterior). */

/** Campo numérico corto en línea (el kit trae `w-full`). */
export const INPUT_CORTO = INPUT.replace('w-full', 'w-20')

const FILTROS: FiltroEscena[] = ['ninguno', 'bn', 'sepia', 'calido', 'frio', 'oscuro']
const FUENTES: FuenteTexto[] = ['sans', 'serif', 'mono', 'display']
const ANIMACIONES: AnimacionTexto[] = ['ninguna', 'fundido', 'subir', 'maquina']

export function Chip({ activo, onClick, disabled, children }: { activo: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      className={`rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-30 ${
        activo ? 'border-white/60 bg-white/20 font-semibold' : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

/** Pestaña píldora de la cabecera de un panel lateral (Clip/Guion, Medios/Sonidos). */
export function Pestana({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`rounded-full px-2.5 py-0.5 text-[11px] transition ${activa ? 'bg-white/20 font-semibold' : 'text-white/50 hover:bg-white/10'}`}
    >
      {children}
    </button>
  )
}

export function Deslizador({
  etiqueta,
  valor,
  onCambiar,
  min = 0,
  max = 1,
  step = 0.05,
}: {
  etiqueta: string
  valor: number
  onCambiar: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <Campo etiqueta={etiqueta} className="w-36">
      <input type="range" min={min} max={max} step={step} value={valor} onChange={(e) => onCambiar(Number(e.target.value))} className="w-full" />
    </Campo>
  )
}

export function SeccionFiltro({ filtro, onCambiar }: { filtro: FiltroEscena; onCambiar: (f: FiltroEscena) => void }) {
  const t = useT()
  const etiqueta: Record<FiltroEscena, string> = {
    ninguno: t('video.filtro.ninguno', 'Sin filtro'),
    bn: t('video.filtro.bn', 'B/N'),
    sepia: t('video.filtro.sepia', 'Sepia'),
    calido: t('video.filtro.calido', 'Cálido'),
    frio: t('video.filtro.frio', 'Frío'),
    oscuro: t('video.filtro.oscuro', 'Oscuro'),
  }
  return (
    <Campo etiqueta={t('video.escena.filtro', 'Filtro')}>
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Chip key={f} activo={filtro === f} onClick={() => onCambiar(f)}>
            {etiqueta[f]}
          </Chip>
        ))}
      </div>
    </Campo>
  )
}

/** Fuente visual de un clip principal o de fondo: clip o imagen de la biblioteca, color plano o imagen con IA. */
export function SeccionFuenteVisual({
  fuente,
  aspecto,
  permiteVideo,
  onElegirMedio,
  onCambiar,
}: {
  fuente: FuenteVisual
  aspecto: AspectoVideo
  permiteVideo: boolean
  onElegirMedio: (tipos: MedioVideo['tipo'][], alElegir: (m: MedioVideo) => void) => void
  onCambiar: (fuente: FuenteVisual) => void
}) {
  const t = useT()
  const calidad = useAjustes((s) => s.calidadImagen)
  const [prompt, setPrompt] = useState('')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const generarFondo = async () => {
    if (!prompt.trim()) return
    setError('')
    setGenerando(true)
    try {
      const blob = await generarImagen(prompt.trim(), 1280, undefined, aspecto, calidad)
      const bmp = await createImageBitmap(blob)
      const medioId = await mediosVideoRepo.add({
        tipo: 'imagen',
        nombre: prompt.trim().slice(0, 40),
        blob,
        ancho: bmp.width,
        alto: bmp.height,
        miniatura: blob,
        origen: 'ia',
        creadoEn: new Date().toISOString(),
      })
      bmp.close()
      onCambiar({ tipo: 'imagen', medioId })
      setPrompt('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerando(false)
    }
  }
  return (
    <Campo etiqueta={t('video.escena.fondo', 'Fondo')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <BotonSecundario
          pequeno
          onClick={() =>
            onElegirMedio(permiteVideo ? ['video', 'imagen'] : ['imagen'], (m) => {
              if (m.id == null) return
              onCambiar(m.tipo === 'video' ? { tipo: 'video', medioId: m.id } : { tipo: 'imagen', medioId: m.id })
            })
          }
        >
          <Icono nombre="pelicula" /> {permiteVideo ? t('video.escena.elegirMedio', 'Clip o imagen') : t('video.panel.elegirImagen', 'Elegir imagen')}
        </BotonSecundario>
        {PALETA_VIDEO.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={t('video.escena.fondoColor', 'Fondo de color')}
            title={t('video.escena.fondoColor', 'Fondo de color')}
            onClick={() => onCambiar({ tipo: 'color', color: c })}
            style={{ background: c }}
            className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
              fuente.tipo === 'color' && fuente.color === c ? 'border-white ring-2 ring-white/60' : 'border-white/20'
            }`}
          />
        ))}
      </div>
      {imagenIaActiva() && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('video.escena.fondoIaPh', 'Fondo con IA: un atardecer en la playa…')}
            className={INPUT}
          />
          <BotonSecundario pequeno disabled={generando || !prompt.trim()} onClick={() => void generarFondo()}>
            {generando ? <Spinner pequeno /> : <Icono nombre="brillo" />} <Creditos n={CREDITOS[opImagen(calidad)]} />
          </BotonSecundario>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </Campo>
  )
}

/** El texto en pantalla: contenido, subtítulo, posición, tamaño, color, tipografía, caja y animación. */
export function SeccionTexto({
  texto,
  onCambiar,
  autoFocus,
}: {
  texto: EstiloTexto
  onCambiar: (patch: Partial<EstiloTexto>) => void
  autoFocus?: boolean
}) {
  const t = useT()
  const etiquetaFuente: Record<FuenteTexto, string> = {
    sans: t('video.texto.fuente.sans', 'Sans'),
    serif: t('video.texto.fuente.serif', 'Serif'),
    mono: t('video.texto.fuente.mono', 'Mono'),
    display: t('video.texto.fuente.display', 'Display'),
  }
  const etiquetaAnim: Record<AnimacionTexto, string> = {
    ninguna: t('video.texto.anim.ninguna', 'Ninguna'),
    fundido: t('video.texto.anim.fundido', 'Fundido'),
    subir: t('video.texto.anim.subir', 'Subir'),
    maquina: t('video.texto.anim.maquina', 'Máquina de escribir'),
  }
  return (
    <Campo etiqueta={t('video.escena.texto', 'Texto en pantalla')}>
      <textarea
        value={texto.contenido}
        onChange={(e) => onCambiar({ contenido: e.target.value })}
        rows={2}
        autoFocus={autoFocus}
        placeholder={t('video.escena.textoPh', 'Un título breve…')}
        className={INPUT}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Chip activo={texto.posicion === 'arriba'} onClick={() => onCambiar({ posicion: 'arriba' })}>
          {t('video.escena.arriba', 'Arriba')}
        </Chip>
        <Chip activo={texto.posicion === 'centro'} onClick={() => onCambiar({ posicion: 'centro' })}>
          {t('video.escena.centro', 'Centro')}
        </Chip>
        <Chip activo={texto.posicion === 'abajo'} onClick={() => onCambiar({ posicion: 'abajo' })}>
          {t('video.escena.abajo', 'Abajo')}
        </Chip>
        <span className="mx-1 h-4 w-px bg-white/10" />
        {(['S', 'M', 'L'] as const).map((tam) => (
          <Chip key={tam} activo={texto.tamano === tam} onClick={() => onCambiar({ tamano: tam })}>
            {tam}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        {PALETA_VIDEO.slice(0, 8).map((c) => (
          <button
            key={c}
            type="button"
            aria-label={t('video.escena.colorTexto', 'Color del texto')}
            title={t('video.escena.colorTexto', 'Color del texto')}
            onClick={() => onCambiar({ color: c })}
            style={{ background: c }}
            className={`h-4 w-4 rounded-full border transition hover:scale-110 ${
              texto.color === c ? 'border-white ring-2 ring-white/60' : 'border-white/20'
            }`}
          />
        ))}
      </div>
      <input
        value={texto.subtitulo ?? ''}
        onChange={(e) => onCambiar({ subtitulo: e.target.value || undefined })}
        placeholder={t('video.texto.subtituloPh', 'Una línea secundaria…')}
        aria-label={t('video.texto.subtitulo', 'Subtítulo')}
        className={`${INPUT} mt-1.5`}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-white/40">{t('video.texto.fuente', 'Tipografía')}</span>
        {FUENTES.map((f) => (
          <Chip key={f} activo={(texto.fuente ?? 'sans') === f} onClick={() => onCambiar({ fuente: f === 'sans' ? undefined : f })}>
            {etiquetaFuente[f]}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        <Chip activo={!!texto.caja} onClick={() => onCambiar({ caja: texto.caja ? undefined : true })}>
          {t('video.texto.caja', 'Caja detrás del texto')}
        </Chip>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-white/40">{t('video.texto.animacion', 'Animación de entrada')}</span>
        {ANIMACIONES.map((a) => (
          <Chip key={a} activo={(texto.animacion ?? 'ninguna') === a} onClick={() => onCambiar({ animacion: a === 'ninguna' ? undefined : a })}>
            {etiquetaAnim[a]}
          </Chip>
        ))}
      </div>
    </Campo>
  )
}

/** Selector de voz por grupos (IA con créditos / dispositivo gratis). Null si aquí no hay ninguna voz. */
export function SelectorVoz({
  voz,
  grupos,
  onCambiar,
  etiqueta,
}: {
  voz: string | undefined
  grupos: GrupoVoces[]
  onCambiar: (voz: string) => void
  etiqueta: string
}) {
  if (grupos.length === 0) return null
  return (
    <select value={voz ?? ''} onChange={(e) => onCambiar(e.target.value)} aria-label={etiqueta} title={etiqueta} className={`${INPUT} min-w-0 flex-1`}>
      {grupos.map((g) => (
        <optgroup key={g.id} label={g.etiqueta}>
          {g.voces.map((v) => (
            <option key={v.id} value={v.id}>
              {v.etiqueta}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

/** Guion + voz del narrador + generar/elegir audio: la comparten los clips de narración y de avatar. */
export function SeccionVoz({
  texto,
  vozEfectiva,
  vozDe,
  audioNombre,
  narrando,
  onTexto,
  onVoz,
  onNarrar,
  onElegirAudio,
  onQuitarAudio,
  onSubtitulos,
}: {
  texto: string
  vozEfectiva: string | undefined
  /** Nombre del narrador dueño de la voz (el selector cambia la suya); ausente = la voz del clip/proyecto. */
  vozDe?: string
  /** Nombre del audio actual; ausente = sin audio todavía. */
  audioNombre?: string
  narrando: boolean
  onTexto: (texto: string) => void
  onVoz: (voz: string) => void
  onNarrar: () => void
  onElegirAudio: () => void
  onQuitarAudio: () => void
  onSubtitulos: () => void
}) {
  const t = useT()
  const generandoMuestra = useVozGenerando((s) => s.generando)
  const [error, setError] = useState('')
  const grupos = gruposVoz(t)
  const voz = vozValida(vozEfectiva, grupos.flatMap((g) => g.voces.map((v) => v.id)))
  // Voz del dispositivo (o IA sin nadie que la sirva): gratis; deja archivo solo donde el sistema sintetiza.
  const gratis = usaDispositivo(voz)
  const dejaArchivo = vozDejaArchivo(voz)
  const etiquetaSelector = vozDe ? t('video.narradores.vozDe', 'Voz de {n}', { n: vozDe }) : t('video.voz.titulo', 'Voz del narrador')
  const oirMuestra = async () => {
    setError('')
    const frase = texto.trim().slice(0, 120) || t('video.voz.fraseMuestra', 'Hola, así sonará la narración de tu video.')
    const ok = await hablarConVoz(frase, voz)
    if (!ok) setError(t('video.voz.muestraFallo', 'No se pudo reproducir la muestra'))
  }
  return (
    <Campo etiqueta={t('video.escena.narracionTitulo', 'Narración')}>
      <textarea
        value={texto}
        onChange={(e) => onTexto(e.target.value)}
        rows={3}
        placeholder={t('video.escena.narracionPh', 'Lo que la voz dirá en esta escena…')}
        className={INPUT}
      />
      {grupos.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <SelectorVoz voz={voz} grupos={grupos} onCambiar={onVoz} etiqueta={etiquetaSelector} />
          <BotonSecundario
            pequeno
            disabled={generandoMuestra}
            onClick={() => void oirMuestra()}
            aria-label={t('video.voz.muestra', 'Oír muestra')}
            title={t('video.voz.muestra', 'Oír muestra')}
          >
            {generandoMuestra ? <Spinner pequeno /> : <Icono nombre="play" />}
            {!gratis && (
              <>
                {' '}
                <Creditos op={OP_NARRACION} />
              </>
            )}
          </BotonSecundario>
        </div>
      )}
      {audioNombre && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-white/70">
          <Icono nombre="bocina" />
          <span className="min-w-0 flex-1 truncate">{audioNombre}</span>
          <BotonSecundario pequeno onClick={onQuitarAudio}>
            {t('video.escena.quitar', 'Quitar')}
          </BotonSecundario>
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {dejaArchivo && (
          <BotonSecundario pequeno disabled={narrando || !texto.trim()} onClick={onNarrar}>
            {narrando ? <Spinner pequeno /> : <Icono nombre="bocina" />}{' '}
            {gratis ? t('video.voz.narrarGratis', 'Narrar (gratis)') : t('video.escena.narrarIA', 'Narrar con IA')}
            {!gratis && (
              <>
                {' '}
                <Creditos op={OP_NARRACION} />
              </>
            )}
          </BotonSecundario>
        )}
        <BotonSecundario pequeno onClick={onElegirAudio}>
          <Icono nombre="musica" /> {t('video.escena.elegirAudio', 'Elegir audio')}
        </BotonSecundario>
        <BotonSecundario pequeno disabled={!texto.trim()} onClick={onSubtitulos}>
          <Icono nombre="letra" /> {t('video.subtitulos.generar', 'Generar subtítulos')}
        </BotonSecundario>
      </div>
      {gratis && !dejaArchivo && !audioNombre && (
        <p className="mt-1 text-[11px] text-white/45">
          {t(
            'video.voz.enVivo',
            'La voz del dispositivo suena en la vista previa, pero no queda en el archivo exportado: para exportar con voz, usa una voz IA, graba con el micrófono o elige un audio.',
          )}
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </Campo>
  )
}
