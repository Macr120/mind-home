# Cómo trabajar Mind Planner Home (MPH) sin desperdiciar contexto

Objetivo: que cada tarea cargue **solo** el código y las reglas relevantes.

---

## 1. Etiqueta el alcance al pedir cambios

Empieza el mensaje con una etiqueta. La IA y las reglas de Cursor usarán eso para acotar.

| Etiqueta | Cuándo | Archivos típicos |
|----------|--------|------------------|
| `[CASA]` | 3D, cámara, personaje, menú, editor mapa, interacción | `src/core/house/**`, `src/core/state/**`, `src/core/ui/**` (shell) |
| `[DATOS]` | Tablas, migraciones, repos | `src/core/data/db.ts`, `repository.ts` |
| `[REGISTRY]` | Nuevo cuarto, posición, contrato | `registry.ts`, `Furniture.tsx`, `rooms/<id>/index.tsx` |
| `[COCINA]` … `[HOBBIES]` | Solo esa mini-app | `src/rooms/<id>/**` |
| `[EDITOR]` | Personalización casa (colores, avatar, objetos) | `src/core/ui/editor/**`, `EditPanel.tsx` |

Ejemplos:

- `[COCINA] Agrega filtro por categoría en el diario de comidas`
- `[CASA] El personaje no centra bien al abrir el editor de paredes`
- `[DATOS] Nueva tabla para recordatorios en recámara`

---

## 2. Archivos que debes @ mencionar (Cursor)

| Tarea | Menciona |
|-------|----------|
| Estado general | `@docs/AVANCE.md` |
| Convenciones | `@.cursor/rules/arquitectura.mdc` |
| Casa 3D / navegación | `@docs/COMO-TRABAJAR.md` + carpeta `@src/core/house` |
| Un cuarto concreto | `@src/rooms/cocina` (o el id) + `@docs/AVANCE.md` (solo la fila de esa app) |
| Nuevo cuarto | `@.cursor/rules/agregar-cuarto.mdc` |

**No** abras `@src/core/data/db.ts` entero si solo cambias UI de un cuarto.

---

## 3. Reglas Cursor (automáticas por carpeta)

| Regla | Se activa cuando editas |
|-------|-------------------------|
| `arquitectura.mdc` | Siempre (resumen mínimo) |
| `casa.mdc` | `src/core/house/**`, `state/**`, shell `ui/**` |
| `agregar-cuarto.mdc` | `src/rooms/**` |
| `datos.mdc` | `src/core/data/**` |

Así, al editar `rooms/cocina/` no se inyecta todo el contexto de la casa 3D.

---

## 4. Límites de cada capa

### Casa NO debe

- Contener lógica de negocio de nutrición, finanzas, etc.
- Importar componentes de `rooms/<id>/` salvo vía `registry` (lazy: solo `App`).

### App NO debe

- Importar `db` directamente.
- Importar `@react-three/fiber` ni archivos de `house/`.
- Asumir posición en el mapa (eso es `registry` + diseño).

### Datos

- Cambio solo en UI existente → probablemente **ningún** cambio en `db.ts`.
- Campo nuevo persistido → `[DATOS]`: tabla + versión Dexie + repo; luego la app usa el repo.

---

## 5. Flujos de trabajo recomendados

### Pulir un cuarto existente

1. Lee la fila en `docs/AVANCE.md`.
2. Chat: `[COCINA] …` + `@src/rooms/cocina`.
3. Si hace falta un campo nuevo: primero `[DATOS]`, después vuelve al cuarto.

### Cambio en navegación o editor

1. `[CASA] …` + `@src/core/house` o `@src/core/state/layoutStore.ts`.
2. No leas las 12 apps.

### Cuarto nuevo

1. `@.cursor/rules/agregar-cuarto.mdc`
2. Orden: carpeta app → `index.tsx` → `registry` → `Furniture` → (datos si aplica).

---

## 6. Documentación: una fuente, sin duplicar

| Archivo | Rol |
|---------|-----|
| `docs/AVANCE.md` | Qué está hecho (casa + apps) |
| `docs/COMO-TRABAJAR.md` | Este archivo — workflow |
| `README.md` | Usuario final: comandos, controles |
| `CLAUDE.md` | Índice corto para IA → apunta a `docs/` |
| `.cursor/rules/*.mdc` | Reglas acotadas por glob |

Actualiza **solo** `AVANCE.md` cuando termines un hito grande en un cuarto o en la casa.

---

## 7. Chats separados por tema

En Cursor, conviene **un chat por contexto**:

- Chat A: Casa / editor / cámara
- Chat B: Cocina + datos nutrición
- Chat C: Finanzas
- …

Así el historial no mezcla 500 líneas de Three.js con tabs de Tailwind.

---

## 8. Checklist antes de cerrar una tarea

```bash
npx tsc --noEmit
npm run build
```

Solo `[CASA]` con cambios 3D: probar en `npm run dev` pan, zoom, entrar a cuarto, editor.
