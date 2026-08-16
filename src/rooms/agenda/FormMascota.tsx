import { useRef, useState, type FormEvent } from 'react'
import type { EspecieMascota, Mascota } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { comprimirFoto } from '../_shared/fotos'
import { AvatarContacto } from './AvatarContacto'
import { COLOR_AREA } from './constantes'
import { acento } from '../_shared/acento'
import { guardarMascota } from './crear'
import { ESPECIES, getEspecie } from './mascotas'
import { Campo, INPUT, Modal } from './ui'

export function FormMascota({ inicial, onCerrar }: { inicial?: Mascota | null; onCerrar: () => void }) {
  const t = useT()
  const archivo = useRef<HTMLInputElement>(null)
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [especie, setEspecie] = useState<EspecieMascota>(inicial?.especie ?? 'perro')
  const [raza, setRaza] = useState(inicial?.raza ?? '')
  const [nacimiento, setNacimiento] = useState(inicial?.nacimiento ?? '')
  const [peso, setPeso] = useState(inicial?.peso != null ? String(inicial.peso) : '')
  const [veterinario, setVeterinario] = useState(inicial?.veterinario ?? '')
  const [telefono, setTelefono] = useState(inicial?.telefono ?? '')
  const [notas, setNotas] = useState(inicial?.notas ?? '')
  const [foto, setFoto] = useState<Blob | undefined>(inicial?.foto)

  const elegirFoto = async (files: FileList | null) => {
    const elegido = files?.[0]
    if (elegido) setFoto(await comprimirFoto(elegido))
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    await guardarMascota(inicial ?? null, {
      nombre: nombre.trim(),
      especie,
      raza: raza.trim() || undefined,
      nacimiento: nacimiento || undefined,
      peso: peso ? Number(peso) : undefined,
      veterinario: veterinario.trim() || undefined,
      telefono: telefono.trim() || undefined,
      notas: notas.trim() || undefined,
      foto,
      ejemplo: inicial?.ejemplo,
    })
    onCerrar()
  }

  return (
    <Modal
      titulo={
        inicial
          ? t('agenda.mascota.editar', 'Editar mascota')
          : t('agenda.salud.nuevaMascota', 'Nueva mascota')
      }
      onCerrar={onCerrar}
    >
      <form onSubmit={guardar} className="space-y-3">
        <div className="flex items-center gap-3">
          <AvatarContacto nombre={nombre || '?'} foto={foto} icono={getEspecie(especie).icono} size={56} />
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
          <Campo etiqueta={t('agenda.mascota.especie', 'Especie')}>
            <select
              value={especie}
              onChange={(e) => setEspecie(e.target.value as EspecieMascota)}
              className={INPUT}
            >
              {ESPECIES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.emoji} {t(e.clave, e.es)}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Campo etiqueta={t('agenda.mascota.raza', 'Raza')}>
            <input value={raza} onChange={(e) => setRaza(e.target.value)} className={INPUT} />
          </Campo>
          <Campo etiqueta={t('agenda.mascota.nacimiento', 'Nacimiento')}>
            <input
              type="date"
              value={nacimiento}
              onChange={(e) => setNacimiento(e.target.value)}
              className={INPUT}
            />
          </Campo>
          <Campo etiqueta={t('agenda.mascota.peso', 'Peso (kg)')}>
            <input
              type="number"
              min="0"
              step="0.1"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              className={INPUT}
            />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={t('agenda.mascota.veterinario', 'Veterinario')}>
            <input value={veterinario} onChange={(e) => setVeterinario(e.target.value)} className={INPUT} />
          </Campo>
          <Campo etiqueta={t('agenda.persona.telefono', 'Teléfono')}>
            <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={INPUT} />
          </Campo>
        </div>

        <Campo etiqueta={t('agenda.form.notas', 'Notas')}>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder={t('agenda.mascota.phNotas', 'alergias, comida, chip…')}
            className={INPUT}
          />
        </Campo>

        <button
          type="submit"
          className="w-full rounded-lg py-2.5 text-sm font-bold ui-accent-bg transition hover:brightness-110"
          style={acento(COLOR_AREA.salud)}
        >
          {t('agenda.guardar', 'Guardar')}
        </button>
      </form>
    </Modal>
  )
}
