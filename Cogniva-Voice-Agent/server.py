import os
import re
import uuid
from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from concurrent.futures import ThreadPoolExecutor
import asyncio

from nodes.stt import speech_to_text
from nodes.tts import text_to_speech
from supervisor import agent, FallbackAgent
from extractor import extract_and_save

app = FastAPI()
executor = ThreadPoolExecutor(max_workers=4)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("audio_out", exist_ok=True)
app.mount("/audio", StaticFiles(directory="audio_out"), name="audio")

VOICE_MAP = {
    "hi": "hi-IN-SwaraNeural",
    "en": "en-IN-NeerjaNeural",
    "bn": "bn-IN-TanishaaNeural",
    "ne": "ne-NP-HemkalaNeural",
    "mr": "mr-IN-AarohiNeural",
    "gu": "gu-IN-DhwaniNeural",
    "ta": "ta-IN-PallaviNeural",
    "te": "te-IN-ShrutiNeural",
    "kn": "kn-IN-SapnaNeural",
    "ml": "ml-IN-SobhanaNeural",
    "ur": "ur-IN-GulNeural",
}

def detect_language(text: str, fallback_lang: str = "en") -> str:
    """Detect language of user utterance or generated reply accurately."""
    if not text:
        return fallback_lang
    
    # 1. Direct Unicode Script Range checks
    for char in text:
        code = ord(char)
        if 0x0900 <= code <= 0x097F:
            return "hi"  # Devanagari (Hindi, Marathi, Nepali)
        elif 0x0980 <= code <= 0x09FF:
            return "bn"  # Bengali / Assamese
        elif 0x0A80 <= code <= 0x0AFF:
            return "gu"  # Gujarati
        elif 0x0B80 <= code <= 0x0BFF:
            return "ta"  # Tamil
        elif 0x0C00 <= code <= 0x0C7F:
            return "te"  # Telugu
        elif 0x0C80 <= code <= 0x0CFF:
            return "kn"  # Kannada
        elif 0x0D00 <= code <= 0x0D7F:
            return "ml"  # Malayalam
        elif 0x0600 <= code <= 0x06FF:
            return "ur"  # Urdu / Arabic

    # 2. Romanized Hindi / Hinglish keywords check
    lower = text.lower()
    hinglish_keywords = {
        "namaste", "namaskar", "kaise", "kaisi", "kaisa", "kya", "hai", "hain", "hoon", "mera", "meri", "mere",
        "aap", "tum", "mujhe", "hum", "sab", "accha", "acchi", "acche", "thik", "theek", "nahi", "nahin", "haan",
        "dawa", "dawai", "paani", "chai", "khel", "khelo", "khelna", "chalo", "batao", "suno", "karo", "karna",
        "baat", "yaad", "bahut", "shukriya", "dhanyavaad", "dhanyawad", "kaun", "kaha", "idhar", "udhar", "beta", "dost"
    }
    words = set(re.findall(r"\b\w+\b", lower))
    if len(words.intersection(hinglish_keywords)) >= 1:
        return "hi"

    return fallback_lang


@app.post("/voice-turn")
async def voice_turn(
    transcript: str = Form(""),
    locale: str = Form(""),
    route: str = Form(""),
    sessionId: str = Form("default-session"),
    token: str = Form(""),
    audio: UploadFile = None,
):
    session_id = sessionId or "default-session"
    from tools.session import set_token
    set_token(token)

    # 1. Determine the best transcript & auto-detect language
    final_transcript = (transcript or "").strip()
    detected_lang = detect_language(final_transcript, fallback_lang="en" if not locale.startswith("hi") else "hi")

    if audio is not None:
        temp_path = f"audio_out/in_{uuid.uuid4().hex}.webm"
        try:
            content = await audio.read()
            if content and len(content) > 200:
                with open(temp_path, "wb") as f:
                    f.write(content)
                # Auto-detect language using Whisper with verbose_json
                stt_text, stt_lang = speech_to_text(temp_path, language=None)
                if stt_text and stt_text.strip():
                    final_transcript = stt_text.strip()
                if stt_lang:
                    detected_lang = stt_lang
                else:
                    detected_lang = detect_language(final_transcript, fallback_lang=detected_lang)
        except Exception as stt_err:
            print("STT note:", stt_err)
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    # If transcript is still empty, default to welcoming prompt in the detected language
    if not final_transcript:
        final_transcript = "नमस्ते" if detected_lang == "hi" else "Hello"

    config = {"configurable": {"thread_id": session_id}}

    # 2. Extract facts asynchronously
    try:
        executor.submit(extract_and_save, session_id, final_transcript)
    except Exception as e:
        print("Fact extraction note:", e)

    # 3. Invoke Supervisor Agent with same-language guarantee
    reply_text = ""
    messages_log = []
    try:
        reply_future = executor.submit(
            agent.invoke,
            {"messages": [("user", f"[session_id: {session_id}, language: {detected_lang}] {final_transcript}")]},
            config,
        )
        result = reply_future.result(timeout=12)
        if result and "messages" in result and result["messages"]:
            messages_log = result["messages"]
            last_content = result["messages"][-1].content
            if isinstance(last_content, str):
                reply_text = last_content
            elif isinstance(last_content, list):
                reply_text = " ".join(str(item) for item in last_content)
    except Exception as invoke_err:
        print("Agent invocation fallback activated:", invoke_err)
        fallback = FallbackAgent()
        res = fallback.invoke(
            {"messages": [("user", f"[session_id: {session_id}] {final_transcript}")]},
            config,
        )
        if res and "messages" in res and res["messages"]:
            messages_log = res["messages"]
            reply_text = res["messages"][-1].content

    if not reply_text or not reply_text.strip():
        if detected_lang == "hi":
            reply_text = "मैं यहीं आपके साथ हूँ। मैं पूरे प्यार और अपनेपन से आपकी बात सुन रहा हूँ।"
        else:
            reply_text = "I am right here with you, dear. I am listening with all my warmth and care."

    # 4. Check for Game Routing Intent
    intent = "CHAT"
    game_command = None
    if "[ROUTED_TO_GAME" in reply_text or any(
        "route_to_game" in str(m) for m in messages_log
    ):
        intent = "START_GAME"
        game_command = {
            "action": "START_GAME",
            "gameId": "memory-garden-match",
            "source": "voice",
            "transcript": final_transcript,
        }

    # 5. Determine exact response language from reply and synthesize matching TTS
    reply_lang = detect_language(reply_text, fallback_lang=detected_lang)
    clean_audio_text = re.sub(r"\[.*?\]", "", reply_text).strip()
    if not clean_audio_text:
        clean_audio_text = reply_text

    audio_filename = f"out_{uuid.uuid4().hex}.mp3"
    audio_path = f"audio_out/{audio_filename}"
    voice = VOICE_MAP.get(reply_lang, VOICE_MAP.get("en", "en-IN-NeerjaNeural"))
    reply_audio_url = None
    try:
        await text_to_speech(clean_audio_text, voice, audio_path)
        public_url = os.getenv("VOICE_AGENT_PUBLIC_URL", "http://localhost:8001").rstrip("/")
        reply_audio_url = f"{public_url}/audio/{audio_filename}"
    except Exception as tts_err:
        print("TTS note:", tts_err)


    return JSONResponse({
        "replyText": clean_audio_text if intent == "START_GAME" else reply_text,
        "replyAudioUrl": reply_audio_url,
        "language": reply_lang,
        "intent": intent,
        "gameCommand": game_command,
    })  