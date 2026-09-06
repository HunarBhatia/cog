from groq import Groq
from config import GROQ_API_KEY

if GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
    except Exception:
        client = None
else:
    client = None

LANGUAGE_CODE_MAP = {
    "hindi": "hi",
    "english": "en",
    "bengali": "bn",
    "nepali": "ne",
    "marathi": "mr",
    "gujarati": "gu",
    "tamil": "ta",
    "telugu": "te",
    "kannada": "kn",
    "malayalam": "ml",
    "urdu": "ur",
    "assamese": "bn",
    "punjabi": "hi",
}

def speech_to_text(audio_path: str, language: str = None):
    """
    Transcribe audio and automatically identify the spoken language using Whisper.
    Returns (transcript_text, detected_language_code).
    """
    if not client:
        return "", None
    try:
        with open(audio_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                file=f,
                model="whisper-large-v3-turbo",
                language=language,
                response_format="verbose_json",
            )
        text = getattr(transcription, "text", "") or ""
        raw_lang = getattr(transcription, "language", None)
        lang_code = None
        if raw_lang:
            raw_clean = str(raw_lang).lower().strip()
            lang_code = LANGUAGE_CODE_MAP.get(raw_clean, raw_clean)
        return text.strip(), lang_code
    except Exception as e:
        print("Whisper transcription error:", e)
        return "", None

if __name__ == "__main__":
    result, lang = speech_to_text("output.mp3")
    print("Transcript:", result, "Language:", lang)