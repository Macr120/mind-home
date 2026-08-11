-- Nueva operación `tts`: voz con IA de los asistentes (OpenAI `tts-1`),
-- alternativa a `speechSynthesis` nativo cuando el asistente tiene `vozIA`
-- activado en su ficha (⚙️ del chat).
--
-- $15/1M caracteres; el edge function `ia-tts` recorta la entrada a 1000
-- caracteres (~$0.015 = 3 créditos exactos a precio pleno).
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
    when 'tts'         then 3   -- OpenAI tts-1 ($15/1M car., tope 1000 car.) — voz con IA del asistente
  end;
$$;
