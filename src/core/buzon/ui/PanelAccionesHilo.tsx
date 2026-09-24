import { useRef, type ReactNode } from 'react'
import { abrirAppOPlantilla } from '../../abrirApp'
import { useEspacios } from '../../espacios/cache'
import { nombreTipo } from '../../espacios/enlaces'
import { ICONO_TIPO, type TipoEspacio } from '../../espacios/tipos'
import { useT } from '../../i18n/useT'
import { mensajeErrorPartida } from '../../partida/api'
import { JUEGOS_INVITABLES, type JuegoInvitable } from '../../partida/juegosInvitables'
import { pedirTexto } from '../../state/confirmarStore'
import { useMascota } from '../../state/mascotaStore'
import { Icono } from '../../ui/iconos/Icono'
import type { NombreIcono } from '../../ui/iconos/catalogo'
import { invitarAMiCasa } from '../../visita/anfitrion'
import { mensajeErrorBuzon } from '../api'
import { guardarNotaSistema } from '../cache'
import { ejecutarComandoHilo } from '../comandoHilo'
import type { Paquete } from '../compartibles'
import { enviar } from '../motor'
import { TIPOS_ENVIAR } from '../ordenesHilo'
import { topeDe, type Contacto, type TipoAdjunto } from '../tipos'
import { SelectorCompartible } from './SelectorCompartible'

export type AccionHilo = 'jugar' | 'enviar' | 'colaborar'

/**
 * Los paneles de los tres botones de arriba del hilo. Cada elección corre la
 * MISMA orden que se escribiría en la barra («jugar ajedrez», «colaborar
 * documento Capítulo 1»), así la nota del hilo enseña cómo pedirlo a mano.
 */
export function PanelAccionesHilo({
  accion,
  contacto,
  onCerrar,
}: {
  accion: AccionHilo
  contacto: Contacto
  onCerrar: () => void
}) {
  const hiloId = contacto.hiloId!
  const t = useT()
  const correr = (orden: string) => {
    onCerrar()
    void ejecutarComandoHilo(hiloId, orden, t)
  }
  if (accion === 'enviar') return <PanelEnviar contacto={contacto} onCerrar={onCerrar} />
  return accion === 'jugar' ? (
    <PanelJugar contacto={contacto} correr={correr} onCerrar={onCerrar} />
  ) : (
    <PanelColaborar correr={correr} onCerrar={onCerrar} />
  )
}

function Marco({ titulo, icono, onCerrar, children }: { titulo: string; icono: NombreIcono; onCerrar: () => void; children: ReactNode }) {
  const t = useT()
  return (
    <div className="ui-panel-glass h-full overflow-y-auto rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 px-1 pb-2">
        <span className="text-base text-white/60">
          <Icono nombre={icono} />
        </span>
        <p className="flex-1 text-[11px] font-semibold text-white/50">{titulo}</p>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title={t('chat.conv.cerrar', 'Cerrar')}
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  )
}

const FILA = 'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-sm text-white/85 transition hover:bg-white/5 disabled:opacity-50'

