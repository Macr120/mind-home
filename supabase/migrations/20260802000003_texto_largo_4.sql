-- `texto_largo` sube de 3 a 4 créditos: medición real contra la API (ago 2026).
--
-- La tabla de 20260802000001 se calibró con una estimación de salida (~3000 tok
-- → $0.0175 = 3.5 créditos) y se redondeó a la baja. `scripts/medir-costos.mjs
-- --op texto_largo --reps 6` sobre el prompt del plan IA da **3653 entrada /
-- 3771 salida = $0.0225 = 4.5 créditos**: era la única op que se vendía por
-- debajo de su costo.
--
-- Por qué 4 y no 5: la op es una MEZCLA. Solo el plan IA agota el tope; las
-- demás formas piden mucho menos al proxy (que aplica `Math.min(tope,
-- maxTokens)`) y salen baratas — mapa conceptual (2000) $0.0098, programa de
-- series (1600) $0.0058, efemérides (1800) $0.0039. Con 4 el conjunto queda
-- holgado y el peor caso —un usuario que gaste TODO en planes— cae bajo el
-- techo de la suscripción con los 600 créditos vigentes de `limites_plan`:
-- 600 ÷ 4 = 150 planes × $0.0225 = $3.38 < $3.50. Con 3 eran 200 planes =
-- $4.50, por encima.
--
-- Residuo conocido: 4 créditos por $0.0225 son $0.0056 por crédito, un 12% por
-- encima del ancla de $0.005. Si `creditos_mes` sube a los 700 que propone
-- docs/COSTOS.md, ese peor caso vuelve a asomar ($3.94). Sellarlo del todo pide
-- 5 créditos —que castigarían a las formas cortas— o partir la op por tope,
-- como se hizo con `imagen`/`imagen_alta`.
--
-- Espejos que cambian con esta migración: `CREDITOS` en
-- `src/core/cuenta/costos.ts` y `CREDITOS` en `scripts/medir-costos.mjs`.
-- `TOPES` de `ia-chat` NO cambia: el tope de salida sigue siendo 4096.

create or replace function public.costo_op(p_tipo text)
returns int
language sql
immutable
as $$
  select case p_tipo
    when 'chat'        then 1   -- chat de la casa (con o sin TOOLS_EDITOR)
    when 'texto'       then 1   -- apps: recetas, macros, charlas, resúmenes (≤1500 tok)
    when 'vision'      then 1   -- texto + foto de ENTRADA (la foto son ~1.6k tok de entrada)
    when 'texto_largo' then 4   -- planes IA, mapas, tarjetas, efemérides (≤4096 tok)
    when 'modelo3d'    then 10  -- Sonnet 5 + razonamiento adaptativo
    when 'imagen'      then 3   -- gpt-image-1-mini low ($0.005) — calidad rápida, principal
    when 'imagen_alta' then 10  -- Gemini 3.1 Flash Lite Image ($0.0336) — calidad buena
  end;
$$;
