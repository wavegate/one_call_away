import { NextRequest, NextResponse } from "next/server";
import {
  addCircleMember,
  getAllCircleMembers,
} from "@/lib/circle-store";
import type { CircleMemberInput } from "@/lib/types";

export async function GET() {
  try {
    const members = await getAllCircleMembers();
    return NextResponse.json({ members });
  } catch (error) {
    console.error("[api/circle GET]", error);
    return NextResponse.json(
      { error: "Failed to load circle members" },
      { status: 500 }
    );
  }
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

    const member = await addCircleMember(body);
    return NextResponse.json({ member }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to add circle member" },
      { status: 500 }
    );
  }
}