function PanelJugar({ contacto, correr, onCerrar }: { contacto: Contacto; correr: (orden: string) => void; onCerrar: () => void }) {
  const t = useT()
  const hiloId = contacto.hiloId!

  const visitar = async () => {
    onCerrar()
    const orden = t('partida.invitar', 'Invitar a mi MindHaOS')
    void guardarNotaSistema(hiloId, orden, true)
    let respuesta: string
    try {
      await invitarAMiCasa(contacto.contactoId)
      respuesta = t('buzon.panel.visitaEnviada', 'Invité a @{a} a tu MindHaOS', { a: contacto.alias })
    } catch (e) {
      console.error('[partida] visita', e)
      respuesta = mensajeErrorPartida(e, t)
    }
    void guardarNotaSistema(hiloId, respuesta, false)
  }

  return (
    <Marco titulo={t('buzon.panel.jugar', '¿A qué quieren jugar?')} icono="joystick" onCerrar={onCerrar}>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {(Object.entries(JUEGOS_INVITABLES) as [JuegoInvitable, (typeof JUEGOS_INVITABLES)[JuegoInvitable]][]).map(([id, j]) => (
          <button key={id} type="button" onClick={() => correr(`jugar ${j.es.toLowerCase()}`)} className={FILA}>
            <span className="text-lg">
              <Icono emoji={j.emoji} />
            </span>
            <span className="truncate">{t(j.clave, j.es)}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => void visitar()} className={`${FILA} mt-1 border-t border-white/10 pt-2`}>
        <Icono nombre="casa" /> {t('partida.invitar', 'Invitar a mi MindHaOS')}
      </button>
    </Marco>
  )
}

/** La palabra de la orden para un contenido («receta», «rutina»…). */
function palabraDe(p: Paquete): string {
  return Object.entries(TIPOS_ENVIAR).find(([, [app, tipo]]) => app === p.app && tipo === p.tipo)?.[0] ?? p.tipo
}

function PanelEnviar({ contacto, onCerrar }: { contacto: Contacto; onCerrar: () => void }) {
  const t = useT()
  const hiloId = contacto.hiloId!
  const archivoRef = useRef<HTMLInputElement>(null)
  const hablar = useMascota((s) => s.decir)

  const enviarPaquete = async (p: Paquete) => {
    onCerrar()
    void guardarNotaSistema(hiloId, `enviar ${palabraDe(p)} ${p.nombre}`, true)
    let respuesta: string
    try {
      await enviar(hiloId, { texto: '', paquete: p })
      respuesta = t('buzon.orden.enviado', 'Le envié «{n}» a @{a}', { n: p.nombre, a: contacto.alias })
    } catch (e) {
      respuesta = mensajeErrorBuzon(e, t)
    }
    void guardarNotaSistema(hiloId, respuesta, false)
  }

  const enviarArchivo = (f: File) => {
    const tipo: TipoAdjunto = f.type.startsWith('image/')
      ? 'imagen'
      : f.type === 'application/pdf'
        ? 'pdf'
        : f.type.startsWith('video/')
          ? 'video'
          : 'audio'
    if (f.size > topeDe(tipo)) {
      hablar(t('chat.mediaGrande', 'El archivo pesa más de {mb} MB, usa uno más ligero.', { mb: topeDe(tipo) / 1024 / 1024 }), {
        persistir: false,
      })
      return
    }
    onCerrar()
    void enviar(hiloId, { texto: '', adjunto: { tipo, blob: f, nombre: f.name } }).catch((e) =>
      hablar(mensajeErrorBuzon(e, t), { sistema: true }),
    )
  }

  return (
    <SelectorCompartible
      className="h-full"
      onElegir={(p) => void enviarPaquete(p)}
      onCerrar={onCerrar}
      cabecera={
        <>
          <button type="button" onClick={() => archivoRef.current?.click()} className={`${FILA} mb-1 bg-white/5`}>
            <Icono nombre="adjuntar" /> {t('buzon.panel.archivo', 'Foto, PDF, audio o video')}
          </button>
          <input
            ref={archivoRef}
            type="file"
            accept="image/*,application/pdf,audio/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) enviarArchivo(f)
            }}
          />
        </>
      }
    />
  )
}

/** Tipo de espacio → la app donde se crea y se comparte. */
const APP_DE: Record<TipoEspacio, string | null> = {
  documento: 'escritura',
  dibujo: 'arte',
  audio: 'audio',
  video: 'video',
  calendario: null,
}

function PanelColaborar({ correr, onCerrar }: { correr: (orden: string) => void; onCerrar: () => void }) {
  const t = useT()
  const espacios = useEspacios()
  const mios = (espacios ?? []).filter((e) => e.rol === 'dueno')

  const nuevoCalendario = async () => {
    const nombre = await pedirTexto({ titulo: t('buzon.panel.nombreCal', 'Nombre del calendario compartido') })
    if (nombre?.trim()) correr(`colaborar calendario ${nombre.trim()}`)
  }

  return (
    <Marco titulo={t('buzon.panel.colaborar', '¿En qué colaboramos?')} icono="vincular" onCerrar={onCerrar}>
      {(Object.keys(APP_DE) as TipoEspacio[]).map((tipo) => {
        const lista = mios.filter((e) => e.tipo === tipo)
        const app = APP_DE[tipo]
        return (
          <div key={tipo} className="mb-1">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
              <Icono nombre={ICONO_TIPO[tipo]} /> {nombreTipo(tipo)}
            </p>
            {lista.map((e) => (
              <button key={e.espacioId} type="button" onClick={() => correr(`colaborar ${tipo} ${e.titulo}`)} className={FILA}>
                <Icono nombre={ICONO_TIPO[tipo]} /> <span className="truncate">{e.titulo}</span>
              </button>
            ))}
            {app ? (
              lista.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onCerrar()
                    abrirAppOPlantilla(app)
                  }}
                  className={`${FILA} text-xs text-white/45`}
                >
                  <Icono nombre="compartir" />
                  <span className="min-w-0 flex-1">{t('buzon.panel.pista', 'Abre un proyecto, pulsa «Compartir» y aparecerá aquí')}</span>
                </button>
              )
            ) : (
              <button type="button" onClick={() => void nuevoCalendario()} className={`${FILA} text-xs text-white/60`}>
                <Icono nombre="agregar" /> {t('buzon.panel.nuevoCal', 'Nuevo calendario compartido')}
              </button>
            )}
          </div>
        )
      })}
    </Marco>
  )
}
