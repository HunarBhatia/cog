import fs from "fs";
import path from "path";

export const NUM_LEVELS = 10;
export const THETA_MIN = -3.0;
export const THETA_MAX = 3.0;

export const LEVEL_DIFFICULTY: Record<number, number> = {};
for (let level = 1; level <= NUM_LEVELS; level++) {
  LEVEL_DIFFICULTY[level] = Number(
    (THETA_MIN + ((level - 1) * (THETA_MAX - THETA_MIN)) / (NUM_LEVELS - 1)).toFixed(4)
  );
}

export function sigmoid(x: number): number {
  const clamped = Math.max(-30.0, Math.min(30.0, x));
  return 1.0 / (1.0 + Math.exp(-clamped));
}

export function levelToB(level: number): number {
  return LEVEL_DIFFICULTY[level] ?? 0.0;
}

export function normalizeScore(score: number): number {
  return Math.max(0.0, Math.min(1.0, score / 100.0));
}

// Default neutral starting state — all domains begin at theta = 0.0
const DEFAULT_STORE: Record<string, { theta: number }> = {
  memory: { theta: 0.0 },
  attention: { theta: 0.0 },
  daily_routine: { theta: 0.0 },
  pattern_recognition: { theta: 0.0 },
  emotional: { theta: 0.0 },
};

// In-memory cache as fallback for serverless environments (Vercel)
const inMemoryStore: Record<string, { theta: number }> = { ...DEFAULT_STORE };

function getStoreFilePath(): string | null {
  try {
    const candidate1 = path.resolve(process.cwd(), "..", "ssh-2026", "ability_state.json");
    if (fs.existsSync(candidate1)) return candidate1;
    const candidate2 = path.resolve(process.cwd(), "ssh-2026", "ability_state.json");
    if (fs.existsSync(candidate2)) return candidate2;
  } catch {
    // Ignore error in serverless environment
  }
  return null;
}

export function loadStore(): Record<string, { theta: number }> {
  const filePath = getStoreFilePath();
  if (filePath) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      Object.assign(inMemoryStore, parsed);
      return inMemoryStore;
    } catch {
      // Fall back to memory
    }
  }
  return inMemoryStore;
}

export function saveStore(store: Record<string, { theta: number }>): void {
  Object.assign(inMemoryStore, store);
  const filePath = getStoreFilePath();
  if (filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
    } catch {
      // Ignore in read-only / serverless environment
    }
  }
}

/**
 * Resets all domain ability scores to neutral defaults (theta = 0.0).
 * Called when a new account is registered so each user starts fresh.
 */
export function resetStore(): void {
  // Reset in-memory store to fresh defaults
  for (const domain of Object.keys(inMemoryStore)) {
    inMemoryStore[domain] = { theta: 0.0 };
  }
  // Ensure all 5 domains are present
  for (const domain of Object.keys(DEFAULT_STORE)) {
    inMemoryStore[domain] = { theta: 0.0 };
  }
  // Persist to disk if available
  const filePath = getStoreFilePath();
  if (filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_STORE, null, 2), "utf-8");
    } catch {
      // Ignore in serverless
    }
  }
}

export interface UpdateAbilityInput {
  domain: string;
  level: number;
  result: number; // 0 or 1
  score: number;  // 0 to 100
}

export type IrtResultPayload = UpdateAbilityInput;


export interface UpdateAbilityOutput {
  domain: string;
  theta_old: number;
  theta_new: number;
  P: number;
  Q: number;
  M: number;
}

export function updateAbility(data: UpdateAbilityInput): UpdateAbilityOutput {
  const { domain, level, result, score } = data;
  const store = loadStore();
  const theta = store[domain]?.theta ?? 0.0;
  const b = levelToB(level);

  const P = sigmoid(theta - b);
  const evidence = result - P;

  const Q = normalizeScore(score);
  const M = 0.7 + 0.6 * Q;

  const eta = 0.4;
  let thetaNew = theta + eta * evidence * M;
  thetaNew = Math.max(THETA_MIN, Math.min(THETA_MAX, thetaNew));

  store[domain] = { theta: thetaNew };
  saveStore(store);

  return {
    domain,
    theta_old: Number(theta.toFixed(4)),
    theta_new: Number(thetaNew.toFixed(4)),
    P: Number(P.toFixed(4)),
    Q: Number(Q.toFixed(4)),
    M: Number(M.toFixed(4)),
  };
}

export interface PlayGameOutput {
  domain: string;
  level: number;
  probability: number;
}

export function playGame(domain: string): PlayGameOutput {
  const store = loadStore();
  const theta = store[domain]?.theta ?? 0.0;

  let bestLevel = 1;
  let bestDiff = Infinity;
  let bestP = 0.5;

  for (let level = 1; level <= NUM_LEVELS; level++) {
    const b = LEVEL_DIFFICULTY[level];
    const p = sigmoid(theta - b);
    const diff = Math.abs(p - 0.5);
    if (diff < bestDiff) {
      bestLevel = level;
      bestDiff = diff;
      bestP = p;
    }
  }

  return {
    domain,
    level: bestLevel,
    probability: Number(bestP.toFixed(4)),
  };
}
