# Mind Planner Home (MPH)

App de una **casa isométrica 3D estilo Roblox** donde cada cuarto es una mini-app 2D
independiente pero interconectada (muchas apps en 1). Web (Vite + React), futuro móvil
con Capacitor.

## Organización por contexto

- **Estado del avance**: [`docs/AVANCE.md`](docs/AVANCE.md) — casa vs cada cuarto
- **Cómo trabajar sin ruido**: [`docs/COMO-TRABAJAR.md`](docs/COMO-TRABAJAR.md)
- Etiquetas en prompts: `[CASA]`, `[DATOS]`, `[COCINA]`, …

## Stack
- **React 19 + TypeScript + Vite**
- **React Three Fiber + @react-three/drei** (Three.js) para la casa 3D
- **Zustand** para estado global (`src/core/state/houseStore.ts`)
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`) para las apps 2D
- **Dexie (IndexedDB)** para datos locales — migrable a Supabase después

## Estructura
```
src/
  core/
    house/      escena 3D (House, Room3D, Character, RoomMarker, walls.ts)
    data/       db.ts (Dexie) + repository.ts (repos reactivos)
    state/      houseStore.ts (Zustand)
    ui/         HUD, RoomOverlay
    registry.ts contrato RoomModule + lista de cuartos/plantillas
  rooms/<id>/   UNA CARPETA POR CUARTO (la mini-app 2D)
```

## Reglas duras (no romper)
1. **Datos**: las apps de los cuartos NUNCA importan `db` directamente. Usan los
   repositorios de `src/core/data/repository.ts` (`useAll`, `add`, `update`, `remove`).
   Para datos nuevos: agrega la tabla en `db.ts` (sube `this.version(n)`) y crea un repo.
   `db.ts` es el único punto que toca IndexedDB (para migrar a Supabase se reescribe solo ese archivo).
2. **Geometría de paredes**: `src/core/house/walls.ts` es la ÚNICA fuente. La usan
   tanto el render (`Room3D`) como las colisiones (`Character`). No dupliques esa geometría.
3. **Contrato de cuarto**: cada `src/rooms/<id>/index.tsx` exporta por defecto un
   `RoomModule` y se registra en `src/core/registry.ts`.
4. **Idioma**: todo el texto de UI y los comentarios en **español**.
5. **Estilo**: tema oscuro (fondo `#0f1115`), Tailwind utility-first, sin librerías de
   UI externas. Las gráficas se hacen con divs/SVG (sin librería de charts).
6. **Variables de Configuraciones** (`idioma`, `estiloIconos`, `modoUI`, `temaUI` de
   `src/core/state/ajustesStore.ts` — el usuario las cambia en la pestaña Configuraciones).
   TODO cambio de UI debe respetarlas:
   - **Texto nuevo** → siempre `t('clave', 'Español')` (hook `useT` de `src/core/i18n/useT.ts`)
     y su traducción inglesa en `src/core/i18n/dict.ts` **en el mismo cambio**. Nunca texto
     visible hardcodeado (tampoco en `title`, `placeholder`, `alt` o `aria-label`).
   - **Icono nuevo** → siempre `<Icono nombre="...">` de `src/core/ui/iconos/` (o
     `<Icono emoji={dato}>` si el emoji viene de datos/BD); nunca un emoji crudo en JSX.
     Si no existe la entrada, añade `{ emoji, Svg }` al `CATALOGO` de
     `src/core/ui/iconos/catalogo.ts`. No incrustes emojis dentro de los textos de `t()`.
   - **Excepciones que sí conservan emoji**: `<option>` de selects, `placeholder` de inputs,
     mensajes de celebración/notificación («¡Ganaste! 🎉»), frases de mascota
     (`core/chat/mascotas.ts`), etiquetas `<text>` dentro de SVG (croquis/diales) y
     cualquier emoji que el usuario guardó como dato.
   - Colores/tema: usa las clases `ui-*`/variables `--ui-*` (nunca hardcodear fondos).

