-- Precios ago-2026 v2 y el techo que los hace seguros.
--
-- Precios nuevos (todo en USD): unlock 6.99 (app + primer mes de IA),
-- suscripción Pro ×1/×2/×3 a 6 / 12 / 18, y una recarga consumible
-- `creditos_x1` de 6 = 700 créditos que no caducan. Es decir: **cada 6 USD
-- compra 700 créditos**, venga de la suscripción o de la recarga.
--
-- La regla de negocio que fija el techo: de cada 6 USD, la ganancia mínima debe
-- ser 2 USD. La pasarela (Stripe vía RevenueCat Billing) se lleva ~2.9% + $0.30
-- = ~$0.47, así que el gasto real de IA no puede pasar de:
--
--   6.00 − 0.47 − 2.00 = 3.53 USD  por cada 700 créditos
--
-- Y 700 créditos × $0.005 (el ancla de COGS) = **3.50 USD** exactos. O sea: el
-- techo correcto es el propio valor ancla de los créditos consumidos, sin
-- holgura. Por eso `techo_factor` baja de 1.10 a **1.00**: el bucket de
-- 20260815000002 pasa a denegar en cuanto el gasto REAL del mes alcanza
-- `créditos_consumidos × $0.005`, en vez de dejar un 10% de colchón (que con
-- 700 créditos eran $3.85 y dejaban la ganancia en $1.68).
--
-- Escala solo con el volumen, porque el techo se calcula sobre los créditos
-- CONSUMIDOS: ×2 (1400 cr, $12) tope $7.00 · ×3 (2100 cr, $18) tope $10.50 ·
-- una recarga de 700 sobre un plan ×1 sube el tope a $7.00 habiendo cobrado
-- $12. El máximo absoluto que un usuario puede costar es el tope más la última
-- llamada que lo cruza (≤ $0.05), nunca los $4 del límite duro.
--
-- El ponderado real medido es ~$0.0033/crédito, así que un usuario normal
-- sigue sin acercarse: esto es un tope anti-abuso, no una tarifa.

alter table public.limites_plan alter column techo_factor set default 1.00;
update public.limites_plan set techo_factor = 1.00;

-- La recarga vuelve al catálogo (`creditos_x1`), así que el webhook vuelve a
-- llamar a `sumar_creditos_extra`. Se le aplica el mismo blindaje que a las
-- demás RPC en 20260803000001: solo service_role, nunca el cliente. El revoke
-- original (20260727000003) no incluía `public`, y en Postgres las funciones
-- nacen con EXECUTE a PUBLIC.
revoke execute on function public.sumar_creditos_extra(uuid, int) from public, anon, authenticated;
grant execute on function public.sumar_creditos_extra(uuid, int) to service_role;
