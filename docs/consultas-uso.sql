-- Consultas de operación del backend de IA (guardarlas en el SQL Editor de
-- Supabase como "saved queries"). Fuente y contexto: docs/COSTOS.md §Telemetría.
--
-- Ritual mensual: correr las 5, comparar `usd_real` vs `usd_cobrado` por op, y
-- si alguna se desvía >20% del ancla (1 crédito = $0.005), recalibrar la tarifa
-- con una migración de `costo_op()` (precedente: 20260802000003) apoyándose en
-- `scripts/medir-costos.mjs`.
--
-- OJO (auditoría ago 2026): la vigilancia NO debe centrarse en `texto_largo`. Su
-- $3.94 es de las exposiciones MENORES; el peor caso real es el `chat` con
-- TOOLS_EDITOR sin caché ($0.0202/crédito ≈ $14 con 700 créditos). Ver la
-- corrección en docs/COSTOS.md. Vigila `chat` y `modelo3d` primero.

-- 0) DECISIÓN PENDIENTE: ¿el tope de 8192 de `modelo3d` está sobredimensionado?
--    Su tope es 2.7× la salida esperada y es la mayor exposición por llamada
--    ($0.1265). Si el p95 anda por ~3000, basta recortar el tope a 4096; si se
--    acerca a 4000, hay que subir la tarifa en vez de recortar (recortar de más
--    trunca el JSON del modelo, que es el modo de fallo del thinking adaptativo).
--    Recordatorio: el precio introductorio de Sonnet 5 acaba el 31-ago-2026.
select percentile_cont(0.50) within group (order by tokens_salida) as p50,
       percentile_cont(0.95) within group (order by tokens_salida) as p95,
       max(tokens_salida)                                          as maximo,
       count(*)                                                    as filas
  from uso_ia_ops
 where op = 'modelo3d';

-- 1) ¿Cada operación cobra lo que cuesta? (Haiku 4.5 a precio pleno)
select op,
       sum(llamadas) as n,
       sum(creditos) as creditos_cobrados,
       round(sum(creditos) * 0.005, 2) as usd_cobrado,
       round((sum( tokens_entrada        * 1.00
                 + tokens_cache_creacion * 1.25
                 + tokens_cache_lectura  * 0.10
                 + tokens_salida         * 5.00) / 1e6)::numeric, 2) as usd_real
  from uso_ia_ops
 where proveedor = 'anthropic'
 group by op order by usd_real desc;

-- 2) Costo medio por llamada de cada operación (para reajustar la tarifa)
select op, proveedor,
       round((sum(tokens_salida)::numeric / nullif(sum(llamadas), 0)), 0) as salida_media,
       round((sum(tokens_entrada + tokens_cache_lectura)::numeric
              / nullif(sum(llamadas), 0)), 0) as entrada_media
  from uso_ia_ops group by op, proveedor order by op;

-- 3) Hit-rate del caché por mes (objetivo: >50% en cuanto haya ráfagas de chat).
--    Si se mantiene alto y las ráfagas se separan >5 min, evaluar encender
--    IA_CHAT_TTL_TOOLS=1h (escritura 2×, rentable con ≥3 lecturas por entrada).
select periodo,
       round(100.0 * sum(tokens_cache_lectura)
             / nullif(sum(tokens_entrada + tokens_cache_creacion + tokens_cache_lectura), 0)) as hit_pct
  from uso_ia group by periodo order by periodo desc;

-- 4) Costo real (USD) por usuario-mes (texto; imágenes van en la 5)
select user_id, periodo,
       round((( tokens_entrada        * 1.00
              + tokens_cache_creacion * 1.25
              + tokens_cache_lectura  * 0.10) / 1e6
             + tokens_salida * 5.00 / 1e6
             + (tokens_entrada_gemini * 0.25 + tokens_salida_gemini * 1.50) / 1e6
             )::numeric, 4) as usd_texto,
       imagenes, creditos
  from uso_ia order by periodo desc, usd_texto desc;

-- 5) Imágenes: costo por calidad Y proveedor. Revela cuánto se pierde cuando la
--    calidad rápida cae al respaldo (Gemini sirve por encima de lo cobrado).
select op, proveedor, sum(llamadas) as n,
       round((sum(llamadas) * case proveedor when 'gemini' then 0.0336 else 0.005 end)::numeric, 3) as usd,
       sum(creditos) as creditos_cobrados
  from uso_ia_ops
 where op in ('imagen', 'imagen_alta')
 group by op, proveedor order by op, proveedor;

-- 6) Salud del sistema de reservas (fix de acuñación 20260803000001): huérfanas
--    viejas ≈ llamadas que cobraron y nunca resolvieron; deben ser pocas y
--    la purga oportunista de consumir_cuota_ia las limpia a las 24 h.
select count(*) as reservas_vivas,
       count(*) filter (where creada < now() - interval '1 hour') as viejas
  from reservas_ia;
