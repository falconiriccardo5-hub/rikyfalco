"""Trascrizione locale con faster-whisper (usata dal nodo "Trascrizione").

Installazione:  pip install faster-whisper
Il modello viene scaricato automaticamente al primo utilizzo (cache di Hugging Face).

Uscita: file JSON {"language": "it", "words": [{"start": 0.0, "end": 0.4, "text": "ciao"}]}
Su stdout vengono stampate righe "PROGRESS <0..1>" lette dall'app.
"""

import argparse
import json
import sys
import wave


def load_wav(path):
    """Legge il WAV 16 kHz mono preparato dall'app senza passare da PyAV.

    Alcune combinazioni di faster-whisper e PyAV (av >= 14) falliscono con
    "open() got an unexpected keyword argument 'metadata_errors'": passando
    direttamente i campioni l'errore non si presenta.
    """
    try:
        import numpy as np

        with wave.open(path, "rb") as w:
            if w.getframerate() != 16000 or w.getnchannels() != 1 or w.getsampwidth() != 2:
                return path
            data = w.readframes(w.getnframes())
        return np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
    except Exception:
        return path


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--audio", required=True)
    p.add_argument("--model", default="small")
    p.add_argument("--language", default="auto")
    p.add_argument("--threads", type=int, default=4)
    p.add_argument("--prompt", default="")
    p.add_argument("--out", required=True)
    a = p.parse_args()

    from faster_whisper import WhisperModel  # import qui per un errore chiaro se manca

    print(f"LOG caricamento modello {a.model}", flush=True)
    model = WhisperModel(a.model, device="auto", compute_type="auto", cpu_threads=a.threads)
    segments, info = model.transcribe(
        load_wav(a.audio),
        language=None if a.language == "auto" else a.language,
        word_timestamps=True,
        vad_filter=False,
        initial_prompt=a.prompt or None,
    )
    duration = max(1e-6, float(getattr(info, "duration", 0) or 0))
    words = []
    for seg in segments:
        for w in seg.words or []:
            words.append({"start": float(w.start), "end": float(w.end), "text": w.word})
        print(f"PROGRESS {min(1.0, float(seg.end) / duration):.4f}", flush=True)

    with open(a.out, "w", encoding="utf-8") as f:
        json.dump({"language": info.language, "words": words}, f, ensure_ascii=False)
    print("PROGRESS 1", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
