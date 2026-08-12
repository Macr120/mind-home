import { lazy, Suspense, useState } from 'react'
import { getPlantilla } from '../registry'
import { costoDieta, costoReceta } from '../../rooms/cocina/costosIA'
import { costoOp } from '../cuenta/costos'
import { useAjustes } from '../state/ajustesStore'
import { useT } from '../i18n/useT'
import { useManualTraducido } from './manualI18n'
import { Creditos } from '../ui/Creditos'
import { Icono } from '../ui/iconos/Icono'
// La tabla de precios solo se descarga al desplegar su carpeta.
const EditorIASection = lazy(() =>
  import('../ui/editor/EditorIASection').then((m) => ({ default: m.EditorIASection })),
)

/**
 * Manual de comandos del "arquitecto": referencia ordenada de lo que se le puede
 * pedir por chat, agrupada POR APLICACIÓN (una carpeta por app, con sus grupos
 * Registrar / Abrir y menús / Jugar / Acciones / Con IA) más las carpetas del
 * mapa exterior, la casa/editor y el asistente. Cada ejemplo es clicable
 * (rellena la barra de chat) y va coloreado con un marcado ligero:
 *   [palabra]  → la orden fija que el arquitecto reconoce (azul)
 *   {palabra}  → la parte que el usuario puede cambiar a su gusto (ámbar)
 * Cada frase tiene su versión inglesa (`en`) y se muestra según el idioma de la
 * app. El parser sin IA entiende español: en inglés, la mayoría de los ejemplos
 * los resuelve la capa de IA (los grupos «Con IA» la requieren en ambos idiomas:
 * son las funciones que de verdad gastan una llamada al modelo, nunca atajos
 * deterministas).
 */

interface Ejemplo {
  /** Frase con marcado [orden]/{variable}; se envía sin marcado al chat. */
  frase: string
  /** La misma frase en inglés (se muestra cuando la app está en inglés). */
  en: string
  /** App/cuarto que registra la frase (su ícono ilustra el ejemplo). */
  roomId?: string
  /**
   * Créditos que cuesta pedirlo, para las frases caras (las que encadenan
   * varias llamadas o generan imágenes). Solo se pinta en el plan por cuenta.
   */
  creditos?: number
}

/** Sub-apartado dentro de una carpeta (rótulos genéricos reutilizables). */
interface Grupo {
  /** Rótulo: clave chat.manual.grupo.<id>. */
  id: 'registrar' | 'abrir' | 'jugar' | 'acciones' | 'ia'
  ejemplos: Ejemplo[]
}

/** Atajo de teclado: no se envía al chat, solo se consulta (carpeta «Teclado»). */
interface Atajo {
  teclas: string
  /** Nombre de la tecla en inglés, solo si cambia (Mayús → Shift). */
  teclasEn?: string
  accion: string
  /** La misma acción en inglés. */
  en: string
}

interface Carpeta {
  /** Id de plantilla si la carpeta ES una app (ícono y título salen del registry). */
  appId?: string
  /** Emoji e id/título propios para carpetas que no son una app. */
  icon?: string
  id: string
  titulo?: string
  /** Descripción de la carpeta y valores disponibles (gris). */
  nota?: string
  /** Requisito importante (ámbar). */
  aviso?: string
  /** Teclas de PC de la carpeta (se listan antes de los ejemplos, sin ser clicables). */
  atajos?: Atajo[]
  grupos: Grupo[]
}

interface Seccion {
  /** Clave chat.manual.seccion.<id>. */
  id: 'apps' | 'mapa' | 'casa' | 'asistente'
  titulo: string
  nota?: string
  carpetas: Carpeta[]
}

const AVISO_INFRA =
  'Las órdenes de construir abren un editor a pantalla completa: el chat se cierra hasta que salgas con ✕. Las acciones de cuidado funcionan sin salir del chat.'

