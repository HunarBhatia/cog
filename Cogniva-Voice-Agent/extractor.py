from langchain_groq import ChatGroq
from langchain_core.tools import tool
from tools.memory import add_memory
from tools.reminders import add_reminder
from config import GROQ_API_KEY, MODEL_NAME

EXTRACT_PROMPT = """Analyze the following conversation snippet from an elderly patient and their AI companion.
Extract any important facts worth remembering and any reminders that should be set.

Session ID: {session_id}
User said: "{user_message}"
Companion replied: "{agent_reply}"

IMPORTANT EXTRACTION RULES:
1. FACTS TO SAVE (use add_memory):
   - Family member names, relationships (e.g. "my daughter Priya", "my son Rahul")
   - Personal preferences (favorite tea, food, music, flowers, morning routine)
   - Medical details (conditions, doctor names, medication names)
   - Cherished memories or important life events
   - Daily habits and routines

2. REMINDERS TO SET (use add_reminder):
   - ANY mention of medicine, tablets, pills, dawa — set a reminder even if time is vague
   - Doctor appointments or check-ups
   - Meals, water/hydration reminders
   - Any activity the patient says they need to do
   - If NO explicit time is given, use a sensible default:
     * Morning medicine → "8:00 AM"
     * Evening medicine → "7:00 PM" 
     * General reminder → "10:00 AM"
   - ALWAYS create the reminder even without a specific time — use the defaults above

3. DO NOT save trivial small talk. Focus on actionable, meaningful information.

Extract now. Use tools if there is ANYTHING worth saving or reminding."""

if GROQ_API_KEY:
    try:
        llm = ChatGroq(api_key=GROQ_API_KEY, model=MODEL_NAME, temperature=0)
        tools = [add_memory, add_reminder]
        llm_with_tools = llm.bind_tools(tools, tool_choice="auto")

        def extract_and_save(session_id: str, user_message: str, agent_reply: str = ""):
            """Extract facts and reminders from the full conversation turn (user + agent)."""
            try:
                prompt = EXTRACT_PROMPT.format(
                    session_id=session_id,
                    user_message=user_message,
                    agent_reply=agent_reply or "(no reply yet)",
                )
                response = llm_with_tools.invoke(prompt)
                for call in response.tool_calls:
                    tool_map = {"add_memory": add_memory, "add_reminder": add_reminder}
                    fn = tool_map.get(call["name"])
                    if fn:
                        fn.invoke({**call["args"], "session_id": session_id})
            except Exception as e:
                print("Extraction error:", e)

    except Exception as init_err:
        print("Extractor init error:", init_err)
        def extract_and_save(session_id: str, user_message: str, agent_reply: str = ""):
            pass
else:
    def extract_and_save(session_id: str, user_message: str, agent_reply: str = ""):
        pass