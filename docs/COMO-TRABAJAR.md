# Cómo trabajar Mind Planner Home (MPH) sin desperdiciar contexto

Objetivo: que cada tarea cargue **solo** el código y las reglas relevantes.

---

## 1. Etiqueta el alcance al pedir cambios

Empieza el mensaje con una etiqueta. La IA y las reglas de Cursor la usan para acotar.

| Etiqueta | Cuándo | Archivos típicos |
|----------|--------|------------------|
| `[CASA]` | 3D, cámara, personaje, menú, editor de mapa, interacción | `src/core/house/**`, `src/core/state/**`, `src/core/ui/**` |
| `[DATOS]` | Tablas, migraciones, repos, sincronización | `src/core/data/**` |
| `[REGISTRY]` | Plantilla nueva o cambio de contrato | `registry.ts`, `rooms/<id>/index.tsx`, `modelosRecursos.tsx` |
| `[COCINA]` … `[AGENDA]` | Solo esa mini-app | `src/rooms/<id>/**` |
| `[EDITOR]` | Personalización de la casa (colores, avatar, objetos, planos) | `src/core/ui/editor/**`, `src/core/ui/planos/**`, `EditPanel.tsx` |
| `[NUBE]` | Cuenta, créditos, IA de servidor, sync | `src/core/cuenta/**`, `src/core/data/sync/**`, `supabase/**` |
| `[WEB]` | Landing pública y /cuenta | `web/**`, `vite.config.web.ts` |

Ejemplos:

- `[COCINA] Agrega filtro por categoría en el diario de comidas`
- `[CASA] El personaje no centra bien al abrir el editor de paredes`
- `[DATOS] Nueva tabla para recordatorios en recámara`

---

## 2. Archivos que conviene mencionar (Cursor)

| Tarea | Menciona |
|-------|----------|
| Reglas duras | `@CLAUDE.md` |
| Estado general | `@docs/AVANCE.md` |
| Convenciones | `@.cursor/rules/arquitectura.mdc` |
| Casa 3D / navegación | `@src/core/house` |
| Una app concreta | `@src/rooms/<id>` |
| App nueva | `@.cursor/rules/agregar-cuarto.mdc` |
| Nube y créditos | `@docs/BACKEND.md`, `@docs/COSTOS.md` |

**No** abras `@src/core/data/db.ts` entero (3 600 líneas) si solo cambias UI de una app.

---

## 3. Reglas Cursor (automáticas por carpeta)

| Regla | Se activa cuando editas |
|-------|-------------------------|
| `arquitectura.mdc` | Siempre |
| `casa.mdc` | `src/core/house/**`, `state/**`, `ui/**` |
| `agregar-cuarto.mdc` | `src/rooms/**` |
| `datos.mdc` | `src/core/data/**` |

---

## 4. Límites de cada capa

### La casa NO debe

- Contener lógica de negocio de nutrición, finanzas, etc.
- Importar componentes de `rooms/<id>/` salvo vía `registry` (y su `App` va con `lazy()`).

### Una app NO debe

- Importar `db` directamente (solo repos).
- Importar `@react-three/fiber` ni archivos de `house/`.
- Importar otra app: lo compartido va en `src/rooms/_shared/`.
- Asumir una posición en el mapa: las apps se asignan a objetos, no tienen sitio fijo.

### Datos

- Cambio solo en UI existente → probablemente **ningún** cambio en `db.ts`.
- Campo nuevo persistido → `[DATOS]`: tabla + versión Dexie + repo + alta en `syncables.ts`.

---

## 5. Flujos de trabajo recomendados

### Pulir una app existente

1. Lee su fila en `docs/AVANCE.md`.
2. Chat: `[COCINA] …` + `@src/rooms/cocina`.
3. Si hace falta un campo nuevo: primero `[DATOS]`, después vuelve a la app.

### Cambio en navegación o editor

1. `[CASA] …` + `@src/core/house` o `@src/core/state/layoutStore.ts`.
2. No leas las 21 apps.

### App nueva

1. `@.cursor/rules/agregar-cuarto.mdc`
2. Orden: carpeta → `index.tsx` → `registry` → datos → recurso 3D → enganches
   (actividad, i18n, tutorial, demo).

---

## 6. Documentación: una fuente, sin duplicar

| Archivo | Rol |
|---------|-----|
| `CLAUDE.md` | Reglas duras y lista viva de apps — la fuente principal |
| `docs/AVANCE.md` | Qué está hecho por área |
| `docs/COMO-TRABAJAR.md` | Este archivo — workflow |
| `docs/BACKEND.md` / `docs/COSTOS.md` | Nube, créditos y runbook |
| `README.md` | Usuario final: comandos, controles, apps |
| `.cursor/rules/*.mdc` | Reglas acotadas por glob |

Actualiza `AVANCE.md` cuando termines un hito grande. Si cambias el contrato de `Plantilla`,
la estructura de carpetas o el modelo de cuartos, **actualiza también las reglas `.mdc`**: son
lo que lee la IA, y desactualizadas hacen que trabaje sobre archivos que ya no existen.

---

## 7. Chats separados por tema

Un chat por contexto: casa/editor, una app, datos/nube. Así el historial no mezcla 500 líneas
de Three.js con tabs de Tailwind.

---

## 8. Checklist antes de cerrar una tarea

```bash
npx tsc -b
npm run build
npm run lint
```

**`npx tsc --noEmit` NO sirve aquí**: el `tsconfig` usa `references` y no valida nada. Tiene
que ser `tsc -b`.

Solo `[CASA]` con cambios 3D: probar además en `npm run dev` pan, zoom, entrar a una app y el
editor de mapa.
