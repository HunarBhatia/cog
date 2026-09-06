import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "openai/gpt-oss-120b"

# language codes(Bhashini step)
SUPPORTED_LANGUAGES = {
    "hindi": {"code": "hi", "tts_voice": "hi-IN-SwaraNeural"},
    "bengali": {"code": "bn", "tts_voice": "bn-IN-TanishaaNeural"},
}
print("KEY LOADED:", GROQ_API_KEY[:10] if GROQ_API_KEY else "NONE")