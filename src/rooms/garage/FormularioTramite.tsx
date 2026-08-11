import { useState } from 'react'
import type { TallerVehiculo, TipoTramite, TramiteVehiculo, Vehiculo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import type { GrupoTramite } from './constantes'
import {
  ANTICIPACIONES,
  COLOR,
  HORA_TRAMITE,
  PERIODICIDADES,
  getTipoTramite,
  tramitesDisponibles,
} from './constantes'
import { hoyISO } from './fecha'
import { nuevoId } from './ids'
import { guardarTramite } from './tramites'
import { Campo, Formulario, INPUT, TINTA_CTA } from './ui'

export function FormularioTramite({
  vehiculo,
  talleres,
  grupo,
  inicial,
  onGuardado,
  onCancelar,
}: {
  vehiculo: Vehiculo
  talleres: TallerVehiculo[]
  /** Pestaña desde la que se abre: acota los tipos que se ofrecen. */
  grupo: GrupoTramite
  inicial?: TramiteVehiculo
  onGuardado: () => void
  onCancelar: () => void
}) {
  const t = useT()
  const esDoc = grupo === 'documento'
  const disponibles = tramitesDisponibles(vehiculo.matricula, grupo)
  const [tipo, setTipo] = useState<TipoTramite>(inicial?.tipo ?? disponibles[0].id)
  const [titulo, setTitulo] = useState(
    inicial?.titulo ?? t(`garage.tramTipo.${disponibles[0].id}`, disponibles[0].label),
  )
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO())
  const [hora, setHora] = useState(inicial?.hora ?? HORA_TRAMITE)
  const [cadaMeses, setCadaMeses] = useState(String(inicial?.cadaMeses ?? disponibles[0].cadaMeses))
  const [avisoDias, setAvisoDias] = useState(String(inicial?.avisoDias ?? 15))
  const [costo, setCosto] = useState(inicial?.costo != null ? String(inicial.costo) : '')
  const [folio, setFolio] = useState(inicial?.folio ?? '')
  const [tallerId, setTallerId] = useState(inicial?.tallerId ?? '')
  const [nota, setNota] = useState(inicial?.nota ?? '')

  /** Elegir tipo trae su nombre y su periodicidad, salvo que ya se escribieran. */
  const cambiarTipo = (id: TipoTramite) => {
    const previo = getTipoTramite(tipo)
    const nuevo = getTipoTramite(id)
    setTipo(id)
    if (!titulo.trim() || titulo === t(`garage.tramTipo.${previo.id}`, previo.label)) {
      setTitulo(t(`garage.tramTipo.${nuevo.id}`, nuevo.label))
    }
    setCadaMeses(String(nuevo.cadaMeses))
  }

  const guardar = async () => {
    if (!titulo.trim() || !fecha || vehiculo.id == null) return
    await guardarTramite(
      {
        tramiteId: inicial?.tramiteId ?? nuevoId('tv'),
        vehiculoId: vehiculo.id,
        tipo,
        titulo: titulo.trim(),
        fecha,
        hora: hora || undefined,
        cadaMeses: Number(cadaMeses) || undefined,
        avisoDias: Number(avisoDias) || undefined,
        costo: costo ? parseFloat(costo) : undefined,
        folio: folio.trim() || undefined,
        tallerId: tallerId || undefined,
        nota: nota.trim() || undefined,
        activo: inicial?.activo ?? true,
        creadoEn: inicial?.creadoEn ?? new Date().toISOString(),
      },
      vehiculo,
      inicial?.id,
    )
    onGuardado()
  }

  return (
    <Formulario
      icono={inicial ? 'editar' : esDoc ? 'tarjeta' : 'calendario'}
      titulo={
        inicial
          ? esDoc
            ? t('garage.doc.editar', 'Editar documento')
            : t('garage.tram.editar', 'Editar trámite')
          : esDoc
            ? t('garage.doc.nuevo', 'Nuevo documento')
            : t('garage.tram.nuevo', 'Programar trámite')
      }
      onGuardar={() => void guardar()}
      onCancelar={onCancelar}
    >
      {/* El tipo se elige tocando, no desplegando: son pocos y cada uno cambia el
          nombre y la periodicidad por defecto. */}
      <div className="flex flex-wrap gap-1.5">
        {disponibles.map((x) => {
          const activo = x.id === tipo
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => cambiarTipo(x.id)}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition hover:brightness-125"
              style={
                activo
                  ? { background: COLOR, color: TINTA_CTA }
                  : { background: `${COLOR}1a`, boxShadow: `inset 0 0 0 1px ${COLOR}33` }
              }
            >
              <span className={activo ? '' : 'texto-vivo'} style={activo ? undefined : vivo(COLOR)}>
                <Icono nombre={x.icono} /> {t(`garage.tramTipo.${x.id}`, x.label)}
              </span>
            </button>
          )
        })}
      </div>

      {!vehiculo.matricula?.trim() && (
        <p className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-[11px] leading-relaxed text-white/45">
          {t(
            'garage.tram.sinPlaca',
            'Sin placas registradas solo aparece lo básico. Añade la matrícula en la ficha del vehículo para agendar tenencia, verificación, tarjeta de circulación y seguro.',
          )}
        </p>
      )}

      <Campo etiqueta={t('garage.tram.titulo', 'Nombre *')}>
        <input className={INPUT} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </Campo>

      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta={t('garage.tram.fecha', 'Próximo vencimiento *')}>
          <input
            type="date"
            className={INPUT}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Campo>
        <Campo etiqueta={t('garage.tram.hora', 'Hora del recordatorio')}>
          <input
            type="time"
            className={INPUT}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta={t('garage.tram.repite', 'Se repite')}>
          <select
            className={INPUT}
            value={cadaMeses}
            onChange={(e) => setCadaMeses(e.target.value)}
          >
            {PERIODICIDADES.map((p) => (
              <option key={p.meses} value={p.meses}>
                {t(`garage.tramCada.${p.meses}`, p.label)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta={t('garage.tram.aviso', 'Avisarme')}>
          <select
            className={INPUT}
            value={avisoDias}
            onChange={(e) => setAvisoDias(e.target.value)}
          >
            {ANTICIPACIONES.map((a) => (
              <option key={a.dias} value={a.dias}>
                {t(`garage.tramAviso.${a.dias}`, a.label)}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta={t('garage.tram.costo', 'Costo estimado (MXN)')}>
          <input
            type="number"
            min={0}
            className={INPUT}
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />
        </Campo>
        <Campo etiqueta={t('garage.tram.folio', 'Póliza / folio')}>
          <input className={INPUT} value={folio} onChange={(e) => setFolio(e.target.value)} />
        </Campo>
      </div>

      <Campo etiqueta={t('garage.tram.taller', 'Dónde se hace')}>
        <select className={INPUT} value={tallerId} onChange={(e) => setTallerId(e.target.value)}>
          <option value="">{t('garage.tram.sinTaller', 'Sin contacto')}</option>
          {talleres.map((c) => (
            <option key={c.tallerId} value={c.tallerId}>
              {c.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta={t('garage.tram.nota', 'Notas')}>
        <textarea
          className={`${INPUT} min-h-[50px]`}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </Campo>

      <p className="text-[11px] text-white/40">
        <Icono nombre="calendario" />{' '}
        {esDoc
          ? t('garage.doc.pista', 'El documento aparece en el calendario y te avisa antes de vencer.')
          : t('garage.tram.pista', 'El trámite aparece en el calendario y te avisa a su hora.')}
      </p>
    </Formulario>
  )
}
