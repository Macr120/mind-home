# Traducir MPH a 10 idiomas — plan por olas para sesiones en paralelo

Guía operativa para llevar MPH del par es/en a **diez idiomas** — pt, fr, de, it, ja,
zh, ko, ru, ar, hi — repartiendo el trabajo entre varias sesiones de Claude Code sin
que se pisen y sin gastar API. El «cómo» mecánico está en `scripts/traducir-a-mano.mjs`;
aquí está el «quién hace qué y en qué orden». Cada ola trae su encargo listo para
copiar y pegar en una sesión nueva (§5 en adelante).

**Regla de oro: con créditos de la SESIÓN, no de la API.** Los scripts
`traducir-i18n.mjs` y `traducir-contenido.mjs` llaman a la API con
`ANTHROPIC_API_KEY` y solo se usan si el usuario lo autoriza expresamente.

---

## 1. Las reglas que no cambian

El reparto no se decide por idioma sino por **qué archivo escribe cada sesión**:

| Capa | Archivo que se escribe | Se reparte por |
|---|---|---|
| Interfaz | `src/core/i18n/dict.<idioma>.ts` — uno por idioma | **idioma** |
| Tutoriales | `src/core/i18n/dict.<idioma>.tut.ts` — uno por idioma | **idioma** |
| Contenido | `src/rooms/<cuarto>/demo.data.i18n.ts` — uno por cuarto, **con todos los idiomas dentro** | **cuarto** |
| Manual de comandos | `src/core/chat/manual.<idioma>.ts` — uno por idioma | **idioma** |
| Catálogos sueltos | un solo archivo con todos los idiomas dentro | **una sola sesión** |

De ahí salen las reglas:

1. **Paraleliza por SECCIÓN (interfaz, cuartos, catálogos), no por idioma. Dentro de
   cada sesión, TODOS los idiomas de la tanda.** Leer las frases cuesta lo mismo para
   uno que para cinco idiomas; escribir el segundo sale casi gratis comparado con
   volver a leer en otra sesión.
2. **Contenido: una sesión por cuarto.** Dos sesiones no pueden compartir un
   `demo.data.i18n.ts`; los `.json` intermedios de `traducciones/` sí son por idioma
   y no chocan.
3. **El glosario ANTES que nada**: `scripts/traducir/glosario.mjs` tiene que estar
   cerrado para todos los idiomas de la tanda (término fijo por concepto, tratamiento
   y las decisiones de contenido). Si no, cada sesión inventa su propio «meta» y no
   concuerdan.
4. **Verificar sin chocar**: durante el trabajo, `node scripts/verificar-i18n.mjs`
   (no compila, no toca nada compartido). `npx tsc -b` **solo al final y en una sola
   sesión**: dos builds a la vez se pelean por `.tsbuildinfo`.
5. **Se termina y se juzga una tanda antes de abrir la siguiente**: europeos
   (olas 1–3), luego no latinos (olas 4–6), luego árabe (ola 7). Así cada idioma se
   puede revisar de punta a punta y los errores de método no se multiplican por diez.
6. **Más sesiones en paralelo acortan el reloj, no el gasto**: el total de tokens es
   el mismo y la cuota es compartida. Tres o cuatro a la vez es el punto razonable.

---

## 2. El mapa: idiomas y estado

Estado al 12 ago 2026 (`node scripts/verificar-i18n.mjs` da el actual):

| Idioma | dict (5.883) | tut (612) | contenido (~3.670) | alta en `idiomas.ts` |
|---|---|---|---|---|
| pt | 5.883 ✓ | 612 ✓ | solo jardín (261) | ✓ |
| fr | 676 | 0 | — | ✓ |
| de | 676 | 0 | — | ✓ |
| it | 676 | 0 | — | ✓ |
| ja, zh, ko, ru, hi | 11 (arranque) | 0 | — | ✓ (Ola 0, 12 ago 2026) |
| ar | — | — | — | ✗ (Ola 7, después del RTL) |

Volumen por idioma: 5.878 claves de interfaz (139 KB en inglés) + 612 pasos de
tutorial (53 KB) + ~3.670 textos de contenido (212 KB). **La misión entera ronda
varios millones de tokens de sesión: es trabajo de días con 3–4 sesiones a la vez,
no de una tarde.** Como ancla medida: la interfaz de 3 idiomas en una sesión
son ~344 K tokens; repartida en tres sesiones, ~624 K.

---

## 3. Modelo y esfuerzo por bloque

El cuello de botella es producir texto, no razonar: el glosario ya decidió lo difícil.

| Bloque | Modelo | Esfuerzo | Por qué |
|---|---|---|---|
| Interfaz (`dict`) | Sonnet 5 | bajo | 5.878 cadenas cortas, muy mecánico |
| Tutoriales (`tut`) | Opus 5 | medio | 612 textos largos; aquí se oye la voz |
| Contenido del demo | Sonnet 5 | bajo | narrativo pero con el tono ya fijado |
| Diario cultural | Opus 5 | medio | la palabra del día se SUSTITUYE, no se traduce |
| Sísifo, especies | Opus 5 | bajo | pocos textos, muy visibles, evocativos |
| Manual de comandos | Sonnet 5 | bajo | frases que el usuario teclea: naturales y llanas |
| Cuarto Idiomas (Ola 5) | Opus 5 | medio | cada tarjeta pide criterio, no traducción plana |
| Ola 0 y RTL (Ola 7) | el de la sesión | medio | son sesiones de CÓDIGO, no de traducción |

El mismo reparto vale para los no latinos: el registro (です・ます, 해요체, आप…) no lo
decide el modelo sino el glosario.

---

## 4. Las olas de un vistazo

```
Ola 0  Cimientos ja/zh/ko/ru/hi (+ glosario ar)   ─┐ arrancan HOY en paralelo:
Ola 1  Interfaz europea: fr/de/it + arreglo pt    ─┘ no comparten archivos
Ola 2  Contenido europeo (4 sesiones × 4 idiomas)
Ola 3  Catálogos europeos (K-1 · K-manual · K-diario)      ← puede solaparse con la 2
Ola 4  Interfaz no latina (N-cjk · N-ruhi)                 ← necesita la Ola 0
Ola 5  Contenido no latino (4 sesiones × 5 idiomas) + cuarto Idiomas (9 idiomas)
Ola 6  Catálogos no latinos + medios RSS (K-medios va cuando quieras: archivo propio)
Ola 7  Árabe: R-rtl (código) → A-1 (interfaz) → A-2 (contenido y catálogos)
Ola 8  Cierre: verificación, tsc -b, build y revisión en la app
```

Dentro de una ola, las sesiones listadas no comparten archivos y pueden ir a la vez
(respetando el tope de 3–4). Entre olas, la frontera es de método y de cuota, no
siempre de archivos: la 3 puede solaparse con la 2, y K-medios con cualquiera.

---

## 5. Ola 0 — Cimientos de los seis nuevos (una sesión de código)

**HECHA el 12 ago 2026.** ja, zh, ko, ru e hi están dados de alta con sus
cargadores y sus `dict` de arranque (11 claves cada uno); el glosario tiene los
seis idiomas y un bloque `DECISIONES` (género, viaje del año demo —en la rama
japonesa el destino es **España**—, perfil principal y cifras); el verificador
usa factor de longitud por idioma. `N-cjk` y `N-ruhi` ya pueden entrar.

Sin esto no se puede traducir ni una frase de ja/zh/ko/ru/ar/hi. Es código y
decisiones, no traducción. Encargo:

> Prepara MPH para cinco idiomas nuevos (ja, zh, ko, ru, hi) y deja cerrado el
> glosario del árabe. NO traduzcas nada todavía: esta sesión solo pone los cimientos.
>
> 1. `scripts/traducir/glosario.mjs`: añade **ja, zh, ko, ru, ar, hi** con su
>    `nombre`, su `registro` y su tabla `terminos` (los mismos conceptos que
>    pt/fr/de/it). El registro NO hereda el tuteo europeo: japonés en です・ます,
>    coreano en 해요체, chino con 你, ruso con «ты», hindi con «आप», árabe estándar
>    moderno en trato directo. Añade además un bloque `DECISIONES` con las políticas
>    que el contenido necesita: (a) la **arroba de género** («Pep@», «inquiet@») se
>    resuelve REESCRIBIENDO la frase para esquivar la forma marcada en ru/ar/hi, y en
>    ja/zh/ko desaparece sola; (b) el **destino del viaje** del año demo en la rama
>    ja — en japonés Pep@ no puede viajar a su propio país a aprender su propio
>    idioma: fija un destino equivalente y qué se adapta (moneda, comida, frases
>    sueltas del idioma local); revisa si zh/ko necesitan retoques menores; (c) qué
>    idioma **estudia Pep@ en el cuarto Idiomas** en cada rama (`PERFIL_PRINCIPAL`);
>    (d) **cifras** del árabe y del hindi (occidentales u orientales/devanagari).
> 2. `src/core/i18n/idiomas.ts`: da de alta ja, zh, ko, ru, hi con su bandera,
>    `locale` (ja-JP, zh-CN, ko-KR, ru-RU, hi-IN) y `nombreIA`. El árabe NO se da de
>    alta aún: sin RTL se vería roto; llega en la Ola 7.
> 3. `src/core/i18n/dict.ts`: cargadores en `CARGADORES` y `CARGADORES_TUT` para los
>    cinco, con sus `dict.<id>.ts` y `dict.<id>.tut.ts` de arranque (copia el patrón
>    del `dict.de.ts` inicial: cabecera + export casi vacío; los llena `meter-dict`).
> 4. `scripts/verificar-i18n.mjs`: **factor de longitud POR idioma** en vez del 1,6
>    fijo. El CJK sale más corto que el inglés (una traducción que pase de ~1,2× es
>    sospechosa) y el ruso y el hindi más largos (súbelos a ~1,9× para no ahogar en
>    falsas alarmas). 1,6 queda como valor por defecto.
> 5. Tipografía y cortes: en `core/ui/tipografias.ts` decide qué hacen las pilas
>    «manuscrita» y «redondeada», que no tienen glifos CJK, devanagari ni árabes (lo
>    limpio: en esos idiomas caer a la pila base en vez de mezclar sustitutos).
>    Revisa `word-break`/`overflow-wrap` donde el corte de línea confía en el
>    espacio: el CJK no separa palabras.
> 6. Verifica con `npx tsc -b` y `node scripts/verificar-i18n.mjs`: los cinco nuevos
>    deben salir listados con 0 claves, no como error.

---

## 6. Ola 1 — Interfaz europea

Modelo **Sonnet 5, esfuerzo bajo** para el bloque `dict`; cambia a **Opus 5, esfuerzo
medio** al llegar a `--tut`.

### Sesión `I-multi` — la recomendada

**Por defecto: UNA sesión con los tres idiomas.** Para los ~40 trozos de la interfaz
son ~344 K tokens juntos frente a ~624 K en tres sesiones: un 45 % menos de cuota, y
traducir la misma frase a tres idiomas seguidos sale más coherente.

> Traduce la interfaz de Mind Planner Home al **francés, alemán e italiano a la vez**,
> usando los créditos de esta sesión. NO uses la API ni `scripts/traducir-i18n.mjs`.
>
> MPH es una app donde la vida del usuario es una casa isométrica 3D y cada cuarto una
> mini-app (cocina, ejercicio, finanzas, viajes…), con gamificación suave y asistentes
> que charlan. El español es el original; el inglés, su traducción ya curada.
>
> 1. `node scripts/traducir-a-mano.mjs sacar-dict fr` (y lo mismo con `de` e `it`). Los
>    tres reparten las MISMAS claves en los mismos trozos numerados, dentro de
>    `traducciones/dict-fr/`, `dict-de/` y `dict-it/`.
> 2. Trabaja **trozo a trozo**: lee `dict-fr/NN.json` UNA vez y, con él en contexto,
>    escribe los tres `NN.hecho.json` (en `dict-fr/`, `dict-de/` y `dict-it/`) en tres
>    turnos distintos, uno por idioma. Ese es todo el ahorro: la lectura se paga una vez.
> 3. Cada cuatro o cinco trozos, consolida los tres:
>    `node scripts/traducir-a-mano.mjs meter-dict fr` (y `de`, `it`). Es incremental y no
>    destructivo, así que consolida a menudo: si se corta la sesión no pierdes nada.
> 4. Al terminar la interfaz, repite la ronda entera con la capa de tutoriales:
>    `sacar-dict <idioma> --tut` … `meter-dict <idioma> --tut`. Ahí conviene subir a
>    Opus 5 con esfuerzo medio: son textos largos y llevan la voz de la app.
>
> Reglas de traducción:
> - Lee `scripts/traducir/glosario.mjs` ANTES de traducir nada. Tiene un término fijo por
>   concepto **para cada idioma** y el tratamiento (de tú en los tres). Respétalo: si dos
>   trozos traducen «meta» distinto, la misma pantalla acaba incoherente.
> - Traduce desde el ES, que es el original; el EN está para desambiguar. Si una ficha no
>   trae ES, traduce del EN.
> - Los marcadores `{nombre}`, `{n}`, `{total}` se copian TAL CUAL, sin traducir ni
>   renombrar. **La referencia de los marcadores es el inglés.**
> - «Mind Planner Home» y «MPH» nunca se traducen. No añadas emojis que el original no
>   tenga. Conserva mayúscula inicial, signos finales y saltos de línea.
> - Botones, pestañas y menús son estrechos: si el inglés cabe en una o dos palabras, la
>   traducción también. El alemán es el que más se pasa de largo: vigílalo.
>
> Solo puedes escribir en `traducciones/dict-{fr,de,it}*/` y en los
> `src/core/i18n/dict.{fr,de,it}.ts` y sus `.tut.ts`. Hay otras sesiones trabajando:
> no toques ningún otro archivo.
>
> Verifica con `node scripts/verificar-i18n.mjs`. NO ejecutes `npx tsc -b`: lo corre una
> sola sesión al final.

**Alternativa `I-fr` / `I-de` / `I-it`** (una sesión por idioma): solo si el reloj
aprieta más que la cuota — tres sesiones acaban en un tercio de tiempo pero gastan
casi el doble. El encargo es el mismo de arriba en singular: `sacar-dict fr`, trozos
`NN.json` → `NN.hecho.json`, `meter-dict fr` a menudo, luego `--tut`, y solo puede
escribir en `traducciones/dict-fr*/` y `src/core/i18n/dict.fr.ts`/`dict.fr.tut.ts`.

### Sesión `I-pt` (corta)

> En Mind Planner Home hay 95 claves del diccionario portugués que perdieron su marcador
> `{var}` al traducirse y quedaron con código JavaScript dentro de la frase, y 2 sin
> traducir. Reháztelas usando los créditos de esta sesión, sin usar la API.
>
> 1. `node scripts/verificar-i18n.mjs --solo=pt` te las lista.
> 2. `node scripts/traducir-a-mano.mjs sacar-dict pt` saca exactamente esas (el script da
>    por pendiente toda clave cuyos marcadores no cuadren con el inglés).
> 3. Traduce cada `NN.json` a `NN.hecho.json` con `[{clave, texto}]` y consolida con
>    `node scripts/traducir-a-mano.mjs meter-dict pt`.
>
> Estas claves vienen casi todas SIN español, y es a propósito: su fallback en el código
> es un template literal con `${...}` de JavaScript, que no es un marcador de `t()`.
> Tradúcelas desde el inglés y copia sus `{marcadores}` tal cual.
>
> Sigue `scripts/traducir/glosario.mjs` (portugués de Brasil, tratamiento de «você»). Solo
> puedes escribir en `traducciones/dict-pt*/` y en `src/core/i18n/dict.pt.ts`. Verifica con
> `node scripts/verificar-i18n.mjs --solo=pt`; no ejecutes `npx tsc -b`.

---

## 7. Ola 2 — Contenido europeo (una sesión por grupo de cuartos, 4 idiomas)

