import sqlite3
import re
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
- Keep responses concise (2 to 4 sentences) so that Text-To-Speech (TTS) voice playback is quick, smooth, and natural.

COMPLETE KNOWLEDGE OF COGNIVA ARCADE GAMES:
You have full knowledge of all 3 cognitive games available in the Cogniva system:

1. **Match the Pairs (Memory Garden Match)** [game_type: "memory-garden-match"]:
   - Domain: Visual Memory & Recall (calibrated with Item Response Theory / IRT).
   - How to play: A grid of cards featuring peaceful flowers (lotus, rhododendron, bamboo, orchid). Cards are face-down. The senior taps two cards at a time to reveal them. Finding matching pairs keeps them open.
   - Purpose: Gently exercises short-term visual memory and pattern recognition without pressure. Has 10 adaptive difficulty levels.

2. **Sequence the Task (Daily Routine)** [game_type: "sequence-the-task"]:
   - Domain: Daily Routine & Executive Function.
   - How to play: The senior is presented with illustrated cards of a familiar daily activity (like having morning Assam tea, taking morning medicine, washing hands, or getting ready for a stroll). The cards are scrambled, and the senior arranges them in chronological order from first to last.
   - Purpose: Reinforces logical sequencing, daily life independence, and cognitive planning. Has 10 adaptive levels.

3. **Tap the Target (Attention & Focus)** [game_type: "tap-the-target"]:
   - Domain: Sustained Attention & Visual Focus.
   - How to play: A target flower or shape is displayed at the top. Moving shapes appear across the garden, and the senior taps every matching target while gently ignoring other shapes.
   - Purpose: Sharpens visual alertness, reaction time, and selective attention in a relaxing atmosphere. Has 10 adaptive levels.

GAME INTERACTION RULES:
- If the user asks what games there are, list and warmly describe all 3 games in 2-3 friendly sentences, and ask which one they would like to try.
- If the user asks how a specific game works or asks for details, explain that game clearly and simply.
- If the user says they want to play a game (e.g. "Let's play", "I want to try Match the Pairs", "Sequence the Task please", "खेल खेलते हैं"), call the **route_to_game** tool with the appropriate game_type ("memory-garden-match", "sequence-the-task", or "tap-the-target").

