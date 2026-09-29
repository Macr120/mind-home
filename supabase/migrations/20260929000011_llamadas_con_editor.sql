-- ¿Por qué el chat de la casa manda ~13 900 tokens de entrada por llamada?
-- (auditoría de precios, 25-sep-2026). La sospecha es que TOOLS_EDITOR (~5 500
-- tokens) viaja en casi todos los turnos porque `hayIntencionEditor` da
-- verdadero de más. Estas dos columnas lo miden por llamada; las llena
-- `ia-chat` (docs/consultas-uso.sql, consulta 7).

alter table public.uso_ia_llamadas
  add column con_editor boolean,   -- viajó alguna tool `editor_*`
  add column n_tools smallint;     -- tools mandadas al modelo (tras el filtrado de Jev)
