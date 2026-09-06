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

/**
 * GET /api/irt/level?domain=memory
 * Returns the IRT-recommended level for the given cognitive domain.
 * Response: { domain, level, probability }
 */
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain") ?? "memory";

  try {
    const raw = await runPython(["play_game", domain]);
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[IRT /level] error:", err);
    // Graceful fallback — return level 1 so the game can still start
    return NextResponse.json({ domain, level: 1, probability: 0.5 });
  }
}
