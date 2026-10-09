# Sintetiza una línea con edge-tts y devuelve, por stdout, el segundo en que
# empieza cada palabra (límites de palabra del servicio). La CLI de edge-tts
# solo da límites por frase; la guía ilumina el texto palabra a palabra.
#
#   python scripts/guias/tts_palabras.py <voz> <rate> <salida.mp3> <texto>
import asyncio
import json
import sys

import edge_tts


async def main() -> None:
    voz, rate, salida, texto = sys.argv[1:5]
    com = edge_tts.Communicate(texto, voz, rate=rate, boundary="WordBoundary")
    inicios = []
    with open(salida, "wb") as f:
        async for trozo in com.stream():
            if trozo["type"] == "audio":
                f.write(trozo["data"])
            elif trozo["type"] == "WordBoundary":
                inicios.append(round(trozo["offset"] / 1e7, 3))
    print(json.dumps(inicios))


asyncio.run(main())
