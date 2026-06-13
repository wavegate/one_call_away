import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "XAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      "https://api.x.ai/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expires_after: { seconds: 300 },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Failed to mint session token: ${text}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      token: data.value,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token minting failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
