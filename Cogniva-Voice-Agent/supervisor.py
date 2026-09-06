import sqlite3
from langchain_groq import ChatGroq
try:
    from langchain.agents import create_agent
except Exception:
    from langgraph.prebuilt import create_react_agent as create_agent
from langgraph.checkpoint.sqlite import SqliteSaver
from tools.memory import add_memory, get_memory
from tools.reminders import add_reminder, get_reminders
from tools.game_router import route_to_game
from config import GROQ_API_KEY, MODEL_NAME

SYSTEM_PROMPT = """You are Cogniva, an empathetic, warm, and gentle AI companion built for the Smart India Hackathon (SIH 2026).
Your mission is providing dignified, culturally-grounded care for senior citizens and elderly individuals in the North Eastern Region (NER) of India (Assam, Meghalaya, Manipur, Mizoram, Nagaland, Tripura, Arunachal Pradesh, Sikkim) who may experience memory loss, loneliness, or early cognitive decline.

Your Persona & Demeanor:
- Speak slowly, with deep kindness, warmth, and reassuring patience. Never rush or sound abrupt.
- Use simple, accessible sentences suitable for elderly seniors. Avoid clinical jargon or complex language.
- Celebrate small moments, validate memories, and gently redirect if the senior feels disoriented.
- Integrate comforting references to North Eastern culture when natural — such as warm Assam tea, fresh morning walks, peaceful bamboo groves, gentle rain, and soothing folk flute melodies.

CRITICAL LANGUAGE & SPEECH RULES:
- ALWAYS reply in the EXACT SAME LANGUAGE that the user spoke to you in!
- If the user speaks in Hindi (or Hinglish), reply in gentle, natural Hindi (in Devanagari script).
- If the user speaks in English, reply in warm English.
- If the user speaks in Assamese, Bengali, Nepali, Bodo, or other regional languages, reply in that exact language.
- Keep responses concise (2 to 3 sentences max) so that Text-To-Speech (TTS) voice playback is quick, smooth, and natural.

Capabilities & Tool Usage:
- **add_memory / get_memory**: Automatically save and recall meaningful personal facts (names of family members, favorite tea, cherished childhood memories, daily likes/dislikes).
- **add_reminder / get_reminders**: Set and check daily routine reminders for medicines, hydration, meals, gentle walks, or doctor visits.
- **route_to_game**: When the user wants to play a cognitive memory exercise or garden game, use route_to_game with game_type "memory-garden-match".

Special Contexts:
- If the user says goodbye or wants to rest ("bye cogniva", "goodbye", "alvida"), warmly wish them peace and let them know they can say "hello cogniva" anytime.
- If the user asks about background music or songs, warmly let them know they can toggle the soothing North-Eastern folk flute music anytime using the music button at the bottom-left.
- Always be a gentle anchor of comfort, safety, and dignity.
"""

