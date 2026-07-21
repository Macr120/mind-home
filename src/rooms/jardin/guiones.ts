export type TemaMeditacion = 'ansiedad' | 'foco' | 'gratitud' | 'dormir'

export interface Tema {
  id: TemaMeditacion
  icono: string
  nombre: string
  desc: string
}

export const TEMAS: Tema[] = [
  { id: 'ansiedad', icono: '🌊', nombre: 'Ansiedad', desc: 'Suelta la tensión y vuelve al presente.' },
  { id: 'foco', icono: '🎯', nombre: 'Foco', desc: 'Entrena tu atención con la respiración.' },
  { id: 'gratitud', icono: '🙏', nombre: 'Gratitud', desc: 'Cultiva aprecio por lo que sí está.' },
  { id: 'dormir', icono: '🌙', nombre: 'Dormir', desc: 'Relaja el cuerpo hacia un descanso profundo.' },
]

export const DURACIONES_GUIADAS = [2, 5, 10, 20]

/**
 * Guion de cada meditación guiada: las frases se reparten uniformemente a lo
 * largo de la duración elegida (contenido en español, como los títulos de
 * prácticas; no pasa por i18n).
 */
export const GUIONES: Record<TemaMeditacion, string[]> = {
  ansiedad: [
    'Encuentra una postura cómoda y cierra los ojos suavemente.',
    'Nota tu respiración, sin cambiarla. Solo obsérvala.',
    'La ansiedad es una ola: no tienes que detenerla, solo dejarla pasar.',
    'Con cada exhalación, suelta un poco de tensión de los hombros.',
    'Si llega un pensamiento, nómbralo «pensando» y déjalo ir.',
    'Siente el peso de tu cuerpo sostenido. Aquí y ahora estás a salvo.',
    'Inhala calma. Exhala lo que no puedes controlar.',
    'Poco a poco tu mente se aquieta, como agua que se asienta.',
  ],
  foco: [
    'Siéntate erguido: alerta y relajado a la vez.',
    'Lleva toda tu atención al aire entrando por la nariz.',
    'Tu mente va a divagar. Es normal: ese es el ejercicio.',
    'Cuando notes que te fuiste, vuelve amablemente a la respiración.',
    'Cada regreso cuenta: así se entrena el foco.',
    'Nota los detalles: el aire fresco al entrar, tibio al salir.',
    'Una respiración a la vez. No hay nada más que hacer ahora.',
    'Esta claridad te acompaña el resto del día.',
  ],
  gratitud: [
    'Respira hondo y deja que el cuerpo se suelte.',
    'Trae a tu mente a una persona que te haya hecho bien.',
    'Nota qué se siente en el pecho al recordarla.',
    'Piensa en algo pequeño de hoy que sueles dar por hecho.',
    'Agradece a tu cuerpo, que te sostiene sin pedir permiso.',
    'La gratitud no niega lo difícil: ilumina lo que sí está.',
    'Sonríe suavemente, aunque sea solo por dentro.',
    'Llévate una de estas imágenes contigo al abrir los ojos.',
  ],
  dormir: [
    'Acomódate y deja que el cuerpo se hunda en la cama.',
    'Respira lento: inhala suave, exhala largo.',
    'Relaja la frente, los párpados, la mandíbula.',
    'Suelta los hombros. Suelta las manos.',
    'El día terminó. No hay nada que resolver esta noche.',
    'Cada exhalación te hunde un poco más en el descanso.',
    'Las piernas pesan, tibias y tranquilas.',
    'Deja que el sueño llegue solo, sin buscarlo.',
  ],
}
