import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { rutinasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Reusa los anclajes `cal.*` de CalendarioVista (compartida con el modal del reloj). */
export const tutorialCalendarioApp: TutorialDef = {
  id: 'app-calendario',
  titulo: T('tut.app-calendario.titulo', 'Calendario'),
  resumen: T(
    'tut.app-calendario.resumen',
    'El calendario reúne todo lo agendado de la casa en vistas Día, Semana, Mes, Año y Cronograma. Crea eventos con + Nueva o trazando en la rejilla; las apps aportan sus fechas solas.',
  ),
  preparar: () => {
    abrirApp('calendario')
  },
  pasos: [
    {
      sel: 'cal.panel',
      alEntrar: async (ctx) => {
        await ctx.unaVez('evento-ejemplo', async () => {
          const h = new Date().getHours() + 1
          const [hora, horaFin] =
            h <= 22
              ? [`${String(h).padStart(2, '0')}:00`, `${String(h + 1).padStart(2, '0')}:00`]
              : ['09:00', '10:00']
          const id = await rutinasRepo.add({
            nombre: 'Ejemplo (tutorial) 🎓',
            emoji: '🎓',
            hora,
            horaFin,
            dias: [],
            repeticion: 'una_vez',
            fechaInicio: fechaLocalISO(),
            pasos: [],
            activa: true,
            avisar: false, // demo: que el reloj de avisos no lo anuncie
            creadoEn: new Date().toISOString(),
          })
          ctx.alLimpiar(() => rutinasRepo.remove(id))
        })
      },
      texto: T(
        'tut.app-calendario.1.texto',
        'El calendario de la casa: todo lo agendado en un solo lugar. Agendé hoy el evento «Ejemplo (tutorial) 🎓» para que veas un bloque en la rejilla; se borrará al terminar.',
      ),
    },
    {
      sel: 'cal.vistas',
      titulo: T('tut.app-calendario.2.titulo', 'Vistas'),
      texto: T(
        'tut.app-calendario.2.texto',
        'Día y Semana muestran la rejilla por horas; Mes y Año, el panorama; Cronograma, tus metas en el tiempo.',
      ),
    },
    {
      sel: 'cal.nueva',
      titulo: T('tut.app-calendario.3.titulo', 'Crear eventos'),
      texto: T(
        'tut.app-calendario.3.texto',
        '+ Nueva crea un evento como el de ejemplo; también puedes trazar directo en la rejilla. Arrastra bloques para moverlos o estíralos para cambiar su duración.',
      ),
    },
    {
      sel: 'cal.hoy',
      titulo: T('tut.app-calendario.4.titulo', 'Navegar'),
      texto: T(
        'tut.app-calendario.4.texto',
        'Hoy regresa a la fecha actual; las flechas ‹ › mueven el periodo.',
      ),
    },
    {
      texto: T(
        'tut.app-calendario.5.texto',
        'Los eventos de las apps (viajes, metas con fecha, sueño) aparecen solos; no hay que copiarlos.',
      ),
    },
  ],
}
