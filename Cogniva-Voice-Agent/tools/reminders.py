import requests
from langchain_core.tools import tool
from tools.session import BACKEND_URL, auth_headers

@tool
def add_reminder(session_id: str, reminder: str, time: str) -> str:
    """Add a reminder for medicine, hydration, activity, or appointment."""
    try:
        r = requests.post(f"{BACKEND_URL}/reminders/", json={"text": reminder, "time": time}, headers=auth_headers(), timeout=3)
        return f"Reminder set: {reminder} at {time}" if r.status_code == 201 else f"Failed ({r.status_code})"
    except Exception as e:
        return f"Could not connect to database: {e}"

@tool
def get_reminders(session_id: str) -> str:
    """Get pending reminders for this patient."""
    try:
        r = requests.get(f"{BACKEND_URL}/reminders/", headers=auth_headers(), timeout=3)
        if r.status_code != 200:
            return "No reminders set."
        items = [f"{x['text']} at {x['time']}" for x in r.json()]
        return "\n".join(items) if items else "No reminders set."
    except Exception as e:
        return "No reminders set."