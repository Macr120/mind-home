import type { Plantilla } from '../../core/appContrato'
import { lazy } from 'react'
import { calculosComputoRepo, formulasRepo, hojasRepo, objetivoDiarioDe } from '../../core/data/repository'
import { esSeedIntacta } from '../../core/data/sync/syncables'
import { fechaLocalISO } from '../../core/fechaLocal'
import { registrarProveedorMaterial } from '../../core/materialApps'
import { COLOR_FABRICA, COLS_INICIO, FILAS_INICIO } from './constantes'
import { OPERACIONES_IA } from './costosIA'
import { esencialComputo, flujosComputo } from './tutorial.meta'
import { planMetasComputo } from './plan'

// Las hojas se pueden enlazar desde otras apps (la enciclopedia de Biblioteca
// las usa de material de estudio). Se registra aquí y no en `HojasTab` porque
// este módulo sí es eager: el enlace tiene que existir sin abrir el cuarto.
registrarProveedorMaterial({
  tipo: 'hoja',
  appId: 'computo',
  seccion: 'hojas',
  crear: async (nombre) => {
    const ahora = new Date().toISOString()
    return hojasRepo.add({
      nombre,
      celdas: {},
      filas: FILAS_INICIO,
      cols: COLS_INICIO,
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
  },
  nombre: async (id) => (await hojasRepo.list()).find((h) => h.id === id)?.nombre ?? null,
  listar: async () =>
    (await hojasRepo.list())
      .filter((h) => h.id != null)
      .map((h) => ({ id: h.id!, nombre: h.nombre })),
  // Sin `generar`: una hoja de cálculo se llena calculando, no redactando, así
  // que desde la entrada solo se crea vacía o se enlaza una que ya tengas.
  Vista: lazy(() => import('./VistaHoja')),
})

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo sí es eager: lo usa
// el núcleo sin abrir el cuarto — y por eso NADIE de aquí puede importar
// `motor.ts`, que arrastraría mathjs y KaTeX al bundle inicial.
const ComputoApp = lazy(() => import('./ComputoApp').then((m) => ({ default: m.ComputoApp })))

const computo: Plantilla = {
  id: 'computo',
  nombre: 'Cómputo · Calculadora y hojas',
  icon: '🧮',
  categoria: 'mente',
  color: COLOR_FABRICA,
  App: ComputoApp,
  esencial: esencialComputo,
  flujos: flujosComputo,
  planMetas: planMetasComputo,
  operacionesIA: OPERACIONES_IA,
  // Un día de cómputo es «resolviste algo»: un cálculo del historial, una
  // fórmula nueva o una hoja tocada. El núcleo lo cuenta desde `FUENTES`.
  metaDiaria: {
    clave: 'computo.meta.calculos',
    etiquetaEs: 'Resolver algo',
    unidad: 'cálculos',
    seccion: 'calculadora',
    ajustable: true,
    // Las fórmulas que la app trae puestas no cuentan (ver `esSeedIntacta`):
    // entrar al cuarto por primera vez no es haber resuelto nada.
    del: async (fecha) => ({
      hecho:
        (await calculosComputoRepo.list()).filter((c) => c.fecha === fecha).length +
        (await formulasRepo.list()).filter((f) => f.fecha === fecha && !esSeedIntacta(f)).length,
      objetivo: await objetivoDiarioDe('computo', 1),
    }),
  },
  comandos: [
    {
      seccion: 'formulario',
      etiqueta: 'Formulario',
      nombres: ['formulario', 'formulas', 'mis formulas', 'libro de formulas'],
    },
    {
      seccion: 'calculadora',
      etiqueta: 'Calculadora',
      nombres: ['calculadora', 'calculadora cientifica', 'calcular'],
    },
    {
      seccion: 'grafica',
      etiqueta: 'Graficador',
      nombres: ['graficador', 'graficar', 'grafica una funcion', 'grafica'],
    },
    {
      seccion: 'ecuacion',
      etiqueta: 'Resolver ecuación',
      nombres: ['resolver ecuacion', 'resuelve la ecuacion', 'despejar', 'raices'],
    },
    {
      seccion: 'hojas',
      etiqueta: 'Hojas de cálculo',
      nombres: ['hoja de calculo', 'hojas de calculo', 'hoja', 'hojas'],
    },
    // Los modos de la calculadora. Sus ids son los de `modos.ts`: `esModo()`
    // los reconoce y `destinoInicial()` abre la calculadora ya puesta en ese.
    {
      seccion: 'bases',
      etiqueta: 'Bases (binario y hexadecimal)',
      nombres: ['binario', 'hexadecimal', 'octal', 'bases', 'sistema de numeracion', 'convertir a binario'],
    },
    {
      seccion: 'matrices',
      etiqueta: 'Matrices',
      nombres: ['matrices', 'matriz', 'determinante', 'multiplicar matrices', 'matriz inversa'],
    },
    {
      seccion: 'sistemas',
      etiqueta: 'Sistemas de ecuaciones',
      nombres: ['sistema de ecuaciones', 'sistemas de ecuaciones', 'dos ecuaciones', 'ecuaciones simultaneas'],
    },
    {
      seccion: 'unidades',
      etiqueta: 'Conversión de unidades',
      nombres: ['convertir unidades', 'conversor', 'conversion de unidades', 'unidades', 'convertir'],
    },
    {
      seccion: 'propina',
      etiqueta: 'Cuenta con propina',
      nombres: ['propina', 'la cuenta', 'dividir la cuenta', 'cuanto de propina'],
    },
    {
      seccion: 'regla3',
      etiqueta: 'Regla de tres',
      nombres: ['regla de tres', 'regla de 3', 'proporcion'],
    },
  ],
  esquemas: [
    {
      id: 'calculo',
      descripcion: 'Una operación resuelta y guardada en el historial de la calculadora.',
      campos: [
        { campo: 'entrada', tipo: 'texto', descripcion: 'La expresión tal cual se calculó.', requerido: true },
        { campo: 'salida', tipo: 'texto', descripcion: 'El resultado ya formateado.' },
      ],
      async guardar(valores) {
        const { anotarCalculo } = await import('../../core/data/repository')
        const entrada = typeof valores.entrada === 'string' ? valores.entrada : ''
        if (!entrada) return
        const salida = typeof valores.salida === 'string' ? valores.salida : ''
        const ahora = new Date().toISOString()
        await anotarCalculo({ tipo: 'calculo', entrada, salida, fecha: fechaLocalISO(), creadoEn: ahora })
      },
    },
  ],
}

export default computo
