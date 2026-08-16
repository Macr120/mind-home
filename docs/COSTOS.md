# Costos de la IA, créditos y precio

Análisis de COGS (costo por usuario/mes) de la capa de IA vía cuenta y su
relación con el precio. **Revisión: agosto 2026** (la anterior era de julio).
Complementa a [`BACKEND.md`](BACKEND.md) (arquitectura del proxy y la cuota).

## Qué cambió en esta revisión

1. **La app dejó de ser solo-suscriptores.** El modo local es gratis y sin
   cuenta; la IA se paga con recargas de créditos que no caducan, y el plan Pro
   añade créditos mensuales + sincronización. `consumir_cuota_ia` ya no exige
   plan (migración `20260802000001_creditos_por_operacion.sql`).
2. **La tabla de créditos dejó de ser plana.** Antes toda llamada de texto valía
   1 crédito: un latido de 100 tokens y un plan de metas de 3000 pagaban lo
   mismo. Ahora el precio lo fija la operación.
3. **El modelo 3D estaba mal calibrado**: cobraba 5 créditos y cuesta ~10. Con
   600 créditos gastados solo en 3D el COGS real superaba el precio del plan.
   Esa era la fuga principal y queda cerrada.
4. **Precio: 4.99 USD/mes** (antes 67 MXN ≈ $3.60), con precio local por región.

## Precios de proveedor (agosto 2026)

| Concepto | Precio |
|---|---|
| Claude Haiku 4.5 — entrada / salida | **$1.00 / $5.00** por M tokens |
| Claude Sonnet 5 — entrada / salida | **$3.00 / $15.00** por M tokens |
| Caché: escritura | 1.25× entrada (TTL 5 min) · 2× (TTL 1 h) |
| Caché: lectura | 0.10× entrada |
| Mínimo cacheable — Haiku 4.5 | 4096 tokens (debajo: el marcador es no-op) |
| Mínimo cacheable — Sonnet 5 | 1024 tokens |
| **gpt-image-1-mini** low (imagen PRINCIPAL) | **$0.005** / imagen 1024² ($0.011 en medium) |
| **Gemini 3.1 Flash Lite Image** (calidad «buena») | **$0.0336 / imagen** (1K, único tamaño) |
| Gemini 3.1 Flash Lite (texto de respaldo) | $0.25 entrada / $1.50 salida por M tokens |

⚠️ **Sonnet 5 corre con precio introductorio ($2/$10) hasta el 31-ago-2026.** A
partir del 1 de septiembre el modelo 3D cuesta 50% más. La tabla de abajo ya usa
el precio pleno: no hay que reajustar nada ese día.

⚠️ Los precios de imagen y de Gemini vienen de la revisión anterior y **no se han
verificado** contra el proveedor en esta pasada. Confirmarlos antes de tomar
decisiones de precio basadas en ellos.

Referencias de la familia de imagen, por si hay que subir de escalón:
Nano Banana 2 `gemini-3.1-flash-image` $0.067 (1K) · Nano Banana Pro $0.134 (2K).
Cualquier modelo es sobreescribible sin redeploy:
`npx supabase secrets set GEMINI_IMAGE_MODEL=<modelo-nuevo>`.

El lite **solo genera a 1K y cobra plano**: pedir imágenes chicas no ahorra nada
ahí. La compresión del cliente (`comprimirImagen`, WebP) no baja el costo de IA —
baja el egress de Storage ($0.09/GB) y lo que ocupa IndexedDB en el móvil. Por eso
se pide el `aspectRatio` correcto: los píxeles que el recorte tiraría se pagan igual.

## El ancla: 1 crédito = $0.005 USD de COGS

Todo lo demás se deriva de ahí. En Haiku 4.5 eso equivale a **1000 tokens de
salida** o **5000 de entrada nueva** (o 50 000 leídos de caché). Es la razón por
la que la salida manda: cuesta 5× la entrada.

## Tabla de créditos por operación

Fuente de verdad: `costo_op()` en SQL. Espejo del cliente para enseñar el precio
antes de pedir: `src/core/cuenta/costos.ts`. Topes de `max_tokens`: `TOPES` en
`supabase/functions/ia-chat/index.ts`.

