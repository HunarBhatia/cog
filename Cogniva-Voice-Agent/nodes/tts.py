import edge_tts
import asyncio

async def text_to_speech(text: str, voice: str, output_path: str = "output.mp3"):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    return output_path

if __name__ == "__main__":
    text = "नमस्ते, आज आपका दिन कैसा रहा?"
    voice = "hi-IN-SwaraNeural"
    asyncio.run(text_to_speech(text, voice))
    print("Saved to output.mp3")