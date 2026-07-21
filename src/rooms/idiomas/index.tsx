import type { EsquemaCaptura, RoomModule } from '../../core/registry'
import { vFecha, vNumero, vTexto } from '../../core/registry'
import {
  idiomasRepo,
  registrarRepasoDia,
  repasosIdiomaRepo,
  tarjetasIdiomaRepo,
} from '../../core/data/repository'
import type { TipoTarjeta } from '../../core/data/db'
import { IdiomasApp } from './IdiomasApp'
import { tutorialIdiomas } from './tutorial'
import { COLOR, NIVELES, TIPOS_TARJETA } from './constantes'
import { tarjetasVencidas } from './srs'
import { hoyISO } from './stats'

const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')
const normalizar = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(DIACRITICOS, '')

/**
 * Perfil cuyo nombre o código casa con el texto ("inglés", "en-US"…). Sin
 * mención y con UN solo idioma registrado, se asume ese; con varios, nada.
 */
async function perfilPorNombre(texto: string) {
  const lista = await idiomasRepo.list()
  const clave = normalizar(texto)
  if (!clave) return lista.length === 1 ? lista[0] : undefined
  return (
    lista.find((i) => normalizar(i.nombre) === clave || i.codigo.toLowerCase() === clave) ??
    lista.find((i) => normalizar(i.nombre).includes(clave) || clave.includes(normalizar(i.nombre))) ??
    (lista.length === 1 ? lista[0] : undefined)
  )
}

/** Quick-capture sin IA: "vocab inglés: dog = perro" (o "palabra francés: …"). */
async function capturar(texto: string): Promise<boolean> {
  const m = /^(?:vocab(?:ulario)?|palabra)\s+([^:]+):\s*(.+?)\s*=\s*(.+)$/i.exec(texto.trim())
  if (!m) return false
  const perfil = await perfilPorNombre(m[1])
  if (!perfil?.id) return false
  await tarjetasIdiomaRepo.add({
    idiomaId: perfil.id,
    termino: m[2].trim(),
    traduccion: m[3].trim(),
    tipo: 'palabra',
    nivel: perfil.nivel,
    caja: 0,
    proximaISO: hoyISO(),
    fuente: 'manual',
    creadoEn: new Date().toISOString(),
  })
  return true
}

/** Esquemas para el asistente global: tarjetas de vocabulario y práctica del día. */
const esquemas: EsquemaCaptura[] = [
  {
    id: 'tarjeta',
    descripcion:
      'Guarda una tarjeta de vocabulario cuando el usuario aprende una palabra, frase o expresión de un idioma que estudia ("apunta que serendipity es serendipia", "aprendí a decir bonjour").',
    campos: [
      {
        campo: 'idioma',
        tipo: 'texto',
        descripcion: 'Idioma al que pertenece el término (ej. inglés, francés); omitir si no se menciona',
      },
      { campo: 'termino', tipo: 'texto', descripcion: 'La palabra, frase o expresión en el idioma objetivo', requerido: true },
      { campo: 'traduccion', tipo: 'texto', descripcion: 'Su traducción al español', requerido: true },
      { campo: 'ejemplo', tipo: 'texto', descripcion: 'Frase de ejemplo en el idioma que use el término, si se menciona' },
      {
        campo: 'tipo',
        tipo: 'opcion',
        opciones: TIPOS_TARJETA.map((x) => x.id),
        descripcion: 'palabra = término suelto, frase = oración completa, expresion = modismo o frase hecha',
      },
      {
        campo: 'nivel',
        tipo: 'opcion',
        opciones: NIVELES,
        descripcion: 'Nivel MCER estimado del término (omitir si no es claro)',
      },
    ],
    guardar: async (v) => {
      const termino = vTexto(v.termino)
      const traduccion = vTexto(v.traduccion)
      if (!termino || !traduccion) return
      const perfil = await perfilPorNombre(vTexto(v.idioma))
      if (!perfil?.id) return
      const tipo = TIPOS_TARJETA.some((x) => x.id === v.tipo) ? (v.tipo as TipoTarjeta) : 'palabra'
      await tarjetasIdiomaRepo.add({
        idiomaId: perfil.id,
        termino,
        traduccion,
        ejemplo: vTexto(v.ejemplo) || undefined,
        tipo,
        nivel: NIVELES.includes(vTexto(v.nivel)) ? vTexto(v.nivel) : perfil.nivel,
        caja: 0,
        proximaISO: hoyISO(),
        fuente: 'ia',
        creadoEn: new Date().toISOString(),
      })
    },
  },
  {
    id: 'practica',
    descripcion:
      'Registra práctica de un idioma cuando el usuario dice que estudió o repasó ("repasé inglés", "practiqué 20 tarjetas de francés").',
    campos: [
      { campo: 'idioma', tipo: 'texto', descripcion: 'Idioma practicado; omitir si no se menciona' },
      { campo: 'repasos', tipo: 'numero', descripcion: 'Cuántas tarjetas o ejercicios repasó (1 si no se dice)' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const perfil = await perfilPorNombre(vTexto(v.idioma))
      if (!perfil?.id) return
      const n = Math.max(1, Math.round(vNumero(v.repasos, 1)))
      await registrarRepasoDia(perfil.id, vFecha(v.fecha), n)
    },
  },
]

const idiomas: RoomModule = {
  id: 'idiomas',
  nombre: 'Idiomas',
  icon: '🌐',
  categoria: 'mente',
  posicion: [3, 0, -6],
  color: COLOR,
  App: IdiomasApp,
  tutorial: tutorialIdiomas,
  capturar,
  esquemas,
  // El único objetivo que no hay que inventar: lo pone el SRS. La meta se cumple
  // cuando no queda ninguna tarjeta vencida.
  metaDiaria: {
    clave: 'idiomas.metaDiaria',
    etiquetaEs: 'Repaso de hoy',
    unidad: 'tarjetas',
    seccion: 'repaso',
    del: async (fecha) => {
      const vencidas = tarjetasVencidas(await tarjetasIdiomaRepo.list(), fecha).length
      const hecho = (await repasosIdiomaRepo.list())
        .filter((r) => r.fecha === fecha)
        .reduce((s, r) => s + r.repasos, 0)
      // El objetivo es lo que tocaba repasar hoy: lo ya repasado MÁS lo que sigue
      // vencido. Contar solo las vencidas lo haría bajar conforme avanzas y llegaría
      // a 0 (= meta apagada) justo al terminarlas, que es cuando debe darse por
      // cumplida. Sin tarjetas ni idiomas, 0 = no hay nada que repasar, y así se dice.
      return { hecho, objetivo: hecho + vencidas }
    },
  },
  comandos: [
    { seccion: 'charlas', etiqueta: 'Tutor', nombres: ['tutor', 'tutor de idiomas'] },
    { seccion: 'repaso', etiqueta: 'Repaso', nombres: ['repaso', 'tarjetas', 'repasar tarjetas'] },
    { seccion: 'vocabulario', etiqueta: 'Vocabulario', nombres: ['vocabulario'] },
    { seccion: 'temario', etiqueta: 'Temario', nombres: ['temario'] },
    { seccion: 'progreso', etiqueta: 'Progreso', nombres: ['progreso de idiomas'] },
  ],
}

export default idiomas