| `op` | Tope salida | Créditos | Costo real | Dónde se usa |
|---|---|---|---|---|
| `chat` | 2048 | **1** | $0.004–0.020 | Chat de la casa, con y sin `TOOLS_EDITOR`; latidos |
| `texto` | 1500 | **1** | $0.0017–0.006 | Recetas, dietas, macros, sabio, tutor, charlas, resúmenes, expandir nodo |
| `vision` | 1500 | **1** | ~$0.0026 | `analizarImagenIA` (evidencia de descanso) |
| `texto_largo` | 4096 | **4** | $0.004–0.023 (medido) | Planes IA de metas, mapas conceptuales, tarjetas SRS, efemérides |
| `modelo3d` | 8192 | **10** | $0.032–0.049 | `generarModelo3D`: objetos, personajes, ropa, asistentes |
| `imagen` | — | **3** | ~$0.005 | Calidad rápida (gpt-image-1-mini): la de por defecto |
| `imagen_alta` | — | **10** | ~$0.034 | Calidad buena (Gemini), a elección del usuario |
| `voz` | — | **1** | ~$0.003 (tope 30s) | Dictado del chat de la casa vía Whisper, fallback sin `SpeechRecognition` (WebView de Android) |
| `tts` | — | **3** | ~$0.015 (tope 1000 car.) | Voz con IA de un asistente (OpenAI tts-1), alternativa a `speechSynthesis` nativo |
| `pdf` | 1500 | **4** | ~$0.010–0.020 | PDF adjunto en el chat (menú «+»); la entrada del documento es lo caro |

Cómo se sostiene cada número (Haiku 4.5, precio pleno):

- **`chat`** — entrada ~4 000 (tools de captura + system + historial), salida ~400.
  Sin caché $0.006; con el prefijo cacheado $0.0024. Con `TOOLS_EDITOR` la entrada
  sube a ~10 000, pero ese bloque es estático y **compartido entre todos los
  usuarios**, así que se lee a 0.10×. Promedio real ≈ 1 crédito.
- **`texto`** — entrada ~800, salida ~900 → $0.0053. El caso barato (macros, 200
  tokens de salida) baja a $0.0017. El piso de 1 crédito lo cubre de sobra.
- **`vision`** — la foto viaja a 768px ≈ 1 600 tokens de ENTRADA ($1/M) y la
  respuesta es corta (~150). Sale igual de barata que `texto`; existe aparte solo
  para poder medirla en `uso_ia_ops`.
- **`texto_largo`** — **medido** (ago 2026, ver «Medición real» abajo): el plan IA
  agota el tope (3 653 entrada / 3 771 salida → $0.0225 = 4.5 créditos), pero las
  demás formas piden mucho menos al proxy y salen entre $0.004 y $0.010. Se cobran
  **4**: cubren la mezcla y dejan el peor caso bajo el techo.
- **`modelo3d`** — Sonnet 5 con razonamiento adaptativo: entrada ~1 200, salida
  ~3 000 contando el pensamiento → $0.049 a precio pleno. 9.8 créditos → **10**.
- **`imagen`** — $0.005 = 1 crédito. Se cobran 3: margen holgado para absorber
  subidas de precio del modelo y, sobre todo, las caídas al respaldo (ver abajo).
- **`imagen_alta`** — $0.0336 = 6.7 créditos. Se cobran 10.
- **`voz`** — Whisper $0.006/min; el cliente topa la grabación a 30s ($0.003).
  Se cobra 1 crédito, igual que las demás ops de 1 latido.
- **`tts`** — OpenAI tts-1 $15/1M car.; el proxy recorta la entrada a 1000
  car. ($0.015 = 3 créditos exactos). Se cobran 3, igual que `imagen`.
- **`pdf`** — el documento viaja como entrada (tope 2.8M b64 ≈ 30–40 págs ≈
  15–20k tokens ≈ $0.015–0.020) y la respuesta va topada a 1500. Se cobran 4,
  como `texto_largo`: aquí lo caro es la ENTRADA, no la salida.

### Medición real de `texto_largo` (ago 2026)

El resto de la tabla son estimaciones; esta op se midió contra la API porque era
la única sospechosa de venderse a pérdida (`node --env-file=.env.local
scripts/medir-costos.mjs --op texto_largo --reps 6`, más las formas cortas a
mano). Lo que se ve es que **la op es bimodal**: el proxy recorta la salida con
`Math.min(tope_de_la_op, maxTokens del cliente)`, así que lo que manda no es el
tope de 4096 sino lo que pide cada call-site.

| Forma (call-site) | `maxTokens` | Entrada | Salida | Costo | Créditos reales |
|---|---|---|---|---|---|
| Plan IA (`core/planIA.ts`) | 3000–4000 | 3 653 | 3 771 | **$0.0225** | 4.5 |
| Mapa conceptual (`rooms/ideas/ia.ts`) | 2000 | 839 | 1 795 | $0.0098 | 2.0 |
| Efemérides (`rooms/diario/efemerides.ts`) | 1800 | 644 | 647 | $0.0039 | 0.8 |

El plan IA es el que se pasaba: costaba 4.5 créditos y se cobraban 3. Las otras
tres formas dejaban margen de sobra. La tarifa única de **4** cubre la mezcla sin
castigar a las cortas; ver Riesgos para el residuo que queda.

