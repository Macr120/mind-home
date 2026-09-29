-- Op `transporte` (auditoría de precios, 25-sep-2026): cada búsqueda de
-- transporte público a HERE (Intermodal Routing) pasa por la Edge Function
-- `navegar` y cobra 1 crédito. El plan Base de HERE solo regala 2 500 al mes
-- PARA TODA LA APP y después cobra ~$2.50 por mil ($0.0025 por búsqueda): el
-- crédito ($0.005) la cubre con margen. Mapa, rutas a pie/bici/auto y
-- geocodificación siguen gratis desde el cliente.
--
-- Copia íntegra de la versión vigente (20260814000001_op_pdf.sql) + la op nueva.

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
  end;
$$;
