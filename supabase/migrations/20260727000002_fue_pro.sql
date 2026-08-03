-- ¿La cuenta PAGÓ alguna vez? La app exige suscripción para empezar (puerta de
-- suscripción); el modo local-sin-IA tras cancelar es un beneficio exclusivo de
-- quien fue Pro. La escribe solo el webhook de RevenueCat (nunca se revierte).

alter table public.perfiles add column fue_pro boolean not null default false;

-- Idempotente por si ya hubiera algún Pro activo al migrar.
update public.perfiles set fue_pro = true where plan = 'pro';
