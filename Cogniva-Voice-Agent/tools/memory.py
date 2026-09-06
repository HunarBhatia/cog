import requests
from langchain_core.tools import tool
from tools.session import BACKEND_URL, auth_headers

@tool
def add_memory(session_id: str, fact: str) -> str:
    """Save an important fact about the patient to long-term memory."""
    try:
        r = requests.post(f"{BACKEND_URL}/memory/", json={"fact": fact}, headers=auth_headers(), timeout=3)
        return f"Saved: {fact}" if r.status_code == 201 else f"Failed ({r.status_code})"
    except Exception as e:
        return f"Could not connect to database: {e}"

@tool
def get_memory(session_id: str) -> str:
    """Retrieve saved memories about this patient."""
    try:
        r = requests.get(f"{BACKEND_URL}/memory/", headers=auth_headers(), timeout=3)
        if r.status_code != 200:
            return "No memories stored yet."
        facts = [m["fact"] for m in r.json()]
        return "\n".join(facts) if facts else "No memories stored yet."
    except Exception as e:
        return "No memories stored yet."