## Agregar un cuarto nuevo
1. Crear `src/rooms/<id>/MiApp.tsx` — componente React 2D con Tailwind, tema oscuro.
2. Crear `src/rooms/<id>/index.tsx` exportando un `RoomModule` (alias de `Plantilla`,
   contrato en `registry.ts`):
   - Campos: `id` (único, kebab/lowercase), `nombre`, `icon`, `color`, `categoria`
     (`'cuerpo' | 'mente' | 'complemento' | 'config'`), `App`.
   - `posicion` ya NO existe (era del modelo viejo de cuadrícula fija; ahora el usuario
     ubica la app al asignarla a un objeto de un cuarto).
3. Registrar en `src/core/registry.ts`: importar y añadir a `plantillas[]` + su
   descripción en `DESCRIPCIONES`.
4. Datos nuevos: tabla en `db.ts` (sube `this.version(n)`) + repo en `repository.ts`.
5. Recurso 3D del cuarto: entrada en `SIEMBRA` de `src/core/house/modelosRecursos.tsx` +
   tipo/componente en `especialesPlantillaMeta.ts` y `especialesPlantilla.tsx`
   (`Furniture.tsx` ya no existe).
6. Enganchar al resto del núcleo (ver `src/rooms/ideas/` como referencia reciente):
   FUENTES de actividad en `src/core/gamificacion/actividad.ts`, tablas a sincronizar en
   `src/core/data/sync/syncables.ts`, textos en `src/core/i18n/dict.ts`, y si aplica,
   tutorial/comandos de chat/asistente propio.

## Cuartos
| # | Cuarto | App | Estado |
|---|--------|-----|--------|
| 1 | Cocina | Nutrición | ✅ |
| 2 | Ejercicio | Rutinas | ✅ |
| 3 | Recámara | Descanso + Anecdotario | ✅ |
| 4 | Despacho | Finanzas | ✅ |
| 5 | Biblioteca | Aprendizaje | ✅ |
| 6 | Entretenimiento | Películas, series, libros, juegos de mesa | ✅ |
| 7 | Sala | Viajes | ✅ |
| 8 | Jardín | Mindfulness | ✅ |
| 9 | Garage/Taller | Vehículos | ✅ |
| 10 | Diario | **Noticias (briefing RSS diario)** — NO es el anecdotario | ✅ |
| B | Hobbies | Pasatiempos y proyectos | ✅ |
| C | Anecdotario | Fotos y recuerdos (separado de Recámara) | ✅ |
| D | Idiomas | Tutor IA, vocabulario SRS y temario por niveles | ✅ |
| E | Calendario | Eventos y rutinas por día/semana/mes | ✅ |
| F | Ideas | Diario de ideas y lluvias, mapas conceptuales y diagramas para decidir | ✅ |
| G | Agenda | Trabajo (pendientes, eventos, proyectos), Salud (citas, medicamentos y mascotas con sus cuidados) y Personas (contactos y cumpleaños) | ✅ |

**Infraestructura** (plantillas `tipo: 'infraestructura'`: se construyen directo en el
mapa 3D, no ocupan un cuarto): Caminos (pistas, rieles, montañas rusas), Canchas (fútbol,
tenis, básquet), Huerto (parcelas y cultivos), Granja (cría de animales) y Paintball
(batallas 1v1/2v2/campal vs. asistentes). Todas ✅.

**Personalización de la casa** (colores, avatar, objetos, perfil): modo **✏️ Editar mapa** → panel derecho (`EditPanel`).

**Respaldo de datos** (exportar/restaurar/borrar): Editor → pestaña Configuraciones →
sección «Respaldo de datos» (`EditorRespaldoSection`). Antes vivía en el cuarto Bodega,
eliminado en jul 2026.

## Calidad "premium"
Cada cuarto debe acercarse a apps premium del mercado. Antes de construir/pulir un cuarto,
analiza qué features tiene la competencia e impleméntalas (ej. Finanzas: presupuestos,
gráficas, categorías con iconos, metas de ahorro).

## Verificación
```bash
npm run dev      # http://localhost:5173
npx tsc -b       # tipos (¡OJO! --noEmit NO valida nada aquí: tsconfig usa references)
npm run build    # build de producción
```
Los tres deben pasar sin errores antes de dar por hecho un cambio.

## Notas
- iOS con Capacitor requiere Mac; desarrollo principal en Windows.
- Ver `README.md` para detalles y tabla completa.
