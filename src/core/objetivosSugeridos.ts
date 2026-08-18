import { getPlantilla } from './appContrato'
import { tGlobal } from './i18n/useT'
import { actividadId } from './rutinas'
// Solo el TIPO (se borra al compilar): no crea ciclo con la UI en tiempo de ejecución.
import type { Actividad, RegistroRapido } from './ui/HorarioActividad'

/**
 * Lo que cada app SUGIERE proponerse: «registrar mis comidas», «rutina de fuerza
 * lunes, miércoles y viernes». Es el catálogo que convierte una app en un hábito
 * sin pedirle al usuario que invente el objetivo ni que rellene el formulario de
 * un evento — elegir uno pide solo los días.
 *
 * Aceptar una sugerencia NO crea nada nuevo: escribe la misma fila de `rutinas`
 * que `agendarActividad`, así que aparece sola en la lista de hoy (fuente 2 de
 * `armarPasosHoy`), en los Objetivos de la casa y en el calendario.
 *
 * El catálogo va aquí y no en cada `Plantilla` —como `SEMILLAS` de
 * `gamificacion/asistentesPlantilla.ts` o `FUENTES` de `gamificacion/actividad.ts`—
 * porque es CONTENIDO: se escribe, se lee y se revisa de una sentada.
 */

export interface ObjetivoSugerido {
  /** Id estable dentro de su app: forma el `actividadId`, no se puede renombrar. */
  id: string
  /** Clave i18n de la etiqueta y su fallback en español. */
  clave: string
  etiquetaEs: string
  /** Sin valor, el emoji de la app. */
  emoji?: string
  /** Días de fábrica (0=domingo … 6=sábado). Sin valor, todos los días. */
  dias?: number[]
  /** Hora con la que nace SI el usuario pide hora; sin ella el objetivo no suena. */
  horaSugerida?: string
  /** Sección de la app a la que lleva la fila (de `Plantilla.comandos`). */
  seccion?: string
  /**
   * Registro de un toque desde la lista de hoy. Solo lo llevan los objetivos donde
   * un valor fijo es HONESTO: un vaso de agua, 45 min de fuerza. Una comida o una
   * anécdota de un toque escribiría un registro vacío que envenena los totales,
   * así que esas llevan al sitio donde se registran de verdad.
   */
  registro?: RegistroRapido
  /** El campo de `registro.valores` que el usuario puede ajustar al añadirlo. */
  cantidad?: { campo: string; valor: number; unidad: string }
}

/** Los días de la semana con nombre, para que el catálogo se lea. */
const TODOS: number[] = []
const LMV = [1, 3, 5]
const MJ = [2, 4]
const ENTRE_SEMANA = [1, 2, 3, 4, 5]
const DOMINGO = [0]
const SABADO = [6]
const FIN_DE_SEMANA = [5, 6]

