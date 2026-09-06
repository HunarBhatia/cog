from langchain_groq import ChatGroq
from langchain_core.tools import tool
from tools.memory import add_memory
from tools.reminders import add_reminder
from config import GROQ_API_KEY, MODEL_NAME

EXTRACT_PROMPT = """Analyze the following message from an elderly patient in a conversation. 
Extract any important facts worth remembering (family names, preferences, medical details, routines) 
and any reminders they mention (medicine times, appointments, tasks).

Session ID: {session_id}
Patient said: "{message}"

If there are facts worth saving, use the add_memory tool.
If there are reminders to set, use the add_reminder tool.
If there is nothing actionable, do nothing."""

if GROQ_API_KEY:
    try:
        llm = ChatGroq(api_key=GROQ_API_KEY, model=MODEL_NAME, temperature=0)
        tools = [add_memory, add_reminder]
        llm_with_tools = llm.bind_tools(tools, tool_choice="auto")
        def extract_and_save(session_id: str, message: str):
            try:
                prompt = EXTRACT_PROMPT.format(session_id=session_id, message=message)
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
        def extract_and_save(session_id: str, message: str):
            pass
else:
    def extract_and_save(session_id: str, message: str):
        pass