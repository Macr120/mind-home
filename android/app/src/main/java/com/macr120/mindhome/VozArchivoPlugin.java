package com.macr120.mindhome;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;

/**
 * Plugin Capacitor local «VozArchivo»: la voz del sistema como archivo WAV
 * (`TextToSpeech.synthesizeToFile`), para la narración gratis del Studio de
 * video. El `speechSynthesis` del WebView solo suena; esto deja el audio.
 * Mismo contrato que el de iOS (`VozArchivoPlugin.swift`).
 */
@CapacitorPlugin(name = "VozArchivo")
public class VozArchivoPlugin extends Plugin {
  private TextToSpeech tts;
  private boolean listo = false;
  private final Object candado = new Object();

  @Override
  public void load() {
    tts = new TextToSpeech(getContext(), status -> {
      synchronized (candado) {
        listo = status == TextToSpeech.SUCCESS;
        candado.notifyAll();
      }
    });
  }

  /** El motor arranca en segundo plano: se espera (poco) a que avise. */
  private boolean esperarListo() {
    synchronized (candado) {
      long limite = System.currentTimeMillis() + 5000;
      while (!listo && System.currentTimeMillis() < limite) {
        try {
          candado.wait(200);
        } catch (InterruptedException e) {
          return false;
        }
      }
      return listo;
    }
  }

  @PluginMethod
  public void sintetizar(PluginCall call) {
    String texto = call.getString("texto");
    if (texto == null || texto.trim().isEmpty()) {
      call.reject("Falta texto");
      return;
    }
    String voz = call.getString("voz", "");
    String lang = call.getString("lang", "es");
    // Fuera del hilo del bridge: la síntesis tarda segundos.
    new Thread(() -> sintetizarEnHilo(call, texto, voz, lang)).start();
  }

  private void sintetizarEnHilo(PluginCall call, String texto, String voz, String lang) {
    if (!esperarListo()) {
      call.reject("TTS no disponible");
      return;
    }
    tts.setLanguage(Locale.forLanguageTag(lang.replace('_', '-')));
    if (voz != null && !voz.isEmpty()) {
      Set<Voice> voces = tts.getVoices();
      if (voces != null) {
        for (Voice v : voces) {
          if (voz.equals(v.getName())) {
            tts.setVoice(v);
            break;
          }
        }
      }
    }
    File archivo = new File(getContext().getCacheDir(), "mph-voz-" + System.currentTimeMillis() + ".wav");
    final Object fin = new Object();
    final boolean[] estado = { false, false }; // [terminado, ok]
    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
      @Override
      public void onStart(String utteranceId) {}

      @Override
      public void onDone(String utteranceId) {
        synchronized (fin) {
          estado[0] = true;
          estado[1] = true;
          fin.notifyAll();
        }
      }

      @Override
      public void onError(String utteranceId) {
        synchronized (fin) {
          estado[0] = true;
          fin.notifyAll();
        }
      }
    });
    if (tts.synthesizeToFile(texto, null, archivo, "mph-" + System.nanoTime()) != TextToSpeech.SUCCESS) {
      call.reject("No se pudo sintetizar");
      return;
    }
    synchronized (fin) {
      long limite = System.currentTimeMillis() + 60000;
      while (!estado[0] && System.currentTimeMillis() < limite) {
        try {
          fin.wait(200);
        } catch (InterruptedException e) {
          break;
        }
      }
    }
    if (!estado[1]) {
      archivo.delete();
      call.reject("La síntesis falló");
      return;
    }
    try (FileInputStream in = new FileInputStream(archivo)) {
      byte[] bytes = new byte[(int) archivo.length()];
      int leidos = 0;
      while (leidos < bytes.length) {
        int n = in.read(bytes, leidos, bytes.length - leidos);
        if (n < 0) break;
        leidos += n;
      }
      JSObject res = new JSObject();
      res.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));
      call.resolve(res);
    } catch (IOException e) {
      call.reject("No se pudo leer el audio");
    } finally {
      archivo.delete();
    }
  }

  @Override
  protected void handleOnDestroy() {
    if (tts != null) tts.shutdown();
  }
}