const SECCIONES: Seccion[] = [
  {
    id: 'apps',
    titulo: 'Apps de la casa',
    nota: 'Cada app registra lo suyo con tus palabras (usa @app para forzar el destino) y sus menús se abren por su nombre. Los ejemplos «Con IA» siempre gastan una llamada de IA (plan Pro o tu clave); tus plantillas propias también capturan por chat con IA y se abren por su nombre.',
    carpetas: [
      {
        appId: 'cocina',
        id: 'cocina',
        nota: 'Con IA también entiende la foto de tu platillo (la registra estimando macros). Las recetas y dietas que pidas por chat llegan con su imagen: tardan un poco más en aparecer y cuestan los créditos marcados.',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: '[Comí] {pollo con arroz} en la {cena}', en: '[I ate] {chicken with rice} for {dinner}' },
              { frase: '[Tomé] {2 vasos} de [agua]', en: '[I drank] {2 glasses} of [water]' },
              { frase: '[Me pesé]: {74 kg}', en: '[I weighed myself]: {74 kg}' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] el {recetario}', en: '[Open] the {recipe book}' },
              { frase: '[Abre] la {lista del súper}', en: '[Open] the {shopping list}' },
              { frase: '[Abre] el {diario de comidas}', en: '[Open] the {food diary}' },
              { frase: '[Abre] la {dieta}', en: '[Open] the {diet}' },
              { frase: '[Abre] las {metas de nutrición}', en: '[Open] the {nutrition goals}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              {
                frase: 'Inventa una [receta] {ligera con atún}',
                en: 'Make up a [recipe] {light, with tuna}',
                creditos: costoReceta(true),
              },
              {
                frase: 'Arma una [dieta] {alta en proteína}',
                en: 'Build a [diet] {high in protein}',
                creditos: costoDieta(true),
              },
              { frase: 'Agrega {plátano y avena} a la [lista del súper]', en: 'Add {bananas and oats} to the [shopping list]' },
            ],
          },
        ],
      },
      {
        appId: 'ejercicio',
        id: 'ejercicio',
        nota: 'Con IA: plan de entrenamiento en su Cronograma (botón ✨) e imágenes ilustrativas de los ejercicios dentro de la app.',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: '[Entrené] {pierna} {45 min}', en: '[I trained] {legs} {45 min}' },
              { frase: '[Corrí] {5 km}', en: '[I ran] {5 km}' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] el {plan de ejercicio}', en: '[Open] the {workout plan}' },
              { frase: '[Abre] {fuerza}', en: '[Open] {strength}' },
              { frase: '[Abre] {cardio}', en: '[Open] {cardio}' },
              { frase: '[Abre] {flexibilidad}', en: '[Open] {flexibility}' },
              { frase: '[Abre] las {metas de ejercicio}', en: '[Open] the {workout goals}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              { frase: 'Registra mi sesión: {crossfit 40 min, intensidad alta}', en: 'Log my session: {crossfit 40 min, high intensity}' },
            ],
          },
        ],
      },
      {
        appId: 'descanso',
        id: 'descanso',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: '[Dormí] {7 horas}, calidad {4/5}', en: '[I slept] {7 hours}, quality {4/5}' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] el {despertador}', en: '[Open] the {alarm clock}' },
              { frase: '[Abre] {mi sueño}', en: '[Open] {my sleep}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              { frase: '{Me acosté a las 23, desperté a las 7 y me levanté 2 veces}', en: '{Went to bed at 23, woke up at 7, got up twice}' },
            ],
          },
        ],
      },
      {
        appId: 'anecdotario',
        id: 'anecdotario',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: '[Recuerdo]: {tarde de juegos con mi hermana}', en: '[Memory]: {board-game evening with my sister}' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] mis {anécdotas}', en: '[Open] my {stories}' },
              { frase: '[Abre] el {calendario de ánimo}', en: '[Open] the {mood calendar}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              { frase: 'Anota esta anécdota: {hoy celebramos el cumple de mamá}', en: "Save this memory: {we celebrated mom's birthday today}" },
            ],
          },
        ],
      },
      {
        appId: 'despacho',
        id: 'despacho',
        nota: 'Con IA también puedes adjuntar la foto de un ticket: registra el gasto.',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: '[Gasté] {500} en {el súper}', en: '[I spent] {500} on {groceries}' },
              { frase: '[Cobré] {8000} de {la quincena}', en: '[I got paid] {8000} {this fortnight}' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] el {balance}', en: '[Open] the {balance}' },
              { frase: '[Abre] los {gastos fijos}', en: '[Open] the {fixed expenses}' },
              { frase: '[Abre] los {movimientos}', en: '[Open] the {transactions}' },
              { frase: '[Abre] las {metas de ahorro}', en: '[Open] the {savings goals}' },
              { frase: '[Abre] las {divisas}', en: '[Open] {forex}' },
              { frase: '[Abre] las {criptomonedas}', en: '[Open] {cryptocurrencies}' },
              { frase: '[Abre] las {materias primas}', en: '[Open] {commodities}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              { frase: '{Pagué 250 de luz y 180 de agua}', en: '{I paid 250 for power and 180 for water}' },
            ],
          },
        ],
      },
      {
        appId: 'computo',
        id: 'computo',
        nota: 'El formulario y el graficador cuelgan de la calculadora, y trae Matemáticas, Física y Química de fábrica; cualquiera de esas fórmulas se edita. Dentro de la sala, la IA escribe fórmulas, explica paso a paso, arma hojas y lee los datos que selecciones.',
        grupos: [
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] el {formulario}', en: '[Open] the {formula book}' },
              { frase: '[Abre] la {calculadora}', en: '[Open] the {calculator}' },
              { frase: '[Abre] el {graficador}', en: '[Open] the {plotter}' },
              { frase: '[Abre] las {hojas de cálculo}', en: '[Open] the {spreadsheets}' },
              { frase: '[Resolver ecuación]', en: '[Solve equation]' },
            ],
          },
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Convertir unidades]', en: '[Convert units]' },
              { frase: '[Abre] las {matrices}', en: '[Open] {matrices}' },
              { frase: '[Sistema de ecuaciones]', en: '[System of equations]' },
              { frase: '[Convertir a binario]', en: '[Convert to binary]' },
              { frase: '[Propina]', en: '[Tip]' },
              { frase: '[Regla de tres]', en: '[Rule of three]' },
            ],
          },
        ],
      },
      {
        appId: 'biblioteca',
        id: 'biblioteca',
        nota: 'Dentro viven el Sabio (charlas con IA), el destilado a entradas wiki y los subtemas del árbol.',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: '[Estudié] {historia romana} {30 min}', en: '[I studied] {Roman history} {30 min}' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] las {charlas}', en: '[Open] the {chats}' },
              { frase: '[Abre] la {enciclopedia}', en: '[Open] the {encyclopedia}' },
              { frase: '[Abre] la {sesión de estudio}', en: '[Open] the {study session}' },
              { frase: '[Abre] el {resumen de estudio}', en: '[Open] the {study summary}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              { frase: 'Apunta que aprendí: {los ríos de Europa}', en: 'Note what I learned: {the rivers of Europe}' },
            ],
          },
        ],
      },
      {
        appId: 'entretenimiento',
        id: 'entretenimiento',
        nota: 'Juegos de la mesa: viborita, tetris, ajedrez, damas, sudoku, memorama, pong, hockey, simón, cuatro en línea, space, dino…',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: '[Vi la película] {Dune}', en: '[I watched the movie] {Dune}' },
              { frase: '[Jugué] {ajedrez} con mi hermano', en: '[I played] {chess} with my brother' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] el {archivo}', en: '[Open] the {archive}' },
              { frase: '[Abre] la {mesa de juegos}', en: '[Open] the {game table}' },
            ],
          },
          {
            id: 'jugar',
            ejemplos: [
              { frase: '[Quiero jugar] la {viborita}', en: '[I want to play] {snake}' },
              { frase: '[Juega] {tetris}', en: '[Play] {tetris}' },
              { frase: '[Juega] una partida de {ajedrez}', en: '[Play] a game of {chess}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              { frase: 'Apunta {la serie Dark} como pendiente', en: 'Add {the show Dark} to my watchlist' },
            ],
          },
        ],
      },
      {
        appId: 'sala',
        id: 'sala',
        nota: 'Con IA, los lugares nuevos se geocodifican solos y aparecen como pin en el mapamundi.',
        grupos: [
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] el {mapamundi}', en: '[Open] the {world map}' },
              { frase: '[Abre] {por conocer}', en: '[Open] the {wish list}' },
              { frase: '[Abre] las {rutas}', en: '[Open] the {routes}' },
              { frase: '[Abre] la {bitácora de viajes}', en: '[Open] the {travel log}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              { frase: '[Visité] {Oaxaca}', en: '[I visited] {Oaxaca}' },
              { frase: 'Quiero conocer {Japón}', en: 'I want to visit {Japan}' },
              { frase: '[Visité] {Roma}: {la fontana de noche es mágica}', en: '[I visited] {Rome}: {the fountain at night is magical}' },
            ],
          },
        ],
      },
      {
        appId: 'jardin',
        id: 'jardin',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: '[Medité] {10 min}', en: '[I meditated] {10 min}' },
              { frase: '[@]{jardin} [agradezco] {mi salud, mi familia y el café}', en: '[@]{jardin} [grateful for] {my health, my family and coffee}' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] la {meditación}', en: '[Open] {meditation}' },
              { frase: '[Abre] la {respiración}', en: '[Open] {breathing}' },
              { frase: '[Abre] los {agradecimientos}', en: '[Open] {gratitude}' },
            ],
          },
        ],
      },
      {
        appId: 'garage',
        id: 'garage',
        nota: 'Los vehículos que se montan (bici, moto, auto, OVNI) están en «Personaje y paseos».',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: 'Cambié el [aceite] del {auto}', en: 'Changed the [oil] on the {car}' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] el {resumen del garage}', en: '[Open] the {garage summary}' },
              { frase: '[Abre] {mis vehículos}', en: '[Open] {my vehicles}' },
            ],
          },
        ],
      },
      {
        appId: 'diario',
        id: 'diario',
        nota: 'Las secciones culturales de las efemérides y el reparto por asistentes usan IA dentro de la app.',
        grupos: [
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] los {titulares}', en: '[Open] the {headlines}' },
              { frase: '[Abre] las {efemérides}', en: '[Open] {on this day}' },
            ],
          },
        ],
      },
      {
        appId: 'hobbies',
        id: 'hobbies',
        nota: 'Cada hobby y cada proyecto tienen su propio cronograma de metas, con plan por IA (✨) y fotos de avance.',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: 'Avancé en mi [proyecto] de {acuarela} {40 min}', en: 'Made progress on my {watercolor} [project] {40 min}' },
              { frase: 'Practiqué {guitarra} {25 min}', en: 'I practiced {guitar} {25 min}' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] {mis hobbies}', en: '[Open] {my hobbies}' },
            ],
          },
        ],
      },
      {
        appId: 'ideas',
        id: 'ideas',
        nota: 'Dentro de la app: 7 formatos (mental, árbol, llaves, círculo, flujo, Venn y comparación). La IA dibuja el mapa entero desde un tema o amplía el nodo o la región que elijas. Sin IA, el chat crea el mapa en blanco con tu tema de raíz.',
        grupos: [
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] mis {mapas mentales}', en: '[Open] my {mind maps}' },
              { frase: '[Abre] los {mapas conceptuales}', en: '[Open] the {concept maps}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              { frase: '[Hazme un mapa mental] de {la fotosíntesis}', en: '[Make me a mind map] of {photosynthesis}' },
              { frase: '[Dibuja un diagrama de flujo] de {cómo hacer pan}', en: '[Draw a flowchart] of {how to bake bread}' },
              { frase: '[Compara] {café} y {té} en un mapa', en: '[Compare] {coffee} and {tea} in a map' },
              { frase: '[Haz un esquema] de {lo que me acabas de explicar}', en: '[Make a diagram] of {what you just explained}' },
            ],
          },
        ],
      },
      {
        appId: 'agenda',
        id: 'agenda',
        nota: 'Tres secciones: Trabajo (pendientes y tablero), Salud (citas médicas y medicamentos) y Personas (tu libreta con cumpleaños). Lo que lleva fecha aparece solo en el calendario; con hora, además te avisa.',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: '[Agenda] una {junta con el cliente} el {martes a las 10}', en: '[Schedule] a {meeting with the client} on {Tuesday at 10}' },
              { frase: '[Apunta el pendiente] {mandar la cotización}', en: '[Add the to-do] {send the quote}' },
              { frase: '[Tengo cita] con el {dentista} el {14 a las 5}', en: '[I have an appointment] with the {dentist} on the {14th at 5}' },
              { frase: '[Recuérdame] tomar {ibuprofeno} a las {8 y a las 20}', en: '[Remind me] to take {ibuprofen} at {8 and 20}' },
              { frase: '[Guarda el contacto] de {Ana}: {5512345678}, cumple el {3 de mayo}', en: "[Save] {Ana}'s {contact}: {5512345678}, birthday {May 3}" },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] mis {pendientes}', en: '[Open] my {to-dos}' },
              { frase: '[Abre] mis {citas médicas}', en: '[Open] my {medical appointments}' },
              { frase: '[Abre] mis {contactos}', en: '[Open] my {contacts}' },
            ],
          },
        ],
      },
      {
        appId: 'idiomas',
        id: 'idiomas',
        nota: 'Dentro viven el tutor conversacional por nivel, las tarjetas desde la charla y las tarjetas por tema (IA).',
        grupos: [
          {
            id: 'registrar',
            ejemplos: [
              { frase: '[Vocab] {inglés}: {dog} = {perro}', en: '[Vocab] {spanish}: {perro} = {dog}' },
              { frase: '[Repasé] {francés} {15 min}', en: '[I reviewed] {french} {15 min}' },
            ],
          },
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] el {tutor}', en: '[Open] the {tutor}' },
              { frase: '[Abre] el {repaso}', en: '[Open] the {review}' },
              { frase: '[Abre] el {temario}', en: '[Open] the {syllabus}' },
              { frase: '[Abre] el {progreso de idiomas}', en: '[Open] the {language progress}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              { frase: 'Aprendí en {alemán}: {Hund} = {perro}', en: 'I learned in {german}: {Hund} = {dog}' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'mapa',
    titulo: 'Mapa exterior',
    nota: 'Huerto, granja, pistas y canchas viven fuera de los cuartos, sobre el mapa 3D.',
    carpetas: [
      {
        appId: 'huerto',
        id: 'huerto',
        nota: 'Cultivos: zanahoria, lechuga, girasol, tomate, maíz y calabaza.',
        aviso: AVISO_INFRA,
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Construye] un {huerto}', en: '[Build] a {vegetable garden}' },
              { frase: '[Quiero sembrar] {zanahorias}', en: '[I want to plant] {carrots}' },
              { frase: '[Siembra] {maíz} en el huerto', en: '[Plant] {corn} in the garden' },
              { frase: '[Pon] un {aspersor} en el huerto', en: '[Add] a {sprinkler} to the garden' },
              { frase: '[Riega] el {huerto}', en: '[Water] the {garden}' },
              { frase: '[Cosecha] el {huerto}', en: '[Harvest] the {garden}' },
              { frase: '[Llévame] al {huerto}', en: '[Take me] to the {garden}' },
            ],
          },
        ],
      },
      {
        appId: 'granja',
        id: 'granja',
        nota: 'Animales: gallina, cerdo, cabra, oveja, vaca y caballo. Se alimentan con lo cosechado en Comida. El que lleva mucho sin comer enferma y hay que curarlo; los corrales se limpian cada semana.',
        aviso: AVISO_INFRA,
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Haz] un {corral}', en: '[Make] a {pen}' },
              { frase: '[Pon] {vacas} en la granja', en: '[Put] {cows} on the farm' },
              { frase: '[Alimenta] a los {animales}', en: '[Feed] the {animals}' },
              { frase: '[Mima] a los {animales}', en: '[Pet] the {animals}' },
              { frase: '[Cura] a los {animales}', en: '[Heal] the {animals}' },
              { frase: '[Limpia] los {corrales}', en: '[Clean] the {pens}' },
              { frase: '[Llévame] a la {granja}', en: '[Take me] to the {farm}' },
            ],
          },
        ],
      },
      {
        appId: 'caminos',
        id: 'caminos',
        nota: 'Con la pista y la meta trazadas puedes correr contrarreloj o contra un asistente; al tren te subes desde la vía.',
        aviso: AVISO_INFRA,
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Pon] una {pista de carreras}', en: '[Add] a {race track}' },
              { frase: '[Traza] las {vías del tren}', en: '[Lay] the {train tracks}' },
              { frase: '[Construye] una {montaña rusa}', en: '[Build] a {roller coaster}' },
              { frase: '[Pon] la {meta} de la pista', en: '[Place] the track {finish line}' },
              { frase: '[Borra] la {pista}', en: '[Erase] the {track}' },
            ],
          },
          {
            id: 'jugar',
            ejemplos: [
              { frase: '[Corre una carrera] de {3 vueltas}', en: '[Run a race] of {3 laps}' },
              { frase: '[Hagamos una carrera] {contra} un asistente', en: "[Let's race] {against} an assistant" },
              { frase: '[Corre una carrera] {fácil} de {5 vueltas}', en: '[Run an] {easy} [race] of {5 laps}' },
              { frase: '[Quiero montar] el {tren}', en: '[I want to ride] the {train}' },
              { frase: '[Quiero montar] la {montaña rusa}', en: '[I want to ride] the {roller coaster}' },
              { frase: '[Llévame] a la {meta}', en: '[Take me] to the {finish line}' },
            ],
          },
        ],
      },
      {
        appId: 'paintball',
        id: 'paintball',
        nota: 'Modos: 1 vs 1, 2 vs 2 (necesita 3 asistentes) y batalla campal. Cada quien aguanta 3 bolazos y se juega en la planta baja.',
        grupos: [
          {
            id: 'jugar',
            ejemplos: [
              { frase: '[Juguemos] {paintball}', en: "[Let's play] {paintball}" },
              { frase: '[Juguemos paintball] {2v2}', en: "[Let's play paintball] {2v2}" },
              { frase: '[Reta] a {Luna} a un paintball {1v1}', en: '[Challenge] {Luna} to a {1v1} paintball match' },
              { frase: '[Paintball] campal en {difícil}', en: '{Hard} free-for-all [paintball]' },
              { frase: '[Sal] del {paintball}', en: '[Quit] the {paintball} match' },
            ],
          },
        ],
      },
      {
        appId: 'canchas',
        id: 'canchas',
        nota: 'En las canchas se juega caminando dentro; el balón se controla al acercarte.',
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Pon] una {cancha de fútbol}', en: '[Add] a {soccer field}' },
              { frase: '[Pon] una {cancha de tenis} {azul}', en: '[Add] a {blue} {tennis court}' },
              { frase: '[Crea] una {cancha de básquet}', en: '[Create] a {basketball court}' },
              { frase: '[Pon] un {campo de béisbol}', en: '[Add] a {baseball field}' },
              { frase: '[Llévame] a la {cancha}', en: '[Take me] to the {court}' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'casa',
    titulo: 'La casa y el editor',
    carpetas: [
      {
        // El calendario no es una app: vive en el reloj y reúne lo de todas.
        icon: '📅',
        id: 'calendario',
        titulo: 'Calendario',
        nota: 'Se abre desde el reloj de la casa. Reúne las metas y eventos de todas las apps; en Metas puedes pedir planes con IA (✨).',
        grupos: [
          {
            id: 'abrir',
            ejemplos: [
              { frase: '[Abre] la {agenda de hoy}', en: "[Open] {today's agenda}" },
              { frase: '[Abre] {mi semana}', en: '[Open] {my week}' },
              { frase: '[Abre] el {cronograma}', en: '[Open] the {timeline}' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              { frase: '[Crea una rutina] de mañana: {agua, estiramiento y gratitud} a las {7:00}', en: '[Create a routine] for mornings: {water, stretching and gratitude} at {7:00}' },
              { frase: '[Crea una rutina] de {lunes y miércoles}: {correr 20 min}', en: '[Create a routine] for {Mondays and Wednesdays}: {a 20 min run}' },
            ],
          },
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Enséñame] las {rutinas}', en: '[Show me] the {routines}' },
            ],
          },
        ],
      },
      {
        icon: '🚪',
        id: 'cuartos',
        titulo: 'Cuartos',
        nota: 'Crea, renombra y organiza los cuartos. «Elimina» borra el cuarto de la casa.',
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Crea un cuarto] llamado {Estudio}', en: '[Create a room] called {Studio}' },
              { frase: '[Renombra] la {cocina} a {Oficina}', en: '[Rename] the {kitchen} to {Office}' },
              { frase: '[Cambia el ícono] de la {cocina} a {🍳}', en: '[Change the icon] of the {kitchen} to {🍳}' },
              { frase: '[Pon] la {cocina} en categoría {cuerpo}', en: '[Set] the {kitchen} category to {cuerpo}' },
              { frase: '[Agrega] la {biblioteca} al mapa', en: '[Add] the {library} to the map' },
              { frase: '[Elimina] la {cocina}', en: '[Delete] the {kitchen}' },
              { frase: '[Abre] la {cocina}', en: '[Open] the {kitchen}' },
            ],
          },
        ],
      },
      {
        icon: '🎨',
        id: 'superficies',
        titulo: 'Color, piso y techo',
        nota: 'Colores: rojo, azul, verde… o un código #hex. Materiales de piso y formas de techo del catálogo del editor.',
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Pinta] la {cocina} de {azul}', en: '[Paint] the {kitchen} {blue}' },
              { frase: '[Piso] de la {cocina} de {madera}', en: '{Wood} [floor] for the {kitchen}' },
              { frase: '[Piso] de la {cocina} {rojo}', en: '{Red} [floor] for the {kitchen}' },
              { frase: '[Techo] de la {cocina} de {tejas rojas}', en: '{Red-tile} [roof] for the {kitchen}' },
              { frase: '[Techo a dos aguas] en la {cocina}', en: '[Gabled roof] on the {kitchen}' },
              { frase: '[Haz] la {cocina} {redonda}', en: '[Make] the {kitchen} {round}' },
            ],
          },
        ],
      },
      {
        icon: '📐',
        id: 'mapa',
        titulo: 'Mapa y estructura',
        nota: 'Lados: norte, sur, este y oeste (también arriba, abajo, izquierda o derecha).',
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Agranda] la {cocina}', en: '[Enlarge] the {kitchen}' },
              { frase: '[Encoge] la {cocina}', en: '[Shrink] the {kitchen}' },
              { frase: '[Mueve] la {cocina} a la {derecha}', en: '[Move] the {kitchen} to the {right}' },
              { frase: '[Abre el muro] {norte} de la {cocina}', en: '[Open the] {north} [wall] of the {kitchen}' },
              { frase: '[Pon una puerta] {corredera} en el muro {sur} de la {cocina}', en: '[Add a] {sliding} [door] on the {south} wall of the {kitchen}' },
              { frase: '[Pon] {ladrillo} en el muro {este} de la {cocina}', en: '[Set] {brick} on the {east} wall of the {kitchen}' },
              { frase: '[Haz más grueso] el muro {norte} de la {cocina}', en: '[Thicken] the {north} wall of the {kitchen}' },
              { frase: '[Apila] la {sala} sobre la {cocina}', en: '[Stack] the {living room} on top of the {kitchen}' },
              { frase: '[Agranda el mapa] hacia el {este}', en: '[Grow the map] to the {east}' },
            ],
          },
        ],
      },
      {
        icon: '🪑',
        id: 'objetos',
        titulo: 'Objetos',
        nota: 'Catálogo sin IA: lámpara, silla, mesa, planta, guitarra, alfombra, baúl, cuadro, pelota y libro. Cualquier otra cosa se genera con IA como modelo 3D y va a tu inventario. Las imágenes 2D se piden con «crea una imagen de…» y se quedan en el chat.',
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Crea] una {lámpara}', en: '[Create] a {lamp}' },
              { frase: '[Pinta el último objeto] de {rojo}', en: '[Paint the last object] {red}' },
              { frase: '[Gira el último objeto]', en: '[Rotate the last object]' },
              { frase: '[Haz el último objeto] más {grande}', en: '[Make the last object] {bigger}' },
              { frase: '[Agrupa los objetos] de la {cocina}', en: '[Group the objects] in the {kitchen}' },
              { frase: '[Quita el último objeto]', en: '[Remove the last object]' },
            ],
          },
          {
            id: 'ia',
            ejemplos: [
              // Por chat son DOS llamadas: el turno que lo interpreta y la
              // generación en sí.
              {
                frase: '[Genera en 3D] {un dragón morado}',
                en: '[Generate in 3D] {a purple dragon}',
                creditos: costoOp('chat') + costoOp('modelo3d'),
              },
              {
                frase: '[Genera en 3D] {una fuente de piedra} estilo {minimalista}',
                en: '[Generate in 3D] {a stone fountain}, {minimalist} style',
                creditos: costoOp('chat') + costoOp('modelo3d'),
              },
              {
                frase: '[Crea una imagen] de {un atardecer en la playa}',
                en: '[Create an image] of {a sunset at the beach}',
                creditos: costoOp('chat') + costoOp('imagen'),
              },
            ],
          },
        ],
      },
      {
        icon: '🧍',
        id: 'personaje',
        titulo: 'Personaje y paseos',
        nota: 'Prendas: sombrero, lentes… Partes: cabeza, torso y piernas. Vehículos: bici, moto, auto y OVNI (vuela con Space/Shift). Vistas: isométrica, tercera y primera persona (tecla V).',
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Ponme] {sombrero} {rojo}', en: '[Put on] a {red} {hat}' },
              { frase: '[Quítame] los {lentes}', en: '[Take off] my {glasses}' },
              { frase: '[Pinta el torso] del [avatar] de {verde}', en: '[Paint the] [avatar] [torso] {green}' },
              { frase: '[Haz el avatar] más {grande}', en: '[Make the avatar] {bigger}' },
              { frase: '[Móntame] en la {bici}', en: '[Get me on] the {bike}' },
              { frase: '[Quiero conducir] el {auto}', en: '[I want to drive] the {car}' },
              { frase: '[Bájame]', en: '[Get me off]' },
              { frase: '[Vista en] {primera persona}', en: '{First person} [view]' },
              { frase: '[Vista] {isométrica}', en: '{Isometric} [view]' },
            ],
          },
        ],
      },
      {
        icon: '⌨️',
        id: 'teclado',
        titulo: 'Teclado (PC)',
        nota: 'Atajos para jugar con teclado. No se escriben en el chat: se usan en la casa. No responden mientras escribes en un campo ni con un cuarto abierto.',
        atajos: [
          { teclas: 'W A S D', accion: 'Caminar (también con las flechas)', en: 'Walk (arrow keys too)' },
          { teclas: 'Mayús', teclasEn: 'Shift', accion: 'Correr (se queda puesto hasta volver a pulsar)', en: 'Run (stays on until you press again)' },
          { teclas: 'Espacio', teclasEn: 'Space', accion: 'Saltar', en: 'Jump' },
          { teclas: 'Ctrl', accion: 'Agacharse (mantener pulsado)', en: 'Crouch (hold)' },
          { teclas: 'E', accion: 'Lo que tengas delante: entrar al cuarto, subirte o bajarte del vehículo, cambiar de nivel', en: 'Whatever is in front of you: enter the room, get on or off the vehicle, change floor' },
          { teclas: '1 / 2', accion: 'Levantar la mano derecha / izquierda', en: 'Raise your right / left hand' },
          { teclas: '3', accion: 'Bailar', en: 'Dance' },
          { teclas: '4', accion: 'Mortal', en: 'Backflip' },
          { teclas: 'Q', accion: 'Abrir la rueda de herramientas', en: 'Open the tool wheel' },
          { teclas: 'T', accion: 'Abrir el chat y escribir', en: 'Open the chat and type' },
          { teclas: 'V', accion: 'Cambiar de vista: isométrica, tercera y primera persona', en: 'Switch view: isometric, third and first person' },
          { teclas: 'H', accion: 'Esconder o mostrar el HUD', en: 'Hide or show the HUD' },
          { teclas: 'Esc', accion: 'Cerrar lo que esté abierto', en: 'Close whatever is open' },
          { teclas: 'Espacio · Mayús', teclasEn: 'Space · Shift', accion: 'Conduciendo el OVNI: subir y bajar. En los demás vehículos, Espacio derrapa', en: 'Flying the UFO: up and down. In other vehicles, Space drifts' },
        ],
        grupos: [],
      },
      {
        icon: '🏠',
        id: 'interfaz',
        titulo: 'Casa e interfaz',
        nota: 'Tema de la casa, fondo del cielo, música ambiental y tu resumen Wrapped. Ambientes de música: calma, festivo, nocturno, chiptune, acogedor, energía, estudio, arcade, bosque, viaje, carrera y cajita.',
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Cambia el tema] a {navidad}', en: '[Change the theme] to {christmas}' },
              { frase: '[Fondo] {nieve}', en: '{Snow} [background]' },
              { frase: '[Quita el tema]', en: '[Remove the theme]' },
              { frase: '[Pon música] {relajante}', en: '[Play] {chill} [music]' },
              { frase: '[Música] {chiptune}', en: '[Music] {chiptune}' },
              { frase: '[Volumen] al {40%}', en: '[Volume] at {40%}' },
              { frase: '[Apaga la música]', en: '[Turn off the music]' },
              { frase: '[Abre] mi {resumen semanal}', en: '[Open] my {weekly recap}' },
              { frase: '[Abre] mi {resumen mensual}', en: '[Open] my {monthly recap}' },
            ],
          },
        ],
      },
      {
        icon: '⚙️',
        id: 'configuraciones',
        titulo: 'Configuraciones',
        nota: 'Lo mismo que la pestaña Configuraciones del editor: idioma, apariencia (claro, oscuro, transparente), estilo de iconos, tema y tipografía de la interfaz, vidrio de los paneles, estilo visual del mapa (normal, cómic, miniatura, retro, neón) con sus efectos, avisos y respaldo.',
        aviso: 'Iniciar sesión, restaurar un respaldo y borrar los datos NO se hacen por chat: el asistente te abre esa sección para que lo confirmes tú.',
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Modo] {oscuro}', en: '{Dark} [mode]' },
              { frase: '[Apariencia] {transparente}', en: '{Transparent} [appearance]' },
              { frase: '[Cambia el idioma] a {inglés}', en: '[Switch the language] to {Spanish}' },
              { frase: '[Tema de interfaz] {neón}', en: '[UI theme] {neon}' },
              { frase: '[Tipografía] {serif}', en: '[Font] {serif}' },
              { frase: '[Pon iconos] {profesionales}', en: '[Use] {professional} [icons]' },
              { frase: '[Transparencia] al {40%}', en: '[Transparency] at {40%}' },
              { frase: '[Estilo] {cómic}', en: '{Comic} [style]' },
              { frase: '[Apaga los efectos]', en: '[Turn off the effects]' },
              { frase: '[Avísame] de mis {rutinas}', en: '[Notify me] about my {routines}' },
              { frase: '[Avísame de mis metas] a las {21:00}', en: '[Remind me of my goals] at {21:00}' },
              { frase: '[Apaga los avisos]', en: '[Turn off notifications]' },
              { frase: '[Descarga un respaldo] de mis datos', en: '[Download a backup] of my data' },
              { frase: '[Vuelve a ver la bienvenida]', en: '[Show the welcome menu again]' },
              { frase: '[Abre las configuraciones]', en: '[Open settings]' },
              { frase: '[Abre] mi {cuenta}', en: '[Open] my {account}' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'asistente',
    titulo: 'Asistente y ayuda',
    carpetas: [
      {
        icon: '🧠',
        id: 'memoria',
        titulo: 'Memoria y captura',
        nota: 'El asistente recuerda hechos entre sesiones. Adjunta una foto con el clip o dicta con el micrófono; @app fuerza el destino de un registro.',
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Recuerda que] {soy vegetariano}', en: '[Remember that] {I am vegetarian}' },
              { frase: '[@]{cocina} {ensalada de la comida}', en: '[@]{cocina} {salad for lunch}' },
            ],
          },
        ],
      },
      {
        icon: '❓',
        id: 'ayuda',
        titulo: 'Ayuda y tutoriales',
        nota: 'Pregunta cómo funciona cualquier app o menú («cómo funciona…», «qué hace…», «para qué sirve…») y te lo explica; pide «tutorial de…» y el mago lo enseña en pantalla paso a paso.',
        grupos: [
          {
            id: 'acciones',
            ejemplos: [
              { frase: '[Cómo funciona] la {cocina}', en: '[How does] the {kitchen} [work]' },
              { frase: '[Cómo funciona] el {editor}', en: '[How does] the {editor} [work]' },
              { frase: '[Cómo funciona] la {rueda de herramientas}', en: '[How does] the {tool wheel} [work]' },
              { frase: '[Cómo funciona] el {chat}', en: '[How does] the {chat} [work]' },
              { frase: '[Qué hace] el {inventario}', en: '[What does] the {inventory} [do]' },
              { frase: '[Para qué sirve] la {cámara}', en: '[What is] the {camera} [for]' },
              { frase: '[Tutorial de] {ejercicio}', en: '[Tutorial of] the {editor}' },
              { frase: '[Tutorial de] la {biblioteca}', en: '[Tutorial of] the {chat}' },
              { frase: '[Tutorial] {general}', en: '{General} [tutorial]' },
            ],
          },
        ],
      },
    ],
  },
]

