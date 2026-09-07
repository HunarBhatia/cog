import { NextRequest, NextResponse } from "next/server";
import { playGame } from "@/lib/irt";

/**
 * GET /api/irt/level?domain=memory
 * Returns the IRT-recommended level for the given cognitive domain.
 * Response: { domain, level, probability }
 */
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain") ?? "memory";

  try {
    const data = playGame(domain);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[IRT /level] error:", err);
    // Graceful fallback — return level 1 so the game can still start
    return NextResponse.json({ domain, level: 1, probability: 0.5 });
  }
}

