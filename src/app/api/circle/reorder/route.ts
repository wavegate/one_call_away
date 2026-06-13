import { NextRequest, NextResponse } from "next/server";
import { getAllCircleMembers, reorderCircleMembers } from "@/lib/circle-store";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const orderedIds = body.orderedIds;

    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
      return NextResponse.json(
        { error: "orderedIds must be an array of member ids" },
        { status: 400 }
      );
    }

    const existingIds = new Set(getAllCircleMembers().map((member) => member.id));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id: string) => !existingIds.has(id))
    ) {
      return NextResponse.json(
        { error: "orderedIds must include every Circle member exactly once" },
        { status: 400 }
      );
    }

    const members = reorderCircleMembers(orderedIds);
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json(
      { error: "Failed to reorder Circle" },
      { status: 500 }
    );
  }
}
