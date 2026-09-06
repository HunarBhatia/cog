from langchain_core.tools import tool

@tool
def route_to_game(game_type: str) -> str:
    """Route the user to a cognitive game/memory exercise when they agree to play or ask for one."""
    return f"[ROUTED_TO_GAME:{game_type}]"