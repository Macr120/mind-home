import type { RegistroMantenimiento, TramiteVehiculo, Vehiculo } from '../../core/data/db'
import { COLOR } from './constantes'
import { dinero, hoyISO } from './fecha'
import {
  alertasMantenimiento,
  alertasTramites,
  gastoAnio,
  type AlertaMantenimiento,
} from './stats'
import { TARJETA } from './ui'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/** Dato suelto de la tira de arriba. */
function Estadistica({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className={`${TARJETA} p-3 text-center`}>
      <p className="truncate text-xl font-black texto-vivo" style={vivo(COLOR)}>
        {valor}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/45">{etiqueta}</p>
    </div>
  )
}

/** Fila de alerta: barra de color a la izquierda y flecha de "entrar". */
function FilaAlerta({
  alerta,
  color,
  onAbrir,
}: {
  alerta: AlertaMantenimiento
  color: string
  onAbrir: () => void
}) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="group flex w-full items-center gap-3 rounded-xl bg-black/20 px-3 py-2 text-left transition hover:bg-black/30"
    >
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          <Icono nombre={alerta.icono} /> {alerta.titulo}
        </span>
        <span className="block truncate text-xs text-white/50">
          {alerta.vehiculoNombre} · {alerta.detalle}
        </span>
      </span>
      <span className="shrink-0 text-white/25 transition group-hover:text-white/60">
        <Icono nombre="siguiente" />
      </span>
    </button>
  )
}

export function ResumenTab({
  vehiculos,
  registros,
  tramites,
  onAbrirVehiculo,
}: {
  vehiculos: Vehiculo[]
  registros: RegistroMantenimiento[]
  tramites: TramiteVehiculo[]
  onAbrirVehiculo: (id: number) => void
}) {
  const t = useT()
  const año = hoyISO().slice(0, 4)
  const gastado = gastoAnio(registros, año)
  // Servicios y papeleo en la misma lista: lo que urge, urge.
  const alertas = [
    ...alertasTramites(vehiculos, tramites),
    ...alertasMantenimiento(vehiculos, registros),
  ]
  const vencidos = alertas.filter((a) => a.urgencia === 'vencido')
  const proximos = alertas.filter((a) => a.urgencia === 'proximo')
  const pendientes = tramites.filter((x) => x.activo).length

  // Un solo semáforo arriba: rojo si algo venció, ámbar si algo se acerca, verde
  // si el garaje está en paz. Evita que el usuario tenga que leer dos listas
  // para saber si le urge algo.
  const estado: { icono: NombreIcono; color: string; titulo: string; detalle: string } =
    vencidos.length > 0
      ? {
          icono: 'alerta',
          color: '#f87171',
          titulo: t('garage.r.hero.vencido', '{n} cosas vencidas', { n: String(vencidos.length) }),
          detalle: t('garage.r.hero.vencidoDet', 'Ponte al día antes de que se complique.'),
        }
      : proximos.length > 0
        ? {
            icono: 'calendario',
            color: COLOR,
            titulo: t('garage.r.hero.proximo', '{n} en puerta', { n: String(proximos.length) }),
            detalle: t('garage.r.hero.proximoDet', 'Nada vencido: solo lo que viene en camino.'),
          }
        : {
            icono: 'hecho',
            color: '#34d399',
            titulo: t('garage.r.hero.alDia', 'Todo al día'),
            detalle: t('garage.r.hero.alDiaDet', 'Sin servicios ni trámites pendientes.'),
          }

  return (
    <div className="space-y-4">
      {vehiculos.length > 0 && (
        <section
          data-tut="garage.resumen.semaforo"
          className="flex items-center gap-3 rounded-2xl border p-4"
          style={{ background: `${estado.color}14`, borderColor: `${estado.color}38` }}
        >
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl"
            style={{ background: `${estado.color}26` }}
          >
            <span className="texto-vivo" style={vivo(estado.color)}>
              <Icono nombre={estado.icono} />
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-base font-black texto-vivo" style={vivo(estado.color)}>
              {estado.titulo}
            </p>
            <p className="text-xs text-white/55">{estado.detalle}</p>
          </div>
        </section>
      )}

      <div data-tut="garage.resumen.stats" className="grid grid-cols-3 gap-2">
        <Estadistica valor={String(vehiculos.length)} etiqueta={t('garage.r.vehiculos', 'Vehículos')} />
        <Estadistica valor={String(pendientes)} etiqueta={t('garage.r.tramites', 'Trámites')} />
        <Estadistica valor={dinero(gastado)} etiqueta={t('garage.r.gasto', `Gasto ${año}`, { año })} />
      </div>

      {vencidos.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-red-500/35 bg-red-500/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-red-400">
            <Icono nombre="alerta" /> {t('garage.r.vencido', 'Mantenimiento vencido')}
          </p>
          {vencidos.map((a, i) => (
            <FilaAlerta
              key={`v-${a.vehiculoId}-${a.titulo}-${i}`}
              alerta={a}
              color="#f87171"
              onAbrir={() => onAbrirVehiculo(a.vehiculoId)}
            />
          ))}
        </section>
      )}

      {proximos.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-400">
            <Icono nombre="calendario" /> {t('garage.r.proximo', 'Próximamente')}
          </p>
          {proximos.map((a, i) => (
            <FilaAlerta
              key={`p-${a.vehiculoId}-${a.titulo}-${i}`}
              alerta={a}
              color={COLOR}
              onAbrir={() => onAbrirVehiculo(a.vehiculoId)}
            />
          ))}
        </section>
      )}

      {alertas.length === 0 && vehiculos.length > 0 && (
        <p className={`${TARJETA} p-4 text-center text-sm text-white/50`}>
          {t(
            'garage.r.sinAlertas',
            'Sin alertas. Registra el próximo servicio en cada mantenimiento para recibir avisos.',
          )}
        </p>
      )}

      {vehiculos.length === 0 && (
        <div className={`${TARJETA} space-y-1 p-6 text-center`}>
          <p className="text-3xl">
            <Icono nombre="auto" />
          </p>
          <p className="text-sm font-semibold text-white/70">
            {t('garage.r.vacioTitulo', 'El garaje está vacío')}
          </p>
          <p className="text-xs text-white/45">
            {t(
              'garage.r.sinVehiculos',
              'Añade tu primera bicicleta, auto o moto en la pestaña Vehículos.',
            )}
          </p>
        </div>
      )}
    </div>
  )
}