### Las dos calidades de imagen

El usuario elige en Configuraciones › Precios de la IA; la preferencia viaja con
cada petición (`calidad` en el body de `ia-imagen`) y decide **proveedor y precio**:

| Calidad | Proveedor | Cadena | Costo | Créditos |
|---|---|---|---|---|
| **Rápida** (por defecto) | gpt-image-1-mini `low` | `IMG_CADENA_RAPIDA` = `openai,gemini` | $0.005 | 3 |
| **Buena** | Gemini 3.1 Flash Lite Image | `IMG_CADENA_ALTA` = `gemini,openai` | $0.0336 | 10 |

⚠️ **El respaldo ya NO abarata: encarece.** Antes Gemini era el principal y
OpenAI el respaldo más barato, así que una caída de Google bajaba la factura.
Ahora es al revés: si OpenAI falla en calidad rápida, la imagen se sirve con
Gemini ($0.0336) habiendo cobrado 3 créditos ($0.015) — **por debajo del costo**.
Es un evento raro y acotado (solo mientras OpenAI esté caído), pero conviene
vigilarlo en `uso_ia_ops` por proveedor; el `console.warn` de `ia-imagen` lo
etiqueta con la op para poder contarlo.

En OpenAI el tamaño **sí** cambia el precio: `4:3` y `3:4` se mapean a
1536×1024 / 1024×1536, más caros que el cuadrado. Pedir el aspecto correcto
importa más ahora que con Gemini, que cobraba plano.

## Tabla completa: qué cuesta cada cosa, cuarto por cuarto

Fuente de verdad en código: `src/core/cuenta/catalogoNucleo.ts` (chat, editor,
metas) y `src/rooms/<id>/costosIA.ts` (cada cuarto), agregados por
`gruposIA()`. La misma tabla se consulta dentro de la app en **Configuraciones ›
Precios de la IA**, y el badge de cada botón sale de ahí: si un número de aquí no
coincide con la app, el equivocado es este documento.

Los precios asumen la calidad de imagen **rápida** (3 créditos). En calidad buena
cada imagen pasa a 10, así que las filas con imágenes se multiplican.

### Chat de la casa

| Operación | Composición | Créditos |
|---|---|---|
| Mensaje al asistente | 1 × chat | **1** |
| «Genera en 3D…» por chat | 1 × chat + 1 × modelo3d | **11** |
| «Crea una imagen de…» por chat | 1 × chat + 1 × imagen | **4** |
| «Hazme un mapa de ideas» por chat | 1 × chat + 1 × texto_largo | **5** (≈, hasta 9 con reintento) |
| Turno de Chat AR (cámara + asistente 3D) | 1 × texto | **1** |
| PDF adjunto en el chat (menú «+») | 1 × pdf | **4** |
| Frase espontánea del personaje | 1 × texto | **1** (solo Pro, 1 de cada 10 latidos) |

### Editor de la casa

| Operación | Composición | Créditos |
|---|---|---|
| Modelo 3D de objeto o arquitectura | 1 × modelo3d | **10** |
| Modelo 3D de personaje | 1 × modelo3d | **10** |
| Prenda del guardarropa | 1 × modelo3d | **10** |
| Forma de un asistente | 1 × modelo3d | **10** |
| Voz con IA de un asistente (probar/regenerar) | 1 × tts | **3** |
| Textura de piso, muro o techo | 1 × imagen | **3** |
| Textura de fondo de cielo | 1 × imagen | **3** |

### Metas y cronograma (el botón ✨ sale en 8 cuartos)

| Operación | Composición | Créditos |
|---|---|---|
| Plan ✨ con IA: cronograma, itinerario, plan de estudio, plan financiero | 1 × texto_largo | **4** |

### Cocina

| Operación | Composición | Créditos |
|---|---|---|
| Crear receta con IA | 1 × texto + 1 × imagen | **4** |
| **Dieta completa o plan alimenticio** | 5 × texto + 5 × imagen | **20** (≈) |
| Calcular calorías y macros | 1 × texto | **1** |
| Foto de una receta o dieta | 1 × imagen | **3** |

La dieta es la operación más cara del catálogo: el plan y sus 4 recetas se
escriben en llamadas aparte y cada plato lleva su foto. Sin proveedor de imagen
son 5 créditos. En calidad buena, 55.

### Ejercicio

| Operación | Composición | Créditos |
|---|---|---|
| Ilustrar un ejercicio | 1 × imagen | **3** |
| **Ilustrar los ejercicios que faltan** (lote) | N × imagen | **3 × N** |

