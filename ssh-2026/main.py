import json
import math
from pathlib import Path
from typing import Dict

# ---------------------------------------------------------------------------
# Difficulty levels
# ---------------------------------------------------------------------------

NUM_LEVELS = 10
THETA_MIN, THETA_MAX = -3.0, 3.0

LEVEL_DIFFICULTY = {
    level: round(THETA_MIN + (level - 1) * (THETA_MAX - THETA_MIN) / (NUM_LEVELS - 1), 4)
    for level in range(1, NUM_LEVELS + 1)
}

def sigmoid(x):
    x = max(-30.0, min(30.0, x))
    return 1.0 / (1.0 + math.exp(-x))

def level_to_b(level):
    return LEVEL_DIFFICULTY[level]

# ---------------------------------------------------------------------------
# Storage: domain -> {"theta": number}. Nothing else.
# ---------------------------------------------------------------------------

STORE_FILE = Path(__file__).parent / "ability_state.json"

def _load_store() -> dict:
    if STORE_FILE.exists():
        with open(STORE_FILE, "r") as f:
            return json.load(f)
    return {}

def _save_store(store: dict) -> None:
    with open(STORE_FILE, "w") as f:
        json.dump(store, f, indent=2)

# ---------------------------------------------------------------------------
# Metric normalization (used internally by update_ability)
# ---------------------------------------------------------------------------

def _normalize_score(score):
    """
    score is expected to be in [0, 100] (already computed by the caller).
    Normalizes it down to [0, 1] for use in Q. Clamps out-of-range values
    instead of blowing up, in case the incoming score is slightly off-range.
    """
    return max(0.0, min(1.0, score / 100.0))


# ===========================================================================
# FUNCTION 1
# ===========================================================================

def update_ability(game_data_path: str) -> Dict:
    """
    Reads a JSON file of one completed game session and updates ONLY that
    domain's theta value inside ability_state.json. Every other domain
    already in the file is left untouched.

    Expected JSON:
    {
        "domain": "memory",
        "level": 6,
        "result": 1,
        "score": 82
    }
    """
    with open(game_data_path, "r") as f:
        data = json.load(f)

    domain = data["domain"]
    level = data["level"]
    result = data["result"]

    store = _load_store()
    theta = store.get(domain, {}).get("theta", 0.0)
    b = level_to_b(level)

    P = sigmoid(theta - b)
    evidence = result - P

    Q = _normalize_score(data["score"])
    M = 0.7 + 0.6*Q

    eta = 0.4
    theta_new = theta + eta * evidence * M
    theta_new = max(THETA_MIN, min(THETA_MAX, theta_new))

    # navigate to just this domain's key and update its theta -- nothing else touched
    store[domain] = {"theta": theta_new}
    _save_store(store)

    return {
        "domain": domain,
        "theta_old": round(theta, 4),
        "theta_new": round(theta_new, 4),
        "P": round(P, 4),
        "Q": round(Q, 4),
        "M": round(M, 4),
    }


# ===========================================================================
# FUNCTION 2
# ===========================================================================

def play_game(domain: str) -> Dict:
    """
    Given a domain name, returns the difficulty level (1-10) whose predicted
    success probability is closest to 50%.
    """
    store = _load_store()
    theta = store.get(domain, {}).get("theta", 0.0)

    best_level, best_diff, best_p = None, None, None
    for level, b in LEVEL_DIFFICULTY.items():
        p = sigmoid(theta - b)
        diff = abs(p - 0.5)
        if best_diff is None or diff < best_diff:
            best_level, best_diff, best_p = level, diff, p

    return {"domain": domain, "level": best_level, "probability": round(best_p, 4)}


if __name__ == "__main__":
    import sys

    if len(sys.argv) >= 3 and sys.argv[1] == "play_game":
        # CLI: python main.py play_game <domain>
        domain = sys.argv[2]
        result = play_game(domain)
        print(json.dumps(result))

    elif len(sys.argv) >= 6 and sys.argv[1] == "update_ability":
        # CLI: python main.py update_ability <domain> <level> <result> <score>
        data = {
            "domain": sys.argv[2],
            "level": int(sys.argv[3]),
            "result": int(sys.argv[4]),
            "score": float(sys.argv[5]),
        }
        # Write to a temp file then call update_ability
        import tempfile, os
        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False
        )
        json.dump(data, tmp)
        tmp.close()
        try:
            result = update_ability(tmp.name)
            print(json.dumps(result))
        finally:
            os.unlink(tmp.name)

    else:
        # Legacy dev test
        print(update_ability("incoming_game_data.json"))
        result = play_game("daily_routine")
        print(result)