-- Op `musica` (8-oct-2026): la versión CANTADA de una canción del Studio de
-- audio sale por la Edge Function `ia-musica` (Google Lyria 3.5 vía la API de
-- Gemini). Google cobra $0.08 por canción, sin importar la duración: con el
-- ancla de $0.005 por crédito son 16 créditos justos.
--
-- Copia íntegra de la versión vigente (20260929000013_op_transporte.sql) + la op nueva.

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
    when 'tts'         then 3   -- OpenAI tts-1 ($15/1M car., tope 1000 car.) — voz con IA del asistente
    when 'pdf'         then 4   -- chat con PDF adjunto (tope ~2 MB de entrada, salida 1500 tok)
    when 'transporte'  then 1   -- HERE Intermodal Routing (~$0.0025 pasado el cupo gratis)
    when 'musica'      then 16  -- Lyria 3.5 ($0.08 por canción completa con voz)
  end;
$$;
