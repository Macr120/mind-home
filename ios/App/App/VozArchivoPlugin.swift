import AVFoundation
import Capacitor
import Foundation

/**
 * Plugin Capacitor local «VozArchivo»: la voz del sistema como archivo WAV
 * (`AVSpeechSynthesizer.write`), para la narración gratis del Studio de video.
 * El `speechSynthesis` del WebView solo suena; esto deja el audio. Mismo
 * contrato que el de Android (`VozArchivoPlugin.java`).
 */
@objc(VozArchivoPlugin)
public class VozArchivoPlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "VozArchivoPlugin"
  public let jsName = "VozArchivo"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "sintetizar", returnType: CAPPluginReturnPromise),
  ]

  /// Retenido mientras escribe: si se suelta, deja de entregar búferes.
  private var sintetizador: AVSpeechSynthesizer?

  @objc func sintetizar(_ call: CAPPluginCall) {
    guard let texto = call.getString("texto"), !texto.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      call.reject("Falta texto")
      return
    }
    let nombre = call.getString("voz") ?? ""
    let lang = (call.getString("lang") ?? "es").replacingOccurrences(of: "_", with: "-")
    let frase = AVSpeechUtterance(string: texto)
    frase.voice =
      AVSpeechSynthesisVoice.speechVoices().first { $0.name == nombre }
      ?? AVSpeechSynthesisVoice(language: lang)
      ?? AVSpeechSynthesisVoice(language: String(lang.prefix(2)))
    let s = AVSpeechSynthesizer()
    sintetizador = s
    var pcm = Data()
    var formato: AVAudioFormat?
    var terminado = false
    s.write(frase) { buffer in
      guard let b = buffer as? AVAudioPCMBuffer, b.frameLength > 0 else {
        // Un búfer vacío marca el final.
        if terminado { return }
        terminado = true
        self.sintetizador = nil
        guard let f = formato, !pcm.isEmpty else {
          call.reject("La síntesis falló")
          return
        }
        let wav = VozArchivoPlugin.envolverWav(pcm, rate: UInt32(f.sampleRate), canales: UInt16(f.channelCount))
        call.resolve(["base64": wav.base64EncodedString()])
        return
      }
      formato = b.format
      pcm.append(VozArchivoPlugin.pcm16(b))
    }
  }

  /// El búfer llega en float32 (o int16) por canal; se baja a int16 entrelazado.
  private static func pcm16(_ b: AVAudioPCMBuffer) -> Data {
    let n = Int(b.frameLength)
    let canales = Int(b.format.channelCount)
    var out = Data(capacity: n * canales * 2)
    if let f = b.floatChannelData {
      for i in 0..<n {
        for c in 0..<canales {
          var v = Int16(max(-1, min(1, f[c][i])) * 32767)
          out.append(Data(bytes: &v, count: 2))
        }
      }
    } else if let e = b.int16ChannelData {
      for i in 0..<n {
        for c in 0..<canales {
          var v = e[c][i]
          out.append(Data(bytes: &v, count: 2))
        }
      }
    }
    return out
  }

  private static func envolverWav(_ pcm: Data, rate: UInt32, canales: UInt16) -> Data {
    var d = Data()
    func u32(_ v: UInt32) {
      var x = v.littleEndian
      d.append(Data(bytes: &x, count: 4))
    }
    func u16(_ v: UInt16) {
      var x = v.littleEndian
      d.append(Data(bytes: &x, count: 2))
    }
    d.append("RIFF".data(using: .ascii)!)
    u32(UInt32(36 + pcm.count))
    d.append("WAVE".data(using: .ascii)!)
    d.append("fmt ".data(using: .ascii)!)
    u32(16)
    u16(1)
    u16(canales)
    u32(rate)
    u32(rate * UInt32(canales) * 2)
    u16(canales * 2)
    u16(16)
    d.append("data".data(using: .ascii)!)
    u32(UInt32(pcm.count))
    d.append(pcm)
    return d
  }
}
