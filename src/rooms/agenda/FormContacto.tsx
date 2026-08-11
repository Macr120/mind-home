import { useRef, useState, type FormEvent } from 'react'
import type { ContactoAgenda } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { comprimirFoto } from '../_shared/fotos'
import { AvatarContacto } from './AvatarContacto'
import { COLOR_AREA, HORA_CUMPLE } from './constantes'
import { guardarContacto } from './crear'
import { Campo, INPUT, Modal } from './ui'

export function FormContacto({
  inicial,
  alCuidadoInicial,
  onCerrar,
}: {
  inicial?: ContactoAgenda | null
  /** Precarga «A mi cuidado» en un alta nueva (desde el botón de Prójimos). */
  alCuidadoInicial?: boolean
  onCerrar: () => void
}) {
  const t = useT()
  const archivo = useRef<HTMLInputElement>(null)
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [relacion, setRelacion] = useState(inicial?.relacion ?? '')
  const [telefono, setTelefono] = useState(inicial?.telefono ?? '')
  const [correo, setCorreo] = useState(inicial?.correo ?? '')
  const [cumple, setCumple] = useState(inicial?.cumple ?? '')
  const [horaCumple, setHoraCumple] = useState(inicial?.horaCumple ?? HORA_CUMPLE)
  const [direccion, setDireccion] = useState(inicial?.direccion ?? '')
  const [notas, setNotas] = useState(inicial?.notas ?? '')
  const [foto, setFoto] = useState<Blob | undefined>(inicial?.foto)
  const [alCuidado, setAlCuidado] = useState(inicial?.alCuidado ?? alCuidadoInicial ?? false)

  const elegirFoto = async (files: FileList | null) => {
    const archivo = files?.[0]
    if (archivo) setFoto(await comprimirFoto(archivo))
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    await guardarContacto(inicial ?? null, {
      nombre: nombre.trim(),
      relacion: relacion.trim() || undefined,
      alCuidado: alCuidado || undefined,
      telefono: telefono.trim() || undefined,
      correo: correo.trim() || undefined,
      cumple: cumple || undefined,
      horaCumple: cumple ? horaCumple : undefined,
      direccion: direccion.trim() || undefined,
      notas: notas.trim() || undefined,
      foto,
    })
    onCerrar()
  }

  return (
    <Modal
      titulo={
        inicial
          ? t('agenda.editarContacto', 'Editar contacto')
          : alCuidadoInicial
            ? t('agenda.salud.nuevoProjimo', 'Nuevo prójimo')
            : t('agenda.personas.nuevoContacto', 'Nuevo contacto')
      }
      onCerrar={onCerrar}
    >
      <form onSubmit={guardar} className="space-y-3">
        <div className="flex items-center gap-3">
          <AvatarContacto nombre={nombre || '?'} foto={foto} size={56} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => archivo.current?.click()}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
            >
              <Icono nombre="foto" /> {t('agenda.persona.foto', 'Foto')}
            </button>
            {foto && (
              <button
                type="button"
                onClick={() => setFoto(undefined)}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/10"
              >
                <Icono nombre="quitar" />
              </button>
            )}
          </div>
          <input
            ref={archivo}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void elegirFoto(e.target.files)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={t('agenda.form.nombre', 'Nombre')}>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus className={INPUT} />
          </Campo>
          <Campo etiqueta={t('agenda.persona.relacion', 'Relación')}>
            <input
              value={relacion}
              onChange={(e) => setRelacion(e.target.value)}
              placeholder={t('agenda.persona.phRelacion', 'familia, trabajo…')}
              className={INPUT}
            />
          </Campo>
        </div>

        {/* Es la misma ficha: marcarla la hace aparecer también en Salud. */}
        <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
          <input
            type="checkbox"
            checked={alCuidado}
            onChange={(e) => setAlCuidado(e.target.checked)}
            className="mt-0.5 accent-teal-400"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {t('agenda.persona.alCuidado', 'A mi cuidado')}
            </span>
            <span className="block text-[11px] text-white/45">
              {t(
                'agenda.persona.alCuidadoAyuda',
                'Aparece en Salud › Prójimos, con sus citas, sus medicamentos y sus cuidados.',
              )}
            </span>
          </span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={t('agenda.persona.telefono', 'Teléfono')}>
            <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={INPUT} />
          </Campo>
          <Campo etiqueta={t('agenda.persona.correo', 'Correo')}>
            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className={INPUT} />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={t('agenda.persona.cumple', 'Cumpleaños')}>
            <input type="date" value={cumple} onChange={(e) => setCumple(e.target.value)} className={INPUT} />
          </Campo>
          <Campo etiqueta={t('agenda.persona.horaCumple', 'Avisarme a las')}>
            <input
              type="time"
              value={horaCumple}
              disabled={!cumple}
              onChange={(e) => setHoraCumple(e.target.value)}
              className={INPUT}
            />
          </Campo>
        </div>

        <Campo etiqueta={t('agenda.persona.direccion', 'Dirección')}>
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={INPUT} />
        </Campo>

        <Campo etiqueta={t('agenda.form.notas', 'Notas')}>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={INPUT} />
        </Campo>

        <button
          type="submit"
          data-tut="agenda.personas.cumple"
          className="w-full rounded-lg py-2.5 text-sm font-bold texto-cta transition hover:brightness-110"
          style={{ background: COLOR_AREA.personas }}
        >
          {t('agenda.guardar', 'Guardar')}
        </button>
      </form>
    </Modal>
  )
}
