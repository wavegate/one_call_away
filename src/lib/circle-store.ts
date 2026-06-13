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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);

    const columns = db
      .prepare("PRAGMA table_info(circle_members)")
      .all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === "sort_order")) {
      db.exec(
        "ALTER TABLE circle_members ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"
      );
      const rows = db
        .prepare(
          "SELECT id FROM circle_members ORDER BY created_at ASC"
        )
        .all() as Array<{ id: string }>;
      const update = db.prepare(
        "UPDATE circle_members SET sort_order = ? WHERE id = ?"
      );
      rows.forEach((row, index) => {
        update.run(index, row.id);
      });
    }

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
      "SELECT id, name, relationship, phone FROM circle_members ORDER BY sort_order ASC, created_at ASC"
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
  const maxOrder = getDb()
    .prepare("SELECT COALESCE(MAX(sort_order), -1) as max_order FROM circle_members")
    .get() as { max_order: number };

  getDb()
    .prepare(
      "INSERT INTO circle_members (id, name, relationship, phone, sort_order) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      id,
      input.name.trim(),
      input.relationship.trim(),
      input.phone.trim(),
      maxOrder.max_order + 1
    );

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
  if (result.changes === 0) return false;

  const remaining = getDb()
    .prepare("SELECT id FROM circle_members ORDER BY sort_order ASC, created_at ASC")
    .all() as Array<{ id: string }>;
  reorderCircleMembers(remaining.map((row) => row.id));
  return true;
}

export function reorderCircleMembers(orderedIds: string[]): CircleMember[] {
  const database = getDb();
  const update = database.prepare(
    "UPDATE circle_members SET sort_order = ? WHERE id = ?"
  );

  const reorder = database.transaction((ids: string[]) => {
    ids.forEach((id, index) => {
      update.run(index, id);
    });
  });

  reorder(orderedIds);
  return getAllCircleMembers();
}
