# Como tts_palabras.py, pero con Azure Speech (el servicio oficial de las mismas
# voces neuronales; edge-tts devuelve 403 desde oct 2026). Necesita
# AZURE_SPEECH_KEY y AZURE_SPEECH_REGION en el entorno (voz.mjs los lee de
# .env.local). Escribe el mp3 y devuelve por stdout el segundo en que empieza
# cada palabra.
#
#   python scripts/guias/tts_azure.py <voz> <rate> <salida.mp3> <texto> [pitch]
import json
import os
import sys
from xml.sax.saxutils import escape

import azure.cognitiveservices.speech as speechsdk


def main() -> None:
    voz, rate, salida, texto = sys.argv[1:5]
    pitch = sys.argv[5] if len(sys.argv) > 5 else "+0Hz"
    cfg = speechsdk.SpeechConfig(subscription=os.environ["AZURE_SPEECH_KEY"], region=os.environ["AZURE_SPEECH_REGION"])
    cfg.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3)
    sintetizador = speechsdk.SpeechSynthesizer(speech_config=cfg, audio_config=speechsdk.audio.AudioOutputConfig(filename=salida))
    inicios = []

    def palabra(e: speechsdk.SpeechSynthesisWordBoundaryEventArgs) -> None:
        # Solo palabras (no la puntuación), como el WordBoundary de edge-tts.
        if e.boundary_type == speechsdk.SpeechSynthesisBoundaryType.Word:
            inicios.append(round(e.audio_offset / 1e7, 3))

    sintetizador.synthesis_word_boundary.connect(palabra)
    idioma = "-".join(voz.split("-")[:2])
    ssml = (
        f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{idioma}">'
        f'<voice name="{voz}"><prosody rate="{rate}" pitch="{pitch}">{escape(texto)}</prosody></voice></speak>'
    )
    r = sintetizador.speak_ssml_async(ssml).get()
    if r.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        detalle = r.cancellation_details
        raise SystemExit(f"Azure: {r.reason} {detalle.reason if detalle else ''} {detalle.error_details if detalle else ''}")
    print(json.dumps(inicios))


main()
