import { NextRequest, NextResponse } from "next/server";

const PYTHON_VOICE_AGENT_URL =
  process.env.PYTHON_VOICE_AGENT_URL || "http://127.0.0.1:8001/voice-turn";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Forward to FastAPI voice agent
    const pythonResponse = await fetch(PYTHON_VOICE_AGENT_URL, {
      method: "POST",
      body: formData,
    });

    if (pythonResponse.ok) {
      const data = await pythonResponse.json();
      return NextResponse.json(data);
    }

    const errText = await pythonResponse.text();
    console.warn("Python voice agent returned non-200:", pythonResponse.status, errText);
    return NextResponse.json(
      {
        replyText: "I am right here with you. How can I brighten your day?",
        intent: "CHAT",
        error: `Voice agent status ${pythonResponse.status}`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.warn("Could not reach Python voice agent on 8001:", error.message);
    return NextResponse.json(
      {
        replyText: "I am listening closely. Would you like to chat, or try our memory garden match?",
        intent: "CHAT",
      },
      { status: 200 }
    );
  }
}
