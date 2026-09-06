import requests

BACKEND_URL = "http://127.0.0.1:8000/api"

# Set per request by server.py; falls back to auto-login for terminal testing
_current_token = None

def set_token(token: str):
    global _current_token
    if token:
        _current_token = token

def get_token() -> str:
    global _current_token
    if _current_token:
        return _current_token
    try:
        resp = requests.post(
            f"{BACKEND_URL}/login/",
            json={"username": "testpatient", "password": "testpass123"},
            timeout=2,
        )
        if resp.status_code == 200:
            _current_token = resp.json().get("access")
    except Exception:
        pass
    return _current_token or ""

def auth_headers():
    tok = get_token()
    return {"Authorization": f"Bearer {tok}"} if tok else {}