No hay generación de rutinas con IA: se arman a mano desde el catálogo. Lo que
cuesta es ilustrarlas y el Plan ✨ de la meta. El lote no tiene tope, así que la
confirmación dice el total exacto antes de empezar.

### Biblioteca

| Operación | Composición | Créditos |
|---|---|---|
| Turno de charla con el Sabio | 1 × texto | **1** |
| Primer turno de una charla nueva | 3 × texto | **3** |
| Clasificar y destilar una charla ✨ | 2 × texto | **2** |
| Ramificar el árbol 🌿 | 1 × texto | **1** |
| Actualizar la entrada al salir de la charla | 1 × texto | **1** |
| Generar material de estudio de una entrada | 1 × texto | **1** |
| Ilustrar una entrada | 1 × imagen | **3** |

El primer turno cuesta 3 porque además de responder, la IA titula la charla, la
cuelga del nodo que le toca en el árbol y la deja destilada como entrada
(`arbol.ts::clasificarYDestilar`). Fuente: `rooms/biblioteca/costosIA.ts`.

### Idiomas

| Operación | Composición | Créditos |
|---|---|---|
| Turno de charla con el tutor | 1 × texto | **1** |
| Primer turno de una charla nueva | 2 × texto | **2** |
| Clasificar una charla ✨ | 1 × texto | **1** |
| Extraer tarjetas de la charla | 1 × texto | **1** |
| Generar tarjetas de un tema | 1 × texto | **1** |
| Imagen mnemotécnica de una tarjeta | 1 × imagen | **3** |

### Ideas

| Operación | Composición | Créditos |
|---|---|---|
| Mapa conceptual con IA | 1 × texto_largo | **4** (≈, 8 si reintenta) |
| Más ideas (expandir nodo o lluvia) | 1 × texto | **1** |

### Sala de cómputo

| Operación | Composición | Créditos |
|---|---|---|
| Escribir una fórmula desde su descripción | 1 × texto | **1** |
| Explicar o despejar paso a paso | 1 × texto | **1** |
| Armar una hoja de cálculo con sus fórmulas | 1 × texto_largo | **4** |
| Interpretar los datos seleccionados | 1 × texto | **1** |

### Entretenimiento

| Operación | Composición | Créditos |
|---|---|---|
| Rellenar la ficha con IA | 1 × texto | **1** |
| Resumen de una obra | 1 × texto | **1** |

Las portadas no gastan créditos: salen de Wikipedia y Open Library.

### Diario (noticias)

| Operación | Composición | Créditos |
|---|---|---|
| Efemérides culturales del día | 1 × texto_largo | **4** (automática, 1/día, solo Pro) |
| Reparto del diario por un asistente | 1 × texto | **1** (automática, solo Pro) |

Es el único cuarto con IA que corre sola, y por eso ambas exigen suscripción
(`iaOperativa()`): unos créditos comprados no deben gastarse sin pedir nada.
Titulares y fotos vienen de El País y Wikipedia, sin coste.

### Recámara

| Operación | Composición | Créditos |
|---|---|---|
| Evidencia con foto para apagar la alarma | 1 × vision | **1** |

### Cuartos sin IA propia

Sala (viajes), Hobbies y Despacho solo tienen el **Plan ✨** (4 créditos, `texto_largo`).
Agenda, Garage, Jardín, Calendario y Anecdotario no gastan nada: su única IA es
el chat de la casa capturando datos, que se cobra como un mensaje normal.

### Por qué el cliente declara la `op` y aun así no puede hacer trampa

El cliente manda `op` en el body; el servidor le aplica **su tope de
`max_tokens`**. Declarar `texto` para pagar 1 en vez de 3 no sirve: la respuesta
se recorta a 1500 tokens, que es justo lo que hace barata a esa tarifa. El perfil
`calidad` manda por encima de todo y siempre se cobra como `modelo3d`.

## Anatomía de una solicitud (tokens de entrada)

Chat de la casa (`interpretarIA`):

| Bloque | Tokens | ¿Cuándo viaja? |
|---|---|---|
| TOOLS_EDITOR (56 tools) | ~5 500 | Solo con intención de edición; PRIMERO en el arreglo y con breakpoint → prefijo cacheado compartido entre TODOS los usuarios |
| Tools de captura + recordar + crear_rutina + crear_modelo_3d | ~2 100–3 900 | Siempre (varía por apps asignadas) |
| System (personalidad + memorias + fecha) | ~1 100 base; +750 con párrafos de editor | Párrafos de editor solo con intención |
| Historial (12 mensajes × ≤600 chars) | ~0–1 800 | Crece hasta saturar la ventana |
| Imagen adjunta | ~1 600 (1024px) | Opcional |

