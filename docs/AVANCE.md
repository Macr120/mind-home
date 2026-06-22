# Mind Home — Estado del avance

Última actualización: junio 2026. **Fuente de verdad** para saber qué está hecho en la
**casa (shell 3D)** vs cada **mini-app (cuarto)**.

---

## Arquitectura en una frase

La **casa** (`src/core/`) es el controlador: render 3D, navegación, menú, editor de mapa
y registro de cuartos. Cada **app** (`src/rooms/<id>/`) es independiente: solo su UI 2D y
los repos de `repository.ts`. No importan `db` ni Three.js.

---

## Casa (shell 3D + UI global) — ✅ reciente

| Área | Archivos clave | Estado |
|------|----------------|--------|
| Escena 3D | `house/House.tsx`, `Room3D.tsx`, `Furniture.tsx`, `walls.ts` | ✅ |
| Personaje | `house/Character.tsx`, `movement.ts`, `navigation.ts` | ✅ |
| Cámara | `house/CameraRig.tsx`, `CameraControls.tsx`, `state/cameraStore.ts` | ✅ |
| Navegación | Clic suelo (sin colisiones), pan central/dos dedos, zoom, doble clic centrar | ✅ |
| Menú lateral | `ui/RoomSideMenu.tsx` — tarjetas compactas, Entrar / Editar | ✅ |
| Entrar a cuarto | Menú «Entrar» o clic mueble principal → diálogo (`roomInteract.ts`) | ✅ |
| Overlay app | `ui/RoomOverlay.tsx` — Mind Home arriba izq., Volver arriba der. | ✅ |
| Interacción 3D | `InteractAnchor`, `InteractOverlay`, `interactUiStore` (sin Html drei) | ✅ |
| Techo | `TechoToggleButton`, `conTecho` en `houseStore` | ✅ |
| Editor mapa | `layoutStore`, `EditPanel`, `WallEditor`, arrastre cuartos/objetos | ✅ |
| Editor cuarto | Zoom/offset con panel derecho, sombras off en edición | ✅ |
| Controles vista | `NavControls` abajo izquierda en edición | ✅ |
| Personalización casa | `disenoStore` + editor mapa (`EditPanel`, `core/ui/editor/`) | ✅ |
| Registro | `registry.ts` — 12 `RoomModule` | ✅ |

**No tocar al trabajar solo en un cuarto** salvo que cambies contrato, posición, mueble 3D
o datos compartidos.

---

## Datos compartidos — `db.ts` v21

| Repo | Tablas / uso |
|------|----------------|
| `finanzasRepo` | transacciones, presupuestos, metas |
| `comidasRepo`, `planComidasRepo`, `aguaRepo`, `favoritosRepo`, `perfilNutricionRepo` | Cocina |
| `sesionesEjercicioRepo`, `seriesFuerzaRepo`, `perfilEjercicioRepo` | Ejercicio |
| `suenoRepo`, `anecdotasRepo` | Recámara |
| `mediaArchivoRepo`, `juegosMesaRepo` | Entretenimiento |
| `progresoTemaRepo` | Biblioteca |
| `viajesRepo`, `actividadesViajeRepo`, `gastosViajeRepo`, `checklistViajeRepo` | Sala (viajes) |
| `sesionesMindfulnessRepo`, `registroAnimoRepo`, `gratitudDiariaRepo`, `perfilMindfulnessRepo` | Jardín |
| `vehiculosRepo`, `registrosMantenimientoRepo` | Garage |
| `noticiasRepo` | Diario |
| `perfilUsuarioRepo` | Perfil (editor mapa) |
| `disenoRoomsRepo`, `disenoAvatarRepo` | Colores/nombres/avatar (editor mapa) |
| `bitacoraRepo` | Chat del arquitecto (texto crudo etiquetado) |
| `memoriasRepo` | Memorias del arquitecto: hechos sobre el usuario ("recuerda que…") |
| `rutinasRepo`, `ejecucionesRutinaRepo` | Rutinas orquestadas (pasos multi-cuarto) + qué se completó cada día |

**Captura**: los cuartos con quick-capture exponen además `esquemas` (`EsquemaCaptura[]`
en `registry.ts`): descripción declarativa de los campos de cada registro. Es el contrato
que la capa de IA usa como "herramientas" (el modelo llena campos → `guardar` usa repos).
El `capturar` por regex queda como fallback sin red.

