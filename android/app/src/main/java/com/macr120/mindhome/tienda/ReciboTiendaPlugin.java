package com.macr120.mindhome.tienda;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.integrity.IntegrityManager;
import com.google.android.play.core.integrity.IntegrityManagerFactory;
import com.google.android.play.core.integrity.IntegrityTokenRequest;

/**
 * Plugin Capacitor local «ReciboTienda»: la prueba de que esta instalación se
 * compró en Google Play.
 *
 * La app se publica como app de PAGO, así que no hay compra in-app que
 * consultar: lo que vale es la LICENCIA. Este plugin pide un token de la
 * Play Integrity API y lo entrega tal cual; quien lo decodifica y decide es el
 * servidor (`supabase/functions/_shared/reciboTienda.ts`), que exige el
 * veredicto `LICENSED`. Java no interpreta nada — un veredicto leído en el
 * cliente no probaría nada, cualquiera puede mentirle a su propio teléfono.
 *
 * El `nonce` lo manda la web (`sha256` del access_token de la sesión) para que
 * el veredicto quede atado a esa sesión y no se pueda reutilizar.
 */
@CapacitorPlugin(name = "ReciboTienda")
public class ReciboTiendaPlugin extends Plugin {

  @PluginMethod
  public void pedirToken(PluginCall call) {
    String nonce = call.getString("nonce");
    if (nonce == null || nonce.isEmpty()) {
      call.reject("sin-nonce");
      return;
    }

    try {
      IntegrityManager gestor = IntegrityManagerFactory.create(getContext());
      gestor
        .requestIntegrityToken(IntegrityTokenRequest.builder().setNonce(nonce).build())
        .addOnSuccessListener(respuesta -> {
          JSObject r = new JSObject();
          r.put("token", respuesta.token());
          call.resolve(r);
        })
        // Sin Play Services, sin red o con la app instalada fuera de Play: el
        // alta se queda sin hacer y se reintenta en el próximo arranque.
        .addOnFailureListener(e -> call.reject(e.getMessage()));
    } catch (Exception e) {
      call.reject(e.getMessage());
    }
  }
}