type SegTipo = 'txt' | 'orden' | 'variable'

/** Trocea el marcado [orden]/{variable} de una frase en segmentos coloreables. */
function segmentar(frase: string): { texto: string; tipo: SegTipo }[] {
  const out: { texto: string; tipo: SegTipo }[] = []
  const re = /\[([^\]]+)\]|\{([^}]+)\}/g
  let ultimo = 0
  for (let m = re.exec(frase); m; m = re.exec(frase)) {
    if (m.index > ultimo) out.push({ texto: frase.slice(ultimo, m.index), tipo: 'txt' })
    out.push(m[1] != null ? { texto: m[1], tipo: 'orden' } : { texto: m[2], tipo: 'variable' })
    ultimo = m.index + m[0].length
  }
  if (ultimo < frase.length) out.push({ texto: frase.slice(ultimo), tipo: 'txt' })
  return out
}

/** Frase limpia (sin marcado) tal como se escribe en el chat. */
const sinMarcado = (frase: string) => frase.replace(/[[\]{}]/g, '')

const COLOR_SEG: Record<SegTipo, string> = {
  txt: '',
  orden: 'font-semibold text-sky-300',
  variable: 'text-amber-300',
}

/** Rótulos por defecto de los grupos (claves chat.manual.grupo.<id>). */
const GRUPO_ES: Record<Grupo['id'], string> = {
  registrar: 'Registrar',
  abrir: 'Abrir y menús',
  jugar: 'Jugar',
  acciones: 'Acciones',
  ia: 'Con IA',
}

