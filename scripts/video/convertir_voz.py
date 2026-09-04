r"""
Convierte el timbre de los segmentos TTS a la voz clonada del usuario con el
conversor de OpenVoice V2. La voz BASE la pone edge-tts en cada idioma (los 16);
aqui solo se le cambia el color de voz al de la referencia, asi que la
pronunciacion nativa se conserva.

Lo llama doblar.mjs con --clonar, pero tambien sirve suelto:

  <venv>\Scripts\python.exe convertir_voz.py --ref voz-referencia.m4a seg-01.mp3 seg-02.mp3 ...

Escribe seg-01.clon.wav junto a cada entrada. El embedding de la referencia se
cachea en <ref>.se.pth (se recalcula si la referencia cambia). OPENVOICE_DIR
apunta a la carpeta con OpenVoice/ y checkpoints_v2/; por defecto es la raiz
del venv que ejecuta este script (C:\Users\<tu>\openvoice).
"""
import argparse
import os
import re
import sys
import tempfile
import types
from pathlib import Path

RAIZ = Path(os.environ.get('OPENVOICE_DIR') or Path(sys.executable).parents[2])

import numpy as np
import torch
import librosa
import soundfile as sf

# wavmark solo pone la marca de agua (y con segmentos cortos ni cabe); se anula
# para no depender de su modelo descargable
sys.modules.setdefault('wavmark', types.SimpleNamespace(load_model=torch.nn.Identity))
from openvoice.api import ToneColorConverter


def cargar_conversor():
    device = 'cuda:0' if torch.cuda.is_available() else 'cpu'
    conv = ToneColorConverter(str(RAIZ / 'checkpoints_v2' / 'converter' / 'config.json'), device=device)
    conv.watermark_model = None
    ckpt = str(RAIZ / 'checkpoints_v2' / 'converter' / 'checkpoint.pth')
    try:
        conv.load_ckpt(ckpt)
    except Exception:
        # torch >= 2.6 carga con weights_only=True; el checkpoint oficial trae objetos sueltos
        d = torch.load(ckpt, map_location=conv.device, weights_only=False)
        conv.model.load_state_dict(d['model'], strict=False)
        print(f"Loaded checkpoint '{ckpt}' (weights_only=False)")
    return conv


def se_de_referencia(conv, ruta_ref):
    """Embedding de la voz del usuario: quita silencios, trocea a ~10 s y promedia."""
    cache = Path(str(ruta_ref) + '.se.pth')
    if cache.exists() and cache.stat().st_mtime >= Path(ruta_ref).stat().st_mtime:
        return torch.load(cache, map_location=conv.device)

    sr = conv.hps.data.sampling_rate
    y, _ = librosa.load(ruta_ref, sr=sr)
    tramos = librosa.effects.split(y, top_db=30)
    voz = np.concatenate([y[a:b] for a, b in tramos]) if len(tramos) else y
    if len(voz) < sr * 3:
        sys.exit(f'✗ la referencia {ruta_ref} trae menos de 3 s de voz; graba al menos 30 s')

    paso = sr * 10
    with tempfile.TemporaryDirectory() as tmp:
        trozos = []
        for i in range(0, len(voz), paso):
            trozo = voz[i:i + paso]
            if len(trozo) < sr:
                continue
            p = os.path.join(tmp, f'ref-{i}.wav')
            sf.write(p, trozo, sr)
            trozos.append(p)
        se = conv.extract_se(trozos)
    torch.save(se.cpu(), cache)
    return se.to(conv.device)


def main():
    ap = argparse.ArgumentParser(description='Clona el timbre de la referencia sobre segmentos TTS')
    ap.add_argument('--ref', required=True, help='audio con la voz del usuario (wav/mp3/m4a, >= 30 s)')
    ap.add_argument('--tau', type=float, default=0.3, help='fuerza de la conversion (0.3 por defecto)')
    ap.add_argument('entradas', nargs='+', help='segmentos TTS del MISMO hablante/idioma')
    args = ap.parse_args()

    conv = cargar_conversor()
    tgt_se = se_de_referencia(conv, args.ref)
    # el hablante fuente es la voz de edge-tts: su embedding sale de los propios segmentos
    src_se = conv.extract_se(list(args.entradas))

    for entrada in args.entradas:
        salida = re.sub(r'\.[^.]+$', '.clon.wav', entrada)
        conv.convert(entrada, src_se, tgt_se, salida, tau=args.tau)
        print(f'  clon {os.path.basename(salida)}')


if __name__ == '__main__':
    main()
