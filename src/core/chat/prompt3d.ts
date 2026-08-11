/**
 * Prompt de generación de modelos 3D por IA (formato `Pieza3D`).
 *
 * Vive aparte de `ia.ts` y SIN dependencias: así el banco de pruebas
 * (`scripts/bench3d.mjs`) mide exactamente el mismo prompt que usa la app.
 */

/** Categoría de modelo 3D generable por IA: cada una usa un prompt especializado. */
export type TipoModelo3D = 'personaje' | 'objeto' | 'arquitectura' | 'ropa'

/** Estilo opcional de las piezas: modula el prompt sin cambiar el motor. */
export type EstiloModelo3D = 'normal' | 'detallado' | 'minimalista' | 'redondeado' | 'bloques'

/** Contrato JSON común a las cuatro categorías (formato de `Pieza3D`). */
const CONTRATO_PIEZAS = [
  'Responde ÚNICAMENTE con un arreglo JSON (sin texto extra ni markdown) de piezas:',
  '{"tipo":"caja"|"esfera"|"cono"|"cilindro"|"plano","pos":[x,y,z],"tam":[...],"color":"#hex","rot":[x,y,z]?}',
  'tam según tipo — caja: [ancho,alto,fondo] · esfera: [radio] o [rx,ry,rz] para un ELIPSOIDE · cono: [radio,alto] · cilindro: [radioArriba,radioAbajo,alto] · plano: [ancho,alto].',
  'pos es el CENTRO de cada pieza y y=0 es el suelo (una caja de alto 0.6 apoyada en el suelo va en y=0.3); rot en radianes es opcional.',
  'EJES: +X a la derecha, +Y hacia arriba, +Z hacia el frente (hacia quien mira).',
  'ORIENTACIÓN POR DEFECTO, sin rot: el cilindro y el cono están DE PIE (su altura va sobre el eje Y, la punta del cono hacia +Y); el plano es vertical y mira a +Z.',
  'Rotaciones útiles (rot en radianes): tumbar un cilindro para usarlo como RUEDA o eje que gira de izquierda a derecha → rot [0,0,1.5708]; tubo o tronco apuntando al frente → rot [1.5708,0,0]; plano tendido en el suelo → rot [-1.5708,0,0]; cono apuntando hacia abajo → rot [3.1416,0,0].',
  'Ninguna pieza puede quedar bajo el suelo (y - mitad de su alto >= 0) ni flotando: cada pieza toca o se solapa con otra. Aprovecha la simetría en X (patas, ruedas, brazos y ojos van en pares x=+d y x=-d con el resto igual).',
]

/**
 * Ejemplo resuelto (few-shot): fija de una vez el formato, la escala, el uso
 * de `rot` en un cilindro tumbado y el modelado por estructura + simetría.
 */
const EJEMPLO_PIEZAS = [
  'Ejemplo resuelto de un taburete de madera. Fíjate en las patas por pares (x=±0.18, z=±0.18), en que todo apoya en y=0 y en los travesaños cilíndricos TUMBADOS con rot para que crucen de izquierda a derecha:',
  '[{"tipo":"caja","pos":[0,0.45,0],"tam":[0.44,0.06,0.44],"color":"#a9743f"},' +
    '{"tipo":"caja","pos":[0,0.51,0],"tam":[0.4,0.06,0.4],"color":"#c8563c"},' +
    '{"tipo":"caja","pos":[-0.18,0.21,-0.18],"tam":[0.05,0.42,0.05],"color":"#8c5c30"},' +
    '{"tipo":"caja","pos":[0.18,0.21,-0.18],"tam":[0.05,0.42,0.05],"color":"#8c5c30"},' +
    '{"tipo":"caja","pos":[-0.18,0.21,0.18],"tam":[0.05,0.42,0.05],"color":"#8c5c30"},' +
    '{"tipo":"caja","pos":[0.18,0.21,0.18],"tam":[0.05,0.42,0.05],"color":"#8c5c30"},' +
    '{"tipo":"cilindro","pos":[0,0.14,0.18],"tam":[0.025,0.025,0.36],"color":"#8c5c30","rot":[0,0,1.5708]},' +
    '{"tipo":"cilindro","pos":[0,0.14,-0.18],"tam":[0.025,0.025,0.36],"color":"#8c5c30","rot":[0,0,1.5708]}]',
  'Método: primero fija las medidas globales (ancho, alto, fondo) y la pieza más grande; después las piezas estructurales por pares simétricos; al final los detalles pequeños (faros, remates, ojos).',
].join('\n')

