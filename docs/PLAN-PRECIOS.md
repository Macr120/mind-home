# Precios unificados en los cuatro canales — EJECUTADO el 26-ago-2026

Decisión de Marco, textual: «números cerrados en consumibles y suscripciones y
solo en la casa unlock 8.99». Se ejecutó entero desde Windows (navegador + repo
+ deploy) en una sola pasada.

| Concepto | Producto | Precio | App Store | Play | RevenueCat | Web |
|---|---|---|---|---|---|---|
| La casa (pago único) | `unlock_casa_v5` / `_v4` | **8.99** | ✅ ya estaba | ✅ creado | ✅ v5 nuevo | ✅ |
| Recarga 700 créditos | `creditos_x1` | **6** | ✅ 5.99→6.00 | ✅ creado | ✅ | ✅ |
| Pro ×1 mensual | `pro_x1_v2` | **6** | ✅ 5.99→6.00 | ✅ creado | ✅ | ✅ |
| Pro ×2 mensual | `pro_x2_v2` | **12** | ✅ 11.99→12.00 | ✅ creado | ✅ | ✅ |
| Pro ×3 mensual | `pro_x3_v2` | **18** | ✅ 17.99→18.00 | ✅ creado | ✅ | ✅ |
| Pro ×1 anual | `pro_x1_anual` | **60** | ✅ 59.99→60.00 | ✅ creado | ✅ | ✅ |

## Lo que quedó hecho

**App Store Connect** — los cinco precios movidos a cifras cerradas con
«Recalculate prices for all countries or regions», así que los 175 territorios
también quedaron redondos ($6.00 US, €7.00 Europa, $9.00 Canadá…). El unlock no
se tocó: ya estaba en 8.99.

**Play Console** — los seis creados desde cero y **activos**:
- Productos únicos: `unlock_casa_v4` (8.99) y `creditos_x1` (6), ambos con
  opción de compra «unica» / «recarga» y etiqueta *Retrocompatibilidad*, así que
  la tienda devuelve el id pelado.
- Suscripciones con plan base: `pro_x1_v2:mensual`, `pro_x2_v2:mensual`,
  `pro_x3_v2:mensual` y `pro_x1_anual:anual`. **Esos sufijos son los que verá el
  webhook antes de `idBase()`.**

**RevenueCat** — `unlock_casa_v5` creado a 8.99 (el precio es inmutable y el
`_v4` se quedó en 8.89) y puesto en el paquete `unlock`; los seis productos de
Play dados de alta a mano y colgados de sus paquetes; las cifras quitadas de las
descripciones de los seis paquetes; y el entitlement `pro` adjuntado a las **8
suscripciones de tienda** (4 de Apple + 4 de Play), que no lo tenían — los pagos
únicos siguen sin entitlement, como debe ser.

**Código y web** — `unlock_casa_v5` el primero en `UNLOCK.productos`
(`src/core/cuenta/productos.ts`) y en `UNLOCK_PRODUCTOS` del webhook; 8,89 → 8,99
en los 16 catálogos de `web/i18n/paginas/` y en el respaldo de `cuenta.tsx`;
`docs/BACKEND.md` al día. `npx tsc -b` y `npm run traducir:verificar` limpios.
Desplegados **la landing** (`wrangler pages deploy dist-web --project-name
mindplannerhome`) y **el webhook** (`functions deploy revenuecat-webhook`).

## Lo que NO se pudo cerrar

- **El JSON de la cuenta de servicio de Google falta en RevenueCat.** Sin él, el
  botón «Import» de la fila de Play dice *No new products available to import* y,
  sobre todo, **RC no puede validar ninguna compra de Android**. Por eso los seis
  productos de Play están dados de alta a mano y su *Store Status* dice «Could
  not check». Lo tiene que subir Marco: Google Cloud → cuenta de servicio → clave
  JSON → RevenueCat › Apps › Mind Planner Home (Play Store).
- **La app (`dist`) no se desplegó**: compilarla publicaría los ~1300 archivos sin
  commitear que arrastra el árbol. No hace falta para esto — el cliente resuelve
  el unlock por identificador de PAQUETE (`unlock`), no por el id del producto.
- Sigue pendiente y es de Marco: el acuerdo de licencia de Apple, su teléfono y
  la contraseña del revisor, y la clasificación por edad (9+ vs *Teen*).
- Basura del onboarding de RC sin borrar: entitlement «mind planer home Pro» con
  3 productos de Test Store.

## Trampas (las viejas y las nuevas)

**App Store Connect**
- Los importes cerrados ($6.00, $12.00, $18.00, $60.00) **están detrás de «See
  Additional Prices»**; la lista por defecto solo trae los `.99` y buscar «6.00»
  ahí da «No Results».
- El precio de una **suscripción** se cambia en «View all Subscription Pricing» →
  fila *Starting Price* → **Edit Price** (al fondo del diálogo, hay que hacer
  scroll). El de un **producto único** va por «Price Schedule +» → *Global Price
  Change*, y ese sí pide fecha: el calendario trae **«Make Price Change Now»**.
- Los botones del pie de los diálogos quedan fuera de la ventana: `scroll_to`
  sobre el botón antes de pulsarlo, o el clic cae en la tabla.

**Play Console**
- **Play «embellece» el precio**: metes 6.00 y guarda 5.99 («para determinar un
  precio final atractivo»). Hay que **volver a editar el país a mano** para dejar
  la cifra cerrada. El 8.99 no lo toca porque ya le gusta.
- La moneda del diálogo masivo viene en **MXN**; cambiarla a USD antes de teclear.
- En el modelo nuevo de productos únicos **ya no existe la casilla
  «consumible»**: solo *Comprar* / *Alquilar*. Lo consumible lo decide la app al
  llamar a `consumeAsync`.
- Guardar un plan básico lo deja en **borrador**: hay que pulsar «Activar» después.

**RevenueCat**
- El precio de un producto es **INMUTABLE**; subirlo obliga a crear otro y a
  ponerlo el primero de la lista en `productos.ts` **y en el webhook**.
- Los desplegables de producto de los paquetes **solo ofrecen productos que ya
  existen**; si la tienda no tiene ninguno aparece «+ New Product» y se puede
  crear ahí mismo, pero en cuanto existe uno el atajo desaparece y hay que ir a
  Products › (tienda) › + New.
- Las descripciones de los paquetes son inputs de React: se reescriben con el
  setter nativo de `HTMLInputElement.prototype.value` + evento `input`.

**Cloudflare**
- **Hay DOS proyectos de Pages** y `wrangler pages deploy` sin `--project-name`
  eligió el equivocado: `mindplannerhome` = la landing (`dist-web`,
  mindplannerhome.com) y `mindplannerhome-app` = la app (`dist`,
  app.mindplannerhome.com). Pasar **siempre** `--project-name`. Si se cruza, el
  arreglo es *Rollback to this deployment* en el panel (wrangler no tiene rollback).
