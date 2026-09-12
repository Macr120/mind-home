import { useState } from 'react'
import { useVozGenerando } from '../../core/audio/vozIA'
import type { NarradorVideo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { useAsistentes } from '../../core/state/asistentesStore'
import { Creditos } from '../../core/ui/Creditos'
import { SelectorAsistente } from '../../core/ui/comun/SelectorAsistente'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonSecundario, Campo, INPUT, TARJETA } from '../_shared/ui'
import { MAX_NARRADORES } from './constantes'
import { OP_NARRACION } from './costosIA'
import type { ClipNarracion, ProyectoAbierto } from './modelo'
import { emojiNarrador, nombreNarrador } from './narradores'
import { Chip, SelectorVoz } from './Secciones'
import { gruposVoz, hablarConVoz, usaDispositivo, vozValida } from './voces'

/**
 * Las voces del proyecto: el bloque «Voces» (alta con o sin personaje, voz IA de
 * cada narrador, muestra y baja) y los chips de «Quién habla» del panel de un
 * clip. Las reglas sobre los clips están en `modelo.ts` (`asignarNarrador`).
 */

function IconoNarrador({ n }: { n: NarradorVideo }) {
  const emoji = emojiNarrador(n)
  return emoji ? <Icono emoji={emoji} /> : <Icono nombre="microfono" />
}

/** Chips de «Quién habla» en el panel de un clip de voz o de avatar. */
export function QuienHabla({
  proyecto,
  clip,
  onElegir,
  onEditar,
}: {
  proyecto: ProyectoAbierto
  clip: ClipNarracion
  onElegir: (narradorId: string) => void
  /** Lleva al bloque «Voces» del guion. */
  onEditar: () => void
}) {
  const t = useT()
  useAsistentes((s) => s.lista)
  const narradores = proyecto.narradores ?? []
  return (
    <Campo etiqueta={t('video.narradores.quienHabla', 'Quién habla')}>
      <div className="flex flex-wrap items-center gap-1.5">
        {narradores.map((n) => (
          <Chip key={n.id} activo={clip.narradorId === n.id} onClick={() => onElegir(n.id)}>
            <IconoNarrador n={n} /> {nombreNarrador(t, n)}
          </Chip>
        ))}
        <button
          type="button"
          onClick={onEditar}
          className="rounded-full border border-dashed border-white/20 px-2.5 py-1 text-xs text-white/60 transition hover:bg-white/10"
        >
          <Icono nombre={narradores.length ? 'editar' : 'agregar'} />{' '}
          {narradores.length ? t('video.narradores.editar', 'Editar las voces') : t('video.narradores.anadir', 'Añadir una voz')}
        </button>
      </div>
    </Campo>
  )
}

/** El bloque «Voces» del guion. */
export function PanelNarradores({
  proyecto,
  onAnadir,
  onCambiar,
  onQuitar,
}: {
  proyecto: ProyectoAbierto
  onAnadir: (asistenteId?: string) => void
  onCambiar: (narradorId: string, patch: Partial<NarradorVideo>) => void
  onQuitar: (narradorId: string) => void
}) {
  const t = useT()
  useAsistentes((s) => s.lista)
  const [eligiendo, setEligiendo] = useState(false)
  const generando = useVozGenerando((s) => s.generando)
  const grupos = gruposVoz(t)
  const elegibles = grupos.flatMap((g) => g.voces.map((v) => v.id))
  const narradores = proyecto.narradores ?? []
  const lleno = narradores.length >= MAX_NARRADORES
  const anadir = (asistenteId?: string) => {
    onAnadir(asistenteId)
    setEligiendo(false)
  }
  const muestra = (n: NarradorVideo) =>
    void hablarConVoz(t('video.voz.fraseMuestra', 'Hola, así sonará la narración de tu video.'), vozValida(n.voz, elegibles))
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white/60">
          {t('video.narradores.titulo', 'Voces')} · {narradores.length}/{MAX_NARRADORES}
        </p>
        <BotonSecundario pequeno disabled={lleno} onClick={() => setEligiendo((v) => !v)} aria-expanded={eligiendo}>
          <Icono nombre="agregar" /> {t('video.narradores.anadir', 'Añadir una voz')}
        </BotonSecundario>
      </div>
      {narradores.length === 0 && !eligiendo && (
        <p className="text-[11px] text-white/40">
          {t('video.narradores.vacio', 'Aún no hay voces: define quién narra, con personaje o sin él.')}
        </p>
      )}
      {eligiendo && (
        <div className={`${TARJETA} space-y-2 p-2`}>
          <Chip activo={false} onClick={() => anadir()}>
            <Icono nombre="microfono" /> {t('video.narradores.sinPersonaje', 'Sin personaje (voz en off)')}
          </Chip>
          <SelectorAsistente titulo={t('video.narradores.conPersonaje', 'O un personaje:')} onElegir={(a) => anadir(a.id)} />
        </div>
      )}
      {narradores.map((n) => (
        <div key={n.id} className={`${TARJETA} space-y-1.5 p-2`}>
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-base">
              <IconoNarrador n={n} />
            </span>
            <input
              value={n.nombre ?? ''}
              placeholder={nombreNarrador(t, { ...n, nombre: undefined })}
              onChange={(e) => onCambiar(n.id, { nombre: e.target.value || undefined })}
              aria-label={t('video.narradores.nombre', 'Nombre de la voz')}
              className={`${INPUT} min-w-0 flex-1`}
            />
            <button
              type="button"
              onClick={() => onQuitar(n.id)}
              aria-label={t('video.narradores.quitar', 'Quitar esta voz')}
              title={t('video.narradores.quitar', 'Quitar esta voz')}
              className="grid h-7 w-7 shrink-0 place-items-center rounded text-white/40 transition hover:bg-white/10 hover:text-red-400"
            >
              <Icono nombre="basura" />
            </button>
          </div>
          {grupos.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <SelectorVoz
                voz={vozValida(n.voz, elegibles)}
                grupos={grupos}
                onCambiar={(voz) => onCambiar(n.id, { voz })}
                etiqueta={t('video.narradores.vozDe', 'Voz de {n}', { n: nombreNarrador(t, n) })}
              />
              <BotonSecundario
                pequeno
                disabled={generando}
                onClick={() => muestra(n)}
                aria-label={t('video.voz.muestra', 'Oír muestra')}
                title={t('video.voz.muestra', 'Oír muestra')}
              >
                <Icono nombre="play" />
                {!usaDispositivo(vozValida(n.voz, elegibles)) && (
                  <>
                    {' '}
                    <Creditos op={OP_NARRACION} />
                  </>
                )}
              </BotonSecundario>
            </div>
          ) : (
            <p className="text-[11px] text-white/40">
              {t('video.narradores.sinVoces', 'Este dispositivo no tiene voces: activa una voz IA en el panel de IA.')}
            </p>
          )}
        </div>
      ))}
      {narradores.length > 0 && (
        <p className="text-[11px] text-white/35">
          {t('video.narradores.nota', 'Con personaje, aparece en pantalla mientras habla; sin él, es voz en off.')}
        </p>
      )}
    </section>
  )
}
