import sounddevice as sd
from scipy.io.wavfile import write
from graph import voice_graph
import os

session_id = "test_user_1"
SAMPLE_RATE = 16000
DURATION = 5  # seconds per turn, adjust as needed

def record_audio(path="input.wav"):
    print("Recording... speak now")
    audio = sd.rec(int(DURATION * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='int16')
    sd.wait()
    write(path, SAMPLE_RATE, audio)
    return path

print("Cogniva Voice Agent — full audio mode. Ctrl+C to stop.\n")

while True:
    input("Press Enter to speak...")
    audio_path = record_audio()

    result = voice_graph.invoke({
        "audio_in_path": audio_path,
        "session_id": session_id,
        "language": "hi",  # hardcode for now, switch to "bn" to test Bengali
    })

    print("You said:", result["transcript"])
    print("Agent:", result["response_text"])

    os.system(f"start {result['audio_out_path']}")  # Windows: opens default player