Reparto en cuatro sesiones de carga parecida. `jardin` ya tiene el portugués hecho:
esa sesión solo le añade fr, de e it (al resto de cuartos les falta también el pt).

| Sesión | Cuartos | Frases (×4 idiomas) |
|---|---|---|
| `C-1` | anecdotario, agenda, garage, cocina | 477 |
| `C-2` | jardin, cocina-recetas (`--recetas`) | 484 |
| `C-3` | biblioteca, sala, descanso, hobbies | 431 |
| `C-4` | ideas, ejercicio, computo, despacho, entretenimiento | 538 |

`idiomas` queda fuera a propósito: se hace en la Ola 5 (`C-idiomas`).

Plantilla de encargo (Sonnet 5, esfuerzo bajo), cuarto a cuarto dentro de la sesión:

> Traduce el contenido del cuarto `<cuarto>` a **pt, fr, de e it**, con créditos de
> sesión (NO uses la API ni `traducir-contenido.mjs`).
>
> 1. `node scripts/traducir-a-mano.mjs sacar <cuarto>`
> 2. Lee `traducciones/<cuarto>.pendientes.json` UNA vez y escribe los cuatro archivos
>    `traducciones/<cuarto>.<idioma>.json` con `[{ruta, texto}]`.
> 3. `node scripts/traducir-a-mano.mjs meter <cuarto> <idioma>` para cada idioma.
>
> Sigue el glosario y el tratamiento de `scripts/traducir/glosario.mjs`. Es un diario en
> primera persona: adapta la cultura (monedas, comidas, lugares) pero no lo que pasó.
> No toques ningún archivo fuera de `traducciones/` y de `src/rooms/<cuarto>/`.
> Verifica con `node scripts/verificar-i18n.mjs`; no ejecutes `npx tsc -b`.

---

## 8. Ola 3 — Catálogos europeos

Los que viven en un único archivo con todos los idiomas dentro van en **una sola
sesión** cada grupo (archivos distintos ⇒ pueden ir a la vez, incluso solapadas con
la Ola 2):

- **`K-1`** — Sísifo (12 rangos + 52 insignias + 5 categorías), especies del diario,
  fórmulas de cómputo, ejemplos y mapas de Ideas, metas y hábitos del demo, ejemplos
  de fábrica y los textos sueltos de los builders. ~800 frases, 20 KB. Opus 5 para
  Sísifo y especies (evocativos), Sonnet 5 para el resto.
- **`K-manual`** — el manual de comandos (`src/core/chat/manual.<idioma>.ts`,
  234 frases por idioma). Sonnet 5: frases que el usuario teclea, naturales y llanas.
  Respeta el marcado `[así]`/`{así}` del manual.
- **`K-diario`** — el diario cultural (560 frases). **Necesita criterio, no
  traducción** (Opus 5): la palabra del día se SUSTITUYE por una palabra bonita de
  ESE idioma, y de la obra y el libro solo cambia el título del artículo de Wikipedia.

En los tres encargos: todos los idiomas de la tanda (pt, fr, de, it) en la misma
pasada, glosario primero, verificar con `verificar-i18n.mjs`, nada de `tsc -b`.

---

## 9. Ola 4 — Interfaz no latina (tras la Ola 0)

Dos sesiones en paralelo, agrupadas por escritura; el mismo flujo de `I-multi`:

| Sesión | Idiomas | Registro (ya fijado en el glosario) |
|---|---|---|
| `N-cjk` | ja, zh, ko | です・ます · 你 · 해요체 |
| `N-ruhi` | ru, hi | ты · आप |

Encargo de `N-cjk` (el de `N-ruhi` es igual cambiando idiomas y reglas propias):

> Traduce la interfaz de Mind Planner Home al **japonés, chino simplificado y coreano
> a la vez**, con créditos de esta sesión. NO uses la API ni `traducir-i18n.mjs`.
>
> MPH es una app donde la vida del usuario es una casa isométrica 3D y cada cuarto una
> mini-app, con gamificación suave y asistentes que charlan. El español es el original;
> el inglés, su traducción ya curada.
>
> 1. `node scripts/traducir-a-mano.mjs sacar-dict ja` (y `zh`, `ko`): mismos trozos
>    numerados en `traducciones/dict-ja/`, `dict-zh/`, `dict-ko/`.
> 2. Trozo a trozo: lee `dict-ja/NN.json` UNA vez y escribe los tres `NN.hecho.json`
>    en turnos separados, uno por idioma.
> 3. Consolida a menudo: `meter-dict ja` / `zh` / `ko` (incremental, no destructivo).
> 4. Al terminar, la capa de tutoriales con `--tut` y **Opus 5, esfuerzo medio**.
>
> Reglas (además de las de siempre: glosario primero, marcadores `{x}` TAL CUAL con el
> inglés de referencia, «MPH» sin traducir, sin emojis nuevos, saltos de línea):
> - El registro lo fija el glosario: です・ます en japonés, 해요체 en coreano, 你 en
>   chino. Nada de calcar el tuteo español.
> - En CJK la traducción sale normalmente MÁS CORTA que el inglés: si te queda más
>   larga, sospecha de paráfrasis. En botones, brevedad máxima.
> - Puntuación nativa (、。en ja; ，。en zh) y sin espacios de relleno; el coreano sí
>   separa palabras con espacio.
> - La arroba de género («Pep@») desaparece: escribe la frase neutra natural.
>
> Solo puedes escribir en `traducciones/dict-{ja,zh,ko}*/` y en
> `src/core/i18n/dict.{ja,zh,ko}.ts` y sus `.tut.ts`. Verifica con
> `node scripts/verificar-i18n.mjs --solo=ja` (y `zh`, `ko`); no ejecutes `npx tsc -b`.

Para `N-ruhi`, sustituye las reglas propias por: registro «ты» en ruso y «आप» en
hindi; el ruso y el hindi salen MÁS LARGOS que el inglés — en botones y pestañas
recorta hasta que quepa; la arroba de género se esquiva REESCRIBIENDO la frase
(política del glosario); cifras en hindi según lo decidido en el glosario.

---

## 10. Ola 5 — Contenido no latino + cuarto Idiomas

Los mismos cuatro grupos de cuartos de la Ola 2 (`C-1b`…`C-4b`), ahora a
**ja, zh, ko, ru, hi** (cinco `.json` por cuarto). La plantilla es la de §7 con dos
añadidos al encargo:

> - Aplica las `DECISIONES` del glosario: en la rama **ja** el viaje del año cambia de
>   destino tal y como está decidido allí (con su moneda y su comida); la arroba de
>   género se esquiva reescribiendo en ru/hi y desaparece en ja/zh/ko.
> - Adapta la cultura como siempre (monedas, comidas, lugares) pero no lo que pasó.

Y la sesión que no existía en la tanda europea:

### Sesión `C-idiomas` (los 9 idiomas, Opus 5, esfuerzo medio)

> El cuarto `idiomas` está EXCLUIDO del flujo normal (constante `FUERA` de
> `traducir-contenido.mjs`) porque son tarjetas de vocabulario: en la rama española
> Pep@ aprende inglés y en la inglesa aprende español, así que la regla «es≠en ⇒
> traducible» pondría el término A APRENDER en el idioma de la interfaz — justo lo
> contrario de lo que debe pasar.
>
> 1. Aplica la decisión `PERFIL_PRINCIPAL` del glosario: qué idioma estudia Pep@ en
>    cada rama (`src/rooms/idiomas/demo.ts`).
> 2. Con eso fijado, traduce SOLO las glosas, los ejemplos y el texto alrededor (nunca
>    los términos a estudiar) a pt, fr, de, it, ja, zh, ko, ru e hi.
> 3. No toques nada fuera de `traducciones/` y `src/rooms/idiomas/`.

---

## 11. Ola 6 — Catálogos no latinos + medios

- **`K-1b`**, **`K-manual-b`**, **`K-diario-b`** — los mismos encargos de la Ola 3
  con ja, zh, ko, ru, hi. En `K-diario-b` la palabra del día se sustituye por una
  palabra bonita NATIVA de cada idioma (no una traducción de la española).
- **`K-medios`** — archivo propio, puede ir en cualquier momento y necesita red:

> Los medios del diario (`src/rooms/diario/fuentes.ts`) son curación, no traducción:
> un lector japonés quiere prensa japonesa, no El País traducido. Para cada idioma
> dado de alta (pt, fr, de, it, ja, zh, ko, ru, hi — y ar cuando llegue) busca 3–5
> feeds RSS nativos de prensa generalista más alguno cultural, VERIFICA cada uno con
> una petición real (que devuelva XML válido) y marca `proxy: true` en los que no
> abran CORS. Las efemérides NO se tocan: ya usan la Wikipedia de cada idioma.

---

## 12. Ola 7 — Árabe (tres fases, en orden)

El árabe es un proyecto aparte: pide RTL y la app está escrita con utilidades
direccionales de Tailwind. Traducirlo antes de que la interfaz sepa espejarse es
traducir sobre un layout que habrá que rehacer.

### Fase `R-rtl` (sesión de código, sin traducir nada)

> Prepara la interfaz de MPH para espejarse en RTL. NO traduzcas nada.
>
> 1. `dir` dinámico en `<html>` según el idioma activo (ar → `rtl`).
> 2. Barre las utilidades direccionales de Tailwind y pásalas a lógicas:
>    `left-`/`right-` → `start-`/`end-`, `ml-`/`mr-` → `ms-`/`me-`, `pl-`/`pr-` →
>    `ps-`/`pe-`, `text-left`/`right` → `text-start`/`end`, `rounded-l`/`r` →
>    `rounded-s`/`e`, `border-l`/`r` → `border-s`/`e`. OJO: lo que es geometría de
>    verdad (canvas 3D, coordenadas, el D-pad) NO se espeja.
> 3. Revisa a mano lo señalado: menú lateral flotante, HUD por cuadrantes, rueda de
>    herramientas, y las flechas/iconos que apuntan (los chevrons de navegación se
>    espejan; play y similares, no).
> 4. Prueba con pseudo-RTL: fuerza `dir="rtl"` con la interfaz aún en español y
>    recorre la app entera; lo que se vea roto se arregla ANTES de traducir.
> 5. `npx tsc -b` y `npm run build` al final (esta sesión sí, porque es de código).

### Fase `A-1` — alta + interfaz

> Da de alta el árabe y traduce su interfaz, con créditos de sesión (NO API).
>
> 1. Alta en `src/core/i18n/idiomas.ts` (locale `ar-SA`, `nombreIA` árabe) y sus
>    cargadores en `dict.ts`, siguiendo el patrón de los demás.
> 2. El flujo de siempre: `sacar-dict ar` → trozos → `meter-dict ar` → `--tut` con
>    Opus 5. Sigue el glosario: registro, política de género (reescribir para
>    esquivar la forma marcada) y cifras según lo decidido en la Ola 0.
> 3. El ruso ya avisó del largo; el árabe también tiende a crecer: en botones, corto.
> 4. Verifica con `node scripts/verificar-i18n.mjs --solo=ar` y revisa en la app con
>    el RTL ya activo: el texto árabe sobre un layout espejado es la prueba real.

### Fase `A-2` — contenido y catálogos

Los grupos `C-1`…`C-4` + `C-idiomas` + `K-1`/`K-manual`/`K-diario` de las olas
anteriores, solo para `ar`, con las mismas plantillas y las `DECISIONES` del glosario.

---

## 13. Ola 8 — Cierre (una sola sesión)

> Cierra la tanda de idiomas de MPH:
>
> 1. `node scripts/verificar-i18n.mjs` completo: 0 errores (los avisos de longitud se
>    revisan uno a uno en su botón).
> 2. `npx tsc -b` y `npm run build` — aquí sí, y solo esta sesión.
> 3. Revisión en la app idioma por idioma (`npm run dev`, selector de Configuraciones):
>    botones estrechos en de/ru/hi/ar, cortes de línea en CJK, tutoriales con la voz y
>    el registro correctos, RTL espejado en ar, y una pasada por el año demo del cuarto
>    con más contenido.
> 4. Apunta el estado final y lo que quede en `docs/AVANCE.md`.

---

## 14. Por dónde empezar HOY

**El modo por defecto ya no es este: es el orquestador de §15.** Las sesiones
manuales de las olas (§5–§13) quedan como alternativa si se prefiere trabajar a mano
o si el orquestador está `PAUSADO`. `E-0` e `I-pt` ya están hechas.

---

## 15. Modo orquestador (bitácora y protocolo)

Una sesión orquestadora (Fable 5) dirige obreros Sonnet (subagentes en paralelo) y
revisores Opus, con créditos de sesión. El disco es la fuente de verdad: trozo
`NN.json` sin `NN.hecho.json` = pendiente; `dict.*.ts` = consolidado;
`verificar-i18n` = verdad mecánica.

**Regla mientras `ESTADO: ACTIVO`**: ninguna otra sesión ejecuta `sacar`/`meter` ni
escribe en `traducciones/`. Las dos colisiones letales son un `sacar-dict` concurrente
(renumera los trozos) y dos escritores del mismo `NN.hecho.json`.

**Bucle de ronda**: anotar el roster aquí ANTES de lanzar → 12–15 obreros en
background (lote = 3 trozos de dict, 2 de tut, 1 cuarto×idioma de contenido) →
validar JSON de cada `.hecho.json` → QA muestral del orquestador ANTES de meter
(marcadores, términos del glosario, passthrough es/en) → `meter-dict` en serie →
`verificar-i18n --solo=xx` → actualizar bitácora → ronda siguiente. Revisor Opus tras
la ronda 2 de cada capa nueva y al cerrar cada idioma. Repesca: `sacar-dict` SOLO con
el inventario agotado; máximo 2 repescas y el residuo lo corrige el orquestador.

**Protocolo de arranque de una sesión nueva** («continúa la misión de traducción»):
1) leer esta sección → 2) contar `NN.json` vs `NN.hecho.json` en `traducciones/` →
3) validar y meter todo lo hecho suelto → 4) `verificar-i18n` → 5) reanudar por el
roster: los trozos del roster sin `.hecho` se reasignan tal cual.

### Bitácora

