import { useState, type FormEvent } from 'react'
import type { CuidadoMascota, Mascota, TipoCuidadoMascota } from '../../core/data/db'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { COLOR_AREA } from './constantes'
import { guardarCuidado } from './crear'
import { getCuidado, HORA_CUIDADO, PERIODOS, textoPeriodo, TIPOS_CUIDADO } from './mascotas'
import { Campo, INPUT, Modal } from './ui'

/**
 * Alta y edición de un cuidado. La fecha es SIEMPRE la próxima vez: el historial
 * se resume en `ultima`, que escribe el botón «Ya lo hice» de la ficha.
 */
export function FormCuidado({
  mascota,
  inicial,
  onCerrar,
}: {
  mascota: Mascota
  inicial?: CuidadoMascota | null
  onCerrar: () => void
}) {
  const t = useT()
  const [tipo, setTipo] = useState<TipoCuidadoMascota>(inicial?.tipo ?? 'vacuna')
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [fecha, setFecha] = useState(inicial?.fecha ?? fechaLocalISO())
  const [hora, setHora] = useState(inicial?.hora ?? HORA_CUIDADO)
  const [cadaMeses, setCadaMeses] = useState(inicial?.cadaMeses ?? getCuidado('vacuna').mesesSugeridos)
  const [nota, setNota] = useState(inicial?.nota ?? '')

  // Cambiar de tipo trae su nombre y su periodo habituales, salvo que ya hayas
  // escrito un título propio (una vacuna concreta, «rabia» o «refuerzo»).
  const cambiarTipo = (nuevo: TipoCuidadoMascota) => {
    const previo = getCuidado(tipo)
    if (!titulo.trim() || titulo === t(previo.clave, previo.es)) {
      const def = getCuidado(nuevo)
      setTitulo(t(def.clave, def.es))
      setCadaMeses(def.mesesSugeridos)
    }
    setTipo(nuevo)
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    const def = getCuidado(tipo)
    const nombre = titulo.trim() || t(def.clave, def.es)
    await guardarCuidado(
      inicial ?? null,
      {
        mascotaId: mascota.mascId,
        tipo,
        titulo: nombre,
        fecha,
        hora: hora || undefined,
        cadaMeses: cadaMeses || undefined,
        ultima: inicial?.ultima,
        nota: nota.trim() || undefined,
        activo: inicial?.activo ?? true,
        ejemplo: inicial?.ejemplo,
      },
      mascota.nombre,
    )
    onCerrar()
  }

  return (
    <Modal
      titulo={
        inicial
          ? t('agenda.cuidado.editar', 'Editar cuidado')
          : t('agenda.mascota.nuevoCuidado', 'Nuevo cuidado')
      }
      onCerrar={onCerrar}
    >
      <form onSubmit={guardar} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={t('agenda.cuidado.tipo', 'Tipo')}>
            <select
              value={tipo}
              onChange={(e) => cambiarTipo(e.target.value as TipoCuidadoMascota)}
              className={INPUT}
            >
              {TIPOS_CUIDADO.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {t(c.clave, c.es)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta={t('agenda.cuidado.titulo', 'Qué es')}>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={t(getCuidado(tipo).clave, getCuidado(tipo).es)}
              className={INPUT}
            />
          </Campo>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Campo etiqueta={t('agenda.cuidado.proxima', 'Próxima vez')}>
            <input
              type="date"
              value={fecha}
              required
              onChange={(e) => setFecha(e.target.value)}
              className={INPUT}
            />
          </Campo>
          <Campo etiqueta={t('agenda.form.hora', 'Hora')}>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={INPUT} />
          </Campo>
          <Campo etiqueta={t('agenda.cuidado.cada', 'Se repite')}>
            <select
              value={cadaMeses}
              onChange={(e) => setCadaMeses(Number(e.target.value))}
              className={INPUT}
            >
              {PERIODOS.map((m) => (
                <option key={m} value={m}>
                  {textoPeriodo(m, t)}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <p className="text-xs text-white/40">
          {t(
            'agenda.cuidado.aviso',
            'Al darlo por hecho, la fecha salta sola al siguiente periodo.',
          )}
        </p>

        <Campo etiqueta={t('agenda.form.notas', 'Notas')}>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className={INPUT} />
        </Campo>

        <button
          type="submit"
          className="w-full rounded-lg py-2.5 text-sm font-bold texto-cta transition hover:brightness-110"
          style={{ background: COLOR_AREA.salud }}
        >
          {t('agenda.guardar', 'Guardar')}
        </button>
      </form>
    </Modal>
  )
}