const CATALOGO: Record<string, ObjetivoSugerido[]> = {
  cocina: [
    {
      id: 'comidas',
      clave: 'objetivos.sug.cocina.comidas',
      etiquetaEs: 'Registrar lo que comí',
      emoji: '🍽️',
      dias: TODOS,
      seccion: 'diario',
    },
    {
      id: 'agua',
      clave: 'objetivos.sug.cocina.agua',
      etiquetaEs: 'Beber agua',
      emoji: '💧',
      dias: TODOS,
      seccion: 'diario',
      registro: { esquemaId: 'agua', valores: { ml: 500 }, etiqueta: 'Beber agua' },
      cantidad: { campo: 'ml', valor: 500, unidad: 'ml' },
    },
    {
      id: 'peso',
      clave: 'objetivos.sug.cocina.peso',
      etiquetaEs: 'Pesarme',
      emoji: '⚖️',
      dias: DOMINGO,
      seccion: 'progreso',
    },
    {
      id: 'menu',
      clave: 'objetivos.sug.cocina.menu',
      etiquetaEs: 'Planear el menú de la semana',
      emoji: '📅',
      dias: DOMINGO,
      seccion: 'plan',
    },
    {
      id: 'compra',
      clave: 'objetivos.sug.cocina.compra',
      etiquetaEs: 'Hacer la compra',
      emoji: '🛒',
      dias: SABADO,
      seccion: 'compras',
    },
  ],

  ejercicio: [
    {
      id: 'fuerza',
      clave: 'objetivos.sug.ejercicio.fuerza',
      etiquetaEs: 'Rutina de fuerza',
      emoji: '🏋️',
      dias: LMV,
      horaSugerida: '07:00',
      seccion: 'fuerza',
      registro: {
        esquemaId: 'sesion',
        valores: { tipo: 'fuerza', duracionMin: 45, titulo: 'Rutina de fuerza' },
        etiqueta: 'Rutina de fuerza',
      },
      cantidad: { campo: 'duracionMin', valor: 45, unidad: 'min' },
    },
    {
      id: 'cardio',
      clave: 'objetivos.sug.ejercicio.cardio',
      etiquetaEs: 'Cardio',
      emoji: '🏃',
      dias: MJ,
      horaSugerida: '07:00',
      seccion: 'resistencia',
      registro: {
        esquemaId: 'sesion',
        valores: { tipo: 'resistencia', duracionMin: 30, titulo: 'Cardio' },
        etiqueta: 'Cardio',
      },
      cantidad: { campo: 'duracionMin', valor: 30, unidad: 'min' },
    },
    {
      id: 'caminar',
      clave: 'objetivos.sug.ejercicio.caminar',
      etiquetaEs: 'Caminar',
      emoji: '👟',
      dias: TODOS,
      seccion: 'resistencia',
      registro: {
        esquemaId: 'sesion',
        valores: { tipo: 'resistencia', duracionMin: 30, titulo: 'Caminata' },
        etiqueta: 'Caminar',
      },
      cantidad: { campo: 'duracionMin', valor: 30, unidad: 'min' },
    },
    {
      id: 'estirar',
      clave: 'objetivos.sug.ejercicio.estirar',
      etiquetaEs: 'Estirar',
      emoji: '🤸',
      dias: TODOS,
      seccion: 'flexibilidad',
      registro: {
        esquemaId: 'sesion',
        valores: { tipo: 'flexibilidad', duracionMin: 10, titulo: 'Estiramientos' },
        etiqueta: 'Estirar',
      },
      cantidad: { campo: 'duracionMin', valor: 10, unidad: 'min' },
    },
  ],

  descanso: [
    {
      id: 'registrar',
      clave: 'objetivos.sug.descanso.registrar',
      etiquetaEs: 'Registrar cómo dormí',
      emoji: '😴',
      dias: TODOS,
      seccion: 'sueno',
    },
    {
      id: 'acostarme',
      clave: 'objetivos.sug.descanso.acostarme',
      etiquetaEs: 'Acostarme a mi hora',
      emoji: '🌙',
      dias: TODOS,
      horaSugerida: '23:00',
      seccion: 'sueno',
    },
    {
      id: 'pantallas',
      clave: 'objetivos.sug.descanso.pantallas',
      etiquetaEs: 'Sin pantallas antes de dormir',
      emoji: '📵',
      dias: TODOS,
      horaSugerida: '22:00',
      seccion: 'sueno',
    },
  ],

  anecdotario: [
    {
      id: 'escribir',
      clave: 'objetivos.sug.anecdotario.escribir',
      etiquetaEs: 'Escribir mi día',
      emoji: '✍️',
      dias: TODOS,
      horaSugerida: '21:00',
      seccion: 'anecdotas',
    },
    {
      id: 'bueno',
      clave: 'objetivos.sug.anecdotario.bueno',
      etiquetaEs: 'Anotar un buen momento',
      emoji: '🌟',
      dias: TODOS,
      seccion: 'anecdotas',
    },
    {
      id: 'foto',
      clave: 'objetivos.sug.anecdotario.foto',
      etiquetaEs: 'Una foto del día',
      emoji: '📷',
      dias: TODOS,
      seccion: 'anecdotas',
    },
  ],

  despacho: [
    {
      id: 'gastos',
      clave: 'objetivos.sug.despacho.gastos',
      etiquetaEs: 'Apuntar mis gastos del día',
      emoji: '🧾',
      dias: TODOS,
      seccion: 'gastos',
    },
    {
      id: 'presupuesto',
      clave: 'objetivos.sug.despacho.presupuesto',
      etiquetaEs: 'Revisar el presupuesto',
      emoji: '📊',
      dias: DOMINGO,
      seccion: 'balance',
    },
    {
      id: 'ahorro',
      clave: 'objetivos.sug.despacho.ahorro',
      etiquetaEs: 'Registrar lo que ahorré',
      emoji: '🪙',
      dias: [5],
      seccion: 'metas',
    },
  ],

  biblioteca: [
    {
      id: 'estudiar',
      clave: 'objetivos.sug.biblioteca.estudiar',
      etiquetaEs: 'Estudiar',
      emoji: '📖',
      dias: TODOS,
      seccion: 'estudio',
      registro: { esquemaId: 'estudio', valores: { minutos: 20 }, etiqueta: 'Estudiar' },
      cantidad: { campo: 'minutos', valor: 20, unidad: 'min' },
    },
    {
      id: 'apunte',
      clave: 'objetivos.sug.biblioteca.apunte',
      etiquetaEs: 'Escribir un apunte',
      emoji: '📝',
      dias: LMV,
      seccion: 'enciclopedia',
    },
    {
      id: 'preguntar',
      clave: 'objetivos.sug.biblioteca.preguntar',
      etiquetaEs: 'Preguntar algo que no sepa',
      emoji: '💬',
      dias: TODOS,
      seccion: 'charlas',
    },
  ],

  entretenimiento: [
    {
      id: 'archivar',
      clave: 'objetivos.sug.entretenimiento.archivar',
      etiquetaEs: 'Anotar lo que vi o jugué',
      emoji: '🎬',
      dias: TODOS,
      seccion: 'archivo',
    },
    {
      id: 'mesa',
      clave: 'objetivos.sug.entretenimiento.mesa',
      etiquetaEs: 'Una partida de mesa',
      emoji: '🎲',
      dias: FIN_DE_SEMANA,
      seccion: 'mesa',
    },
  ],

  sala: [
    {
      id: 'bitacora',
      clave: 'objetivos.sug.sala.bitacora',
      etiquetaEs: 'Escribir en la bitácora',
      emoji: '📔',
      dias: TODOS,
      seccion: 'bitacora',
    },
    {
      id: 'porConocer',
      clave: 'objetivos.sug.sala.porConocer',
      etiquetaEs: 'Añadir un lugar por conocer',
      emoji: '📍',
      dias: DOMINGO,
      seccion: 'porConocer',
    },
  ],

  jardin: [
    {
      id: 'meditar',
      clave: 'objetivos.sug.jardin.meditar',
      etiquetaEs: 'Meditar',
      emoji: '🧘',
      dias: TODOS,
      seccion: 'meditacion',
      registro: {
        esquemaId: 'practica',
        valores: { tipo: 'meditacion', duracionMin: 10 },
        etiqueta: 'Meditar',
      },
      cantidad: { campo: 'duracionMin', valor: 10, unidad: 'min' },
    },
    {
      id: 'respirar',
      clave: 'objetivos.sug.jardin.respirar',
      etiquetaEs: 'Respirar',
      emoji: '🌬️',
      dias: TODOS,
      seccion: 'respiracion',
      registro: {
        esquemaId: 'practica',
        valores: { tipo: 'respiracion', duracionMin: 5 },
        etiqueta: 'Respirar',
      },
      cantidad: { campo: 'duracionMin', valor: 5, unidad: 'min' },
    },
    {
      id: 'gratitud',
      clave: 'objetivos.sug.jardin.gratitud',
      etiquetaEs: 'Tres agradecimientos',
      emoji: '🙏',
      dias: TODOS,
      seccion: 'gratitud',
    },
  ],

  garage: [
    {
      id: 'revisar',
      clave: 'objetivos.sug.garage.revisar',
      etiquetaEs: 'Revisar el vehículo',
      emoji: '🔧',
      dias: DOMINGO,
      seccion: 'vehiculos',
    },
    {
      id: 'servicio',
      clave: 'objetivos.sug.garage.servicio',
      etiquetaEs: 'Apuntar un servicio',
      emoji: '🛠️',
      dias: DOMINGO,
      seccion: 'resumen',
    },
  ],

  diario: [
    {
      id: 'titulares',
      clave: 'objetivos.sug.diario.titulares',
      etiquetaEs: 'Leer los titulares',
      emoji: '📰',
      dias: ENTRE_SEMANA,
      horaSugerida: '08:00',
      seccion: 'titulares',
    },
    {
      id: 'efemerides',
      clave: 'objetivos.sug.diario.efemerides',
      etiquetaEs: 'Ver las efemérides de hoy',
      emoji: '🗓️',
      dias: TODOS,
      seccion: 'efemerides',
    },
  ],

  hobbies: [
    {
      id: 'practicar',
      clave: 'objetivos.sug.hobbies.practicar',
      etiquetaEs: 'Practicar mi hobby',
      emoji: '🎨',
      dias: TODOS,
      seccion: 'hobbies',
    },
    {
      id: 'proyecto',
      clave: 'objetivos.sug.hobbies.proyecto',
      etiquetaEs: 'Avanzar un proyecto',
      emoji: '🧩',
      dias: SABADO,
      seccion: 'hobbies',
    },
  ],

  idiomas: [
    {
      id: 'repaso',
      clave: 'objetivos.sug.idiomas.repaso',
      etiquetaEs: 'Repasar mis tarjetas',
      emoji: '🃏',
      dias: TODOS,
      seccion: 'repaso',
    },
    {
      id: 'charla',
      clave: 'objetivos.sug.idiomas.charla',
      etiquetaEs: 'Conversar con el tutor',
      emoji: '🗣️',
      dias: LMV,
      seccion: 'charlas',
    },
    {
      id: 'palabras',
      clave: 'objetivos.sug.idiomas.palabras',
      etiquetaEs: 'Añadir palabras nuevas',
      emoji: '📚',
      dias: MJ,
      seccion: 'temario',
    },
  ],

  ideas: [
    {
      id: 'anotar',
      clave: 'objetivos.sug.ideas.anotar',
      etiquetaEs: 'Anotar una idea',
      emoji: '💡',
      dias: TODOS,
      seccion: 'diario',
    },
    {
      id: 'mapa',
      clave: 'objetivos.sug.ideas.mapa',
      etiquetaEs: 'Hacer un mapa de un tema',
      emoji: '🗺️',
      dias: DOMINGO,
      seccion: 'mapas',
    },
  ],

  computo: [
    {
      id: 'resolver',
      clave: 'objetivos.sug.computo.resolver',
      etiquetaEs: 'Resolver algo hoy',
      emoji: '🧮',
      dias: TODOS,
      seccion: 'calculadora',
    },
    {
      id: 'hoja',
      clave: 'objetivos.sug.computo.hoja',
      etiquetaEs: 'Actualizar mi hoja de cálculo',
      emoji: '📈',
      dias: DOMINGO,
      seccion: 'hojas',
    },
  ],

  agenda: [
    {
      id: 'pendientes',
      clave: 'objetivos.sug.agenda.pendientes',
      etiquetaEs: 'Revisar mis pendientes',
      emoji: '✅',
      dias: ENTRE_SEMANA,
      horaSugerida: '09:00',
      seccion: 'trabajo',
    },
    {
      id: 'medicamentos',
      clave: 'objetivos.sug.agenda.medicamentos',
      etiquetaEs: 'Tomar mis medicamentos',
      emoji: '💊',
      dias: TODOS,
      horaSugerida: '09:00',
      seccion: 'salud',
    },
    {
      id: 'cumples',
      clave: 'objetivos.sug.agenda.cumples',
      etiquetaEs: 'Felicitar los cumpleaños',
      emoji: '🎂',
      dias: TODOS,
      seccion: 'personas',
    },
  ],
}