Chats de app (`conversarIA`): system de 350–4 500 caracteres — casi siempre bajo
el mínimo cacheable de Haiku (4096); el costo lo domina el historial en las
conversaciones largas (sabio/tutor: 20 turnos).

Notas honestas sobre el hit-rate del caché: TTL 5 min (pausas largas re-escriben);
la ventana rodante de 12 mensajes rompe el prefijo de conversación cuando se llena
(~turno 7), pero tools+system —el grueso— siguen cacheando. Alternar entre mensajes
con/sin edición crea dos prefijos que conviven sin invalidarse.

## Palancas de ahorro implementadas

1. **Prompt caching** en `ia-chat` (3 breakpoints; escritura 1.25×, lectura 0.10×).
2. **Gating de TOOLS_EDITOR**: las 56 herramientas del editor (~5.5k tokens) y sus
   párrafos del system solo viajan si el mensaje (o los 2 turnos previos) huele a
   edición (`hayIntencionEditor` en `src/core/chat/editorAcciones.ts`).
3. **Latidos del corazón**: la frase espontánea por IA baja de 30% → 10% vía cuenta
   (`src/core/chat/corazon.ts`).
4. **IA de fondo solo con Pro** (`iaOperativa`): latidos, efemérides y reparto no
   gastan créditos comprados. Quien recarga 150 no se los encuentra vacíos sin
   haber pedido nada.
5. **Créditos por operación**: cada acción paga lo que cuesta y el techo del mes
   queda sellado (antes se podía superar gastando todo en 3D).

## Escenarios por perfil

Con 700 créditos/mes y el ancla de $0.005:

| Perfil | Uso mensual | Créditos | Costo IA |
|---|---|---|---|
| Ligero (60%) | 60 chats casa, 40 de app, 2 modelos 3D, 8 imágenes | ~145 | ~$0.60 |
| Típico (30%) | 200 / 150 / 5 / 25 chats·apps·3D·imágenes + 10 planes | ~540 | ~$2.40 |
| Intensivo (10%) | tope de 700 créditos | 700 | ~$3.50 |
| **Ponderado** | | | **~$1.63** + infra ~$0.15 ≈ **$1.80** |

El techo **duro** por suscriptor es $3.50 (700 × $0.005) mientras cada op cobre lo
que cuesta. Antes ese techo no existía: 120 modelos 3D cabían en 600 créditos y
costaban ~$5.90.

Con la imagen a 3 créditos, quien gaste todo en imágenes cuesta $1.17, así que el
techo real lo marca `modelo3d` (70 × $0.049 = $3.43). `texto_largo` era el único
que se pasaba (233 planes × $0.0225 = $5.24); con la tarifa a 4 quedó contenido.
**Decisión ago 2026: `creditos_mes = 700`** (contrapartida del precio a $4.99).

> ### ⚠️ Corrección (auditoría ago 2026): el techo nunca estuvo sellado
>
> Lo de arriba da por hecho que `texto_largo` marca el peor caso ($3.94 con 700
> créditos). **Es falso, y también lo era con 600.** Ordenando las ops por
> $/crédito en su peor caso real, `texto_largo` es de las MENOS expuestas: la
> migración `20260802000003` parcheó la op equivocada, y además razonó sobre 600
> créditos cuando `20260802000001` ya los había subido a 700.
>
> | Peor caso, 700 créditos en una sola op | $/crédito | COGS |
> |---|---|---|
> | `chat` con TOOLS_EDITOR, sin caché, salida al tope | $0.0202 | **$14.17** |
> | `chat` con las tools cacheadas | $0.0153 | $10.71 |
> | `modelo3d` al tope de 8 192 | $0.0127 | $8.86 |
> | `vision` al tope | $0.0113 | $7.91 |
> | `texto` (charla larga) al tope | $0.0111 | $7.77 |
> | `texto_largo` al tope | $0.0061 | $4.29 |
> | `texto_largo` medido (el caso del comentario viejo) | $0.0056 | $3.94 |
>
> Ojo también con el «cacheado: $0.0024» que se atribuía al chat: el mínimo
> cacheable de Haiku 4.5 son 4 096 tokens y el payload típico sin intención de
> editor se queda por debajo, así que el breakpoint es no-op y **no hay descuento
> en el caso común**. Solo el prefijo con `TOOLS_EDITOR` (~5 500 tokens) lo supera.
>
> **La causa raíz no es la tarifa, es la entrada.** El crédito solo pone precio a
> la SALIDA; la entrada la acotan los `LIMITES` de `ia-chat/index.ts`, que permitían
> ~160 000 tokens (~$0.16 en Haiku) en una llamada de 1 crédito. Ninguna tabla de
> precios cierra el techo mientras eso siga abierto.
>
> **Medida aplicada (ago 2026)**: `LIMITES` endurecidos a 24 mensajes × 10 000
> chars + system de 24 000 → ~60 000 tokens (~$0.06) por llamada, sin tocar
> precios ni devaluar los créditos ya comprados. Verificado contra los llamadores
> reales antes de apretar: el chat manda 12 mensajes y ~4 500 chars de system; las
> charlas de Biblioteca e Idiomas, 20 mensajes.
>
> **Pendiente**: medir el p95 de `tokens_salida` de `modelo3d` en `uso_ia_ops`
> antes de tocar su tope de 8 192 (es 2.7× la salida esperada, la mayor exposición
> por llamada). Recortarlo a ciegas trunca el JSON del modelo. Y recordar que el
> precio introductorio de Sonnet 5 **acaba el 31-ago-2026**: a partir de ahí
> `modelo3d` sube ~50 %.
>
> Estrategia acordada: mantener 700 créditos y $4.99, documentar el riesgo y
> bajar el COSTE (topes y límites de entrada) en vez de subir la tarifa.

