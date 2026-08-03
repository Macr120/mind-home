# Mind Planner Home (MPH) — Estado del avance

Última actualización: **agosto 2026**. Estado por área. La lista viva de apps y las reglas
duras están en [`CLAUDE.md`](../CLAUDE.md); aquí va qué está hecho y qué queda.

---

## Arquitectura en una frase

La **casa** (`src/core/`) es el controlador: render 3D, navegación, menú, editor de mapa y
registro de plantillas. Cada **app** (`src/rooms/<id>/`) es independiente: solo su UI 2D y los
repos de `repository.ts`. No importan `db` ni Three.js.

Los cuartos son **dinámicos** (los crea el usuario) y una app se **asigna a un objeto** de un
cuarto. No hay cuadrícula fija ni campo `posicion`: eso era el modelo de 2025.

---

## Casa (shell 3D + UI global) — ✅

| Área | Archivos clave | Estado |
|------|----------------|--------|
| Escena 3D | `house/House.tsx`, `Room3D.tsx`, `walls.ts` | ✅ |
| Objetos y recursos | `catalogo.tsx`, `modelosRecursos.tsx` (`SIEMBRA`), `especialesPlantilla.tsx` | ✅ |
| Personaje | `Character.tsx`, `movement.ts`, apariencia, guardarropa | ✅ |
| Cámara | `CameraRig`, `CameraControls`, iso + 3ª + 1ª persona (tecla V) | ✅ |
| Editor de mapa | 4 pestañas (Mapa/Personajes/Objetos/Configuraciones) + editor 3D | ✅ |
| Construcción | Pisos, muros, puertas, ventanas, techos, formas por celda, niveles y sótano | ✅ |
| Infraestructura | Caminos, canchas, huerto, granja, paintball | ✅ |
| Temas y estilos | 7 temas + 5 estilos de postprocesado, luz/niebla/IBL | ✅ |
| Asistentes y chat | Asistentes configurables, TTS, manual de comandos, deep links | ✅ |
| Gamificación | Tamagotchi de actividad real, XP, rachas, Montaña de Sísifo, Wrapped | ✅ |
| Tutoriales | Tours con mago + spotlight; 39 flujos sobre la casa demo | ✅ |
| i18n | ES/EN con `useT`; inglés en `dict.en.ts` con carga diferida | ✅ |
| Rendimiento | Lazy de apps, texturas optimizadas, selectores acotados en la escena | ✅ |

---

## Datos — Dexie **v106**

`db.ts` es el único punto que toca IndexedDB; las apps usan los repos de `repository.ts`.
118 tablas declaradas, 106 sincronizables.

**Sincronización opcional** (`src/core/data/sync/`, plan Pro): cada tabla lleva `&uid`, se
declara en `syncables.ts` (`TABLAS_SYNC`), y sus claves foráneas numéricas en `FK` +
`ORDEN_TOPO`. El middleware genera tombstones para los borrados.

**Respaldo** (`data/respaldo.ts` + Configuraciones › Respaldo de datos): exporta todas las
tablas menos las internas `_`. La Bodega, que antes alojaba esto, se eliminó en jul 2026.

---

## Apps — 16 de cuarto + 5 de infraestructura

La tabla viva está en [`CLAUDE.md`](../CLAUDE.md) › Cuartos. Todas registradas, abriendo y con
persistencia real; el grado de pulido «premium» varía por app.

De cuarto: Cocina, Ejercicio, Recámara (descanso), Anecdotario, Despacho, Biblioteca,
Entretenimiento, Sala, Jardín, Garage, Diario (noticias), Hobbies, Idiomas, Calendario, Ideas
y Agenda.

De infraestructura (se construyen en el mapa, `tipo: 'infraestructura'`): Caminos, Canchas,
Huerto, Granja y Paintball.

---

## Nube y monetización — ✅

Backend Supabase completo: cuenta y sesión, proxy de IA con **créditos por operación** y
reservas, RevenueCat (suscripción y recargas), sincronización solo-Pro y borrado de cuenta.
15 migraciones en `supabase/migrations/`, 4 Edge Functions. Detalle y runbook en
[`BACKEND.md`](BACKEND.md); tarifas y márgenes en [`COSTOS.md`](COSTOS.md).

**Web pública** (`web/`, segundo build de Vite): landing, `/cuenta`, términos y privacidad.

---

## Casa demo — un año de Pep@ ✅

Demo completa en una **BD paralela** (`mind-home-demo`, solo lectura salvo minijuegos) con un
año de vida ficticia: maratón, −7 kg, piano, Japón en el mes 9 y el bache del mes 7. Entrada
desde Configuraciones › Tutoriales; salida con la píldora «Casa demo». Todo en `src/demo/`,
con contenido bilingüe generado por `npm run demo:texto`.

---

## Deuda conocida (ago 2026)

Lo que está identificado y sin cerrar, por orden de impacto:

1. **Arranque: 1 097 KB gz** en 7 archivos, repartidos en `index` (415), `three` (333) y
   `chat` (343). El siguiente candidato es el registro: los 21 `rooms/*/index.tsx` arrastran
   de forma eager sus `tutorial.ts`, `ejemplos.ts` y `demo.ts` (~156 KB gz medidos aislando
   el chunk `registry`), cuando solo hacen falta al abrir cada app.
   **Cuidado con `advancedChunks`**: no difiere nada, solo agrupa. Un grupo con un único
   módulo del grafo eager se descarga entero — así es como el grupo `editor` metía 609 KB gz
   de código común en el arranque. Verificar por los `modulepreload` de `dist/index.html`,
   nunca por el tamaño del chunk.
2. **Duplicación con sitio natural en `src/rooms/_shared/`**: `BarraEjemplo` (agenda y despacho
   sin migrar al de `_shared/ejemplos/`), `sala/fotos.tsx`, `campana.ts`, `ids.ts`, helpers de
   fecha (`hoyISO` ×9, `sumarDias` ×7) y el heatmap anual ×3.
3. **Contenido sin traducir**: la UI está al 99,97 %, pero los catálogos de datos
   (`biblioteca/pilares.ts`, `entretenimiento/juegos/preguntas.ts`…) se pintan en español
   crudo, `ComandoApp.etiqueta` no tiene clave i18n, y `web/cuenta` es solo español.
4. **`categoriasCardio`** no se puede borrar todavía: su lectura en el seed de Ejercicio es la
   única migración de esos datos a `gruposCardio` y solo corre al sembrar ese cuarto.
5. **Créditos**: el peor caso real de COGS es el `chat` con TOOLS_EDITOR (~$14/mes con 700
   créditos), no `texto_largo`. Ver la corrección en `COSTOS.md`. Aplicados los límites de
   entrada; pendiente medir el p95 de salida de `modelo3d` antes del 31-ago-2026, cuando
   acaba el precio introductorio de Sonnet 5.

**Cerrado en ago 2026**: los 49 warnings de lint (0 errores, 0 warnings), el histórico de
hábitos pausados, el `dispose()` de las geometrías de `MuroRender`, el alias `RoomModule`, la
tabla fantasma `perfilUsuario` (v107), `setRoomPisoImagen`, las cuatro tablas muertas que
viajaban por el sync, las 7 claves foráneas que el sync no traducía y el panel de respaldo,
que llevaba muerto desde la v64.
