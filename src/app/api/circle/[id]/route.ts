import { NextRequest, NextResponse } from "next/server";
import { deleteCircleMember, updateCircleMember } from "@/lib/circle-store";
import type { CircleMemberInput } from "@/lib/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as CircleMemberInput;

    if (!body.name?.trim() || !body.relationship?.trim()) {
      return NextResponse.json(
        { error: "Name and relationship are required" },
        { status: 400 }
      );
    }

    const member = updateCircleMember(id, body);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch {
    return NextResponse.json(
      { error: "Failed to update circle member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteCircleMember(id);

    if (!deleted) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete circle member" },
      { status: 500 }
    );
  }
}