export function ManualComandos({
  onUsar,
  onCerrar,
}: {
  onUsar: (frase: string) => void
  onCerrar: () => void
}) {
  const t = useT()
  const idioma = useAjustes((s) => s.idioma)
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({ cocina: true })
  const toggle = (id: string) => setAbiertas((s) => ({ ...s, [id]: !s[id] }))

  // El español y el inglés van en línea; los demás idiomas se descargan al
  // abrir el manual y, mientras llegan (o si falta la frase), se ve el español.
  const manual = useManualTraducido(idioma)

  /** Frase a mostrar/enviar según el idioma de la app. */
  const fraseDe = (ej: Ejemplo) => manual?.frases[ej.frase] ?? (idioma === 'en' ? ej.en : ej.frase)

  /** Ícono y título de una carpeta (del registry si es una app). */
  const cabecera = (c: Carpeta): { icon: string; titulo: string } => {
    if (c.appId) {
      const p = getPlantilla(c.appId)
      const nombre = (p?.nombre ?? c.appId).split(' · ')[0]
      return { icon: p?.icon ?? '🗒️', titulo: t(`room.${c.appId}.nombre`, nombre).split(' · ')[0] }
    }
    return { icon: c.icon ?? '🗒️', titulo: t(`chat.manual.cat.${c.id}`, c.titulo ?? c.id) }
  }

  return (
    <div className="ui-panel-glass mb-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 px-1 pb-2">
        <span className="text-sm"><Icono nombre="registros" /></span>
        <span className="flex-1 text-[11px] font-semibold text-white/50">
          {t('chat.manual.titulo', 'Manual: qué puedes pedir')}
        </span>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded px-2 py-0.5 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title={t('chat.conv.cerrar', 'Cerrar')}
        >
          ✕
        </button>
      </div>

      <p className="px-1 text-[10px] leading-relaxed text-white/40">
        {t('chat.manual.intro', 'Abre una carpeta y toca un ejemplo para escribirlo en el chat. La mayoría funciona sin IA.')}
      </p>
      <p className="mb-2 px-1 text-[10px] leading-relaxed">
        <span className="font-semibold text-sky-300">{t('chat.manual.leyenda.comando', 'azul: la orden')}</span>
        <span className="text-white/30"> · </span>
        <span className="text-amber-300">{t('chat.manual.leyenda.variable', 'ámbar: cámbialo a tu gusto')}</span>
        <span className="text-white/30"> · </span>
        <span className="text-violet-300">{t('chat.manual.leyenda.ia', 'violeta: gasta una llamada de IA')}</span>
      </p>

      <div className="space-y-2">
        {SECCIONES.map((sec) => (
          <div key={sec.id}>
            <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
              {t(`chat.manual.seccion.${sec.id}`, sec.titulo)}
            </p>
            {sec.nota && (
              <p className="mb-1.5 px-1 text-[10px] leading-relaxed text-white/40">
                {t(`chat.manual.notaSeccion.${sec.id}`, sec.nota)}
              </p>
            )}
            <div className="space-y-1.5">
              {sec.carpetas.map((carpeta) => {
                const abierta = !!abiertas[carpeta.id]
                const cab = cabecera(carpeta)
                const numEjemplos =
                  carpeta.grupos.reduce((s, g) => s + g.ejemplos.length, 0) +
                  (carpeta.atajos?.length ?? 0)
                return (
                  <div key={carpeta.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                    <button
                      type="button"
                      onClick={() => toggle(carpeta.id)}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition hover:bg-white/5"
                    >
                      <span className={`text-[10px] text-white/35 transition-transform ${abierta ? 'rotate-90' : ''}`}>
                        ▸
                      </span>
                      <span className="text-sm"><Icono emoji={cab.icon} /></span>
                      <span className="flex-1 text-[11px] font-semibold text-white/75">{cab.titulo}</span>
                      <span className="rounded-full bg-white/10 px-1.5 py-px text-[10px] text-white/40">
                        {numEjemplos}
                      </span>
                    </button>

                    {abierta && (
                      <div className="border-t border-white/5 px-2 pb-2 pt-1.5">
                        {carpeta.nota && (
                          <p className="mb-1 text-[10px] leading-relaxed text-white/40">
                            {t(`chat.manual.nota.${carpeta.id}`, carpeta.nota)}
                          </p>
                        )}
                        {carpeta.aviso && (
                          <p className="mb-1 text-[10px] leading-relaxed text-amber-400">
                            {t(`chat.manual.aviso.${carpeta.id}`, carpeta.aviso)}
                          </p>
                        )}
                        {carpeta.atajos && (
                          <div className="mb-1 space-y-0.5">
                            {carpeta.atajos.map((a) => (
                              <div key={a.teclas} className="flex items-baseline gap-2">
                                <span className="shrink-0 rounded border border-white/15 bg-white/10 px-1.5 py-px font-mono text-[10px] font-semibold text-white/75">
                                  {manual?.teclas?.[a.teclas] ??
                                    (idioma === 'en' ? (a.teclasEn ?? a.teclas) : a.teclas)}
                                </span>
                                <span className="text-[10px] leading-relaxed text-white/55">
                                  {manual?.atajos[a.accion] ?? (idioma === 'en' ? a.en : a.accion)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {carpeta.grupos.map((grupo) => (
                            <div key={grupo.id}>
                              <p
                                className={`mb-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                  grupo.id === 'ia' ? 'text-violet-300/70' : 'text-white/30'
                                }`}
                              >
                                {t(`chat.manual.grupo.${grupo.id}`, GRUPO_ES[grupo.id])}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {grupo.ejemplos.map((ej) => (
                                  <button
                                    key={ej.frase}
                                    type="button"
                                    onClick={() => onUsar(sinMarcado(fraseDe(ej)))}
                                    className={`rounded-lg border px-2 py-1 text-left text-[11px] text-white/70 transition hover:text-white/90 ${
                                      grupo.id === 'ia'
                                        ? 'border-violet-400/20 bg-violet-400/5 hover:bg-violet-400/15'
                                        : 'border-white/10 bg-white/5 hover:bg-white/15'
                                    }`}
                                  >
                                    {ej.roomId && (
                                      <span className="mr-1"><Icono emoji={getPlantilla(ej.roomId)?.icon ?? '🗒️'} /></span>
                                    )}
                                    {segmentar(fraseDe(ej)).map((seg, i) => (
                                      <span key={i} className={COLOR_SEG[seg.tipo]}>{seg.texto}</span>
                                    ))}
                                    {ej.creditos != null && (
                                      <span className="ml-1.5 inline-block align-middle">
                                        <Creditos n={ej.creditos} aprox />
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Precios de la IA: la misma tabla de Configuraciones, aquí al lado de
            los ejemplos que la gastan. La fuente sigue siendo `catalogoIA`. */}
        <div>
          <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('chat.manual.seccion.precios', 'Lo que cuesta la IA')}
          </p>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => toggle('precios')}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition hover:bg-white/5"
            >
              <span
                className={`text-[10px] text-white/35 transition-transform ${abiertas.precios ? 'rotate-90' : ''}`}
              >
                ▸
              </span>
              <span className="text-sm"><Icono nombre="gema" /></span>
              <span className="flex-1 text-[11px] font-semibold text-white/75">
                {t('ia.precios.titulo', 'Precios de la IA')}
              </span>
            </button>
            {abiertas.precios && (
              <div className="border-t border-white/5 px-2 pb-2 pt-2">
                <Suspense
                  fallback={
                    <p className="py-3 text-center text-[10px] text-white/35">
                      {t('chat.manual.preciosCargando', 'Cargando la tabla…')}
                    </p>
                  }
                >
                  <EditorIASection embed sinTitulo />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
