import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SSH2026_DIR = path.resolve(process.cwd(), "..", "ssh-2026");
const ABILITY_STATE_PATH = path.join(SSH2026_DIR, "ability_state.json");
const ABILITY_HISTORY_PATH = path.join(SSH2026_DIR, "ability_history.json");

/** Default ability state — all domains start at theta = 0.0 (neutral midpoint) */
const DEFAULT_ABILITY_STATE = {
  memory: { theta: 0.0 },
  attention: { theta: 0.0 },
  daily_routine: { theta: 0.0 },
  pattern_recognition: { theta: 0.0 },
  emotional: { theta: 0.0 },
};

/**
 * POST /api/irt/reset
 * Resets the IRT ability state to defaults (theta = 0.0 for all domains)
 * and clears the ability history log.
 * Called when a new user account is created so every account starts fresh.
 */
export async function POST() {
  try {
    // 1. Reset in-memory store via the irt module
    try {
      const { saveStore } = await import("@/lib/irt");
      saveStore(DEFAULT_ABILITY_STATE);
    } catch (e) {
      console.warn("[IRT /reset] Could not reset in-memory store:", e);
    }

    // 2. Overwrite ability_state.json if accessible (local dev)
    try {
      if (fs.existsSync(SSH2026_DIR)) {
        fs.writeFileSync(
          ABILITY_STATE_PATH,
          JSON.stringify(DEFAULT_ABILITY_STATE, null, 2),
          "utf-8"
        );
      }
    } catch (e) {
      console.warn("[IRT /reset] Could not write ability_state.json:", e);
    }

    // 3. Clear ability_history.json if accessible (local dev)
    try {
      if (fs.existsSync(ABILITY_HISTORY_PATH)) {
        fs.writeFileSync(ABILITY_HISTORY_PATH, "[]", "utf-8");
      }
    } catch (e) {
      console.warn("[IRT /reset] Could not clear ability_history.json:", e);
    }

    return NextResponse.json({
      success: true,
      message: "IRT ability state reset to defaults",
      state: DEFAULT_ABILITY_STATE,
    });
  } catch (err) {
    console.error("[POST /api/irt/reset] error:", err);
    return NextResponse.json(
      { error: "Failed to reset IRT state" },
      { status: 500 }
    );
  }
}
