import { NextRequest, NextResponse } from "next/server";
import {
  addCircleMember,
  getAllCircleMembers,
} from "@/lib/circle-store";
import type { CircleMemberInput } from "@/lib/types";

export async function GET() {
  const members = getAllCircleMembers();
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CircleMemberInput;

    if (!body.name?.trim() || !body.relationship?.trim()) {
      return NextResponse.json(
        { error: "Name and relationship are required" },
        { status: 400 }
      );
    }

    const member = addCircleMember(body);
    return NextResponse.json({ member }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to add circle member" },
      { status: 500 }
    );
  }
}