class FallbackAgent:
    def invoke(self, state, config=None):
        messages = state.get("messages", [])
        last_msg = messages[-1][1] if messages else ""
        clean_msg = last_msg
        if "[session_id:" in last_msg:
            clean_msg = last_msg.split("]", 1)[-1].strip()

        is_hindi = any(0x0900 <= ord(c) <= 0x097F for c in clean_msg) or any(
            w in clean_msg.lower() for w in ["namaste", "kaise", "kya", "hai", "aap", "dawa", "khel", "chai", "paani", "alvida"]
        )

        lower = clean_msg.lower()

        if any(w in lower for w in ["bye cogniva", "goodbye", "bye bye", "alvida", "shubhratri", "sleep"]):
            if is_hindi:
                reply = "अलविदा! आराम से विश्राम कीजिए। जब भी मेरी ज़रूरत हो, बस 'hello cogniva' कहिए।"
            else:
                reply = "Goodbye! Have a peaceful and restful time. Just say 'hello cogniva' whenever you need me."
            return {"messages": [type("Msg", (), {"content": reply})()]}

        if any(w in lower for w in ["music", "song", "folk", "gaana", "sangeet", "flute", "bansuri"]):
            if is_hindi:
                reply = "पूर्वोत्तर की लोक धुनें और बांसुरी की आवाज़ मन को बहुत शांति देती हैं। आप नीचे बाईं तरफ दिए गए बटन से कभी भी संगीत शुरू कर सकते हैं।"
            else:
                reply = "The soothing North-Eastern folk flute melodies bring such peace. You can turn the folk music on or off anytime using the button at the bottom-left!"
            return {"messages": [type("Msg", (), {"content": reply})()]}

        if any(w in lower for w in ["game", "play", "match", "flower", "garden", "khel"]):
            if is_hindi:
                reply = "मुझे आपके साथ फूलों का खेल खेलना बहुत अच्छा लगेगा! चलिए अभी फूलों का बगीचा खेल शुरू करते हैं। [ROUTED_TO_GAME:memory-garden-match]"
            else:
                reply = "I would love to play a flower matching game with you! Let us open the memory garden right now. [ROUTED_TO_GAME:memory-garden-match]"
            return {"messages": [type("Msg", (), {"content": reply})()]}

        if any(w in lower for w in ["medicine", "dawa", "pill", "remind", "water", "paani"]):
            if is_hindi:
                reply = "मैंने आपकी दिनचर्या के लिए यह प्यार से नोट कर लिया है। मुझे यह बताने के लिए शुक्रिया।"
            else:
                reply = "I have noted that down gently for your routine. It is wonderful that you shared that with me."
            return {"messages": [type("Msg", (), {"content": reply})()]}

        if any(w in lower for w in ["tea", "chai", "morning", "breakfast", "nashta", "assam"]):
            if is_hindi:
                reply = "असम की ताज़ा गर्म चाय और सुबह की ताज़ी हवा मन को नई ऊर्जा देती है। आज आप कैसा महसूस कर रहे हैं?"
            else:
                reply = "A warm cup of Assam tea and the morning breeze bring such gentle comfort. How are you feeling today?"
            return {"messages": [type("Msg", (), {"content": reply})()]}

        if is_hindi:
            responses = [
                "आपकी आवाज़ सुनकर बहुत अच्छा लगा। आज आपके मन में क्या चल रहा है, मुझे और बताइए।",
                "यह सुनकर बहुत सुकून मिला। क्या आप आराम से बैठकर पुरानी यादें साझा करना चाहेंगे या कोई हल्का खेल खेलना चाहेंगे?",
                "मैं पूरे प्यार और ध्यान से आपकी बात सुन रहा हूँ। आप यहाँ बिल्कुल सुरक्षित और शांत हैं।",
                "मुझे यह बताने के लिए धन्यवाद। जब आप छोटे थे, तब आपका पसंदीदा मौसम या फूल कौन सा था?",
                "मैं यहीं आपके साथ हूँ। हमारे पास बात करने के लिए पूरा समय है।",
            ]
        else:
            responses = [
                "It is so good to hear your voice. Tell me more about what is on your mind today.",
                "That sounds lovely. Would you like to sit together and reminisce, or perhaps try a gentle memory exercise?",
                "I am listening with warm attention. You are in a safe, peaceful place today.",
                "Thank you for sharing that with me. What was your favorite flower or season when you were younger?",
                "I am right here with you. We have all the time in the world.",
            ]
        import hashlib
        idx = int(hashlib.md5(clean_msg.encode()).hexdigest(), 16) % len(responses)
        return {"messages": [type("Msg", (), {"content": responses[idx]})()]}

if GROQ_API_KEY:
    try:
        llm = ChatGroq(api_key=GROQ_API_KEY, model=MODEL_NAME, temperature=0)
        tools = [add_memory, get_memory, add_reminder, get_reminders, route_to_game]
        conn = sqlite3.connect("checkpoints.db", check_same_thread=False)
        checkpointer = SqliteSaver(conn)
        try:
            agent = create_agent(
                model=llm,
                tools=tools,
                prompt=SYSTEM_PROMPT,
                checkpointer=checkpointer,
            )
        except TypeError:
            agent = create_agent(
                model=llm,
                tools=tools,
                system_prompt=SYSTEM_PROMPT,
                checkpointer=checkpointer,
            )
        print("[OK] Groq agent initialized successfully with tools:", [t.name for t in tools])
    except Exception as e:
        print("[WARN] Groq agent init failed, using resilient companion agent:", e)
        agent = FallbackAgent()
else:
    print("[WARN] No GROQ_API_KEY found, using fallback companion agent")
    agent = FallbackAgent()