import { useState } from 'react'
import type { Viaje } from '../../core/data/db'
import { viajesRepo } from '../../core/data/repository'
import { Estrellas } from './Estrellas'
import {
  ESTADOS,
  PAISES_SUGERIDOS,
  TIPOS_VIAJE,
} from './constantes'
import { hoyISO } from './fecha'
import { useT } from '../../core/i18n/useT'

export function FormularioViaje({
  inicial,
  onGuardado,
  onCancelar,
}: {
  inicial?: Viaje
  onGuardado?: () => void
  onCancelar?: () => void
}) {
  const t = useT()
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [destino, setDestino] = useState(inicial?.destino ?? '')
  const [pais, setPais] = useState(inicial?.pais ?? 'México')
  const [paisCustom, setPaisCustom] = useState('')
  const [fechaInicio, setFechaInicio] = useState(inicial?.fechaInicio ?? hoyISO())
  const [fechaFin, setFechaFin] = useState(inicial?.fechaFin ?? hoyISO())
  const [estado, setEstado] = useState<Viaje['estado']>(inicial?.estado ?? 'planificado')
  const [tipoViaje, setTipoViaje] = useState<Viaje['tipoViaje']>(
    inicial?.tipoViaje ?? 'ciudad',
  )
  const [presupuesto, setPresupuesto] = useState(String(inicial?.presupuesto ?? ''))
  const [companeros, setCompaneros] = useState(inicial?.companeros ?? '')
  const [calificacion, setCalificacion] = useState(inicial?.calificacion ?? 0)
  const [resena, setResena] = useState(inicial?.resena ?? '')

  const paisFinal = pais === '__otro__' ? paisCustom.trim() : pais

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !destino.trim() || !paisFinal) return
    const fin = fechaFin >= fechaInicio ? fechaFin : fechaInicio

    const datos = {
      titulo: titulo.trim(),
      destino: destino.trim(),
      pais: paisFinal,
      fechaInicio,
      fechaFin: fin,
      estado,
      tipoViaje,
      presupuesto: parseFloat(presupuesto) || 0,
      moneda: 'MXN',
      calificacion,
      resena: resena.trim(),
      companeros: companeros.trim() || undefined,
      creadoEn: inicial?.creadoEn ?? hoyISO(),
    }

    if (inicial?.id) await viajesRepo.update(inicial.id, datos)
    else await viajesRepo.add(datos)

    onGuardado?.()
  }

  return (
    <form
      onSubmit={guardar}
      className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
    >
      <p className="text-sm font-semibold">
        {inicial ? t('sala.form.editar', '✏️ Editar viaje') : t('sala.form.nuevo', '✈️ Nuevo viaje')}
      </p>

      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder={t('sala.form.ph.nombre', 'Nombre del viaje (ej. Verano en Oaxaca)')}
        required
        className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-teal-400/50"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          placeholder={t('sala.form.ph.destino', 'Ciudad / destino')}
          required
          className="rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <select
          value={pais}
          onChange={(e) => setPais(e.target.value)}
          className="rounded-lg bg-black/30 px-2 py-2 text-sm border border-white/10"
        >
          {PAISES_SUGERIDOS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value="__otro__">{t('sala.form.otroPais', 'Otro país…')}</option>
        </select>
      </div>
      {pais === '__otro__' && (
        <input
          value={paisCustom}
          onChange={(e) => setPaisCustom(e.target.value)}
          placeholder={t('sala.form.ph.pais', 'País')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
      )}

      <div className="flex flex-wrap gap-1.5">
        {TIPOS_VIAJE.map((tipoItem) => (
          <button
            key={tipoItem.id}
            type="button"
            onClick={() => setTipoViaje(tipoItem.id)}
            className={`rounded-lg px-2 py-1 text-xs font-semibold ${
              tipoViaje === tipoItem.id ? 'bg-teal-400 text-black' : 'bg-white/5'
            }`}
          >
            {tipoItem.icon} {tipoItem.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-white/50">
          {t('sala.form.ida', 'Ida')}
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
          />
        </label>
        <label className="text-xs text-white/50">
          {t('sala.form.regreso', 'Regreso')}
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {ESTADOS.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setEstado(e.id)}
            className={`rounded-lg py-1.5 text-xs font-semibold ${
              estado === e.id ? 'bg-teal-400/90 text-black' : 'bg-white/5'
            }`}
          >
            {e.icon} {e.label}
          </button>
        ))}
      </div>

      <input
        type="number"
        value={presupuesto}
        onChange={(e) => setPresupuesto(e.target.value)}
        placeholder={t('sala.form.presupuesto', 'Presupuesto estimado (MXN)')}
        className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
      />

      <input
        value={companeros}
        onChange={(e) => setCompaneros(e.target.value)}
        placeholder={t('sala.form.companeros', 'Compañeros de viaje (opcional)')}
        className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
      />

      {estado === 'completado' && (
        <>
          <div>
            <p className="text-xs text-white/50 mb-1">{t('sala.form.experiencia', 'Tu experiencia')}</p>
            <Estrellas valor={calificacion} onChange={setCalificacion} />
          </div>
          <textarea
            value={resena}
            onChange={(e) => setResena(e.target.value)}
            placeholder={t('sala.form.ph.resena', 'Reseña del viaje: highlights, tips, qué repetirías…')}
            rows={3}
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 resize-none"
          />
        </>
      )}

      <div className="flex gap-2">
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 rounded-xl py-2.5 font-semibold bg-white/5"
          >
            {t('sala.form.cancelar', 'Cancelar')}
          </button>
        )}
        <button
          type="submit"
          className="flex-1 rounded-xl py-2.5 font-bold bg-teal-400 text-black"
        >
          {t('sala.form.guardar', 'Guardar viaje')}
        </button>
      </div>
    </form>
  )
}