```
ESTADO: ACTIVO desde 12 ago 2026 · Fase A (dict fr/de/it) · Ronda 1
Orden de fases: A dict+tut fr/de/it → B contenido europeo C-1..C-4 + catálogos →
C dict+tut ja/zh/ko/ru/hi → D contenido no latino + C-idiomas → E catálogos + medios →
F cierre (tsc -b, build). El árabe queda fuera (Ola 7, tras RTL).

Inventario dict: fr 40 trozos (hecho 01) · de 43 (hechos 01-04) · it 43 (hechos 01-04)

Ronda 1 CERRADA (12 obreros, 36 trozos): 100 % de fichas, 0 vacías, 0 marcadores
rechazados por meter-dict, registro limpio (0 vous/Lei; los «Sie» del de son
pronombre, no tratamiento). El 1er intento se cortó por cuota sin escribir nada.

Ronda 2 CERRADA (12 obreros, 36 trozos): 100 % fichas, 0 vacías, 0 rechazos.
Parches del orquestador antes de meter: «nueve modos»→ocho en los 3 idiomas (la
fuente ES está mal: modos.ts define 8; chip lanzado para corregir el ES) y
=SOMME/=SUMME/=SOMMA→=SUM en placeholder y tutorial de hojas (el motor solo
acepta SUMA y el alias SUM, ver funcionesHoja.ts:113).

Ronda 3: 2º corte de cuota a mitad (reset 7:10). Lo escrito antes del corte se
validó (0 parciales) y se metió. Parche del orquestador: las «mascotas» de
Agenda son animales REALES (veterinario), no el tamagotchi del glosario → en fr
7 claves agenda.* pasaron de «mascotte» a «animal»; aviso preventivo añadido a
los obreros de/it de la zona 42-43 (Haustier / animale domestico).

Ronda 3-bis CERRADA. Los 3 revisores Opus dictaminaron «sin deriva de registro
ni de glosario» y dejaron ~37 hallazgos puntuales, TODOS aplicados sobre los
.hecho.json: fr (Paramètres unificado, app/appli/application→app,
brainstorming→remue-méninges, apóstrofo tipográfico global ’, 4 colisiones de
nombres de cuarto, género neutro en visitado), it (Cestino→Cesta,
Attivi→Attività/Passività, carte vs schede, 6 calcos reescritos), de
(Aktiva/Passiva, Behördengänge, KW {n}, guiones con espacio, Strikeout).
CORRECCIÓN IMPORTANTE: el motor de hojas solo evalúa funciones en ESPAÑOL
(FUNCIONES_HOJA; A_OOXML es solo export) → los ejemplos quedan =SUMA( en los
tres idiomas; el dict.en también enseña =SUM( y está MAL (chip lanzado).

ESTADO DICT: **pt, fr, de, it — 5883/5883 LOS CUATRO ✓** (capa interfaz europea
COMPLETA, 0 errores del verificador). Quedan los avisos de longitud (~370) para
la revisión visual del cierre.

Ronda T1 CERRADA: tut 260/612 en fr/de/it, 0 errores. Unificaciones aplicadas
al cierre: «Retirer la puce», tut.chat.resumen Gym/Palestra, «Registrazioni»,
pestaña «Extra(s)» en tut.menu-plantillas, Pep@→Pep global, incisos alemanes
con guion espaciado (– así –) en TODO el material.

Ronda T2 CERRADA (el 1er intento lo cortó la cuota sin escribir; el 2º entregó
los 33 trozos completos). Correcciones del cierre: onglet Cardio→Endurance (fr),
granja.sinComida de→«ernte in Essen», euros→pesos en 2 pasos fr (la app formatea
MXN: el tutorial describe la pantalla). La clave nueva ideas.ia.sinClave
(en 5883→5884) se tradujo a los 4 idiomas a mano.

★ FASE A TERMINADA (12 ago 2026): pt, fr, de, it — dict 5884/5884 y tut 612/612
los cuatro, verificador sin errores. Quedan ~376 avisos de longitud para la
revisión visual del cierre (Fase F).

FASE B — C-1 CERRADO: anecdotario 249 · agenda 88 · garage 58 · cocina 82,
los cuatro × pt/fr/de/it consolidados en sus demo.data.i18n.ts (16 meter).
DECISIÓN DE MONEDA (rige para C-3 sala y C-4 despacho): el AHORRO del viaje en
la rama pt va en reales ≈×6 (2.400→14.400 · 1.010→6.060 · 2.600→15.600); el
resto de importes queda en euros. fr/de/it no convierten nada (ya es euro).
Los nombres de negocio mexicanos (Taller Rivas, Grúas Tepeyac…) NO se traducen.

C-2 EN VUELO (7 obreros Sonnet): jardin × fr/de/it (261 frases; pt ya estaba) +
recetario × pt/fr/de/it (223 frases, flag --recetas). OJO: --recetas reutiliza
cocina.pendientes.json y cocina.<id>.json — consolidar con «meter cocina <id>
--recetas» y no re-extraer la cocina normal hasta entonces.

ALCANCE ACORDADO CON EL USUARIO (12 ago): esta sesión termina los 4 idiomas
europeos AL 100 % y se DETIENE. Los no latinos (ja/zh/ko/ru/hi: Fases C-D) y el
árabe (Ola 7) arrancan en OTRA conversación con el protocolo de arranque de esta
sección. K-medios (RSS por idioma) también queda para esa tanda.

C-2 CERRADO (jardin ×4 + recetario ×4). C-3 CERRADO (biblioteca 159, sala 160,
descanso 61, hobbies 51 — ×4 idiomas, 16 meter). Unificación aplicada: exónimos
pt Quioto/Tóquio en todos los cuartos.

C-4 CERRADO (ideas 164 · ejercicio 125 · computo 107 · despacho 96 · entret 46
— ×4, 20 meter). CATÁLOGOS CERRADOS: Sísifo (121 entradas ×4), especies (50),
planes (17) + metas (18) del demo, ejemplos de fábrica (7 ejemplos.data.ts +
agenda/despacho/ideas ejemplos.ts; OJO: el generador pisaría las ramas nuevas —
chip lanzado), builders (jardin/hobbies/despacho demo.ts), mapas demo (8),
fórmulas de cómputo (catalogoPt/Fr/De/It.ts + registro), manual de comandos ×4
(220 frases + 14 atajos), diario cultural (40×4 secciones ×4 idiomas, palabra
del día SUSTITUIDA por nativa), cuarto Idiomas (perfiles + 216 fichas, términos
copiados y glosas traducidas).

═══════════════════════════════════════════════════════════════════
ESTADO: PAUSADO — ★★ TANDA EUROPEA TERMINADA AL 100 % (12 ago 2026) ★★
pt, fr, de, it: dict 5884/5884 · tut 612/612 · contenido de los 15 cuartos +
recetario · catálogos completos. verificar-i18n: 0 errores (376 avisos de
longitud para revisión visual). npx tsc -b: exit 0. npm run build: ✓.

QUEDA PARA LA PRÓXIMA CONVERSACIÓN (arrancar con el protocolo de arriba):
1. Fase C: dict + tut de ja/zh/ko/ru/hi (sacar-dict por idioma; 5872 claves y
   612 pasos cada uno; solo tienen las 11 de arranque).
2. Fase D: contenido no latino ×5 (C-1..C-4 + Idiomas con su política) — aplicar
   DECISIONES: en la rama ja el viaje va a ESPAÑA; ahorro en yenes ≈390.000.
3. Fase E: catálogos ×5 + K-medios (RSS nativos por idioma, con peticiones
   reales; también para pt/fr/de/it, que siguen leyendo El País).
4. Ola 7: árabe (R-rtl primero, luego alta + interfaz + contenido).
5. Revisión visual en la app de los ~376 avisos de longitud (receta de
   mind-home-verificar-en-demo) y los títulos de Wikipedia dudosos del diario
   (anotados por el obrero del catálogo cultural).
Pendientes de fondo (chips lanzados): «nueve modos» en el ES del tutorial de la
calculadora · =SUM en dict.en · generador de ejemplos debe conservar idiomas.
═══════════════════════════════════════════════════════════════════

ESTADO: ACTIVO desde 12 ago 2026 (2ª sesión) · Fase C (dict ja/zh/ko/ru/hi) · Ronda 1
Inventario dict: 43 trozos × 5 idiomas (5873 claves c/u). Los trozos son
IDÉNTICOS entre idiomas: el obrero CJK lee dict-ja/NN.json y escribe los
NN.hecho.json de ja+zh+ko; el obrero RUHI lee dict-ru/NN.json y escribe ru+hi.

Roster Ronda 1 (14 obreros Sonnet):
CJK-A 01-02 · CJK-B 03-04 · CJK-C 05-06 · CJK-D 07-08 · CJK-E 09-10 ·
CJK-F 11-12 · CJK-G 13-14 · CJK-H 15-16
RUHI-A 01-02 · RUHI-B 03-04 · RUHI-C 05-06 · RUHI-D 07-08 · RUHI-E 09-10 ·
RUHI-F 11-12

Ronda 1 CERRADA (14 obreros, 72 archivos): QA mecánico 0 fallos (conteos,
claves, marcadores del EN, vacíos). meter: ja/zh/ko 2620/5884 · ru/hi
1939/5884 · verificador sin errores (387 avisos de longitud, van al cierre).
Unificaciones del orquestador: hi Sabio ऋषि→गुरु (6) · ru tab Пассивы (no
Обязательства) · hi patrimonio निवल संपत्ति→पूंजी/शुद्ध पूंजी (la referencia
«Patrimonio › Pasivos» cruzaba trozos y no cuadraba con el nombre de la
pestaña) · ru tutor наставник→репетитор (7, parcheado TAMBIÉN en dict.ru.ts
porque ya estaba metido). Para el revisor Opus tras R2: hi «क्षेत्र» usado para
«campo» de Biblioteca colisiona con «ámbito» del glosario; en.arbolDesc trae
un «()» vacío (bug del EN, sumar al chip de =SUM).
Terminología fijada en R1 (obligatoria para R2+): Sabio 賢者/智者/현자/Мудрец/गुरु
· destilar 抽出/提炼/추출/обобщить/सार निकालें · tutor de Idiomas 先生/老师/
선생님/репетитор/ट्यूटर · patrimonio 純資産/净资产/순자산/Капитал/पूंजी (neto
Чистый капитал/शुद्ध पूंजी) · Activos/Пасivos Активы/Пассивы · hi संपत्ति/
देनदारियां · ko: {nombre}님 antes de partícula · MCER 初級…最上級/入门…精通/
초급…최상급 · juegos con nombre asentado, Paintball y «1 vs 1» en latín.

Roster Ronda 2 (14 obreros Sonnet):
CJK-I 17-18 · CJK-J 19-20 · CJK-K 21-22 · CJK-L 23-24 · CJK-M 25-26 ·
CJK-N 27-28 · CJK-O 29-30 · CJK-P 31-32
RUHI-G 13-14 · RUHI-H 15-16 · RUHI-I 17-18 · RUHI-J 19-20 · RUHI-K 21-22 ·
RUHI-L 23-24

Ronda 2 CERRADA (14 obreros, 72 archivos): QA 0 fallos; meter: ja/zh/ko
5023/5884 · ru/hi 3858/5884 · verificador sin errores (402 avisos longitud).
Unificación del orquestador: Ishikawa 鱼骨图/피시본 다이어그램 en room.ideas.desc
(zh/ko; el ja ya coincidía con las etiquetas de CJK-L).
Terminología nueva fijada en R2: nivel de PISO 階/层/층 ≠ nivel de juego ·
evento イベント/活动/이벤트 ≠ cronograma · fase フェーズ/阶段/단계(ko=paso) ·
hobby 趣味/爱好/취미 · proyecto プロジェクト/项目/프로젝트 · ruta маршрут/मार्ग ≠
itinerario план/योजना · trámites vehiculares LOCALIZADOS (आरसी/रोड टैक्स/
फिटनेस जांच · 自動車税/车船税/자동차세…) · tablero kanban ボード (no 看板 en ja).
Para los revisores Opus: unidades de datos CJK en forma nativa plena
(太字节/テラバイト, trozos 21-22) vs sigla latina asentada · ru «рутина» en
contexto de ejercicio · hi हटाएं/हटाएँ (normalizar anusvara/candrabindu) ·
hi क्षेत्र campo-vs-ámbito · nombre del cuarto cómputo ru/hi entre trozos
(Компьютерная/कंप्यूटिंग कक्ष).

Roster Ronda 3 (12 obreros Sonnet + 2 revisores Opus):
CJK-Q 33-34 · CJK-R 35-36 · CJK-S 37-38 · CJK-T 39-40 · CJK-U 41-42 · CJK-V 43
RUHI-M 25-26 · RUHI-N 27-28 · RUHI-O 29-30 · RUHI-P 31-32 · RUHI-Q 33-34 ·
RUHI-R 35-36
REV-cjk (dict ja/zh/ko consolidado) · REV-ruhi (dict ru/hi consolidado)

Ronda 3 CERRADA: QA 57 archivos 0 fallos. ★ dict ja/zh/ko 5884/5884 COMPLETOS ★
ru/hi 5258/5884 (faltan trozos 37-43, 626 claves). Verificador sin errores,
407 avisos de longitud. Unificaciones del orquestador: temario シラバス/教学大纲
(40 y room.idiomas.desc) · tut.chat.resumen con el nombre REAL del cuarto en
los 5 idiomas (ジム/健身房/헬스장/Спортзал/जिम) · programas de Entretenimiento
zh 片单 (38) · editor.ayuda.conf.a NO puede quedar vacío (ru Визуальный/стиль
карты, hi नक्शे की/विज़ुअल शैली) · «hindi में»→«हिंदी में».

DICTAMEN REV-cjk: SIN deriva de registro/glosario (0 您, 0 당신, 0 formales;
grafías limpias; marcadores 100%). Unidades de datos SE QUEDAN en forma nativa
plena: ModoUnidades.tsx:122 pinta «{traducción} ({u})» → cambiarlas daría
«TB (TB)». 515 hallazgos APLICADOS sobre los hecho (puntuación de ancho
completo por lotes 458, punto medio ・↔· 23, ko espacio tras dos puntos 22,
あなた residual 10, レベル→階 en planos.grupo.*, zh 总净资产).
DICTAMEN REV-ruhi: ru limpio (9 hallazgos); hi con 3 derivas mecánicas
(nasalización, danda, préstamo-vs-nativo por lote) — 310 hallazgos APLICADOS
+ barrido global U+0901→U+0902 (46 restos). Veredictos: anusvara SIEMPRE
(हूं, हटाएं); क्षेत्र convive («ámbito» del glosario es letra muerta: solo
existe en código); «рутина» se queda TAMBIÉN en ejercicio (misma entidad de
BD cruza apps; программа ya está ocupada). मिटाना=borrar vs हटाना=quitar;
nuqta consistente (तारीख़). Chip lanzado: artefactos del dict.en (${n} en
respaldo.aviso:5197 y «()» en arbolDesc).
OJO PRÓXIMA RONDA ru/hi (37-43): ahí vive el bloque demo/ia/cuenta — «Pep»
queda EN LATÍN sin declinar (declinarlo fuerza masculino en ru); mascotas de
agenda 42-43 = animales reales; cuarto cómputo UN solo nombre
(Компьютерная / कंप्यूटिंग कक्ष).

Roster Ronda 4 (3 obreros Sonnet dict + 10 obreros Opus tut):
RUHI-S 37-38 · RUHI-T 39-41 · RUHI-U 42-43
TUT-CJK: sacados 19 trozos ×3 idiomas (dict-{ja,zh,ko}-tut/) —
T-A 01-02 · T-B 03-04 · T-C 05-06 · T-D 07-08 · T-E 09-10 · T-F 11-12 ·
T-G 13-14 · T-H 15-16 · T-I 17-18 · T-J 19

Ronda 4 CERRADA (T-G se relanzó por corte de API sin haber escrito; QA 71
archivos 0 fallos). ★★ LOS 5 DICT COMPLETOS: ja/zh/ko/ru/hi 5884/5884 ★★
★ TUT CJK COMPLETO: 612/612 ×3 ★ verificador sin errores, 407 avisos longitud.
Unificaciones del orquestador en R4:
· JAPÓN SE QUEDA en la rama ja de interfaz+tut (TUT-H y TUT-J/G-bis habían
  aplicado España a medias; revertido en tut 13,14,15,16,19). El cambio a
  España (DECISIONES.viaje.ja) se hará DE UNA PIEZA en la Fase D cuando el
  contenido demo ja lo defina: barrer 日本 en dict.ja.ts y dict.ja.tut.ts
  (fichas tut.app-sala--japon.*, tut.app-despacho--metas.*, pasos 13-19,
  サバイバル日本語→スペイン語, presupuesto en yenes).
· tutor de Idiomas UNIFICADO a 先生/老师/선생님 (los trozos 09-10 habían usado
  チューター/导师/튜터; 7 reemplazos por idioma en hechos y dicts, con ajuste
  de partícula ko 튜터와→선생님과). LECCIÓN: los informes de los obreros a
  veces no cuadran con lo escrito — verificar términos EN DISCO antes de
  fijarlos en encargos (pasó con temario zh: la pestaña real es 大纲 y la
  prosa 教学大纲, patrón aceptado).
· Formulario de cómputo: ficha del tour alineada al rótulo real
  (公式集→数式帳 ja / 公式手册 zh, trozo 23 + dicts).
· zh nav3d 3人称/1人称→第三人称/第一人称 (japonesismo; trozo 31 + dict + citas tut).
· «pesos» queda literal en los 10 idiomas (vehiculos.4, como en la tanda europea).
Fuente ES desfasada anotada: «Infraestructura» en pasos de menú-plantillas
donde la pestaña real es «Complementos»; EN de archivo.3.* también viejo.
Chips lanzados: artefactos dict.en (${n}, arbolDesc) · precio del plan largo
(3 vs 4 créditos, Creditos.tsx vs EditorCuentaSection).

Roster Ronda 5 — FINAL de Fase C (10 obreros Opus, tut ru/hi):
sacados 19 trozos ×2 (dict-ru-tut/, dict-hi-tut/; idénticos entre sí) —
U-A 01-02 · U-B 03-04 · U-C 05-06 · U-D 07-08 · U-E 09-10 · U-F 11-12 ·
U-G 13-14 · U-H 15-16 · U-I 17-18 · U-J 19

Ronda 5 CERRADA (QA 38 archivos, 0 fallos). Parches del orquestador en R5:
फ़ॉरेक्स con nuqta (dict+fuente+cita) · ru granja.herr.limpiar Убрать→
Почистить (chocaba con granja.herr.quitar; cita del tut actualizada) · citas
de la pestaña «Comida» al nombre real del cuarto en ja/ko/hi (「食」/'음식'/
«भोजन») · CJK «Infraestructura»→rótulo real エクストラ/扩展/확장 en ficha y
pasos del tour de plantillas (alineado con ru/hi/fr/de/it, que citaron bien).
Avisos de los obreros para fases posteriores: catalogoRu/Hi (y Ja/Zh/Ko) de
fórmulas NO existen (Fase E) · MAPAS_PEP y planesPep sin rama de los 5 nuevos
(Fase D) — títulos citados en tut («Mi vida ideal», «Casa», «Дом») caerán al
español hasta entonces · hi: título del tour «रिकॉर्ड्स» vs pestaña
«प्रविष्टियां» (unificar en revisión visual) · ru «Убрать» sigue en
huerto.quitar y granja.quitar (pantallas distintas, aceptable).

═══════════════════════════════════════════════════════════════════
ESTADO: PAUSADO — ★★ FASE C TERMINADA (13 ago 2026) ★★
ja, zh, ko, ru, hi: dict 5884/5884 · tut 612/612 LOS CINCO.
verificar-i18n: 0 errores (407 avisos de longitud, van a la revisión visual).
npx tsc -b: exit 0 · npm run build: ✓.
5 rondas orquestadas: 62 obreros Sonnet + 20 Opus de tut + 2 revisores Opus
(REV-cjk 515 + REV-ruhi 310 hallazgos, TODOS aplicados sobre los hecho).
1 relanzamiento por corte de API (TUT-G). Los informes de los obreros a veces
no cuadran con lo escrito: verificar términos EN DISCO antes de fijarlos.

QUEDA (arrancar con el protocolo de esta sección):
1. Fase D: contenido no latino ×5 (C-1..C-4 + C-idiomas con PERFIL_PRINCIPAL)
   — DECISIONES: rama ja viaje a MÉXICO (cambiado por el usuario el 13 ago;
   antes decía España — el glosario ya está actualizado: CDMX/Teotihuacán/
   Oaxaca/San Miguel/Mérida/Chichén, ahorro en yenes ≈390.000 ¥ ≈ 49.000 MXN
   en destino, Teotihuacán al amanecer por Fushimi Inari, ADO por el pase de
   tren). Al aplicarlo, barrer TAMBIÉN 日本 en dict.ja.ts y dict.ja.tut.ts
   (fichas sala/despacho, pasos 13-19, サバイバル日本語→スペイン語, pines).
   OJO DEMO_VERSION: las casas demo construidas no reconstruyen.
2. Fase E: catálogos ×5 (catalogoJa/Zh/Ko/Ru/Hi.ts de fórmulas + registro,
   Sísifo, especies, planes/metas, ejemplos, manual, diario cultural con
   palabra del día NATIVA, mapas demo) + K-medios (RSS nativos, TAMBIÉN para
   pt/fr/de/it que siguen leyendo El País).
3. Ola 7: árabe (R-rtl primero, luego alta + interfaz + contenido).
4. Revisión visual: ~407 avisos de longitud, botones estrechos ru/hi/de,
   cortes de línea CJK (receta mind-home-verificar-en-demo).
Chips pendientes: artefactos dict.en (${n} respaldo.aviso, «()» arbolDesc,
=SUM, EN desfasado de entretenimiento-archivo.3.* y planos.ayuda) · precio
del plan largo (3 vs 4 créditos).
═══════════════════════════════════════════════════════════════════

ESTADO: ACTIVO desde 13 ago 2026 (3ª sesión) · Fase D (contenido demo ja/zh/ko/ru/hi) · Ronda 1
Protocolo de arranque cumplido: nada suelto sin meter · verificador 0 errores
(407 avisos) · re-sacados los 6 cuartos de R1 (conteos idénticos a Fase B).
Plan de rondas: R1 anecdotario·agenda·garage·cocina·jardin·biblioteca ×{CJK,RUHI}
· R2 recetario(--recetas)·sala·descanso·hobbies·ideas·ejercicio ×2 · R3 computo·
despacho·entretenimiento ×2 + C-idiomas ×2 (Opus, PERFIL_PRINCIPAL) · R4 barrido
日本→México en dict.ja.ts/dict.ja.tut.ts + revisores Opus + cierre.
OJO: cocina normal se METE antes de sacar --recetas (comparten cocina.*.json).
Monedas fijadas (factor sobre €, redondeo natural): ja ×150 JPY · zh ×7,5 CNY ·
ko ×1.500 KRW · ru ×100 RUB · hi ×90 INR · rama ja: gastos en destino en MXN
(≈8 ¥/peso). Meta del viaje 2.600 € = 390.000 ¥ (glosario).

Roster Ronda 1 (12 obreros Sonnet, contenido):
CJK y RUHI × anecdotario(249) · agenda(88) · garage(58) · cocina(82) ·
jardin(261) · biblioteca(159)

R1 en marcha: agenda ✓×5 · garage ✓×5 · cocina ✓×5 (metidos; QA 0 fallos).
Parche del orquestador: agenda ja/zh/ko había SUSTITUIDO al Dr. Olmos por
médicos locales inventados (森田/王/김) → devuelto el nombre transcrito
(オルモス/奥尔莫斯/올모스): los nombres propios SE CONSERVAN (política Fase B).
Decisiones aceptadas que rigen para R2/R3: callejero de CDMX en prosa queda en
LATÍN también en ru/hi (exónimos asentados tipo Токио sí se usan) · burrito en
hi = बरिटो · Puebla NO es parada del viaje ja (solo la escena del volcán si el
ES trae el Fuji desde Hakone); itinerario canónico de 6: CDMX/Teotihuacán/
Oaxaca/San Miguel/Mérida/Chichén.
Adelanto de R2: cocina cerrada ⇒ sacado --recetas (223) y lanzados 2 obreros
recetario (escriben cocina.<id>.json, meter con --recetas).

R1 CASI CERRADA: agenda·garage·cocina·biblioteca·jardin ✓×5 metidos (falta solo
anecdotario ×2, en vuelo). Parches del orquestador en R1: Olmos transcrito (ver
arriba) · Laika SIEMPRE transliterada Лайка/लाइका (biblioteca ru/hi la había
dejado en latín; el dict y agenda ya la fijaban) · ru «чем боялось»→«чем
ожидалось» (jardin; бояться no admite impersonal) · cifras al factor exacto:
jardin hi ×90 (5.400/1.080, el obrero usó ×100), zh 450元 (no 470), ko 만 팔천
(no 만 칠천). CONFIRMADO: ES «en inglés» vs EN «in Spanish» en gratitudes NO es
bug: cada rama estudia su PERFIL_PRINCIPAL. En la rama ko el pin «vuelos a
Corea» pasa a Vietnam (un coreano no vuela a su país); ja/zh lo conservan.
R2 COMPLETA EN VUELO (10 obreros): recetario·sala·descanso·hobbies·ideas·
ejercicio ×{CJK,RUHI} (sala lleva el encargo del viaje ja→México con el
itinerario canónico y las correspondencias escena a escena).

Avance R2: descanso ✓×5 · hobbies CJK ✓ · recetario zh/ko ✓ metidos.
RECETARIO rama ja RETENIDA: la carpeta «De Japón» (3 recetas), la dieta
«Vuelta de Japón, ligero» y la lista del súper son autobiográficas del viaje ⇒
obrero Opus quirúrgico re-adaptándolas a México 1:1 en cocina.ja.json (~81
textos); zh/ko correctas tal cual. LAIKA ES GATA (gris, de protectora,
anecdotario ES entradas.23; el «perra» del informe de agenda era error solo
del informe — en las traducciones no se nombra especie). CORTES DE API: 3
obreros caídos y relanzados — anecdotario RUHI (dejó prefijo limpio 0-160/249;
el relevo completa 161-248 SIN re-decidir), ejercicio CJK y RUHI (de cero).
PENDIENTE PARA REVISOR OPUS (al cerrar la rama ja): alinear el mapeo de
ciudades del viaje ja ENTRE cuartos con el reparto de días que defina sala
(deriva detectada: cocina usó Kioto→Teotihuacán; agenda/descanso Kioto→Oaxaca;
jardin Hakone→Oaxaca; hobbies lago Ashi→Popocatépetl desde Puebla, par
sancionado por el glosario).

TRAS EL CORTE DE CUOTA (reset 2:20am; reanudado por protocolo, disco = verdad):
consolidado el parche ja del recetario, que SÍ llegó al disco antes de morir el
obrero (223 en orden, 0 menciones 日本: mole de pollo casero, pozole rojo
rápido, salmón a la veracruzana, «Vuelta de México») ⇒ recetas ja/zh/ko ✓.
Estado real en disco: descanso ×9 ✓ · hobbies ja/zh/ko ✓ · anecdotario ru/hi
PARCIAL 161/249 (prefijo válido, 0 vacías) · anecdotario.zh JSON roto (se
pisa) · sala/ideas/ejercicio/hobbies-ru-hi/recetario-ru-hi sin escribir.

MAPEO CANÓNICO ja→México por ROL de escena (fijado por el orquestador para los
relanzos; agenda/descanso/jardín consolidados ya lo cumplen): Tokio→Ciudad de
México · Hakone→San Miguel de Allende · Kioto→Oaxaca · Nara→Chichén Itzá ·
Osaka→Mérida · Hiroshima→Teotihuacán. Escenas: Fushimi Inari→Teotihuacán al
amanecer · Fuji/lago Ashi→Popocatépetl (solo si el ES trae la escena) ·
ciervos de Nara→iguanas/coatís · Dotonbori→mercados de Oaxaca. El revisor
alinea al cierre los desviados conocidos (cocina ja: 2-3 textos).

Roster Ronda 3 (relanzo, 10 obreros Sonnet):
anecdotario CJK (de cero, zh roto se pisa) · anecdotario RUHI (completa
161→248 sin re-decidir el prefijo) · recetario RUHI · hobbies RUHI · sala CJK ·
sala RUHI · ideas CJK · ideas RUHI · ejercicio CJK · ejercicio RUHI.

Avance R3: ejercicio ✓×9 · ideas ja/zh/ko ✓ · hobbies ✓×9 (todos metidos, QA
0 fallos). Parche del orquestador: ideas ko «Próximo viaje: Corea»→Vietnam
(베트남; el obrero había puesto Taiwán y jardín ya consolidó Vietnam).
CORRECCIÓN DE ENCARGO: Ishikawa en ja es 特性要因図 (dict.ja real), no
フィッシュボーン図 — el obrero obedeció el dict, bien. Grafías nuevas sin
precedente fijadas por hobbies RUHI (озеро Аси/Миядзима/рёкан · आशी झील/
मियाजिमा/रयोकान) — el revisor las cruza con sala al llegar.
R4 EN VUELO (6 obreros Sonnet): computo(107)·despacho(96)·entretenimiento(46)
×{CJK,RUHI}. despacho lleva la tabla de monedas dura (meta 390.000¥/19.500元/
3.900.000₩/260.000₽/234.000₹; rama ja gastos del viaje en MXN) y computo la
regla =SUMA( intacta (el motor solo evalúa español).
Tras R4 quedan: C-idiomas ×2 (Opus) · barrido 日本→México dict.ja(.tut).ts ·
revisor Opus del viaje ja entre cuartos · verificar-i18n + tsc -b + build.

ideas ✓×9 (ru/hi metidos). LISTA DEL REVISOR DE CIERRE (grafías, además del
mapeo ja): Хаконэ (canónica, anecdotario/ideas) vs Хаконе (cocina) · क्योटो
(canónica) vs क्योतो (agenda/cocina) · ryokan hi रयोकान (hobbies) vs र्योकान
(ideas) · posgrado hi पोस्टग्रैजुएट (biblioteca) vs मास्टर्स (ideas) ·
Nuria=Нурия/नूरिया (fijada en ideas).

recetario ✓×9 · sala ru/hi ✓ · computo ✓×9 · despacho ✓×9 (QA 0 fallos; el
aviso «3 marcadores rotos» de computo es falso positivo: llaves de LaTeX en
.tex, mismo criterio que fr/de). Parches del orquestador: computo.ja hoja
«日本の予算»→«メキシコの予算» (la aritmética YA cuadra para México: gastos
presupuestados en ¥ de casa, cambio MXN/¥ 0.126, total en pesos del destino) ·
CETES SE CONSERVA en las 5 ramas (regla de facto: nombre propio anclado se
conserva, lo genérico se adapta; pt fue la excepción histórica). hitos.17
«peso por peso» correcto en las 5 ramas (ja lo resuelve cambiando ahorro ¥→
pesos). Para el revisor: metas.japon en despacho.ja lista las paradas SIN
Teotihuacán (el obrero lo trató como excursión); cotejar con sala.ja. DUDA
VISUAL pendiente de cierre: KaTeX con CJK dentro de \dfrac sin \text{} (3
fórmulas .tex) — mirar en la revisión visual.
C-IDIOMAS EN VUELO (2 Opus): re-sacado idiomas (216); política por campo:
termino/ejemplo inglés SE COPIAN del ES, glosas al idioma; supervivencia zh/
ko/ru/hi japonés copiado + glosa; rama ja INVERTIDA a español de supervivencia
(«サバイバルスペイン語»).

anecdotario ru/hi ✓ (relevo 161-248 limpio, prefijo byte-idéntico; passthrough
único legítimo «42,195») · entretenimiento ✓×9. Parche del orquestador:
entretenimiento zh/ko fichas.23 jet lag→emoción (时差→兴奋 / 시차→설렘; el
vuelo corto no da jet lag, mismo criterio que descanso). Decisión aceptada en
ja: las 3 reseñas de «cine japonés para el viaje» (fichas.20/21/22) pierden la
afirmación de itinerario y conservan las películas y el juicio (reescribir a
cine mexicano habría cambiado lo que pasó). Títulos oficiales verificados en
ru (Срок времени, Ложная слепота…); en hi los títulos de obra quedan en latín
(convención india) y solo las personas se transliteran.
QUEDAN EN VUELO: anecdotario CJK · sala CJK · idiomas CJK/RUHI (Opus). Luego:
meter todo · barrido 日本→México en dict.ja.ts/dict.ja.tut.ts (tras consolidar
sala.ja, para citar paradas reales) · revisor Opus coherencia viaje ja +
grafías · verificar-i18n + npx tsc -b + npm run build.

C-IDIOMAS ja/zh/ko ✓ metido. La estructura real difería del plan: tarjetas
(inglés, 56) y tarjetasJa (supervivencia, 20) son arrays separados, y el
pendientes solo traía las 20 glosas de supervivencia (termino/lectura no
viajan: es==en). Solución rama ja: 40 rutas EXTRA añadidas a idiomas.ja.json
(tarjetasJa.N.termino/lectura invertidas a español, «perdón (ペルドン)»…);
reconstruir() las acepta aunque no estén en el pendientes. Además demo.ts
±: PERFIL_PRINCIPAL/PERFIL_JAPONES/META_B1 ahora tienen ja/zh/ko/ru/hi; en la
rama ja el perfil de supervivencia es スペイン語 con codigo es-MX y 🇲🇽.
Duplicadas 3/10, 4/11, 5/12 en el original: glosas idénticas, fiel al ES.
Los ejemplos EN con «euros»/ciudades japonesas SE QUEDAN (mismo criterio que
pt/fr/de/it; para Pep-ja son viajes domésticos verosímiles).

C-IDIOMAS ru/hi ✓ metido (Вы hacia desconocidos en frases de supervivencia,
como fr/de/it; charla.titulo con nombres latinos de tiempos verbales; «Pepa»
en línea inglesa de material se conserva). sala ✓×9 (transposición ja día a
día: CDMX 1-5 · San Miguel/La Gruta 6-7 con Presa de Allende por Kawaguchiko ·
Oaxaca 8-13 con Monte Albán/Hierve el Agua y Chichén de excursión · Mérida
14-15,18 · Teotihuacán 16-17 amanecer · vuelo interno 19 con vista del Popo ·
CDMX→Narita 20-21; zh/ko salen de 上海·浦东 / 서울·인천 — parche del
orquestador al híbrido zh 墨西哥城·上海浦东; escapadas ja Oaxaca/Valle→
Kagoshima/Nagano; ko itinerario futuro → Vietnam).
BARRIDO 日本→MÉXICO EN dict.ja HECHO: 4 claves dict.ja.ts + 21 dict.ja.tut.ts
(サバイバル日本語→スペイン語, hoja «メキシコの予算», recuerdos del tour de
sala con Pirámide del Sol/Hierve el Agua/coatís…). Conservados legítimos:
ajustes.idioma.ja 日本語, manual de chat, placeholders genéricos con Kioto
(viaje doméstico verosímil). Verificador tras el barrido: 0 errores.
★ HUECO ESTRUCTURAL DETECTADO (decisión de PRODUCTO para el usuario, NO se
tocó): src/rooms/sala/demo.ts LUGARES/rutas/portadas están hardcodeados a
Japón sin capa de idioma, y las FOTOS (public/demo/sala/japon-*.webp,
anecdotario/japon-torii.webp) son assets compartidos ⇒ en la rama ja el
mapamundi pinta pines y fotos de Japón bajo textos de México. Arreglarlo pide
código (LUGARES por idioma con coordenadas mexicanas, rutas, gasto diario) y
assets nuevos de México. Opciones: (a) aceptar la inconsistencia visual, (b)
sesión de código+arte aparte. Los 2 pasos del tut afectados quedaron en
redacción neutra de país a propósito.

★★ anecdotario ✓×9 — LOS 16 LOTES DE CONTENIDO COMPLETOS EN LOS 9 IDIOMAS ★★
(anecdotario ja: Monte Albán para la escena de Fushimi Inari — MISMA decisión
independiente que sala.ja, Teotihuacán reservado para el cierre-Hiroshima;
OXXO/Universum/Chapultepec como color local; ko Corea→Vietnam en 120/121/124).
REVISORES EN VUELO (2 Opus): REV-ja alinea el viaje ja entre cuartos (cocina
comidas 36-47 al itinerario · vuelo interno Mérida→CDMX en anecdotario ·
hobbies lago Ashi→Presa de Allende · despacho metas con Teotihuacán · sala.ko
mercado Dong Xuan/Hoi An) parchando json+i18n.ts (cocina solo i18n.ts: su
json es el recetario) · REV-ruhi unifica grafías (Хаконэ · क्योटो · रयोकान ·
पोस्टग्रैजुएट · волонтёрка · restos de chandrabindu).
Tras revisores: verificar-i18n + npx tsc -b + npm run build (cierre).

REV-ruhi CERRADO: 463 reemplazos en 24 archivos con conteo esperado (Хаконэ
13/0 · क्योटो unificada · रयोकान · posgrado tenía TRES grafías → पोस्टग्रैजुएट
en 18 sitios, «máster en instrumentación» se queda मास्टर्स · anusvara: 434
códepoints U+0901→U+0902, norma confirmada contra dict.hi 5522:2 · волонтёрка
SE QUEDA: el ES marca femenino de un tercero).
REV-ja CERRADO: vuelo interno anecdotario→Mérida–CDMX · hobbies Puebla→Presa
de Allende · despacho hitos.16 lista canónica con Teotihuacán · sala.ko: el
fallo real era Busan colado en el itinerario de Vietnam (→다낭·안방 해변; Dong
Xuan estaba bien, es Hanói) · HALLAZGO: 14 claves de sala.ja itinerario con
es==en NO viajaron al pendientes y caían al ES (Hakone · Gōra en el itinerario
mexicano) → corregidas + 7 ejemplos EN del cuarto Idiomas ja transpuestos
(night bus to Oaxaca…). Cocina ja NO se fuerza al mapeo (platos al azar sin
día; el mole negro se queda en Oaxaca). Desfases heredados del ES (notasDia
−112/−104, sesionesAstro.9) NO se tocan: están igual en los 9 idiomas.

═══════════════════════════════════════════════════════════════════
ESTADO: PAUSADO — ★★ FASE D TERMINADA (13 ago 2026, 3ª sesión) ★★
CONTENIDO DEL DEMO EN LOS 9 IDIOMAS: los 16 lotes (15 cuartos + recetario)
consolidados en sus demo.data.i18n.ts para ja/zh/ko/ru/hi (pt/fr/de/it ya
estaban). Rama ja con el viaje a MÉXICO de una pieza (mapeo canónico Tokio→
CDMX · Hakone→San Miguel · Kioto→Oaxaca · Nara→Chichén · Osaka→Mérida ·
Hiroshima→Teotihuacán; Monte Albán para Fushimi Inari, Teotihuacán como
cierre; supervivencia en español es-MX; escapadas ja a Kagoshima/Nagano; ko
«próximo viaje» a Vietnam) + barrido 日本→México en dict.ja.ts (4) y
dict.ja.tut.ts (21). demo.ts del cuarto Idiomas con PERFIL_PRINCIPAL/
PERFIL_JAPONES/META_B1 para los 5 nuevos.
verificar-i18n: 0 errores (407 avisos longitud) · npx tsc -b: exit 0 ·
npm run build: ✓.
~35 obreros Sonnet + 5 Opus (C-idiomas ×2, parche recetario ja, barrido
dict.ja) + 2 revisores Opus (REV-ja, REV-ruhi 463 reemplazos). 1 corte de
cuota a mitad (reset 2:20am) reanudado por protocolo sin pérdida (el disco
manda; parche ja del recetario sobrevivió al corte).

QUEDA (protocolo de arranque de esta sección):
1. Fase E: catálogos ×5 (catalogoJa/Zh/Ko/Ru/Hi.ts de fórmulas + registro,
   Sísifo, especies, planes/metas, ejemplos de fábrica, manual de comandos,
   diario cultural con palabra del día NATIVA, mapas demo) + K-medios (RSS
   nativos, TAMBIÉN para pt/fr/de/it).
2. Ola 7: árabe (R-rtl primero).
3. Revisión visual: ~407 avisos de longitud + KaTeX con CJK en \dfrac (3
   fórmulas .tex de computo) + botones ru/hi/de (receta
   mind-home-verificar-en-demo).
4. DECISIONES DE PRODUCTO pendientes del usuario: (a) sala/demo.ts LUGARES/
   rutas/portadas hardcodeados a Japón + fotos japon-*.webp compartidas ⇒ la
   rama ja pinta pines/fotos de Japón bajo textos de México (pide código +
   assets de México); (b) tabla del itinerario en zh/ko/ru/hi muestra nombres
   con es==en en latín (Hakone · Gōra…): pasada de transliteración opcional;
   (c) chip lanzado: 22 entradas con n:21 duplicado en sala/demo.data.ts.
═══════════════════════════════════════════════════════════════════

ESTADO: ACTIVO 13 ago 2026 (3ª sesión, continúa) · FASE E (catálogos ×5 + K-medios)
Los catálogos van por EDICIÓN DIRECTA de archivos únicos con idiomas dentro
(sin sacar/meter). Reparto por archivo para no colisionar; los REGISTROS
compartidos (catalogoI18n.ts, manualI18n.ts) los edita SOLO el orquestador al
final. El diario cultural (catalogo.ts, 137 KB) se SERIALIZA: CJK primero,
RUHI después (mismo archivo).

Roster Ronda E1 (10 obreros):
E-formulas-CJK crea computo/catalogoJa/Zh/Ko.ts · E-formulas-RUHI crea
catalogoRu/Hi.ts (nadie toca catalogoI18n.ts) · E-sisifo-especies (Opus):
sisifoData.ts + diario/especies.ts · E-planes: demo/planesPep.ts ·
E-metas-mapas: demo/metasPep.ts + ideas/demo.mapas.ts (títulos citados en
tut: grep dict.<id>.tut.ts ANTES) · E-ejemplos-builders: rooms/*/ejemplos(.data).ts
+ builders jardin/hobbies/despacho demo.ts · E-manual-CJK crea
chat/manual.ja/zh/ko.ts · E-manual-RUHI crea manual.ru/hi.ts (nadie toca
manualI18n.ts) · E-diario-CJK (Opus): diario/catalogo.ts ramas ja/zh/ko,
palabra del día NATIVA · E-medios: diario/fuentes.ts, feeds RSS nativos ×9
idiomas VERIFICADOS con petición real + proxy:true según CORS.

═══════════════════════════════════════════════════════════════════
ESTADO: PAUSADO — ★★ FASE E TERMINADA (13 ago 2026) ★★
Catálogos ×5 COMPLETOS y REGISTRADOS: fórmulas (catalogoJa/Zh/Ko/Ru/Hi.ts,
54+78+14+3+1 cada uno, registrados en catalogoI18n.ts) · Sísifo 121×5 +
especies 100×5 (nombres vernáculos reales) · planes 17×5 (~1045 textos;
rama ko del plan «corea»→VIETNAM alineada con sala/metas) · metas 56×5 +
mapas 8×5 (títulos = los citados en el tut; cifras del viaje = las ya
consolidadas por rama) · ejemplos+builders 14 archivos · manual de comandos
×5 (220+14 c/u, claves byte a byte, registrados en manualI18n.ts; ja llano
de comandos; {Japón}→{Italia} en ja) · diario cultural 40×4 secciones ×5
(títulos verificados contra el REST de la app; palabra del día NATIVA:
木漏れ日/윤슬/окоём/गोधूलि…; colisiones con el dict auditadas) · K-medios:
37 feeds RSS nativos ×9 idiomas verificados con petición real (pt/fr/de/it
por fin dejan El País; CORS medido, proxy solo donde falta ACAO).
verificar-i18n 0 errores (407 avisos) · npx tsc -b exit 0 · npm run build ✓.
2 cortes de conexión (diario CJK y RUHI) reanudados por SendMessage sin
pérdida: el disco tenía las tablas a medias y se completaron.
LÍMV: 12 fichas de libro hindi sin texto/imagen (ni el libro ni el autor
existen en hi.wikipedia — estructural, no de traducción).

QUEDA:
1. Ola 7: árabe (R-rtl primero, luego alta + interfaz + contenido + catálogos).
2. Revisión visual (~407 avisos de longitud, KaTeX CJK en \dfrac, botones
   ru/hi/de, cortes CJK) — receta mind-home-verificar-en-demo.
3. Decisiones de producto del usuario: pines/fotos de sala en rama ja ·
   transliteración de tablas de itinerario zh/ko/ru/hi · fichas hindi vacías
   del diario cultural (¿caer a glosa española?) · chip n:21 en curso.
4. Candidato a idioma 11 en paralelo al árabe: INDONESIO (id) — LTR, latino,
   sin género, mercado enorme; recomendación del 13 ago.
═══════════════════════════════════════════════════════════════════

ESTADO: ACTIVO 13 ago 2026 (4ª sesión) · Fase F (altas tr/id + Ola 7 árabe) · Ronda 1
Alcance de la tanda (pedido del usuario): ÁRABE (Ola 7 completa: R-rtl → A-1 →
A-2) + dos idiomas NUEVOS fuera del plan original: TURCO (tr) e INDONESIO (id).
Cimientos tr/id HECHOS: glosario (registro sen/kamu, términos, viaje: Japón se
queda — liras ×45 → 117.000 ₺ · rupias ×17.500 → Rp45,5 juta, vuelos directos
desde Estambul/Yakarta), alta en idiomas.ts (tr-TR/id-ID), cargadores en
dict.ts, dicts de arranque con 14 nombres de idioma, y claves nuevas del
selector ajustes.idioma.{tr,id,ar} en EN (5884→5887) traducidas a mano en los
9 dicts hechos. El árabe sigue SIN alta (llega tras el RTL, fase A-1).
Inventario dict: tr 43 trozos · id 43 (IDÉNTICOS: el obrero TRID lee dict-tr/
NN.json y escribe los NN.hecho.json de tr+id).

AMPLIACIÓN A MITAD DE R1 (pedido del usuario): se suma el POLACO (pl).
Cimientos pl HECHOS con el mismo molde: glosario (registro «ty», imperativos
Zapisz/Usuń, GÉNERO se reescribe como en ru — el polaco marca género en pasado
y adjetivo —, viaje: Japón + eslotis ×4,25 → 11.000 zł), alta pl-PL, cargadores,
dict.pl(.tut).ts arranque 15 nombres, clave ajustes.idioma.pl en EN (5887→5888)
y a mano en los 11 dicts. Inventario dict pl: 43 trozos (5873 claves).
Los obreros PL entran en la Ronda 2 (los TRID de R1 ya estaban en vuelo).

Roster Ronda 1 (12 obreros Sonnet, dict tr+id):
TRID-A 01-02 · TRID-B 03-04 · TRID-C 05-06 · TRID-D 07-08 · TRID-E 09-10 ·
TRID-F 11-12 · TRID-G 13-14 · TRID-H 15-16 · TRID-I 17-18 · TRID-J 19-20 ·
TRID-K 21-22 · TRID-L 23-24
En paralelo, el orquestador hace R-rtl (código): dir dinámico en ajustesStore,
barrido direccional→lógico (medidos 576 usos en 192 archivos), revisión manual
de menú lateral/HUD/rueda/chevrons y prueba pseudo-RTL en el preview.

R-RTL HECHA (código): esRTL() en idiomas.ts + dir en ajustesStore (set y
arranque) · barrido 576 usos→utilidades lógicas en 207 tsx con perl
(text-start/end, ms/me, ps/pe, start/end, rounded-s/e/ss/se/es/ee, border-s/e;
los left/right-1/2 de CENTRADO excluidos a propósito: con -translate-x-1/2 el
espejo lógico descentra) · D-pad de mover-objetos y fila rotar con dir="ltr"
(pares direccionales: el orden visual NO se espeja) · pseudo-RTL auditado por
DOM en el perfil de pruebas (pane oculto ⇒ sin capturas; getBoundingClientRect:
menú lateral→DER, nav/rotar→IZQ, HUD superior→IZQ, calendario abre sin
desborde) · npx tsc -b ✓ · npm run build ✓. Para la revisión visual del
cierre: chevrons/iconos-flecha SVG que apuntan y anchos de botón en ar.

A-1: ÁRABE DADO DE ALTA (ar-SA, 🇸🇦, esRTL, nombreIA «árabe estándar
moderno») + cargadores + dict.ar(.tut).ts arranque 15 nombres + sacar-dict ar:
43 trozos IDÉNTICOS en partición a tr/id/pl (5873 claves).

Ronda 1: 10/12 cerrados (TRID-B 03-04 y TRID-H 15-16 en vuelo; se meten al
llegar). QA mecánico 0 fallos (3193 fichas/idioma, 0 vacías, 0 marcadores
rotos, 0 desalineados, 0 «siz»/«Anda»). meter parcial: tr 3208/5888 ·
id 3208/5888 · verificador sin errores (avisos: tr 26 · id 31).
POLÍTICA DE COMILLAS FIJADA: tr « » (como el ES) · id “ ” (24 pares « » de R1
normalizados byte a byte, UTF-8 revalidado con TextDecoder fatal) · pl „ ” ·
ar « » (estándar árabe).
Terminología fijada en R1 (obligatoria R2+): Sabio Bilge/Sang Bijak · tutor de
Idiomas öğretmen/tutor · patrimonio Net Değer/Kekayaan Bersih (Varlıklar/Aset ·
Borçlar/Utang) · pestaña Metas Hedefler/Target · destilar damıt/sarikan (el
«saring» suelto de E lo unifica el revisor) · cuartos según TRID-C (Mutfak/
Dapur, Spor Salonu/Gym, Oturma Odası/Ruang Tamu…) SALVO cómputo: Bilgisayar
Odası / Ruang Komputer (mayoría K+L; «Bilgi İşlem»/«Komputasi» de C lo
reconcilia el revisor) · Timeline Zaman çizgisi/Garis waktu ≠ cronograma ·
IA Yapay Zeka / AI · niveles MCER según E (Başlangıç…Ustalık / Pemula…
Penguasaan) · kcal(tr)/kkal(id) · macros P-K-Y / P-K-L · apóstrofo turco ’
en sufijos de nombres propios y marcadores ({h}’de) · % antes del número en
turco (%10), después en indonesio (10%) · =SUMA( intacto · juegos según F.

Roster Ronda 2 (12 obreros Sonnet):
TRID-M 25-26 · TRID-N 27-28 · TRID-O 29-30 · TRID-P 31-32 · TRID-Q 33-34 ·
TRID-R 35-36 · TRID-S 37-38 · TRID-T 39-41 · TRID-U 42-43 (aviso mascotas
agenda = animales reales)
PLAR-A 01-02 · PLAR-B 03-04 · PLAR-C 05-06 — pl+ar del mismo trozo (partición
idéntica); fijan la terminología nueva de pl/ar y la reportan.

REPESCA R1: TRID-B (03-04) y TRID-H (15-16) se ATASCARON sin escribir nada
(los dos se pusieron a construir scripts generadores en vez de traducir;
LECCIÓN: prohibir scripts de generación en el encargo). Detenidos con
TaskStop y relanzados como TRID-B2 y TRID-H2 con la regla explícita de
escribir el JSON a mano con la herramienta de archivos.
Avance R2 consolidado en 3 tandas: tr 5117/5888 · id 5117/5888 · pl 317/5888 ·
ar 317/5888 (PLAR-B trajo el hallazgo: el pasado 2ª sing. árabe es NEUTRO sin
tashkil; la reescritura nominal solo hace falta en imperativo y presente).
Faltan de R2: TRID-B2 03-04 · TRID-H2 15-16 · PLAR-A 01-02 · PLAR-C 05-06.

PLAR-C CERRADO: canon de cuartos pl/ar fijado (Kuchnia/المطبخ · Siłownia/
صالة الرياضة · Gabinet/المكتب · Salon/غرفة المعيشة · Terminarz/الأجندة …tabla
completa en su informe) + finanzas (Aktywa/Pasywa · الأصول/الخصوم · Majątek
netto/صافي الثروة) + REGLA AR: botones en masdar (حفظ، إزالة — el imperativo
árabe marca género) + REGLA PL: imperativos ok, reescribir pasado/condicional
de 2ª. PLAR-A detenido (iba MUY lento, sin volcar a disco; no era el bucle de
scripts de B/H — iba traduciendo) y relanzado como PLAR-A2.

Roster Ronda 3 (11 obreros Sonnet, pl+ar):
PLAR-A2 01-02 · PLAR-D 07-08 · PLAR-E 09-10 · PLAR-F 11-12 · PLAR-G 13-14 ·
PLAR-H 15-16 · PLAR-I 17-18 · PLAR-J 19-20 · PLAR-K 21-22 · PLAR-L 23-24 ·
PLAR-M 25-26
Todos con el canon de PLAR-C, las reglas de género pl/ar, la política de
comillas („ ”/« ») y la prohibición de scripts generadores.

★★ DICT TR e ID COMPLETOS: 5888/5888 LOS DOS (13 ago 2026, verificador 0
errores) ★★ La repesca B2/H2 entregó limpio con la regla anti-scripts.
Avance pl/ar tras 3 tandas de meter: pl 2023/5888 · ar 1689/5888 (siguen
cayendo obreros de R3).
CONFLICTO ANOTADO para QA: temario pl = „program nauki” (PLAR-E, dueño de la
pestaña); si algún trozo trae „sylabus”, se unifica al meter. Grafía juegos
ar fijada por PLAR-F (كانسة الألغام، الضامة، سوليتير…); fichas casino pl
„żeton”, ar «رقاقة».

Ronda TUT-1 (5 obreros OPUS, tut tr+id): sacados 19 trozos ×2 (dict-tr-tut/,
dict-id-tut/; idénticos). Roster:
TT-A 01-02 · TT-B 03-04 · TT-C 05-06 · TT-D 07-08 · TT-E 09-10
Regla de oro del tut: los pasos citan RÓTULOS REALES — el obrero debe buscar
el término consolidado en dict.tr.ts / dict.id.ts antes de citar un botón o
pestaña. TT-F..J (11-19) salen cuando caigan estos.

Avance R3: pl 3688/5888 · ar 3440/5888 tras 5 tandas de meter, QA 0 fallos
acumulado. PLAR-L fijó los 19 diagramas de Ideas (Oś czasu/الخط الزمني,
SWOT queda SWOT, Venn فين no فن…). Faltan de R3: A2 01-02 · G 13-14 · M 25-26.

Roster Ronda 4 (8 obreros Sonnet, pl+ar 27-43 — cierra el dict):
PLAR-N 27-28 · PLAR-O 29-30 · PLAR-P 31-32 · PLAR-Q 33-34 · PLAR-R 35-36 ·
PLAR-S 37-38 · PLAR-T 39-41 · PLAR-U 42-43 (aviso mascotas agenda)

Avance TUT-1: tut tr 319/612 · id 287/612 consolidados (TT-A/D/E cerrados con
rótulos verificados contra dict por Grep — el método funciona; TT-B/C en
vuelo). Voz fijada por TT-A: mago en 1ª persona, imperativos cortos sen/kamu,
presente continuo turco para el gesto en vivo; materias traducidas
(Matematik/Fisika…); AVISO ya conocido: catalogoTr/Id/Pl/Ar.ts de fórmulas no
existen (Fase de catálogos).

Roster Ronda TUT-2 (5 obreros Opus, tut tr+id 11-19, cierra la capa):
TT-F 11-12 · TT-G 13-14 · TT-H 15-16 · TT-I 17-18 · TT-J 19

R4: PLAR-S (37-38) MURIÓ por corte de API sin escribir nada (disco verificado)
→ relanzado como PLAR-S2. Para el revisor pl: residuo «SI» en editor.avatar.*
del dict.pl (PLAR-O lo vio; IA=«AI» es el canon).

★★ LOS 4 DICTS COMPLETOS (13 ago 2026): tr · id · pl · ar = 5888/5888 LOS
CUATRO, QA acumulado 0 fallos, verificador sin errores (628 avisos de longitud
al cierre visual) ★★
LISTA DEL REVISOR (acumulada, se aplica en la ronda de revisión):
· tr: «3B»→«3D» (~20 restos) · mascota.bitacora → registro de actividad (chip
  ya lanzado para pt/fr/de/it; tr/id los toca el revisor)
· id: «Entri» vs «Riwayat» (chat.tab.registros vs tut.chat-registros.*) ·
  «saring»→«sarikan» (destilar, trozos 09-10) · «Bilgi İşlem»/«Komputasi» de
  TRID-C vs canon Bilgisayar Odası/Ruang Komputer
· pl: residuo «SI» en editor.avatar.* · «sylabus» stale en claves viejas →
  «program nauki» · watchlist „lista do obejrzenia” (tut) vs „Program”
  (entre.prog.*): decidir canon
· ar: «الشرح» (PLAR-R) vs «جولة تعريفية» (PLAR-T) para tutorial/tour: unificar ·
  auditar chevrons ‹/› espejados y masdar en botones por muestreo ·
  «دفتر الصيغ» (fichas meta tut) → «كتيب الصيغ» (rótulo real, TP-A)
· pl: DECIDIR declinación de «Pep» — el dict declina (Pepa/Pepowi) pero el
  precedente ru de Fase C fue NO declinar (fuerza masculino); TP-D no declinó
  en tut, TP-A/TP-J sí. Unificar en una dirección.
· CÓDIGO (cierre RTL): WrappedOverlay.tsx:163 navega con clientX físico
  (ancho*0.3) y NO se espeja en RTL — el gesto «izquierda=atrás» queda
  invertido respecto al texto en árabe. Arreglo pequeño de código, va con la
  revisión visual.

Roster Ronda TUT-PLAR (10 obreros Opus, tut pl+ar 01-19; dicts completos como
referencia de rótulos):
TP-A 01-02 · TP-B 03-04 · TP-C 05-06 · TP-D 07-08 · TP-E 09-10 · TP-F 11-12 ·
TP-G 13-14 · TP-H 15-16 · TP-I 17-18 · TP-J 19

★★★ CAPA 1 COMPLETA EN LOS 4 IDIOMAS (13 ago 2026): tr · id · pl · ar con
dict 5888/5888 + tut 612/612 LOS CUATRO. verificar-i18n 0 errores (631 avisos
de longitud) · npx tsc -b exit 0 · npm run build ✓ ★★★
TUT-PLAR cerró sin relanzamientos. Hallazgos nuevos de la ronda:
· ar: «بيزو» (TP-I) vs canon «بيسو» para pesos → unificar · «العرض التجريبي»
  fijado para la demo en capa tut.
· pl: Pep declinado (mayoría del dict: Pepa/Pepowi) vs indeclinable (TP-D,
  precedente ru) — el revisor decide y unifica.

Roster REVISORES (2 Opus, fixes sobre los .hecho.json; el orquestador
re-mete y verifica después):
REV-trid: tr/id dict+tut — 3B→3D (tr) · Entri/Riwayat (id) · saring→sarikan
(id) · «Bilgi İşlem»/«Komputasi» vs canon Bilgisayar Odası/Ruang Komputer ·
mascota.bitacora tr/id · comillas id restantes · muestreo registro sen/kamu.
REV-plar: pl/ar dict+tut — «SI» residual pl · sylabus→program nauki ·
watchlist Program vs lista do obejrzenia (decidir canon) · declinación de Pep
pl (decidir y unificar) · ar دفتر→كتيب الصيغ · tutorial الشرح vs جولة تعريفية ·
بيزو→بيسو · muestreo chevrons ‹/› y masdar.

★★ TR e ID CAPA 1 COMPLETA (13 ago 2026): dict 5888/5888 + tut 612/612 LOS
DOS, verificador 0 errores ★★ (TUT-2 cerró los 19 trozos; TT-B..J con rótulos
verificados por Grep contra el dict, 0 inventados).

TUT-1 CERRADA: tut tr 319/612 · id 319/612 (trozos 01-10 completos).
PARA EL REVISOR DE CIERRE tr/id: (a) dict.id.ts trae «Entri» en
chat.tab.registros pero «Riwayat» en los resúmenes tut.chat-registros.* —
TT-C citó el rótulo real («Entri») y dejó dicho que lo que hay que unificar
es el par del dict; medir usos y unificar. (b) TT-B fijó 3D (no «3B») en
turco: barrer los ~20 usos de «3B» del dict.tr.ts. (c) destilar id: unificar
el «saring» suelto de los trozos 09-10 a «sarikan».

REVISORES CERRADOS: REV-trid 203 reemplazos en 45 hechos (3B→3D +2B→2D · id
«Entri» canon —Riwayat ya es «historial» en 26 sitios, colisión real— ·
saring→sarikan quirúrgico · comillas tr unificadas a « » (26 pares) ·
apóstrofo turco ’ normalizado en 122 sufijos · id linimasa ×2; cómputo y
mascota.bitacora resultaron YA correctos — falsos positivos del encargo).
REV-plar 52 reemplazos en 27 hechos (SI→AI ×5 · sylabus→program nauki ×3 ·
watchlist: rótulos Program(y)/البرامج, descripciones libres · Pep SE DECLINA
en pl (48 vs 13; el indeclinable oblicuo suena a error) · كتيب الصيغ ×3 ·
partición ratificada شرح=tutorial-cosa / جولة=tour-guiado, cruces ×5 ·
بيسو ×2 · 6 chevrons con doble inversión reparados · 6 masdar/artículo ·
3 fugas de género pl). PARCHE DEL ORQUESTADOR: la ficha
tut.app-ejercicio--carrera.resumen citaba «Cardio» (EN desfasado) → pestaña
real Dayanıklılık/Daya tahan/Wytrzymałość/التحمل en los 4 (mismo criterio que
fr→Endurance en Fase A). OJO perl: usar Node para retoques con texto no ASCII
(perl -CSD sin -Mutf8 doble-codifica el reemplazo).
Re-meter final ×4 (dict+tut): 0 marcadores rechazados.

═══════════════════════════════════════════════════════════════════
ESTADO: PAUSADO — ★★★ FASE F TERMINADA (13 ago 2026, 4ª sesión) ★★★
CAPA 1 COMPLETA EN LOS 4 IDIOMAS NUEVOS: tr · id · pl · ar =
dict 5888/5888 + tut 612/612 LOS CUATRO, revisados (255 hallazgos aplicados)
y re-metidos. verificar-i18n: 0 errores (631 avisos de longitud) ·
npx tsc -b: exit 0 · npm run build: ✓.
Además: R-RTL COMPLETA (dir dinámico + 576 usos→lógicas en 207 tsx + D-pad/
rotar con dir=ltr + pseudo-RTL auditado por DOM) y ÁRABE DADO DE ALTA.
~50 obreros Sonnet (dict) + 20 Opus (tut) + 2 revisores Opus en 7 rondas.
Incidencias: 3 obreros atascados construyendo scripts generadores (matados y
relanzados con la regla anti-scripts) · 1 corte de API (PLAR-S, relanzado) ·
0 pérdidas de datos (el disco manda).

QUEDA PARA LA PRÓXIMA CONVERSACIÓN (protocolo de arranque de esta sección):
1. CONTENIDO demo ×4 (ar/tr/id/pl): los 16 lotes (15 cuartos + recetario
   --recetas) con sacar/meter por cuarto. Monedas: tr ×45 (117.000 ₺) ·
   id ×17.500 (Rp45,5 juta) · pl ×4,25 (11.000 zł) · ar según glosario.
   El viaje queda en JAPÓN en los 4. C-idiomas con PERFIL_PRINCIPAL (inglés)
   y segundo perfil japonés.
2. CATÁLOGOS ×4: catalogoTr/Id/Pl/Ar.ts de fórmulas + registro en
   catalogoI18n.ts · Sísifo · especies · planes/metas/mapas · ejemplos de
   fábrica · manual de comandos (manual.tr/id/pl/ar.ts + manualI18n.ts) ·
   diario cultural con palabra del día NATIVA.
3. K-MEDIOS ×4: feeds RSS nativos verificados con petición real (tr/id/pl/ar).
4. REVISIÓN VISUAL: 631 avisos de longitud + RTL real en la app (chevrons SVG
   que apuntan, anchos de botón ar, WrappedOverlay.tsx:163 navega con clientX
   físico y no se espeja — arreglo de código pequeño).
5. Pendiente transversal ES/EN (chips): ui.cargando y
   ejercicio.confirmarGenerarImagenes con marcadores distintos entre dict.ts
   y dict.en.ts · EN desfasado de la ficha Cardio (los 13 idiomas ya citan la
   pestaña real salvo el propio EN) · mascota.bitacora en pt/fr/de/it (chip
   lanzado).
═══════════════════════════════════════════════════════════════════

ESTADO: ACTIVO 13 ago 2026 (5ª sesión) · Fase G (contenido demo tr/id/pl/ar) · Ronda 1
Protocolo cumplido: 0 hechos sueltos (Capa 1 consolidada) · verificador 0
errores (631 avisos) · re-sacados los 6 cuartos de R1 (conteos = Fase B/D).
Plan de rondas (calco de Fase D): R1 anecdotario·agenda·garage·cocina·jardin·
biblioteca ×{TRID,PLAR} · R2 recetario(--recetas)·sala·descanso·hobbies·ideas·
ejercicio ×2 · R3 computo·despacho·entretenimiento ×2 + C-idiomas ×2 (Opus,
PERFIL_PRINCIPAL inglés + segundo perfil japonés) · R4 revisores Opus + cierre.
Después: catálogos ×4 (molde Fase E, edición directa) + K-medios ×4.
OJO: cocina normal se METE antes de sacar --recetas (comparten cocina.*.json).
Monedas (factor sobre €, redondeo natural, TODOS los importes como en Fase D):
tr ×45 ₺ · id ×17.500 Rp («Rp45,5 juta») · pl ×4,25 zł · ar ×4 ر.س — DECISIÓN
DEL ORQUESTADOR: el glosario decía «moneda del país» sin factor; rial saudí
(locale ar-SA), meta del viaje 10.400 ر.س. El viaje queda en JAPÓN en los 4:
vuelo tr Estambul–Tokio directo ~11 h · id Yakarta–Tokio ~7 h (sin noche
entera, el madrugón queda) · pl/ar vuelo largo con escala intactos.
Políticas heredadas que rigen: nombres propios SE CONSERVAN (ar los
translitera: أولموس، لايكا; tr/id/pl en latín) · Laika es GATA (no se nombra
especie en los textos) · mascotas de Agenda = animales REALES · Pep SE DECLINA
en pl · género pl reescrito con impersonales (el diario es 1ª pers. de pasado:
udało się/było warto); 1ª pers. árabe ya es neutra sin tashkil (ojo adjetivos
del yo → forma nominal) · comillas tr « » / id “ ” / pl „ ” / ar « » · cifras
ar/hi occidentales · exónimos pl Tokio/Kioto; ar طوكيو/كيوتو · rótulos de UI
citados se verifican por Grep contra el dict del idioma · PROHIBIDOS los
scripts generadores (regla anti-scripts) · los JSON se escriben por tandas
manteniendo el archivo válido (prefijo reanudable).

Roster Ronda 1 (12 obreros Sonnet, contenido):
TRID y PLAR × anecdotario(249) · agenda(88) · garage(58) · cocina(82) ·
jardin(261) · biblioteca(159)

AMPLIACIÓN A MITAD DE R1 (pedido del usuario): se suma el NEERLANDÉS (nl).
Cimientos nl HECHOS con el molde de pl: glosario (registro «je/jij»,
imperativos Opslaan/Verwijderen, el género casi desaparece — evitar hij/zij
para el yo —, viaje: Japón intacto y moneda YA en euros, como fr/de/it),
alta nl-NL 🇳🇱 en idiomas.ts (antes del ar), cargadores en dict.ts,
dict.nl(.tut).ts de arranque (18 claves), clave ajustes.idioma.nl en EN
(5888→5889) y traducida a mano en los 13 dicts. npx tsc -b ✓ · verificador:
los 13 en 5889/5889, nl 19/5889, 0 errores. Inventario dict nl: 43 trozos
(5870 claves). Comillas nl: “ ”. Factor de longitud: el 1,6 por defecto
(germánico, como de). Canon de cuartos nl: lo fija el primer obrero que los
toque y lo reconcilia el revisor, como en pl/ar.
Plan nl: dict (obreros NLD conforme se liberen huecos) → tut (Opus) →
contenido (16 lotes) → catálogos + K-medios. El contenido nl de los cuartos
de R1 va en ronda propia al final (los obreros de R1 ya volaban sin nl).

Roster NLD Ronda 1 (4 obreros Sonnet, dict nl):
NLD-A 01-03 · NLD-B 04-06 · NLD-C 07-09 · NLD-D 10-12

NLD R1: 01-06 y 10-12 metidos (QA 0 fallos, marcadores = EN) → nl 1704/5889.
PARCHE del orquestador: room.computo.nombre «Rekenen»→Computerkamer (canon
de los otros 12: cuarto = computadora, no cálculo). CANON NL FIJADO en R1
(obligatorio R2+): Instellingen (Ajustes) · Doelen (pestaña Metas) ·
planning (cronograma) ≠ Rooster (horario) · lesprogramma (temario Idiomas)
≠ Programma's (Programas de Entretenimiento) · Gym · Vermaak
(Entretenimiento) · Agenda · Computerkamer · Valuta (divisas) · Crypto ·
Archief · Bordspellen · Dealer (crupier) · stapel (mazo) · hok (corral) ·
segment (tramo de caminos) · «GA!» (¡YA!) · MCER Beginner/Elementair/
Halfgevorderd/Gevorderd/Vergevorderd/Meesterschap · deportes con préstamo
asentado (Games/Sets/Rally/Strike…).
CHIP nuevo detectado por NLD-A: plantillas.ayuda tiene ES y EN
DESINCRONIZADOS (describen funciones distintas); huerto.etiqueta.guardar
ES «Guardar aviso» vs EN «Dismiss notice» (nl siguió al ES como de).

Roster NLD Ronda 2 (4 obreros Sonnet, dict nl):
NLD-E 13-15 · NLD-F 16-18 · NLD-G 19-21 · NLD-H 22-24
Roster NLD Ronda 3: NLD-I 25-27 · NLD-J 28-30 · NLD-K 31-33 · NLD-L 34-36
Roster NLD Ronda 4 (final dict): NLD-M 37-39 · NLD-N 40-41 · NLD-O 42-43

★★ DICT NL COMPLETO: 5889/5889 (13 ago 2026), QA 0 fallos en los 43 trozos,
verificador sin errores ★★ Canon nl final añadido: Automatisch (no «Auto»,
que es coche) · Spraakinvoer (dictado) · Slaap (Descanso) · Kracht ·
Cashflow · Overzicht · Voortgang · vakje/herhalingsvakje (caja Leitner, para
no chocar con hok) · werkplaats (taller) ≠ garage · kenteken (placas) ·
menstruatie/cyclus/vruchtbare periode · zorgmoment/Zorg · prik (vacuna) ·
Naasten (prójimos) · contactenboek · ontworming · kanban Te doen/Bezig/
Klaar · Taken (bandeja) · Huisarts · Pep sin arroba y esquivando zijn/haar.

Ronda TUT-NL (5 obreros OPUS, tut nl, 19 trozos idénticos en partición a
los demás): TN-A 01-04 · TN-B 05-08 · TN-C 09-12 · TN-D 13-16 · TN-E 17-19.
Regla de oro: los pasos citan RÓTULOS REALES — Grep contra dict.nl.ts antes
de citar botón/pestaña. AVISO conocido: catalogoNl de fórmulas y ramas nl
de MAPAS_PEP/planesPep NO existen aún (fase de catálogos) — títulos citados
caerán al ES hasta entonces; citarlos con traducción propia y reportarlos.

★★★ CAPA 1 NL COMPLETA (13 ago 2026): dict 5889/5889 + tut 612/612,
verificador 0 errores. 15 obreros dict + 5 Opus tut, 0 relanzamientos ★★★
Parches del orquestador al cierre del tut: «Infrastructuur»→Extra's en
tut.menu-plantillas.resumen (rótulo real inv.subPlantInfra; mismo bug que
la Fase C corrigió en CJK) · cafetería UNIFICADA a «koffiebar» (convivían
cafetaria —que en nl es friturería—, koffiezaak y koffiebar; 3 reemplazos).
Canon tut nl nuevo: dagdoel (objetivo diario) ≠ doel (meta) · dia/dia's
(lámina Wrapped) · blad (hoja de plan) · tentamen (parcial) · kernpunten ·
opvang/toevluchtsoord (santuario; unificar en revisor) · autopech (la
avería) · eindejaarsuitkering (aguinaldo) · tussentijden (parciales de
carrera) · comillas del tut nl “ ” (como el dict).
TÍTULOS DEMO ACUÑADOS EN EL TUT (la fase de catálogos nl los cita EXACTOS):
· mapas Ideas: «Mijn ideale leven» · «Doorstuderen of werken?» ·
  ochtendroutine · thermodynamica · natuurkunde en muziek · tentamenweek
· computo: Natuurkunde II · tussentoetsen · de koffiebar · het hardlopen ·
  het budget voor Japan · het plan van 18 weken · de cijfers van
  Natuurkunde II
· despacho: De reis naar Japan · het noodfonds · de schuld van de autopech
· entretenimiento: «Sciencefictionklassiekers om nog te zien»
· metas: “thermodynamica afronden vóór het tentamen” · categoría “Huis” ·
  «de aanvraag voor de master»
CABOS para el revisor nl: tut.editor-config.4 cita «densidad» sin clave en
el dict (¿ajuste retirado? el ES también lo citaría desfasado) · Openen vs
Naar binnen (nav.entrar huérfana en código; el tut siguió la ficha
publicada) · opvang (TN-C) vs toevluchtsoord (NLD-L/TN-B) para santuario.

NLD avance: trozos 01-36 metidos, nl 5263/5889, QA 0 fallos. Canon nl
ampliado (R2/R3): Conditie≠Cardio · Traject · Deadline · Dagboek≠
herinneringsdagboek · macros E/K/V · Lichaamsgewicht · reisplan≠route ·
Wektijd/Bedtijd · Administratie · tellerstand · Wegenbelasting/APK-keuring/
Kentekenbewijs · Koppen · Op deze dag · pijler · Sisyphusberg (menú: Berg) ·
Genadedagen · tovenaar (mago) · finish (meta deportiva) ≠ doel · Beweging
(Wrapped) · Vandaag (lista Hoy) · toevluchtsoord (santuario) · tracé/baan ·
kwadrant · dakschild/lessenaarsdak/zadeldak/schilddak/tongewelf/koepel ·
Blok/Bol/Kegel/Cilinder/Vlak · Schilkleuren · Gevel/Binnenmuur · Camus nl
«Men moet zich Sisyphus gelukkig voorstellen.»
PARCHE: ejercicio.confirmarGenerarImagenes nl alineada a los marcadores del
EN ({n},{proveedor}) como los otros 13 dicts — el chip ES/EN pendiente
corregirá los 14 juntos.
Avance R2 contenido: sala pl/ar ✓ · anecdotario pl/ar ✓ METIDOS — ★ R1
CONTENIDO COMPLETA ×4 (los 6 cuartos + recetario) ★. Notas de sala pl/ar:
el ES sale del AICM (Pep vive en CDMX) y pl/ar lo conservan INTACTO
(política «resto»); barrios/templos/hostales en latín, préstamos culturales
ja/ko transliterados en ar (أونيغيري، شينكانسن…) · «doce mil horas» del ES
se tradujo como 12 h siguiendo al EN (revisor decide si era hipérbole).
Anecdotario pl/ar: notas escolares adaptadas (trójka; ar descriptivo) ·
importes intermedios ANCLADOS al % de la meta (11.000 zł/10.400 ر.س) para
que «85 %» cuadre — criterio aceptado.

★ R2 CONTENIDO CERRADA: sala ✓×4 · descanso ✓×4 · hobbies ✓×4 · ideas tr/id ✓
· ejercicio tr/id ✓ (pl/ar de ideas y ejercicio en vuelo al cierre de esta
nota). DECISIONES RATIFICADAS en sala tr/id (precedente zh/ko de Fase D):
origen del vuelo ADAPTADO (İstanbul Havalimanı / Soekarno-Hatta; «catorce
horas»→11 h tr / 7 h id; id sin noche en avión: «Langsung pulang») · la hora
de intercambio en Nishijin enseña turco/indonesio (no español) · escapadas
domésticas TRANSPUESTAS: tr Oaxaca→Gaziantep · Valle de Bravo→Ölüdeniz/
Kelebekler Vadisi; id Oaxaca→Yogyakarta · Valle→Dieng Plateau. En pl/ar el
origen AICM y las escapadas mexicanas SE CONSERVAN (política «resto»).
Ejercicio tr: glúteo/cadera colisionan en «Kalça» → notas.29 usa «Popo ve
kalça» (coloquial, revisar si algún día se fija término oficial).
GRAFÍA AR Nuri/Nuria: el ES usa DOS formas del mismo personaje — «Nuri»
(apodo, anecdotario/jardín → نوري) y «Nuria» (ideas → نوريا, parche del
orquestador sobre el obrero que había unificado a نوري). Traducir LO QUE
DIGA el ES en cada ficha, como ru (Нурия en ideas). ideas ✓×4 · ejercicio
✓×4 METIDOS.

R3 EN VUELO (6 obreros Sonnet): computo(107)·despacho(96)·entretenimiento(46)
×{TRID,PLAR}. despacho lleva la tabla de monedas dura (117.000 ₺ ·
Rp45,5 juta · 11.000 zł · 10.400 ر.س + anclaje de hitos al %) y CETES se
conserva; computo la regla =SUMA( intacta y llaves LaTeX sin tocar (en ar,
nada de árabe dentro del .tex); entretenimiento títulos oficiales por
idioma (ar: asentado o latín, personas transliteradas) y jet lag adaptado
SOLO en id (2 h de desfase; tr/pl/ar lo conservan).
Avance R3: computo ✓×4 · despacho ✓×4 · entretenimiento tr/id ✓ metidos.
PARCHE del orquestador en computo pl/ar: la hoja «Presupuesto Japón»
convierte ¥→MXN con tasa fija COMPARTIDA (0.126 en demo.data.ts, sin rama
por idioma) — fr/de conservaron «(MXN/¥)»/«pesos» y tr/id siguieron ese
criterio; pl/ar habían re-etiquetado a zł/ر.س rompiendo el cuadre →
restauradas A21/A22 a MXN/¥ y peso/بيسو. Si algún día se quiere moneda
local ahí, pide CÓDIGO en demo.data.ts, no traducción.
Canon despacho tr/id: harç/SPP (colegiatura) · yıl sonu ikramiyesi/bonus
akhir tahun (aguinaldo; NO «THR») · kuruşu kuruşuna / rupiah demi rupiah
(peso por peso) · günün menüsü/paket makan siang (comida corrida) ·
entretenimiento: títulos oficiales verificados (Karanlığın Sol Eli,
Trisurya, Mülksüzler, Kör Bakış…; id sin edición local → original).
Tras R3 quedan: C-idiomas ×2 (Opus) · tut nl (19 trozos, Opus) · revisores
Opus (REV-trid-cont, REV-plar-cont, REV-nl) · contenido nl (16 lotes) ·
catálogos ×5 (tr/id/pl/ar/nl) + K-medios ×5 · verificar + tsc -b + build.

CORTE DE CUOTA (reset 8:10pm CDMX): cayeron 4 obreros a mitad — reanudado
por protocolo, el disco mandó: descanso.tr 61/61 COMPLETO ✓ metido ·
entretenimiento.pl 46/46 ✓ metido · idiomas.pl 216/216 ✓ metido (127
copiadas/89 traducidas, política correcta) · idiomas.tr prefijo válido
183/216. Relevos lanzados: descanso-id · entretenimiento-ar · C-idiomas
tr(184-216, sin re-decidir)+id (Opus) · C-idiomas ar (Opus, imita el
reparto campo a campo de pl/ru).

★★ CONTENIDO DEMO tr/id/pl/ar TERMINADO (los 16 lotes + C-idiomas, 13 ago
2026): idiomas ✓×4 con reparto idéntico entre ramas (127 copiadas) ·
entretenimiento.ar con títulos verificados contra Wikipedia ar (الوافد
para Arrival — la suposición inicial era errónea y se corrigió; Blindsight
queda en latín) · relevos del corte entregados limpios (prefijo tr byte-
idéntico). verificar-i18n 0 errores (746 avisos) · npx tsc -b exit 0 ·
npm run build ✓ ★★

REVISORES DE CONTENIDO EN VUELO (2 Opus, fixes sobre los .json de
traducciones/ — el orquestador re-mete después):
REV-trid-cont: coherencia tr/id entre los 16 lotes — TAREA CLAVE: las
escapadas Oaxaca/Valle de Bravo se transpusieron SOLO en sala (tr
Gaziantep/Ölüdeniz · id Yogyakarta/Dieng); buscar menciones en anecdotario/
jardin/hobbies/ideas/agenda tr/id y ALINEARLAS al mapeo de sala · origen
del vuelo İstanbul/Yakarta coherente entre cuartos · apóstrofo ’ ·
exónimos Tokyo/Kyoto · jet lag SOLO adaptado en id · terminología fijada
(Ara Sınav/UTS · Ortopedi · şnitzel · kâse/mangkuk · STNK…).
REV-plar-cont: pl/ar — grafías ar entre cuartos (بحيرة آشي/مياجيما/ريوكان
de hobbies vs sala.ar · كلير دو لون · نوري vs نوريا por ficha ES · negocios
en LATÍN) · pl declinaciones y CERO «-łem/-łam» del yo · token mixto
«Tالباردة» de biblioteca.ar entradas.11 (decidir convención) · «doce mil
horas» de sala (hipérbole ES vs 12 h del EN: verificar qué hicieron las
otras ramas y alinear) · impersonales pl consistentes.

CONTENIDO NL EN VUELO (7 Sonnet + 1 Opus): NC-A anecdotario(249) · NC-B
jardin(261) · NC-C agenda+garage+cocina(228; cocina re-sacada NORMAL) ·
NC-D biblioteca+descanso(220) · NC-E sala+entretenimiento(206) · NC-F
ideas+ejercicio(289) · NC-G computo+despacho(203) · NC-idiomas (Opus,
216, política PERFIL_PRINCIPAL). Recetario nl va DESPUÉS de meter cocina
nl (comparten archivos). nl: euros SIN conversión, Japón intacto, canon
del dict nl (koffiebar, tentamen, de Wijze…).
FE DE ERRATAS del roster: HOBBIES quedó fuera del reparto nl — lanzado
NC-H hobbies(51) al detectarlo. Avance nl: 14/16 lotes metidos (falta
hobbies y recetario, en vuelo). Parche del orquestador: «het café»→«de
koffiebar» en biblioteca/descanso nl (3 fichas; canon).

★ REV-trid-cont CERRADO (66 fixes en 19 archivos, re-metidos 18 pares):
escapadas y origen SIN deriva (solo existen en sala; transposición interna
coherente, cotas reales) · jet lag id limpiado en 4 sitios más (anecdotario
81/93, biblioteca, ejemplo de la tarjeta de idiomas) · LA DERIVA REAL era
el eje «parcial»: tr vize→ara sınav (15) · id ujian tengah semester→UTS
(10) · half marathon id (4) · apóstrofos ’ (19 + 10 en cocina i18n.ts
directo) · romanización Hiroşima→Hiroshima, Aşi→Ashi. Registro sin deriva
(sen/kamu; siz/Anda solo en supervivencia). NO aplicado (transversal):
CETES convive con ₺/Rp (10/13 ramas lo conservan) · «doce mil horas» es
hipérbole FIEL al ES (fr/de/nl la conservan) · tarjeta «jet lag» de
idiomas es vocabulario, se queda.
★ REV-plar-cont CERRADO (52 fixes en 12 archivos, re-metidos 14 pares):
grafías ar unificadas — هاكوني (5 archivos ya la usaban) · مياجيما (sala.ar
la tenía en latín) · أوكونومياكي · ياناكا (Yanaka mal leído «Yanika») ·
Nadia → ناديا (anecdotario usaba نادية) · نوري/نوريا ficha a ficha CORRECTO
sin cambios · كلير دو لون ya 100 % · pl SIN género colado (los «-łem» eran
instrumentales) · token bidi biblioteca → «1 − T_c/T_h (الباردة/الساخنة)» ·
«doce mil horas» YA alineado a ru/hi (12 h; la hipérbole vive en de/fr/it/
pt/tr/id) · monedas exactas 40+ importes con meta anclada al % · comillas
pl „ ” (15 pares corregidos) · DERIVA REAL cerrada: keyboard (الكيبورد /
keyboard pl — klawiatura es de ordenador) · bote de propinas البرطمان ·
Fudżi grafía y género (pokazał się) · sala.pl recupera el jet lag.
NO aplicado (convención, decidir en revisión visual): sala.ar deja barrios/
templos en LATÍN y anecdotario/jardin.ar los transliteran (~50 cadenas;
unificar pediría rehacer sala.ar o los otros) · narrador ar MASCULINO
uniforme en los pocos ḥāl adjetivales (convención de la casa: MSA en trato
directo masculino; si el producto quiere narrador neutro total en ar es
decisión aparte) · garage.ar conserva «Base en»/«piso 3» por bidi.
Verificador 0 errores · tsc -b exit 0 tras re-meter.

★ DECISIÓN DE PRODUCTO nueva (se suma a la de la rama ja): sala/demo.ts
LUGARES (pines del mapamundi, sin capa i18n) mostrará «Oaxaca · Mexico» y
«Valle de Bravo · Mexico» con coordenadas mexicanas bajo notas que en
tr/id hablan de Gaziantep/Ölüdeniz y Yogyakarta/Dieng, y grafías españolas
(Tokio, Seúl) contra el glosario Tokyo. Pide CÓDIGO (LUGARES por idioma),
no traducción — mismo expediente que los pines/fotos de la rama ja.

★★★ CONTENIDO DEMO COMPLETO EN LOS 5 IDIOMAS NUEVOS (13 ago 2026):
tr · id · pl · ar · nl — los 16 lotes (15 cuartos + recetario) consolidados
en sus demo.data.i18n.ts, con 2 revisores Opus aplicados (66 + 52 fixes) y
re-metidos. verificar-i18n 0 errores · tsc -b exit 0 ★★★

FASE DE CATÁLOGOS ×5 EN VUELO (molde Fase E, edición directa, reparto por
archivo; registros catalogoI18n.ts y manualI18n.ts los edita SOLO el
orquestador al final; catalogo.ts del diario SERIALIZADO tr/id primero →
pl/ar/nl después):
E-formulas-TRID crea computo/catalogoTr/Id.ts · E-formulas-PLARNL crea
catalogoPl/Ar/Nl.ts (ar: nada de árabe dentro del .tex) · E-sisifo-especies
(Opus): sisifoData + especies ×5 · E-planes: planesPep ×5 (Corea NO cambia
en estas 5 ramas) · E-metas-mapas: metasPep + demo.mapas ×5 (títulos = los
citados en el tut; nl con la lista acuñada) · E-ejemplos-builders ×5 (el
generador PISARÍA las ramas: a mano) · E-manual-TRID crea manual.tr/id.ts ·
E-manual-PLARNL crea manual.pl/ar/nl.ts · E-diario-TRID (Opus): catalogo.ts
ramas tr/id, palabra del día NATIVA + Wikipedia REST verificada · K-medios:
fuentes.ts feeds RSS tr/id/pl/ar/nl verificados con petición real.

═══════════════════════════════════════════════════════════════════
ESTADO: PAUSADO — ★★★ TANDA tr/id/pl/ar TERMINADA AL 100 % Y NEERLANDÉS
ENTERO, DE CERO AL 100 %, EN LA MISMA SESIÓN (13-14 ago 2026, 5ª) ★★★
Los CINCO idiomas (tr · id · pl · ar · nl) tienen TODO:
· Capa 1: dict 5889/5889 + tut 612/612 (nl se sumó a mitad de ronda:
  cimientos, alta, 43+19 trozos, canon propio).
· Capa 2 contenido: los 16 lotes (15 cuartos + recetario) + cuarto Idiomas
  con su política, consolidados en los demo.data.i18n.ts, con DOS revisores
  Opus de coherencia aplicados y re-metidos (66 + 52 fixes).
· Catálogos: fórmulas (catalogoTr/Id/Pl/Ar/Nl.ts + registro) · Sísifo
  121 ×5 · especies 100 ×5 (vernáculos verificados) · planes 17 ×5 (parche
  corea tr/id) · metas 56 ×5 · mapas 8 ×5 · ejemplos+builders 15 archivos ·
  manual ×5 (manual.tr/id/pl/ar/nl.ts + registro) · diario cultural 40×4 ×5
  (palabra del día NATIVA, títulos REST verificados).
· K-medios: 25 feeds RSS nativos ×5 verificados (CORS medido).
verificar-i18n: 0 errores (746 avisos de longitud) · npx tsc -b: exit 0 ·
npm run build: ✓.
~50 obreros Sonnet + ~14 Opus + 4 revisores en la sesión. Incidencias: 1
corte de cuota (4 relevos por protocolo, 0 pérdidas — el disco manda) + 3
cortes de conexión (relevos limpios); 1 cuarto olvidado del roster nl
(hobbies) detectado por el meter y repuesto.

QUEDA PARA LA PRÓXIMA CONVERSACIÓN:
1. REVISIÓN VISUAL (ya para los 15 idiomas): ~746 avisos de longitud ·
   RTL real en la app (chevrons SVG, anchos ar, WrappedOverlay.tsx:163
   clientX sin espejar — arreglo de código) · KaTeX CJK en \dfrac ·
   botones estrechos de/ru/hi/ar/pl (receta mind-home-verificar-en-demo).
2. DECISIONES DE PRODUCTO del usuario: (a) pines/fotos de sala hardcodeados
   (rama ja Y AHORA tr/id con las escapadas transpuestas); (b) tablas de
   itinerario con es==en en latín (zh/ko/ru/hi); (c) fichas hindi del
   diario cultural sin texto; (d) narrador ar en masculino uniforme (los
   pocos ḥāl adjetivales) — ¿se acepta o se pide neutro total?; (e)
   sala.ar con barrios/templos en latín vs transliterados en otros cuartos.
3. Chips ES/EN transversales: ui.cargando y ejercicio.confirmarGenerar-
   Imagenes (marcadores dict vs dict.en) · EN desfasado (ficha Cardio,
   plantillas.ayuda ES≠EN, «densidad» de editor-config) · mascota.bitacora
   pt/fr/de/it.
═══════════════════════════════════════════════════════════════════

AVANCE CATÁLOGOS: fórmulas ×5 CREADAS y REGISTRADAS en catalogoI18n.ts por
el orquestador (54+78+14+3+1 c/u; id «Rumus ABC», nl «Abc-formule») ·
K-medios ✓ 25 feeds ×5 verificados con petición real y CORS medido (Kompas/
Detik ya no exponen RSS, documentado) · metasPep ✓×5 (56 c/u) · mapas ✓×5
(8 c/u, títulos del tut; 2 relanzos por cortes de conexión) · planes ✓×5
(17 c/u) — PARCHE DEL ORQUESTADOR: el obrero original había escrito el plan
`corea` de tr/id con itinerario a JAPÓN (error; el relevo pl/ar/nl lo cazó
al ver que las otras 11 ramas y metasPep dicen Corea del Sur) → reescritos
a Seúl/Gyeongju-Busan/Jeju; en id sin marco de jet lag (Yakarta–Seúl 2 h) ·
Sísifo 121 ×5 + especies 100 ×5 ✓ (nombres vernáculos verificados: ببر no
نمر para el tigre, عفريت الماء ajolote, Gökdoğan halcón, Ara żółtoskrzydła;
minerales corregidos tras verificar) · manual ×5 CREADO y REGISTRADO en
manualI18n.ts por el orquestador (220+14+3 c/u; pl con impersonal -no/-to
como ru; tr patrón SOV como ja) · diario cultural tr/id ✓ (40×4 c/u,
títulos REST verificados, palabras nativas yakamoz/hüzün · rindu/senja;
sin retrato en id: La sombra del viento, frases de Benedetti/Galeano) ·
diario pl/ar/nl EN VUELO (serializado) · ejemplos-builders EN VUELO.
tsc -b en verde tras cada tanda.

Avance R1: agenda ✓×4 METIDA · garage ✓×4 METIDA · cocina ✓×4 METIDA ·
biblioteca ✓×4 METIDA · jardin ✓×4 METIDA · recetario ✓×4 METIDO
(QA 0 fallos; passthrough legítimo: Café Mirasol, direcciones CDMX).
R2 lanzada: sala·descanso·hobbies ×{TRID,PLAR} + ideas·ejercicio ×2.
Canon recetario: bowl SE TRADUCE en tr/id (kâse/mangkuk — diverge a
propósito del préstamo «Bowl» de las otras 9 ramas) · köri/kari · id gula
cokelat (moreno) ≠ gula merah (palma) · beras merah (integral).
Avance R2: descanso ✓×4 (parche: Clair de Lune ar → كلير دو لون, canon
agenda) · hobbies ✓×4 · anecdotario tr/id ✓ · recetario ✓×4.
GRAFÍAS AR fijadas por hobbies (cruzar con sala.ar al llegar): بحيرة آشي
(lago Ashi) · مياجيما (Miyajima) · ريوكان (ryokan) · ديبوسي (Debussy) ·
ساتي (Satie) · نشيد الفرح (Himno a la alegría) · Mare Crisium TRADUCIDO
بحر الأزمات (mismo criterio que ru Море Кризисов; hi lo translitera).
Himno a la alegría: tr Neşeye Övgü · id Ode Kegembiraan · pl Oda do
radości. Exónimos tr/id: Tokyo/Kyoto (forma internacional, no Tokio). Monedas verificadas al factor
exacto en jardin (60 €→2.700 ₺/Rp1.050.000 · 12 €→540 ₺/Rp210.000).
Confirmado de Fase D: ES «inglés» vs EN «Spanish» en gratitudes NO es bug
(PERFIL_PRINCIPAL); los obreros tr/id conservaron inglés. Canon biblioteca:
posgrado pl=studia magisterskie · ar=الدراسات العليا; científicos pl
declinados en latín (Newtona), ar transliterados (نيوتن). Para el revisor
ar: «Tfría/Tcaliente» quedó como token mixto latín-árabe (Tالباردة) en
biblioteca entradas.11 — decidir convención.
Cocina cerrada ⇒ ADELANTO R2: sacado --recetas (223) y lanzados 2 obreros
recetario TRID/PLAR (escriben cocina.<id>.json pisando los de cocina normal,
ya consolidada; meter con --recetas). Canon cocina ar/pl para el recetario:
platos japoneses pl en latín / ar transliterados (رامن، أوكونومياكي…),
sznycel/شنيتزل, jamón=جامبون, مخبوز (horno) vs مشوي (asado).
Canon fijado por los obreros de R1 (rige para R2+ y el revisor):
· Parcial (examen) = Ara Sınav / UTS / Kolokwium / امتحان نصفي
· Traumatología = Ortopedi (tr,id) / Traumatolog (pl) / أخصائي العظام (ar)
· Facultad de Ciencias = Wydział Nauk Ścisłych / كلية العلوم
· id: STNK (tarjeta de circulación), Kantor Imigrasi (pasaportes), UTS
· «Clair de Lune» ar = كلير دو لون (OJO hobbies/entretenimiento: unificar)
· pl declina nombres con patrón claro (Eleny, Ikera, Ruiza, Laiki);
  Marisol indeclinable
· PARCHE DEL ORQUESTADOR (política Fase D confirmada en disco: ru/zh/hi
  conservan «Verificentro 09-118 Iztaccíhuatl» en LATÍN): NEGOCIOS y
  CALLEJERO quedan en latín TAMBIÉN en ar (9 fichas de garage.ar y 5
  «Café Mirasol» de agenda.ar restauradas al ES; Verificentro pl recupera
  la marca). Las PERSONAS sí se transliteran en ar (أولموس، لايكا، دون
  ريفاس) — la distinción es persona vs negocio/calle.
· tr: şnitzel (milanesa), börek (empanadas), kâse (bowl), Kaşarlı tost
· platos japoneses del viaje SIN traducir en tr/id (ramen, okonomiyaki…)
═══════════════════════════════════════════════════════════════════
```