**Capa de IA** (`src/core/chat/ia.ts`): `interpretarIA(texto, mascota, imagen?)` —
multi-proveedor: Claude (SDK oficial) o Gemini/ChatGPT/DeepSeek/Ollama local (formato
compatible-OpenAI, una sola implementación). Los esquemas van como herramientas, las
`memorias` vigentes como contexto y la `personalidad` de la mascota como voz. Todo se
configura desde el **ChatBox**: botón 🧠 selector de modelo + clave por proveedor
(localStorage `mh.iaKey.<prov>`; legado `mh.iaKey` = Claude), 📎 foto (visión: comida,
tickets…), 🎤 dictado (Web Speech API). Sin clave o con error → fallback automático al
dispatcher determinista. Siguiente fase: proxy serverless con clave propia (freemium) y
herramientas de acción por asistente (chef→recetas web; finanzas→proponer con confirmación).

**Rutinas orquestadas** (`src/core/rutinas.ts` + `ui/RutinasPanel.tsx`, db v23): secuencias
de pasos multi-cuarto con hora y días (botón ⏰ arriba-derecha, badge de pendientes).
Cada paso puede llevar `esquemaId` + `valores` → al palomearlo se registra solo en su
cuarto (⚡). Se crean a mano (editor del panel) o por chat: herramienta de IA
`crear_rutina` (el modelo arma pasos con auto-registro). Recordatorio: el asistente
anuncia la rutina al llegar su hora (revisión cada 30s con la app abierta).

**Calendario** (`ui/Calendario.tsx`, abre con la hora/fecha del RelojWidget; el 📒 del
widget abre el panel rápido): vistas día/semana/mes estilo Google Calendar. La rejilla
es interactiva: clic+arrastre en un hueco crea rutina con ese horario y día; los bloques
tienen `hora`–`horaFin` y `color` propios (paleta en el editor), se mueven con drag&drop
(cambia hora y día de la semana) y se estiran desde el borde inferior. Clic en un bloque
abre el detalle con la checklist (palomeable solo hoy).

---

## Las 12 mini-apps (cuadrícula 4×3)

Posiciones: cols `x: -9 -3 3 9` · filas `z: -6 0 6`. Ver `registry.ts`.

| ID | Nombre | Carpeta | Repos / datos | Estado funcional |
|----|--------|---------|---------------|------------------|
| `cocina` | Cocina · Nutrición | `rooms/cocina/` | comidas, plan, agua, favoritos, perfil | ✅ app completa (tabs resumen, diario, plan, metas) |
| `ejercicio` | Ejercicio | `rooms/ejercicio/` | sesiones, series, perfil | ✅ fuerza, resistencia, flexibilidad, metas |
| `recamara` | Recámara | `rooms/recamara/` | sueño, anécdotas | ✅ descanso + anecdotario |
| `despacho` | Despacho · Finanzas | `rooms/despacho/` | transacciones, presupuestos, metas | ✅ movimientos, resumen, metas |
| `biblioteca` | Biblioteca | `rooms/biblioteca/` | progresoTema | ✅ índice, resumen, pilares |
| `entretenimiento` | Entretenimiento | `rooms/entretenimiento/` | mediaArchivo, juegosMesa | ✅ archivo media + juegos de mesa |
| `sala` | Sala · Viajes | `rooms/sala/` | viajes y relacionados | ✅ lista, detalle, formularios |
| `jardin` | Jardín · Mindfulness | `rooms/jardin/` | mindfulness, ánimo, gratitud | ✅ meditación, respiración, diario |
| `garage` | Garage | `rooms/garage/` | vehículos, mantenimiento | ✅ vehículos, servicios |
| `diario` | Diario · Noticias | `rooms/diario/` | noticias (RSS/briefing) | ✅ central, resumen — **no** es el anecdotario |
| `bodega` | Bodega | `rooms/bodega/` | — (inventario próximo) | ✅ inventario + archivo/respaldo |
| `hobbies` | Hobbies | `rooms/hobbies/` | — (persistencia próxima) | ✅ lista de pasatiempos (básico) |

Todas están **registradas y abren** desde la casa. El grado de pulido «premium» varía por cuarto;
ver `docs/COMO-TRABAJAR.md` para priorizar mejoras sin mezclar contextos.

---

## Mapa mental

```
Mind Home
├── CASA (core/)          → 3D, cámara, menú, editor, interacción
├── DATOS (core/data/)    → db + repos (contrato para apps)
└── APPS (rooms/<id>/)    → 12 independientes, solo 2D + repos
```

---

## Historial reciente de la casa (sesión previa)

- Centrado de cámara con panel de edición abierto.
- Pan/zoom/rotar corregidos; sombras desactivadas en edición.
- Diálogo de interacción solo al seleccionar mueble principal.
- Toggle techo; header unificado (Mind Home / Volver).
- Dependencias actualizadas; README al día.