Infraestructura: Supabase Pro $25/mes fijos (+$0.09/GB egress); repartido desde
~500 suscriptores es ruido (~$0.10–0.20/usuario). RevenueCat: 1% del bruto sobre
$2,500 MTR. **Ojo con el modo local gratis**: trae usuarios con ingreso cero que
igual consumen auth y egress. Medirlo antes de promocionar fuerte.

## Precio vigente (decisión de negocio, 15-ago-2026)

**Unlock: 10.99 USD, pago único** (`unlock_casa`): desbloquea la casa para
siempre e incluye el **primer mes** — plan `trial` de 30 días con el pool de
700 créditos + sync, sin tarjeta ni suscripción (migración `20260815000001`,
webhook). La demo gratis (no persistente) es el free tier. La aritmética del
precio: $6 por la app (el unlock viejo) + $5 por el mes de IA incluido; $10.99
por umbral psicológico.
**Pro: 4.99 USD/mes**, precio local por región, solo mensual, vendido únicamente
en la web. **Recargas: 150 / 600 / 1500 créditos** ($1.99 / $4.99 / $9.99), con
o sin suscripción, sin caducidad — siguen siendo la vía de IA sin plan.

| Concepto (canal web, Stripe 2.9% + $0.30, RC 1%) | Neto | COGS | Margen |
|---|---|---|---|
| Unlock $10.99, comprador típico (trial ~$1.80) | ~$10.26 | ~$1.80 | **~77%** |
| Unlock $10.99, peor caso con bucket (K=1.1 → $3.85) | ~$10.26 | ~$3.85 | **~58%** |
| Unlock $10.99 en tienda al 30%, peor caso | ~$7.69 | ~$3.85 | **~35%** |
| Suscriptor ponderado | ~$4.50 | ~$1.80 | **~60%** |
| Peor caso: 700 créditos completos (con bucket) | ~$4.50 | ~$3.85 | **~14%** |
| Recarga 600 ($4.99), tope bucket $3.30 | ~$4.50 | hasta $3.30 | **~27%** |
| Recarga 150 ($1.99) | ~$1.63 | hasta $0.83 | **~49%** |

**El bucket es prerequisito del precio**: sin él, el peor caso real de 700
créditos era ~$14 (ver «Corrección de auditoría») y el unlock vendía el mes
incluido a pérdida. Con el bucket, el COGS por usuario queda matemáticamente
acotado (ver la sección siguiente).

Costos fijos (fuera del COGS por usuario): Supabase Pro $25/mes + dominio y
hosting estático ~$2 + Apple Developer $99/año cuando haya iOS ≈ **$26–35/mes**.
Con el unlock a $10.99, 4–6 ventas al mes cubren toda la infraestructura.
Mejora estructural: la demo no toca el backend, así que todo el que consume
auth/egress pagó al menos el unlock (adiós al riesgo del «modo local gratis» de
la nota de arriba).

## Bucket: techo de COGS en USD real (migración `20260815000002`)

El crédito solo tarifa la SALIDA; el bucket sella el resto. Cada Edge Function
calcula el costo REAL en USD de su llamada (`_shared/costoUsd.ts`: tokens por
tarifa, o fijo en imagen/voz/tts) y lo acumula en `uso_ia.usd` vía
`registrar_uso_ia`. `consumir_cuota_ia` deniega con motivo **`techo`** cuando:

```
usd_mes >= greatest(techo_piso_usd, (créditos consumidos + costo_op) × $0.005 × techo_factor)
```

- `techo_factor` = **1.1** y `techo_piso_usd` = **$0.50**, por plan en
  `limites_plan` (ajustables sin migración).