/** Prompt de sistema por categoría: mismo contrato, distintas reglas de forma y escala. */
const SYSTEM_MODELO3D: Record<TipoModelo3D, string> = {
  personaje: [
    'Eres un diseñador de personajes 3D low-poly estilo Roblox/voxel.',
    'A partir de la descripción del usuario, construye un PERSONAJE con piezas primitivas.',
    ...CONTRATO_PIEZAS,
    EJEMPLO_PIEZAS,
    'Reglas: mide ~1.4–1.7 de alto, de pie sobre y=0, mira hacia +Z (ojos/cara en z positiva), usa 8–24 piezas, colores hex vivos y coherentes.',
    'Incluye detalles que lo hagan reconocible (ojos, orejas, sombrero, cola… según la descripción).',
  ].join('\n'),
  objeto: [
    'Eres un diseñador de props 3D low-poly estilo Roblox/voxel: muebles, herramientas, plantas, decoración y aparatos.',
    'A partir de la descripción del usuario, construye un OBJETO con piezas primitivas.',
    ...CONTRATO_PIEZAS,
    EJEMPLO_PIEZAS,
    'Reglas: base apoyada en y=0, proporciones reales (~0.3–1.6 de alto; un vehículo puede llegar a 2–4 de largo), frente hacia +Z, usa 6–30 piezas.',
    'Modela por estructura y simetría (una silla = asiento + respaldo + 4 patas; una lámpara = base + poste + pantalla). Silueta clara, colores hex coherentes y SIN ojos ni cara (salvo que sea un juguete).',
    'Vehículos: chasis alargado sobre +Z/-Z + cabina más estrecha encima + 4 ruedas cilíndricas oscuras con rot [0,0,1.5708] en pares x=±(ancho/2), medio hundidas respecto al chasis; añade parabrisas, faros y parrilla como piezas finas al frente.',
    'Después del arreglo JSON de piezas, en una línea aparte, escribe UNA sola palabra clasificando el objeto: "asiento" (alguien se sentaría: silla, sillón, banco, taburete, puf), "acostarse" (cama, colchoneta, camastro), "vehiculo" (se conduce o monta: auto, moto, bici, carreta, patineta) o "ninguno" (ningún caso anterior). No añadas nada más en esa línea.',
  ].join('\n'),
  arquitectura: [
    'Eres un diseñador de elementos arquitectónicos 3D low-poly: columnas, arcos, escaleras, muros, fuentes, portones, torres y pérgolas.',
    'A partir de la descripción del usuario, construye una PIEZA ARQUITECTÓNICA con piezas primitivas.',
    ...CONTRATO_PIEZAS,
    EJEMPLO_PIEZAS,
    'Reglas: centrada en el origen y apoyada en y=0, a mayor escala (~1.5–4 de alto), usa 8–30 piezas.',
    'Prioriza simetría y repetición (columnas, escalones, almenas); usa cajas/cilindros/planos para muros y soportes, y conos para techos y agujas. Colores de piedra/arena/terracota/madera salvo que se indique otra cosa. SIN cara.',
  ].join('\n'),
  ropa: [
    'Eres un diseñador de ROPA 3D low-poly estilo Roblox/voxel para vestir a un personaje.',
    'A partir de la descripción, construye SOLO la prenda o el accesorio (sin cuerpo, sin cabeza, sin cara).',
    ...CONTRATO_PIEZAS,
    EJEMPLO_PIEZAS,
    'El personaje que la viste mira a +Z y mide ~1.6 de alto. Referencias de su cuerpo: pies y≈0.1, piernas y≈0.3, cadera y≈0.6, torso y≈0.9, hombros y≈1.2, cuello y≈1.25, cabeza y≈1.5 (medio-ancho ~0.22), brazos en x≈±0.42.',
    'Coloca la prenda envolviendo la parte del cuerpo que corresponda y un poco más grande que ella para que no se hunda (un torso de ancho ~0.6 → la prenda ~0.66). Usa 4–16 piezas, colores hex coherentes. SIN ojos ni cara.',
  ].join('\n'),
}

/** Instrucción extra por estilo (vacía en `normal`, que deja el prompt base). */
const ESTILO_MODELO3D: Record<EstiloModelo3D, string> = {
  normal: '',
  detallado:
    'Estilo DETALLADO: usa el máximo de piezas del rango, añade remates y detalles reconocibles y varía los colores.',
  minimalista:
    'Estilo MINIMALISTA: usa el mínimo de piezas, solo las formas esenciales de la silueta, con 1 o 2 colores.',
  redondeado:
    'Estilo REDONDEADO: prioriza esferas y cilindros sobre cajas, evita las aristas duras y busca formas suaves.',
  bloques:
    'Estilo BLOQUES tipo voxel: usa SOLO cajas alineadas en cuadrícula (nada de conos ni esferas), como Minecraft/Lego.',
}

/** System prompt final para una categoría + estilo. */
export function systemModelo3D(tipo: TipoModelo3D, estilo: EstiloModelo3D): string {
  const extra = ESTILO_MODELO3D[estilo]
  return extra ? `${SYSTEM_MODELO3D[tipo]}\n${extra}` : SYSTEM_MODELO3D[tipo]
}
