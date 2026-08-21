-- Se retira el alta por LICENCIA de la tienda (20260819000001).
--
-- Aquella RPC concedía la casa a quien demostrara tener la app instalada desde
-- la tienda, porque la app se publicaba de PAGO: instalada era pagada. Desde
-- ago 2026 la casa se compra DENTRO de la app —in-app en Android e iOS,
-- checkout directo en la web—, así que la app se publica GRATIS y el veredicto
-- `LICENSED` de Play Integrity lo obtiene cualquiera que la instale: dejar viva
-- esta RPC sería regalar la casa a todo el que se registre desde el móvil.
--
-- La única puerta que concede `perfiles.unlock` queda siendo el webhook de
-- RevenueCat (compra en cualquiera de las tres cajas) o un cupón. La Edge
-- Function `alta-tienda` responde 410 y conviene borrarla del proyecto
-- (`npx supabase functions delete alta-tienda`).

drop function if exists public.alta_tienda(uuid, text);

-- `perfiles.tienda` NO se borra: ya nadie la escribe, pero guarda de dónde vino
-- cada alta de las que se hicieron mientras la app fue de pago.
