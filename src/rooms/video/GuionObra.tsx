import { useState } from 'react'
import { EMOCIONES, type EmocionId } from '../../core/chat/emociones'
import type { EscenaActor } from '../../core/data/db'
import { PRESETS_ANIMACION, type PresetAnimacionId } from '../../core/house/animacion'
import { useT } from '../../core/i18n/useT'
import { useAsistentes } from '../../core/state/asistentesStore'
import { ES_JUGADOR } from '../../core/state/peliculaStore'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { BotonPrimario, BotonSecundario, Campo, INPUT, Modal, Spinner, TARJETA } from '../_shared/ui'
import { emojiActor, nombreActor, puntoActor } from './actores'
import { COLOR, EN_OFF } from './constantes'
import { OP_GUION } from './costosIA'
import type { ProyectoAbierto } from './modelo'
import { lineasObra, marcaDe, quienDe } from './obra'
import { FORMACIONES, type FormacionId } from './pelicula/efectosCamara'
import { Chip } from './Secciones'
import { fmtSeg } from './TimelinePistas'

/**
 * El guion de la obra (estudio de cine): las líneas en orden —quién, texto,
 * emoción y gesto—, el escenario donde se acomodan las marionetas (a mano o
 * en formación) y la IA que escribe la obra desde una idea. Es un modal: en
 * el cajón del modo película no cabe una línea entera. Las reglas viven en
 * `obra.ts`; aquí solo se pintan y se despachan a `acciones`.
 */

type DireccionEmpuje = 'izq' | 'der' | 'adelante' | 'atras'

export interface AccionesObra {
  onAnadir: (quien: string, texto: string, tras?: string) => void
  onTexto: (id: string, texto: string) => void
  onQuien: (id: string, quien: string) => void
  onEscena: (id: string, patch: Partial<EscenaActor>) => void
  onMover: (id: string, delta: 1 | -1) => void
  onBorrar: (id: string) => void
  onEscuchar: () => void
  onParar: () => void
  /** Lleva el cursor al inicio de la línea. */
  onIr: (id: string) => void
  onMarca: (id: string, punto: { x: number; z: number }) => void
  onTocarMapa: (id: string) => void
  onEmpujar: (id: string, dir: DireccionEmpuje) => void
  onFormacion: (tipo: FormacionId) => void
  onIA: (idea: string, reemplazar: boolean) => void
}

const EMOCION_ES: Record<EmocionId, string> = {
  felicidad: 'Felicidad',
  enojo: 'Enojo',
  sorpresa: 'Sorpresa',
  aprobacion: 'Aprobación',
  gusto: 'Gusto',
  tristeza: 'Tristeza',
}

/** El kit trae `w-full`: el selector va a su ancho y el texto ocupa lo que queda de la fila. */
const SELECTOR = INPUT.replace('w-full', 'w-auto max-w-40')
const CAMPO_LINEA = INPUT.replace('w-full', 'min-w-32 flex-1')

const EMPUJES: { dir: DireccionEmpuje; icono: NombreIcono; clave: string; es: string }[] = [
  { dir: 'izq', icono: 'izquierda', clave: 'video.obra.empujar.izq', es: 'Empujar a la izquierda' },
  { dir: 'der', icono: 'derecha', clave: 'video.obra.empujar.der', es: 'Empujar a la derecha' },
  { dir: 'adelante', icono: 'subir', clave: 'video.obra.empujar.adelante', es: 'Empujar hacia el fondo' },
  { dir: 'atras', icono: 'bajar', clave: 'video.obra.empujar.atras', es: 'Empujar hacia la cámara' },
]

