from langchain_core.tools import tool

VALID_GAMES = {
    "memory-garden-match": "memory-garden-match",
    "match-the-pairs": "memory-garden-match",
    "pairs": "memory-garden-match",
    "flower": "memory-garden-match",
    "sequence-the-task": "sequence-the-task",
    "sequence-task": "sequence-the-task",
    "routine": "sequence-the-task",
    "tap-the-target": "tap-the-target",
    "tap-target": "tap-the-target",
    "target": "tap-the-target",
    "attention": "tap-the-target",
}

@tool
def route_to_game(game_type: str) -> str:
    """Route the user to a cognitive game or memory exercise when they want to play or agree to start a game.
    Valid game types:
    - 'memory-garden-match': Match the Pairs flower cards (Memory domain).
    - 'sequence-the-task': Sequence daily routine activities chronologically (Daily Routine domain).
    - 'tap-the-target': Spot and tap target shapes and colors (Attention domain).
    """
    clean_type = game_type.lower().strip()
    canonical = VALID_GAMES.get(clean_type, "memory-garden-match")
    return f"[ROUTED_TO_GAME:{canonical}]"