- Con K=1.1: 700 cr → tope $3.85 (< $4.50 netos de Pro web); 600 cr de recarga
  → $3.30 (< $3.50 netos de tienda al 30%). K=1.0 castigaría usos legítimos
  pesados (chat de editor con tools cacheadas ronda $0.0153/cr en ráfagas);
  K=1.25 rompería el margen de recargas en tienda.
- El techo ESCALA con los créditos consumidos: quien recarga más tiene más
  margen. El ponderado real es $0.0033/cr, así que >97% de usuarios no lo tocan
  nunca — es anti-abuso, no una tarifa.
- También acota la pérdida del respaldo de imagen (rápida servida por Gemini a
  $0.0336 cobrando 3 cr): ese costo real entra al bucket.
- Cliente: 429 con `error: 'techo'` → cara propia de `CuotaAgotada` («límite de
  uso del mes»); recargar no lo quita a propósito.

## Respaldo entre proveedores

Los dos proxies son una **cadena**: si el principal falla (error, timeout de
60 s o respuesta sin contenido), entra el siguiente. La cuota se cobra una sola
vez para toda la cadena y solo se devuelve si fallan todos.

| Proxy | Principal | Respaldo | Orden |
|---|---|---|---|
| `ia-imagen` calidad rápida | gpt-image-1-mini | Gemini 3.1 Flash Lite Image | `IMG_CADENA_RAPIDA` |
| `ia-imagen` calidad buena | Gemini 3.1 Flash Lite Image | gpt-image-1-mini | `IMG_CADENA_ALTA` |
| `ia-chat` | Claude Haiku 4.5 / Sonnet 5 | Gemini 3.1 Flash Lite / Flash | fijo |

**Corrección respecto a la revisión anterior**: cuando Gemini era el principal, el
respaldo abarataba la factura. Ya no. Con gpt-image-1-mini de principal, una caída
de OpenAI en calidad rápida sirve la imagen con Gemini ($0.0336) habiendo cobrado
3 créditos ($0.015): **por debajo del costo**. En calidad buena pasa lo contrario
(el respaldo es más barato de lo cobrado). Vigilar el reparto por proveedor en
`uso_ia_ops`.

El de texto es al revés en la práctica: aunque Gemini Flash Lite tenga tarifa
menor ($0.25/$1.50 vs $1.00/$5.00), **no replica el prompt caching explícito** que
sostiene el COGS modelado arriba. Un turno cacheado en Anthropic paga la entrada a
0.10× ($0.10/M efectivo), por debajo de los $0.25/M de Gemini. Por eso Gemini está
como respaldo de disponibilidad, no como principal.

### Prueba de costo (muestreo)

`npx supabase secrets set IA_CHAT_GEMINI_PCT=10` manda el 10% del tráfico rápido a
Gemini de entrada (el perfil `calidad` nunca se muestrea: la geometría 3D depende
del razonamiento de Anthropic). Sus tokens se registran aparte, así que la mezcla
no contamina el histórico. Volver a `0` apaga la prueba sin redeploy.

## Telemetría

### `uso_ia_ops` — la tabla que valida la calibración

Una fila por `(usuario, mes, operación, proveedor)`. Es lo que faltaba: hasta
ahora `uso_ia` sumaba todas las llamadas de texto en un contador y no se podía
distinguir un latido de un plan IA.

```sql
-- ¿Cada operación cobra lo que cuesta? (Haiku 4.5 a precio pleno)
select op,
       sum(llamadas) as n,
       sum(creditos) as creditos_cobrados,
       round(sum(creditos) * 0.005, 2) as usd_cobrado,
       round((sum( tokens_entrada        * 1.00
                 + tokens_cache_creacion * 1.25
                 + tokens_cache_lectura  * 0.10
                 + tokens_salida         * 5.00) / 1e6)::numeric, 2) as usd_real
  from uso_ia_ops
 where proveedor = 'anthropic'
 group by op order by usd_real desc;

-- Costo medio por llamada de cada operación (para reajustar la tarifa)
select op, proveedor,
       round((sum(tokens_salida)::numeric / nullif(sum(llamadas), 0)), 0) as salida_media,
       round((sum(tokens_entrada + tokens_cache_lectura)::numeric
              / nullif(sum(llamadas), 0)), 0) as entrada_media
  from uso_ia_ops group by op, proveedor order by op;
```

`usd_real` de `imagen` sale en 0: las imágenes no tienen tokens. Su costo es
`sum(llamadas) × $0.0336` (o × $0.005 si el proveedor fue `openai`).

### `uso_ia` — agregados del mes

