import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomName = searchParams.get("roomName");
  const participantName = searchParams.get("participantName");

  if (!roomName || !participantName) {
    return NextResponse.json(
      { error: "roomName and participantName query parameters are required" },
      { status: 400 }
    );
  }

  return generateTokenResponse(roomName, participantName);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const roomName = body.roomName;
    const participantName = body.participantName;

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: "roomName and participantName are required in request body" },
        { status: 400 }
      );
    }

    return generateTokenResponse(roomName, participantName);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generateTokenResponse(roomName: string, participantName: string) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl =
    process.env.LIVEKIT_URL ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    "wss://pbl-km1y90o5.livekit.cloud";

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          "LiveKit credentials (LIVEKIT_API_KEY and LIVEKIT_API_SECRET) are not configured on the server.",
      },
      { status: 500 }
    );
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      serverUrl,
      roomName,
      participantName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Token generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
