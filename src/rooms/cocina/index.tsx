import type { RoomModule, EsquemaCaptura } from '../../core/registry'
import { vTexto, vNumero, vFecha } from '../../core/registry'
import type { MomentoComida } from '../../core/data/db'
import { aguaRepo, comidasRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import { CocinaApp } from './CocinaApp'

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean))

  // Registro de agua: "tomé 2 vasos", "bebí 500ml", "agua 1 litro", "1.5l de agua"
  const esAgua = ['agua', 'vaso', 'vasos', 'ml', 'litro', 'litros', 'tome', 'bebi', 'hidrate', 'tomar'].some((k) => tokens.has(k))
  if (esAgua) {
    // Detecta ml directamente
    const mlMatch = norm.match(/(\d+(?:\.\d+)?)\s*ml/)
    // Detecta litros
    const litrosMatch = norm.match(/(\d+(?:\.\d+)?)\s*l(?:itros?)?/)
    // Detecta vasos (aprox 240ml c/u)
    const vasosMatch = norm.match(/(\d+)\s*vasos?/)

    let ml = mlMatch
      ? parseFloat(mlMatch[1])
      : litrosMatch
      ? parseFloat(litrosMatch[1]) * 1000
      : vasosMatch
      ? parseInt(vasosMatch[1]) * 240
      : 0

    if (ml > 0) {
      await aguaRepo.add({ fecha: new Date().toISOString().slice(0, 10), ml })
      return true
    }
  }

  // Registro de comida rápido: detecta momento + nombre aproximado
  const MOMENTOS: [string[], string][] = [
    [['desayuno', 'desayune', 'desayunar'], 'desayuno'],
    [['comida', 'almuerzo', 'almorce', 'comi', 'comer'], 'comida'],
    [['cena', 'cene', 'cenar'], 'cena'],
    [['snack', 'colacion', 'merienda', 'botana'], 'snack'],
  ]

  let momento: 'desayuno' | 'comida' | 'cena' | 'snack' | null = null
  for (const [claves, m] of MOMENTOS) {
    if (claves.some((k) => tokens.has(k))) {
      momento = m as 'desayuno' | 'comida' | 'cena' | 'snack'
      break
    }
  }

  const calMatch = norm.match(/(\d+)\s*(?:cal(?:orias?)?|kcal)/)
  if (momento && calMatch) {
    await comidasRepo.add({
      fecha: new Date().toISOString().slice(0, 10),
      momento,
      nombre: texto.slice(0, 80),
      calorias: parseInt(calMatch[1]),
      proteinas: 0,
      carbohidratos: 0,
      grasas: 0,
      nota: texto,
    })
    return true
  }

  return false
}

const MOMENTOS_VALIDOS = new Set<string>(['desayuno', 'comida', 'cena', 'snack'])

const esquemas: EsquemaCaptura[] = [
  {
    id: 'comida',
    descripcion: 'Algo que el usuario comió: una comida, platillo o alimento.',
    campos: [
      { campo: 'nombre', tipo: 'texto', descripcion: 'Nombre del platillo o alimento', requerido: true },
      { campo: 'momento', tipo: 'opcion', opciones: ['desayuno', 'comida', 'cena', 'snack'], descripcion: 'Momento del día en que lo comió', requerido: true },
      { campo: 'calorias', tipo: 'numero', descripcion: 'Calorías estimadas (kcal); estima si no se mencionan' },
      { campo: 'proteinas', tipo: 'numero', descripcion: 'Gramos de proteína estimados' },
      { campo: 'carbohidratos', tipo: 'numero', descripcion: 'Gramos de carbohidratos estimados' },
      { campo: 'grasas', tipo: 'numero', descripcion: 'Gramos de grasa estimados' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const m = vTexto(v.momento, 'comida')
      await comidasRepo.add({
        fecha: vFecha(v.fecha),
        momento: (MOMENTOS_VALIDOS.has(m) ? m : 'comida') as MomentoComida,
        nombre: vTexto(v.nombre, 'Comida'),
        calorias: vNumero(v.calorias),
        proteinas: vNumero(v.proteinas),
        carbohidratos: vNumero(v.carbohidratos),
        grasas: vNumero(v.grasas),
      })
    },
  },
  {
    id: 'agua',
    descripcion: 'Agua que el usuario bebió.',
    campos: [
      { campo: 'ml', tipo: 'numero', descripcion: 'Mililitros (1 vaso ≈ 240 ml, 1 litro = 1000 ml)', requerido: true },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const ml = vNumero(v.ml)
      if (ml > 0) await aguaRepo.add({ fecha: vFecha(v.fecha), ml })
    },
  },
]

const cocina: RoomModule = {
  id: 'cocina',
  nombre: 'Cocina · Nutrición',
  icon: '🍳',
  categoria: 'cuerpo',
  posicion: [-9, 0, -6],
  color: '#f59e0b',
  App: CocinaApp,
  capturar,
  esquemas,
}

export default cocina