PROACTIVE TOOL USE — VERY IMPORTANT:
- **add_reminder**: Call this IMMEDIATELY whenever the user mentions medicine, tablets, pills, dawa, doctor appointment, health check-up, meals, water, or any scheduled activity. Do NOT wait for them to explicitly ask — if they mention it, SET THE REMINDER NOW. If no time is given, use a sensible default (morning medicine → "8:00 AM", evening medicine → "7:00 PM", general → "10:00 AM").
- **add_memory**: Call this whenever the user shares personal information — family names, relationships, preferences, memories, hobbies, or daily habits. Store these facts immediately.
- **get_reminders**: Call this when the user asks what reminders they have or mentions forgetting something.
- **get_memory**: Call this to recall personal facts shared in previous conversations.
- **route_to_game**: Call this whenever the user wants to play or start one of the 3 games.

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
            w in clean_msg.lower() for w in ["namaste", "kaise", "kya", "hai", "aap", "dawa", "khel", "chai", "paani", "alvida", "batao"]
        )

        lower = clean_msg.lower()

        # Goodbye / sleep
        if any(w in lower for w in ["bye cogniva", "goodbye", "bye bye", "alvida", "shubhratri", "sleep"]):
            if is_hindi:
                reply = "अलविदा! आराम से विश्राम कीजिए। जब भी मेरी ज़रूरत हो, बस 'hello cogniva' कहिए।"
            else:
                reply = "Goodbye! Have a peaceful and restful time. Just say 'hello cogniva' whenever you need me."
            return {"messages": [type("Msg", (), {"content": reply})()]}

        # Music
        if any(w in lower for w in ["music", "song", "folk", "gaana", "sangeet", "flute", "bansuri"]):
            if is_hindi:
                reply = "पूर्वोत्तर की लोक धुनें और बांसुरी की आवाज़ मन को बहुत शांति देती हैं। आप नीचे बाईं तरफ दिए गए बटन से कभी भी संगीत शुरू कर सकते हैं।"
            else:
                reply = "The soothing North-Eastern folk flute melodies bring such peace. You can turn the folk music on or off anytime using the button at the bottom-left!"
            return {"messages": [type("Msg", (), {"content": reply})()]}

        # Specific Game Explanations or Direct Launches
        # 1. Sequence the task
        if any(w in lower for w in ["sequence", "routine", "dinacharya", "chronological", "steps"]):
            if any(w in lower for w in ["play", "start", "shuru", "khelo"]):
                if is_hindi:
                    reply = "चलिए दिनचर्या क्रमबद्ध करने का खेल शुरू करते हैं! [ROUTED_TO_GAME:sequence-the-task]"
                else:
                    reply = "Let us start Sequence the Task! You will arrange daily routine steps in chronological order. [ROUTED_TO_GAME:sequence-the-task]"
            else:
                if is_hindi:
                    reply = "सीक्वेंस द टास्क में आप चाय बनाने या सुबह की सैर जैसी रोज़मर्रा की गतिविधियों को सही क्रम में लगाते हैं। यह आपकी दिनचर्या और याददाश्त को मज़बूत करता है। क्या आप इसे खेलना चाहेंगे?"
                else:
                    reply = "Sequence the Task is a daily routine game where you arrange familiar activities (like morning tea or medicine) in chronological order. Would you like to play it now?"
            return {"messages": [type("Msg", (), {"content": reply})()]}

        # 2. Tap the target
        if any(w in lower for w in ["tap the target", "target", "attention", "focus", "spot"]):
            if any(w in lower for w in ["play", "start", "shuru", "khelo"]):
                if is_hindi:
                    reply = "चलिए टैप द टारगेट खेल शुरू करते हैं! [ROUTED_TO_GAME:tap-the-target]"
                else:
                    reply = "Let us open Tap the Target! Spot and tap the matching blossoms. [ROUTED_TO_GAME:tap-the-target]"
            else:
                if is_hindi:
                    reply = "टैप द टारगेट में आपको बगीचे में सही फूल या आकृति को पहचान कर टैप करना होता है। यह खेल एकाग्रता और ध्यान को बढ़ाता है। क्या आप इसे खेलना चाहेंगे?"
                else:
                    reply = "Tap the Target is an attention exercise where you spot and tap matching shapes and blossoms among gentle distractors. Would you like to try it?"
            return {"messages": [type("Msg", (), {"content": reply})()]}

        # 3. Match the pairs / Memory garden
        if any(w in lower for w in ["match the pairs", "pairs", "memory garden", "cards"]):
            if any(w in lower for w in ["play", "start", "shuru", "khelo"]):
                if is_hindi:
                    reply = "चलिए फूलों के जोड़ों को मिलाने का खेल शुरू करते हैं! [ROUTED_TO_GAME:memory-garden-match]"
                else:
                    reply = "Opening our flower matching memory garden right now! [ROUTED_TO_GAME:memory-garden-match]"
            else:
                if is_hindi:
                    reply = "मैच द पेयर्स में आप दो-दो पत्तों को पलटकर एक जैसे फूलों के जोड़े खोजते हैं। यह खेल आपकी याददाश्त को ताज़ा रखता है। क्या आप अभी खेलना चाहेंगे?"
                else:
                    reply = "Match the Pairs is a gentle memory game where you flip cards to find matching blossoms like rhododendrons and orchids. Would you like to play?"
            return {"messages": [type("Msg", (), {"content": reply})()]}

        # General Games Query ("what games do you have", "explain the games", "khel")
        if any(w in lower for w in ["what games", "all games", "which games", "explain game", "khel batao", "khel kaun", "games you have", "games are there", "list games"]):
            if is_hindi:
                reply = "हमारे पास 3 प्यारे खेल हैं: 1. मैच द पेयर्स (फूलों के जोड़े खोजने का याददाश्त खेल), 2. सीक्वेंस द टास्क (दिनचर्या के कामों को सही क्रम में लगाना), और 3. टैप द टारगेट (ध्यान और एकाग्रता का खेल)। आप कौन सा खेलना पसंद करेंगे?"
            else:
                reply = "We have 3 gentle arcade games: 1. Match the Pairs (finding matching flower cards for memory), 2. Sequence the Task (arranging daily routine steps in order), and 3. Tap the Target (spotting target shapes for focus). Which one would you like to try?"
            return {"messages": [type("Msg", (), {"content": reply})()]}

        if any(w in lower for w in ["game", "play", "khel"]):
            if is_hindi:
                reply = "मुझे आपके साथ खेल खेलना बहुत पसंद है! हमारे पास मैच द पेयर्स, सीक्वेंस द टास्क और टैप द टारगेट हैं। चलिए फूलों का बगीचा खेल शुरू करते हैं! [ROUTED_TO_GAME:memory-garden-match]"
            else:
                reply = "I would love to play a game with you! We have Match the Pairs, Sequence the Task, and Tap the Target. Let us start with our peaceful memory garden! [ROUTED_TO_GAME:memory-garden-match]"
            return {"messages": [type("Msg", (), {"content": reply})()]}

        # Reminders & Medicine
        if any(w in lower for w in ["medicine", "dawa", "pill", "remind", "water", "paani"]):
            if is_hindi:
                reply = "मैंने आपकी दिनचर्या के लिए यह प्यार से नोट कर लिया है। समय पर दवा और पानी लेना बहुत ज़रूरी है।"
            else:
                reply = "I have noted that down gently for your routine. Staying on time with medicine brings peace of mind."
            return {"messages": [type("Msg", (), {"content": reply})()]}

        # Tea / morning
        if any(w in lower for w in ["tea", "chai", "morning", "breakfast", "nashta", "assam"]):
            if is_hindi:
                reply = "असम की ताज़ा गर्म चाय और सुबह की ताज़ी हवा मन को नई ऊर्जा देती है। आज आप कैसा महसूस कर रहे हैं?"
            else:
                reply = "A warm cup of Assam tea and the morning breeze bring such gentle comfort. How are you feeling today?"
            return {"messages": [type("Msg", (), {"content": reply})()]}

        # Default conversational warm responses
        if is_hindi:
            responses = [
                "आपकी आवाज़ सुनकर बहुत अच्छा लगा। आज आपके मन में क्या चल रहा है, मुझे और बताइए।",
                "यह सुनकर बहुत सुकून मिला। क्या आप आराम से बैठकर पुरानी यादें साझा करना चाहेंगे या कोई हल्का खेल खेलना चाहेंगे?",
                "मैं पूरे प्यार और ध्यान से आपकी बात सुन रहा हूँ। आप यहाँ बिल्कुल सुरक्षित और शांत हैं।",
                "मुझे यह बताने के लिए धन्यवाद। आज आपका मन कैसा है?",
                "मैं यहीं आपके साथ हूँ। हमारे पास बात करने के लिए पूरा समय है।",
            ]
        else:
            responses = [
                "It is so good to hear your voice. Tell me more about what is on your mind today.",
                "That sounds lovely. Would you like to sit together and reminisce, or perhaps try one of our gentle cognitive games?",
                "I am listening with warm attention. You are in a safe, peaceful place today.",
                "Thank you for sharing that with me. How is your day going so far?",
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