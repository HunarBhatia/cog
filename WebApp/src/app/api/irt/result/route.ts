import { NextRequest, NextResponse } from "next/server";
import { updateAbility, IrtResultPayload } from "@/lib/irt";

export type { IrtResultPayload };

/**
 * POST /api/irt/result
 * Body: { domain, level, result, score }
 * Calculates updated theta info via IRT 2PL model.
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
    const data = updateAbility({
      domain,
      level,
      result,
      score,
    });

    // Optionally log to history file if accessible (e.g. local dev)
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const candidate1 = path.resolve(process.cwd(), "..", "ssh-2026", "ability_history.json");
      const historyPath = (await fs.stat(candidate1).catch(() => null)) ? candidate1 : null;
      if (historyPath) {
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
      }
    } catch {
      // Non-critical in serverless
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[IRT /result] error:", err);
    return NextResponse.json({ error: "IRT update failed" }, { status: 500 });
  }
}

