-- Nueva operación `voz`: dictado por Whisper (fallback de `ia-voz` cuando el
-- WebView de Android no tiene `SpeechRecognition` nativo — ese API no existe
-- ahí, a diferencia de `speechSynthesis`, que sí funciona).
--
-- Whisper cuesta $0.006/min; el cliente topa la grabación a 30s (~$0.003), por
-- debajo del ancla de $0.005/crédito. Se cobra 1 crédito fijo, igual que
-- `chat`/`texto`/`vision`.
--
-- Espejos que cambian con esta migración: `CREDITOS` en `src/core/cuenta/costos.ts`.

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
    when 'voz'         then 1   -- Whisper ($0.006/min, tope 30s) — dictado sin SpeechRecognition
  end;
$$;
