import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { CircleMember, CircleMemberInput } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "circle.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    db.exec(`
      CREATE TABLE IF NOT EXISTS circle_members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        relationship TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const count = db
      .prepare("SELECT COUNT(*) as count FROM circle_members")
      .get() as { count: number };

    if (count.count === 0) {
      const seed = db.prepare(
        "INSERT INTO circle_members (id, name, relationship, phone) VALUES (?, ?, ?, ?)"
      );
      seed.run(
        randomUUID(),
        "Jamie",
        "Sponsor",
        process.env.SUPPORTER_PHONE ?? ""
      );
    }
  }

  return db;
}

function rowToMember(row: {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}): CircleMember {
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    phone: row.phone,
  };
}

export function getAllCircleMembers(): CircleMember[] {
  const rows = getDb()
    .prepare(
      "SELECT id, name, relationship, phone FROM circle_members ORDER BY created_at ASC"
    )
    .all() as Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string;
  }>;

  return rows.map(rowToMember);
}

export function getCallableCircleMembers(): CircleMember[] {
  return getAllCircleMembers().filter((m) => m.phone.trim().length > 0);
}

export function addCircleMember(input: CircleMemberInput): CircleMember {
  const id = randomUUID();
  getDb()
    .prepare(
      "INSERT INTO circle_members (id, name, relationship, phone) VALUES (?, ?, ?, ?)"
    )
    .run(id, input.name.trim(), input.relationship.trim(), input.phone.trim());

  return { id, ...input };
}

export function updateCircleMember(
  id: string,
  input: CircleMemberInput
): CircleMember | null {
  const result = getDb()
    .prepare(
      "UPDATE circle_members SET name = ?, relationship = ?, phone = ? WHERE id = ?"
    )
    .run(
      input.name.trim(),
      input.relationship.trim(),
      input.phone.trim(),
      id
    );

  if (result.changes === 0) return null;
  return { id, ...input };
}

export function deleteCircleMember(id: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM circle_members WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
