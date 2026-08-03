import { useState } from 'react'
import type { CuidadoMascota, Mascota } from '../../core/data/db'
import { useT, type TFunc } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { AvatarContacto } from './AvatarContacto'
import { COLOR_AREA } from './constantes'
import { FormMascota } from './FormMascota'
import { diasHasta, edadMascota, getEspecie } from './mascotas'

/**
 * Las mascotas dentro de Salud: lo que se agenda de ellas (citas, tratamientos y
 * cuidados que se repiten) es de la misma naturaleza que lo tuyo, así que vive en
 * la misma pestaña en vez de en una propia.
 */
export function MascotasSection({
  mascotas,
  cuidados,
  onAbrir,
}: {
  mascotas: Mascota[]
  cuidados: CuidadoMascota[]
  onAbrir: (m: Mascota) => void
}) {
  const t = useT()
  const [creando, setCreando] = useState(false)

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">
          <Icono nombre="animal" /> {t('agenda.salud.mascotas', 'Mascotas')}
        </p>
        <button
          type="button"
          data-tut="agenda.salud.mascotas"
          onClick={() => setCreando(true)}
          className="rounded-xl px-3 py-1.5 text-xs font-bold texto-cta transition hover:brightness-110"
          style={{ background: COLOR_AREA.salud }}
        >
          <Icono nombre="agregar" /> {t('agenda.salud.nuevaMascota', 'Nueva mascota')}
        </button>
      </div>

      {mascotas.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/40">
          {t('agenda.vacio.mascotas', 'Sin mascotas. Agrega a los que también dependen de ti.')}
        </p>
      ) : (
        <div className="space-y-2">
          {mascotas.map((m) => (
            <FilaMascota
              key={m.mascId}
              mascota={m}
              cuidados={cuidados.filter((c) => c.mascotaId === m.mascId && c.activo)}
              onAbrir={() => onAbrir(m)}
            />
          ))}
        </div>
      )}

      {creando && <FormMascota onCerrar={() => setCreando(false)} />}
    </section>
  )
}

function FilaMascota({
  mascota,
  cuidados,
  onAbrir,
}: {
  mascota: Mascota
  cuidados: CuidadoMascota[]
  onAbrir: () => void
}) {
  const t = useT()
  const especie = getEspecie(mascota.especie)
  const proximo = [...cuidados].sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  const faltan = proximo ? diasHasta(proximo.fecha) : null
  const vencido = faltan != null && faltan < 0

  const subtitulo = [mascota.raza, t(especie.clave, especie.es), edadTexto(mascota, t)]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type="button"
      onClick={onAbrir}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:bg-white/10"
    >
      <AvatarContacto nombre={mascota.nombre} foto={mascota.foto} icono={especie.icono} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{mascota.nombre}</span>
        <span className="block truncate text-[11px] text-white/50">{subtitulo}</span>
      </span>
      {proximo && faltan != null && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            vencido ? 'bg-red-500/20 text-red-300' : ''
          }`}
          style={vencido ? undefined : { background: `${COLOR_AREA.salud}33` }}
        >
          {proximo.titulo}
          {' · '}
          {vencido
            ? t('agenda.cuidado.vencido', 'vencido')
            : faltan === 0
              ? t('agenda.persona.hoy', 'hoy')
              : t('agenda.persona.enDias', '{n} d', { n: faltan })}
        </span>
      )}
    </button>
  )
}

/** «2 años», «5 meses»; vacío si no se guardó la fecha de nacimiento. */
export function edadTexto(mascota: Mascota, t: TFunc): string {
  if (!mascota.nacimiento) return ''
  const { anios, meses } = edadMascota(mascota.nacimiento)
  if (anios === 0) return t('agenda.mascota.meses', '{n} meses', { n: meses })
  return anios === 1
    ? t('agenda.mascota.anio', '1 año')
    : t('agenda.mascota.anios', '{n} años', { n: anios })
}
