from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from nodes.stt import speech_to_text
from nodes.tts import text_to_speech
from supervisor import agent
from extractor import extract_and_save
from concurrent.futures import ThreadPoolExecutor
import asyncio

executor = ThreadPoolExecutor(max_workers=2)

class VoiceState(TypedDict):
    audio_in_path: str
    session_id: str
    language: str
    transcript: Optional[str]
    response_text: Optional[str]
    audio_out_path: Optional[str]

def stt_node(state: VoiceState) -> VoiceState:
    transcript = speech_to_text(state["audio_in_path"], language=state["language"])
    return {**state, "transcript": transcript}

def brain_node(state: VoiceState) -> VoiceState:
    session_id = state["session_id"]
    transcript = state["transcript"]
    config = {"configurable": {"thread_id": session_id}}

    extract_future = executor.submit(extract_and_save, session_id, transcript)
    reply_future = executor.submit(
        agent.invoke,
        {"messages": [("user", f"[session_id: {session_id}] {transcript}")]},
        config,
    )

    result = reply_future.result()
    extract_future.result()

    response_text = result["messages"][-1].content
    return {**state, "response_text": response_text}

def tts_node(state: VoiceState) -> VoiceState:
    voice_map = {"hi": "hi-IN-SwaraNeural", "bn": "bn-IN-TanishaaNeural", "en": "en-IN-NeerjaNeural"}
    voice = voice_map.get(state["language"], "hi-IN-SwaraNeural")
    output_path = "agent_response.mp3"
    asyncio.run(text_to_speech(state["response_text"], voice, output_path))
    return {**state, "audio_out_path": output_path}

graph = StateGraph(VoiceState)
graph.add_node("stt", stt_node)
graph.add_node("brain", brain_node)
graph.add_node("tts", tts_node)

graph.set_entry_point("stt")
graph.add_edge("stt", "brain")
graph.add_edge("brain", "tts")
graph.add_edge("tts", END)

voice_graph = graph.compile()