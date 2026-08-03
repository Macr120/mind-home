/**
 * Flujos de hobbies: corren sobre el año de Pep@ en la casa demo. Los pasos
 * localizan el piano y sus proyectos POR LOS REPOS (leer sí se puede en demo)
 * y navegan con clicks sobre las anclas — no crean datos.
 */
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, esperarTut } from '../../core/tutorial/dom'
import { hobbiesRepo, proyectosHobbyRepo } from '../../core/data/repository'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Entra al detalle del piano (idempotente: dentro del detalle el click no-op). */
async function abrirPiano(): Promise<void> {
  const hobbies = await hobbiesRepo.list()
  const piano = hobbies.find((h) => h.emoji === '🎹') ?? hobbies[0]
  if (piano?.id != null) clickTut(`hobbies.item.${piano.id}`)
}

const flujoPiano: TutorialDef = {
  id: 'app-hobbies--piano',
  titulo: T('tut.app-hobbies--piano.titulo', 'El año de piano'),
  resumen: T(
    'tut.app-hobbies--piano.resumen',
    'Hobbies da seguimiento a cada pasatiempo: sesiones con minutos y nota, heatmap anual, rachas, meta semanal y proyectos.',
  ),
  preparar: () => {
    abrirApp('hobbies')
  },
  pasos: [
    {
      sel: 'hobbies.lista',
      titulo: T('tut.app-hobbies--piano.1.titulo', 'Dos hobbies, un año'),
      texto: T(
        'tut.app-hobbies--piano.1.texto',
        'Pep@ registró dos: el piano (su proyecto del año, meta de 4 días por semana) y la astrofotografía. Cada tarjeta muestra la semana en curso y la racha.',
      ),
    },
    {
      sel: 'hobbies.detalle.stats',
      titulo: T('tut.app-hobbies--piano.2.titulo', 'Dentro del piano'),
      texto: T(
        'tut.app-hobbies--piano.2.texto',
        'Racha, mejor racha, total practicado, días activos y promedio. Un año de teclado — con la pausa honesta de Japón.',
      ),
      alEntrar: abrirPiano,
    },
    {
      sel: 'hobbies.detalle.heatmap',
      titulo: T('tut.app-hobbies--piano.3.titulo', 'El heatmap'),
      texto: T(
        'tut.app-hobbies--piano.3.texto',
        'Cada cuadrito es un día. Se ve el arranque del mes 2, cómo el piano SOSTUVO el bache del mes 7 y el hueco de las tres semanas en Japón.',
      ),
    },
    {
      sel: 'hobbies.detalle.sesiones',
      titulo: T('tut.app-hobbies--piano.4.titulo', 'Las sesiones'),
      texto: T(
        'tut.app-hobbies--piano.4.texto',
        'Cada práctica con sus minutos y, muchas, con nota: de «me duelen las manos» a sacar «Clair de Lune» completa.',
      ),
    },
    {
      sel: 'hobbies.detalle.proyectos',
      titulo: T('tut.app-hobbies--piano.5.titulo', 'Proyectos'),
      texto: T(
        'tut.app-hobbies--piano.5.texto',
        'La práctica con rumbo: la primera pieza (terminada en el mes 5) y «Clair de Lune», tocada para la familia hace una semana.',
      ),
    },
  ],
}

const flujoProyectos: TutorialDef = {
  id: 'app-hobbies--proyectos',
  titulo: T('tut.app-hobbies--proyectos.titulo', 'Proyectos con fotos'),
  resumen: T(
    'tut.app-hobbies--proyectos.resumen',
    'Cada proyecto guarda su nota, sus sesiones vinculadas y su avance en fotos.',
  ),
  preparar: () => {
    abrirApp('hobbies')
  },
  pasos: [
    {
      sel: 'hobbies.detalle.proyectos',
      titulo: T('tut.app-hobbies--proyectos.1.titulo', 'Los proyectos del piano'),
      texto: T(
        'tut.app-hobbies--proyectos.1.texto',
        'Un proyecto junta las sesiones que le dedicaste: aquí se ve cuántas y cuántos minutos lleva cada uno.',
      ),
      alEntrar: abrirPiano,
    },
    {
      sel: 'hobbies.proyecto.fotos',
      titulo: T('tut.app-hobbies--proyectos.2.titulo', 'El avance en fotos'),
      texto: T(
        'tut.app-hobbies--proyectos.2.texto',
        '«Clair de Lune» guarda la partitura anotada. En la astrofotografía, el proyecto de las doce lunas llenas junta las mejores tomas del año.',
      ),
      alEntrar: async () => {
        const proyectos = await proyectosHobbyRepo.list()
        const clair = proyectos.find((p) => p.nombre === 'Clair de Lune') ?? proyectos[0]
        if (clair?.id != null) {
          await esperarTut(`hobbies.proyecto.item.${clair.id}`, 3000)
          clickTut(`hobbies.proyecto.item.${clair.id}`)
        }
      },
    },
    {
      texto: T(
        'tut.app-hobbies--proyectos.3.texto',
        'También puedes registrar sesiones por chat («practiqué piano 30 min») y planear metas del proyecto con el planificador.',
      ),
    },
  ],
}

export const flujosHobbies: TutorialDef[] = [flujoPiano, flujoProyectos]
