import type { AreaAgenda, EspecieMascota, Mascota, TipoCuidadoMascota } from '../../core/data/db'
import { contactosAgendaRepo, mascotasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import type { EsquemaCaptura } from '../../core/registry'
import { vFecha, vLista, vTexto } from '../../core/registry'
import { guardarContacto, guardarCuidado, guardarEvento, guardarMascota, guardarMedicamento } from './crear'
import { AREAS } from './constantes'
import { ESPECIES, getCuidado, TIPOS_CUIDADO } from './mascotas'

/** Hora 'HH:mm' válida, o vacío (el modelo a veces manda '8' o '8:00 pm'). */
function vHora(v: unknown): string {
  const texto = vTexto(v).toLowerCase()
  const m = texto.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (!m) return ''
  let h = Number(m[1])
  if (m[3] === 'pm' && h < 12) h += 12
  if (m[3] === 'am' && h === 12) h = 0
  if (h > 23) return ''
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`
}

const vArea = (v: unknown): AreaAgenda => {
  const texto = vTexto(v)
  return (AREAS as string[]).includes(texto) ? (texto as AreaAgenda) : 'trabajo'
}

/** Especie válida; sin ella se conserva la que ya tuviera la ficha. */
const vEspecie = (v: unknown, previo?: Mascota): EspecieMascota => {
  const texto = vTexto(v)
  return ESPECIES.some((e) => e.id === texto)
    ? (texto as EspecieMascota)
    : (previo?.especie ?? 'otro')
}

/** El título del cuidado es el nombre del tipo en el idioma activo. */
const tituloCuidado = (tipo: TipoCuidadoMascota) => {
  const def = getCuidado(tipo)
  return tGlobal(def.clave, def.es)
}

export const esquemas: EsquemaCaptura[] = [
  {
    id: 'evento_agenda',
    descripcion:
      'Algo que el usuario agenda o apunta: una junta o entrega de trabajo, una cita médica, o un plan con alguien. Sin fecha queda como pendiente.',
    campos: [
      {
        campo: 'area',
        tipo: 'opcion',
        descripcion: 'Sección a la que pertenece: trabajo, salud (citas médicas) o personas (planes con alguien)',
        opciones: ['trabajo', 'salud', 'personas'],
        requerido: true,
      },
      { campo: 'titulo', tipo: 'texto', descripcion: 'Qué es (ej. "junta con el cliente", "dentista")', requerido: true },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd; déjala vacía si el usuario no dijo cuándo' },
      { campo: 'hora', tipo: 'texto', descripcion: 'Hora de inicio en formato HH:mm (24 h)' },
      { campo: 'lugar', tipo: 'texto', descripcion: 'Dónde ocurre' },
      { campo: 'con', tipo: 'texto', descripcion: 'Con quién: el médico, el cliente o la persona' },
      { campo: 'notas', tipo: 'texto', descripcion: 'Detalle extra que convenga recordar' },
    ],
    guardar: async (v) => {
      const titulo = vTexto(v.titulo)
      if (!titulo) return
      // Solo se pone fecha si el usuario dijo cuándo: `vFecha` cae en hoy por
      // defecto y convertiría cualquier pendiente suelto en un evento de hoy.
      const fecha = vTexto(v.fecha) ? vFecha(v.fecha) : undefined
      const hora = vHora(v.hora)
      await guardarEvento(null, {
        area: vArea(v.area),
        titulo,
        fecha,
        hora: fecha && hora ? hora : undefined,
        lugar: vTexto(v.lugar) || undefined,
        con: vTexto(v.con) || undefined,
        notas: vTexto(v.notas) || undefined,
      })
    },
  },
  {
    id: 'contacto',
    descripcion: 'Una persona de la libreta del usuario: sus datos de contacto y su cumpleaños.',
    campos: [
      { campo: 'nombre', tipo: 'texto', descripcion: 'Nombre de la persona', requerido: true },
      { campo: 'relacion', tipo: 'texto', descripcion: 'Vínculo: familia, trabajo, amigos…' },
      { campo: 'telefono', tipo: 'texto', descripcion: 'Número de teléfono' },
      { campo: 'correo', tipo: 'texto', descripcion: 'Correo electrónico' },
      { campo: 'cumple', tipo: 'fecha', descripcion: 'Cumpleaños yyyy-mm-dd (con el año de nacimiento si se sabe)' },
    ],
    guardar: async (v) => {
      const nombre = vTexto(v.nombre)
      if (!nombre) return
      // Si ya está en la libreta se completan sus datos en vez de duplicarla.
      const previo = (await contactosAgendaRepo.list()).find(
        (c) => c.nombre.toLowerCase() === nombre.toLowerCase(),
      )
      await guardarContacto(previo ?? null, {
        nombre,
        relacion: vTexto(v.relacion) || previo?.relacion,
        telefono: vTexto(v.telefono) || previo?.telefono,
        correo: vTexto(v.correo) || previo?.correo,
        cumple: vTexto(v.cumple) ? vFecha(v.cumple) : previo?.cumple,
        horaCumple: previo?.horaCumple,
        foto: previo?.foto,
        direccion: previo?.direccion,
        notas: previo?.notas,
      })
    },
  },
  {
    id: 'medicamento',
    descripcion: 'Un medicamento que el usuario está tomando, con las horas a las que le toca.',
    campos: [
      { campo: 'nombre', tipo: 'texto', descripcion: 'Nombre del medicamento', requerido: true },
      { campo: 'dosis', tipo: 'texto', descripcion: 'Cuánto se toma (ej. "500 mg", "1 pastilla")' },
      { campo: 'horas', tipo: 'lista', descripcion: 'Horas de toma en formato HH:mm (24 h), una por elemento', requerido: true },
      { campo: 'hasta', tipo: 'fecha', descripcion: 'Último día del tratamiento yyyy-mm-dd, si lo dijo' },
    ],
    guardar: async (v) => {
      const nombre = vTexto(v.nombre)
      const horas = vLista(v.horas).map(vHora).filter(Boolean)
      if (!nombre || horas.length === 0) return
      await guardarMedicamento(null, {
        nombre,
        dosis: vTexto(v.dosis) || undefined,
        horas,
        dias: [],
        fechaInicio: fechaLocalISO(),
        fechaFin: vTexto(v.hasta) ? vFecha(v.hasta) : undefined,
        activo: true,
      })
    },
  },
  {
    id: 'mascota',
    descripcion: 'Una mascota del usuario: su ficha (especie, raza, nacimiento) para poder agendarle cosas.',
    campos: [
      { campo: 'nombre', tipo: 'texto', descripcion: 'Cómo se llama', requerido: true },
      {
        campo: 'especie',
        tipo: 'opcion',
        descripcion: 'Qué animal es',
        opciones: ESPECIES.map((e) => e.id),
      },
      { campo: 'raza', tipo: 'texto', descripcion: 'Raza, si la dijo' },
      { campo: 'nacimiento', tipo: 'fecha', descripcion: 'Fecha de nacimiento yyyy-mm-dd, si la sabe' },
    ],
    guardar: async (v) => {
      const nombre = vTexto(v.nombre)
      if (!nombre) return
      // Si ya tiene ficha se completa en vez de duplicarla.
      const previo = (await mascotasRepo.list()).find(
        (m) => m.nombre.toLowerCase() === nombre.toLowerCase(),
      )
      await guardarMascota(previo ?? null, {
        nombre,
        especie: vEspecie(v.especie, previo),
        raza: vTexto(v.raza) || previo?.raza,
        nacimiento: vTexto(v.nacimiento) ? vFecha(v.nacimiento) : previo?.nacimiento,
        peso: previo?.peso,
        veterinario: previo?.veterinario,
        telefono: previo?.telefono,
        foto: previo?.foto,
        notas: previo?.notas,
      })
    },
  },
  {
    id: 'cuidado_mascota',
    descripcion:
      'Algo que le toca a una mascota del usuario y suele repetirse: una vacuna, la desparasitación, el baño o la revisión con el veterinario.',
    campos: [
      { campo: 'mascota', tipo: 'texto', descripcion: 'Nombre de la mascota, tal como lo dijo', requerido: true },
      {
        campo: 'tipo',
        tipo: 'opcion',
        descripcion: 'De qué cuidado se trata',
        opciones: TIPOS_CUIDADO.map((c) => c.id),
        requerido: true,
      },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Cuándo toca la próxima vez, yyyy-mm-dd', requerido: true },
      { campo: 'hora', tipo: 'texto', descripcion: 'Hora en formato HH:mm (24 h), si la dijo' },
      { campo: 'cadaMeses', tipo: 'numero', descripcion: 'Cada cuántos meses se repite; 0 si es una sola vez' },
    ],
    guardar: async (v) => {
      const nombre = vTexto(v.mascota)
      // Sin ficha no hay a quién colgarle el cuidado: el chat debe dar de alta la
      // mascota primero (el esquema `mascota` de arriba).
      const mascota = (await mascotasRepo.list()).find(
        (m) => m.nombre.toLowerCase() === nombre.toLowerCase(),
      )
      if (!mascota) return
      const def = getCuidado(vTexto(v.tipo) as TipoCuidadoMascota)
      const meses = Number(v.cadaMeses)
      await guardarCuidado(
        null,
        {
          mascotaId: mascota.mascId,
          tipo: def.id,
          titulo: tituloCuidado(def.id),
          fecha: vFecha(v.fecha),
          hora: vHora(v.hora) || undefined,
          cadaMeses: Number.isFinite(meses) && meses > 0 ? meses : def.mesesSugeridos || undefined,
          activo: true,
        },
        mascota.nombre,
      )
    },
  },
]
