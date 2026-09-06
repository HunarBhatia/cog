import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

const SSH2026_DIR = path.resolve(process.cwd(), "..", "ssh-2026");
const MAIN_PY = path.join(SSH2026_DIR, "main.py");

function runPython(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("python", [MAIN_PY, ...args], {
      cwd: SSH2026_DIR,
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python exited ${code}: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

export interface IrtResultPayload {
  domain: string;
  level: number;
  /** 1 = passed/completed, 0 = failed/gave up */
  result: 0 | 1;
  /** 0–100 score from the game */
  score: number;
}

/**
 * POST /api/irt/result
 * Body: { domain, level, result, score }
 * Calls update_ability() in ssh-2026/main.py and returns updated theta info.
 */
export async function POST(request: NextRequest) {
  let body: IrtResultPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { domain, level, result, score } = body;

  if (!domain || level == null || result == null || score == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const raw = await runPython([
      "update_ability",
      domain,
      String(level),
      String(result),
      String(score),
    ]);
    const data = JSON.parse(raw);

    // Persist to ability_history.json for caregiver dashboard trends
    try {
      const fs = await import("fs/promises");
      const historyPath = path.join(SSH2026_DIR, "ability_history.json");
      let history: unknown[] = [];
      try {
        const fileContent = await fs.readFile(historyPath, "utf-8");
        history = JSON.parse(fileContent);
      } catch {
        history = [];
      }
      history.push({
        timestamp: new Date().toISOString(),
        domain,
        level,
        result,
        score,
        theta_old: data.theta_old,
        theta_new: data.theta_new,
      });
      if (history.length > 100) history = history.slice(-100);
      await fs.writeFile(historyPath, JSON.stringify(history, null, 2), "utf-8");
    } catch (historyErr) {
      console.warn("Could not log to ability_history.json:", historyErr);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[IRT /result] error:", err);
    return NextResponse.json({ error: "IRT update failed" }, { status: 500 });
  }
}
