-- Telemetría por proveedor de texto: el proxy `ia-chat` puede resolverse con
-- Anthropic (principal) o con Gemini (respaldo ante fallo + muestreo de costo).
-- Sin separar los tokens no se puede calcular el USD real de cada uno, que es
-- justo lo que la prueba tiene que medir.
--
-- Los tokens de Gemini van a columnas propias: las de Anthropic conservan su
-- significado histórico y las consultas de COSTOS.md siguen siendo válidas.

alter table public.uso_ia add column solicitudes_gemini int not null default 0;
alter table public.uso_ia add column tokens_entrada_gemini bigint not null default 0;
alter table public.uso_ia add column tokens_salida_gemini bigint not null default 0;

-- registrar_uso_ia: se amplía con el proveedor. DROP + CREATE (no overload: dos
-- firmas harían ambigua la llamada vieja de 4 argumentos). El DEFAULT mantiene
-- compatible al proxy anterior durante la ventana de deploy.
drop function public.registrar_uso_ia(bigint, bigint, bigint, bigint);

create function public.registrar_uso_ia(
  p_entrada bigint,
  p_salida bigint,
  p_cache_crear bigint default 0,
  p_cache_leer bigint default 0,
  p_proveedor text default 'anthropic'
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_per text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_gem boolean := p_proveedor = 'gemini';
begin
  if v_uid is null then return; end if;
  update uso_ia
     set tokens_entrada = tokens_entrada
           + case when v_gem then 0 else greatest(coalesce(p_entrada, 0), 0) end,
         tokens_salida = tokens_salida
           + case when v_gem then 0 else greatest(coalesce(p_salida, 0), 0) end,
         tokens_cache_creacion = tokens_cache_creacion + greatest(coalesce(p_cache_crear, 0), 0),
         tokens_cache_lectura  = tokens_cache_lectura  + greatest(coalesce(p_cache_leer, 0), 0),
         solicitudes_gemini = solicitudes_gemini + case when v_gem then 1 else 0 end,
         tokens_entrada_gemini = tokens_entrada_gemini
           + case when v_gem then greatest(coalesce(p_entrada, 0), 0) else 0 end,
         tokens_salida_gemini = tokens_salida_gemini
           + case when v_gem then greatest(coalesce(p_salida, 0), 0) else 0 end
   where user_id = v_uid and periodo = v_per;
end;
$$;

-- El drop se llevó los privilegios de la firma vieja: re-aplicar.
revoke execute on function public.registrar_uso_ia(bigint, bigint, bigint, bigint, text) from anon;