export function GuionObra({
  proyecto,
  sonando,
  iaOcupado,
  iaError,
  onCerrar,
  acciones,
}: {
  proyecto: ProyectoAbierto
  /** Línea que suena en «Escuchar la obra», o null. */
  sonando: string | null
  iaOcupado: boolean
  iaError: string
  onCerrar: () => void
  acciones: AccionesObra
}) {
  const t = useT()
  const asistentes = useAsistentes((s) => s.lista)
  const [idea, setIdea] = useState('')
  const lineas = lineasObra(proyecto.clips)
  const quienes = [ES_JUGADOR, ...asistentes.map((a) => a.id)]
  const nombreDe = (id: string) => (id === EN_OFF ? t('video.narradores.enOff', 'Narrador') : nombreActor(t, id))
  // Las marionetas presentes: los personajes de las líneas, en orden de aparición.
  const marionetas = [...new Set(lineas.filter((l) => l.pista === 'avatar').map(quienDe))]
  // «Añadir línea» alterna el personaje respecto a la última línea, como un diálogo.
  const siguienteQuien = () => {
    const ultimo = lineas.length ? quienDe(lineas[lineas.length - 1]) : null
    const i = ultimo ? quienes.indexOf(ultimo) : -1
    return quienes[(i + 1) % quienes.length]
  }
  const botonIA = (etiqueta: string, reemplazar: boolean) => (
    <BotonSecundario pequeno disabled={iaOcupado || !idea.trim()} onClick={() => acciones.onIA(idea.trim(), reemplazar)}>
      {iaOcupado ? <Spinner pequeno /> : <Icono nombre="brillo" />} {etiqueta} <Creditos op={OP_GUION} />
    </BotonSecundario>
  )

  return (
    <Modal titulo={t('video.obra.titulo', 'Guion de la obra')} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/50">{t('video.obra.n', '{n} líneas', { n: lineas.length })}</span>
        <span className="flex-1" />
        {sonando ? (
          <BotonSecundario pequeno onClick={acciones.onParar}>
            <Icono nombre="detener" /> {t('video.lineas.parar', 'Parar')}
          </BotonSecundario>
        ) : (
          <BotonSecundario pequeno disabled={lineas.length === 0} onClick={acciones.onEscuchar}>
            <Icono nombre="play" /> {t('video.obra.escuchar', 'Escuchar la obra')}
          </BotonSecundario>
        )}
        <BotonPrimario type="button" pequeno app={COLOR} onClick={() => acciones.onAnadir(siguienteQuien(), '')}>
          <Icono nombre="agregar" /> {t('video.obra.anadirLinea', 'Añadir línea')}
        </BotonPrimario>
      </div>

      {lineas.length === 0 ? (
        <p className="px-2 py-3 text-center text-xs text-white/40">
          {t('video.obra.sinLineas', 'Aún no hay líneas: añade una o pide a la IA que escriba la obra')}
        </p>
      ) : (
        <div className="space-y-1.5">
          {lineas.map((l, i) => {
            const quien = quienDe(l)
            return (
              <div key={l.id} className={`${TARJETA} space-y-1.5 p-2 ${l.id === sonando ? 'border-white/40' : ''}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="w-5 text-center text-[11px] text-white/40">{i + 1}</span>
                  <select
                    value={quien}
                    onChange={(e) => acciones.onQuien(l.id, e.target.value)}
                    aria-label={t('video.obra.quien', 'Quién habla')}
                    className={`${SELECTOR} py-1 text-xs`}
                  >
                    {[...quienes, EN_OFF].map((id) => (
                      <option key={id} value={id}>
                        {id === EN_OFF ? '' : `${emojiActor(id)} `}
                        {nombreDe(id)}
                      </option>
                    ))}
                  </select>
                  {/* El texto se confirma al salir del campo (o con Enter): cada cambio reencadena la obra. */}
                  <input
                    key={`${l.id}:${l.texto ?? ''}`}
                    defaultValue={l.texto ?? ''}
                    placeholder={t('video.obra.textoPh', 'Lo que dice…')}
                    aria-label={t('video.obra.texto', 'Línea')}
                    onBlur={(e) => {
                      if (e.target.value !== (l.texto ?? '')) acciones.onTexto(l.id, e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                    className={`${CAMPO_LINEA} py-1 text-xs`}
                  />
                  <span className="font-mono text-[10px] tabular-nums text-white/40">{fmtSeg(l.inicio)}</span>
                  <BotonSecundario
                    pequeno
                    disabled={i === 0}
                    onClick={() => acciones.onMover(l.id, -1)}
                    aria-label={t('video.guion.subir', 'Subir')}
                    title={t('video.guion.subir', 'Subir')}
                  >
                    <Icono nombre="subir" />
                  </BotonSecundario>
                  <BotonSecundario
                    pequeno
                    disabled={i === lineas.length - 1}
                    onClick={() => acciones.onMover(l.id, 1)}
                    aria-label={t('video.guion.bajar', 'Bajar')}
                    title={t('video.guion.bajar', 'Bajar')}
                  >
                    <Icono nombre="bajar" />
                  </BotonSecundario>
                  <BotonSecundario
                    pequeno
                    onClick={() => acciones.onIr(l.id)}
                    aria-label={t('video.obra.ir', 'Ir a esta línea')}
                    title={t('video.obra.ir', 'Ir a esta línea')}
                  >
                    <Icono nombre="play" />
                  </BotonSecundario>
                  <BotonSecundario
                    pequeno
                    onClick={() => acciones.onBorrar(l.id)}
                    aria-label={t('video.obra.borrarLinea', 'Borrar la línea')}
                    title={t('video.obra.borrarLinea', 'Borrar la línea')}
                  >
                    <Icono nombre="basura" />
                  </BotonSecundario>
                </div>
                {l.pista === 'avatar' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(Object.keys(EMOCIONES) as EmocionId[]).map((e) => (
                      <Chip key={e} activo={l.escena.emocion === e} onClick={() => acciones.onEscena(l.id, { emocion: l.escena.emocion === e ? undefined : e })}>
                        <span title={t(`video.pelicula.emocion.${e}`, EMOCION_ES[e])}>
                          <Icono emoji={EMOCIONES[e].emoji} />
                        </span>
                      </Chip>
                    ))}
                    <span className="mx-1 h-4 w-px bg-white/15" aria-hidden />
                    {PRESETS_ANIMACION.filter((p) => p.id !== 'vida').map((p) => {
                      const id = p.id as Exclude<PresetAnimacionId, 'vida'>
                      return (
                        <Chip key={id} activo={l.escena.anim === id} onClick={() => acciones.onEscena(l.id, { anim: l.escena.anim === id ? undefined : id })}>
                          <Icono emoji={p.emoji} /> {t(`video.pelicula.preset.${id}`, p.nombre)}
                        </Chip>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Campo etiqueta={t('video.obra.escenario', 'Escenario (marionetas)')}>
        {marionetas.length === 0 ? (
          <p className="text-[11px] text-white/45">{t('video.obra.sinPersonajes', 'Añade líneas con personajes para acomodarlos en el escenario')}</p>
        ) : (
          <div className="space-y-1.5">
            {marionetas.map((id) => {
              const m = marcaDe(proyecto.clips, id)
              return (
                <div key={id} className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="min-w-24 font-semibold">
                    <Icono emoji={emojiActor(id)} /> {nombreActor(t, id)}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-white/60">
                    {m.x.toFixed(1)}, {m.z.toFixed(1)}
                  </span>
                  <BotonSecundario pequeno onClick={() => acciones.onMarca(id, puntoActor(id))}>
                    <Icono nombre="ubicacion" /> {t('video.pelicula.aqui', 'Aquí')}
                  </BotonSecundario>
                  <BotonSecundario pequeno onClick={() => acciones.onTocarMapa(id)}>
                    <Icono nombre="mapa" /> {t('video.pelicula.tocarMapa', 'Tocar el mapa')}
                  </BotonSecundario>
                  {EMPUJES.map((e) => (
                    <BotonSecundario key={e.dir} pequeno onClick={() => acciones.onEmpujar(id, e.dir)} aria-label={t(e.clave, e.es)} title={t(e.clave, e.es)}>
                      <Icono nombre={e.icono} />
                    </BotonSecundario>
                  ))}
                </div>
              )
            })}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-white/50">{t('video.obra.formacion', 'Formación')}</span>
              {FORMACIONES.map((f) => (
                <Chip key={f.id} activo={false} onClick={() => acciones.onFormacion(f.id)}>
                  {t(`video.obra.formacion.${f.id}`, f.es)}
                </Chip>
              ))}
            </div>
            <p className="text-[11px] text-white/45">{t('video.pelicula.atraviesan', 'Los personajes caminan en línea recta, atravesando muros')}</p>
          </div>
        )}
      </Campo>

      <Campo etiqueta={t('video.obra.ia.titulo', 'Pedir a la IA')}>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={2}
          placeholder={t('video.obra.ia.ideaPh', 'Una comedia corta donde los personajes discuten por quién se comió la última galleta…')}
          className={INPUT}
        />
        {iaError && <p className="mt-1 text-xs text-red-400">{iaError}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {lineas.length === 0 ? (
            botonIA(t('video.obra.ia.escribir', 'Escribir la obra'), false)
          ) : (
            <>
              {botonIA(t('video.obra.ia.reemplazar', 'Reemplazar la obra'), true)}
              {botonIA(t('video.obra.ia.anadir', 'Añadir al final'), false)}
            </>
          )}
        </div>
      </Campo>
    </Modal>
  )
}
