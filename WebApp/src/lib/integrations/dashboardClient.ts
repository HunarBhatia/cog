import { DJANGO_API_URL } from "./config";

export interface MemoryItem {
  id: number;
  fact: string;
  created_at: string;
}

export interface ReminderItem {
  id: number;
  text: string;
  time: string;
  completed: boolean;
  created_at?: string;
}

export interface GameLogItem {
  id: number;
  game_type: string;
  score: number;
  difficulty: string;
  played_at: string;
}

function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchMemories(token?: string | null): Promise<MemoryItem[]> {
  if (!token) return [];
  try {
    const response = await fetch(`${DJANGO_API_URL}/memory/`, {
      method: "GET",
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      console.warn(`Fetch memories returned status ${response.status}`);
      return [];
    }
    return await response.json();
  } catch (err) {
    console.error("Failed to fetch memories from Django backend:", err);
    return [];
  }
}

export async function createMemory(fact: string, token?: string | null): Promise<MemoryItem | null> {
  if (!token) return null;
  try {
    const response = await fetch(`${DJANGO_API_URL}/memory/`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ fact }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Failed to create memory:", err);
    return null;
  }
}

export async function fetchReminders(token?: string | null): Promise<ReminderItem[]> {
  if (!token) return [];
  try {
    const response = await fetch(`${DJANGO_API_URL}/reminders/`, {
      method: "GET",
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      console.warn(`Fetch reminders returned status ${response.status}`);
      return [];
    }
    return await response.json();
  } catch (err) {
    console.error("Failed to fetch reminders from Django backend:", err);
    return [];
  }
}

export async function createReminder(
  text: string,
  time: string,
  token?: string | null
): Promise<ReminderItem | null> {
  if (!token) return null;
  try {
    const response = await fetch(`${DJANGO_API_URL}/reminders/`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ text, time, completed: false }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Failed to create reminder:", err);
    return null;
  }
}

export async function fetchGameLogs(token?: string | null): Promise<GameLogItem[]> {
  if (!token) return [];
  try {
    const response = await fetch(`${DJANGO_API_URL}/games/`, {
      method: "GET",
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      console.warn(`Fetch game logs returned status ${response.status}`);
      return [];
    }
    return await response.json();
  } catch (err) {
    console.error("Failed to fetch game logs from Django backend:", err);
    return [];
  }
}

export async function postGameScore(
  payload: {
    game_type: string;
    score: number;
    difficulty?: string;
  },
  token?: string | null
): Promise<GameLogItem | null> {
  if (!token) return null;
  try {
    const response = await fetch(`${DJANGO_API_URL}/games/`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        game_type: payload.game_type,
        score: payload.score,
        difficulty: payload.difficulty || "medium",
      }),
    });
    if (!response.ok) {
      console.warn(`Post game score returned status ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error("Failed to post game score to Django backend:", err);
    return null;
  }
}