Columnas: `creditos`, `solicitudes`, `imagenes` (volumen por tipo),
`tokens_entrada`, `tokens_salida`, `tokens_cache_creacion`, `tokens_cache_lectura`
y, para el respaldo de texto, `solicitudes_gemini`, `tokens_entrada_gemini`,
`tokens_salida_gemini` (los tokens de Gemini NO entran en las columnas de
Anthropic: cada proveedor se cuesta con su propia tarifa).

```sql
-- Hit-rate del caché por mes (objetivo: >50% en cuanto haya ráfagas de chat)
select periodo,
       round(100.0 * sum(tokens_cache_lectura)
             / nullif(sum(tokens_entrada + tokens_cache_creacion + tokens_cache_lectura), 0)) as hit_pct
  from uso_ia group by periodo order by periodo desc;

-- Costo real (USD) por usuario-mes. Las imágenes ya NO se pueden costear desde
-- aquí (el precio depende de la calidad y del proveedor): van aparte, abajo.
select user_id, periodo,
       round((( tokens_entrada        * 1.00
              + tokens_cache_creacion * 1.25
              + tokens_cache_lectura  * 0.10) / 1e6
             + tokens_salida * 5.00 / 1e6
             + (tokens_entrada_gemini * 0.25 + tokens_salida_gemini * 1.50) / 1e6
             )::numeric, 4) as usd_texto,
       imagenes, creditos
  from uso_ia order by periodo desc, usd_texto desc;

-- Imágenes: costo por calidad Y proveedor. Es lo único que revela cuánto
-- estamos perdiendo cuando la calidad rápida cae al respaldo (Gemini).
select op, proveedor, sum(llamadas) as n,
       round((sum(llamadas) * case proveedor when 'gemini' then 0.0336 else 0.005 end)::numeric, 3) as usd,
       sum(creditos) as creditos_cobrados
  from uso_ia_ops
 where op in ('imagen', 'imagen_alta')
 group by op, proveedor order by op, proveedor;
```

⚠️ La primera consulta mezcla Haiku y Sonnet 5 bajo la tarifa de Haiku: el costo
del `modelo3d` sale subestimado ~3×. Para separarlos hay que ir a `uso_ia_ops`.

## Riesgos de costo

1. **`texto_largo`: medida y corregida a 4 (ago 2026), con residuo ACTIVO.** Se
   cobraban 3 créditos ($0.015) y el plan IA mide $0.0225 — se vendía a pérdida.
   A 4 ($0.020) el conjunto de la op deja margen, pero **el plan IA sigue
   costando $0.0056 por crédito** (12% sobre el ancla) y con los **700**
   créditos vigentes el peor caso puro es $3.94 > techo $3.50. Vigilar
   `uso_ia_ops` (consulta 1 de Telemetría) el primer mes; si el abuso aparece:
   subir a 5 (castiga a las formas cortas, que cuestan $0.004–0.010) o **partir
   la op por tope** como se hizo con la imagen — `texto_largo` para las formas
   de ≤2000 tokens y una op propia para el plan. Mitigación ya desplegada: el
   tope de `chat` bajó a 2048 para que declarar la op de 1 crédito no regale la
   salida de 4096 de `texto_largo`, y `ia-chat`/`ia-imagen` imponen límites de
   ENTRADA (system/mensajes/imagen) para que la entrada no cobrada quede acotada.
2. **Respaldo de imagen invertido**: en calidad rápida, una caída de OpenAI sirve
   con Gemini por encima de lo cobrado (ver «Respaldo entre proveedores»).
3. **Fin del precio intro de Sonnet 5 (31-ago-2026)**: el modelo 3D sube 50%.
   Ya está absorbido en la tarifa de 10 créditos. Palanca alternativa si aprieta:
   usar Haiku para los estilos simples y reservar Sonnet 5 para `detallado`.
4. **Deprecación del modelo de imagen de Gemini (oct 2026)**: solo afecta a la
   calidad buena; `GEMINI_IMAGE_MODEL` la reapunta sin redeploy.
5. **Modo local gratis**: usuarios sin ingreso que consumen auth y egress. El
   coste marginal es bajo, pero deja de estar cubierto solo por suscriptores.
6. **TTL de 5 min**: usuarios que chatean a sorbos no aprovechan el caché de
   conversación (tools compartidas sí, mientras el proxy tenga tráfico global).
7. **Palancas futuras**: TTL de 1h para tools — **ya implementada como switch**
   (`IA_CHAT_TTL_TOOLS=1h`, sin redeploy; escritura 2× vs 1.25×, rentable con ≥3
   lecturas por entrada: encender solo cuando el hit-rate muestre ráfagas
   separadas >5 min) —, recortar historial de 12 → 8 mensajes, revisar
   `maxTokens` por app con los datos de `uso_ia_ops`.
