import { randomUUID } from "crypto";
import { ensureDbReady } from "./db";
import type { CircleMember, CircleMemberInput } from "./types";

type CircleRow = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
};

function rowToMember(row: CircleRow): CircleMember {
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    phone: row.phone,
  };
}

function parseCircleRow(row: Record<string, unknown>): CircleRow {
  return {
    id: String(row.id),
    name: String(row.name),
    relationship: String(row.relationship),
    phone: String(row.phone),
  };
}

export async function getAllCircleMembers(): Promise<CircleMember[]> {
  const db = await ensureDbReady();
  const result = await db.execute(
    "SELECT id, name, relationship, phone FROM circle_members ORDER BY sort_order ASC, created_at ASC"
  );

  return result.rows.map((row) => rowToMember(parseCircleRow(row)));
}

export async function getCallableCircleMembers(): Promise<CircleMember[]> {
  const members = await getAllCircleMembers();
  return members.filter((member) => member.phone.trim().length > 0);
}

export async function addCircleMember(
  input: CircleMemberInput
): Promise<CircleMember> {
  const db = await ensureDbReady();
  const id = randomUUID();
  const maxOrderResult = await db.execute(
    "SELECT COALESCE(MAX(sort_order), -1) as max_order FROM circle_members"
  );
  const maxOrder = Number(maxOrderResult.rows[0]?.max_order ?? -1);

  await db.execute({
    sql: "INSERT INTO circle_members (id, name, relationship, phone, sort_order) VALUES (?, ?, ?, ?, ?)",
    args: [
      id,
      input.name.trim(),
      input.relationship.trim(),
      input.phone.trim(),
      maxOrder + 1,
    ],
  });

  return { id, ...input };
}

export async function updateCircleMember(
  id: string,
  input: CircleMemberInput
): Promise<CircleMember | null> {
  const db = await ensureDbReady();
  const result = await db.execute({
    sql: "UPDATE circle_members SET name = ?, relationship = ?, phone = ? WHERE id = ?",
    args: [
      input.name.trim(),
      input.relationship.trim(),
      input.phone.trim(),
      id,
    ],
  });

  if (result.rowsAffected === 0) return null;
  return { id, ...input };
}

export async function deleteCircleMember(id: string): Promise<boolean> {
  const db = await ensureDbReady();
  const result = await db.execute({
    sql: "DELETE FROM circle_members WHERE id = ?",
    args: [id],
  });

  if (result.rowsAffected === 0) return false;

  const remaining = await db.execute(
    "SELECT id FROM circle_members ORDER BY sort_order ASC, created_at ASC"
  );
  await reorderCircleMembers(remaining.rows.map((row) => String(row.id)));
  return true;
}

export async function reorderCircleMembers(
  orderedIds: string[]
): Promise<CircleMember[]> {
  const db = await ensureDbReady();
  const tx = await db.transaction("write");

  try {
    for (const [index, id] of orderedIds.entries()) {
      await tx.execute({
        sql: "UPDATE circle_members SET sort_order = ? WHERE id = ?",
        args: [index, id],
      });
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }

  return getAllCircleMembers();
}