/**
 * Lo que esta app sugiere proponerse. Vacío en el cuarto Metas (es el
 * planificador: no registra nada suyo) y en las plantillas personalizadas, que
 * arman sus objetivos con el bloque «Hábito» de la propia app.
 */
export function sugerenciasDe(plantillaId: string): ObjetivoSugerido[] {
  return CATALOGO[plantillaId] ?? []
}

/** La llave estable de la fila que agenda una sugerencia (dedupe con `buscarAgenda`). */
export const idActividadSugerencia = (plantillaId: string, id: string): string =>
  actividadId('objetivo', `${plantillaId}:${id}`)

/** El nombre visible: la etiqueta y, si la lleva, su cantidad («Beber agua · 500 ml»). */
export function nombreSugerencia(s: ObjetivoSugerido, cantidad?: number): string {
  const etiqueta = tGlobal(s.clave, s.etiquetaEs)
  return s.cantidad && cantidad ? `${etiqueta} · ${cantidad} ${s.cantidad.unidad}` : etiqueta
}

/**
 * La sugerencia como actividad agendable: de aquí en adelante es una actividad
 * más de la app, con el mismo camino que las que ya sabían ponerse hora.
 *
 * La `hora` viaja en `horaSugerida` y no en el `extra` de `agendarActividad`
 * porque el `horaFin` se calcula ANTES de aplicar el extra: pasarla por fuera
 * dejaría el bloque terminando a partir de una hora que nadie eligió.
 */
export function actividadDeSugerencia(
  plantillaId: string,
  s: ObjetivoSugerido,
  opciones: { cantidad?: number; hora?: string } = {},
): Actividad {
  const nombre = nombreSugerencia(s, opciones.cantidad)
  const valores =
    s.registro && s.cantidad && opciones.cantidad
      ? { ...s.registro.valores, [s.cantidad.campo]: opciones.cantidad }
      : s.registro?.valores
  return {
    actividadId: idActividadSugerencia(plantillaId, s.id),
    plantillaId,
    nombre,
    emoji: s.emoji ?? getPlantilla(plantillaId)?.icon,
    horaSugerida: opciones.hora || undefined,
    // Solo con hora: sin ella el bloque no ocupa un rato del día, es un pendiente.
    duracionMin: opciones.hora && s.cantidad?.unidad === 'min' ? opciones.cantidad : undefined,
    seccion: s.seccion,
    registroRapido: valores ? { esquemaId: s.registro!.esquemaId, valores, etiqueta: nombre } : undefined,
  }
}
