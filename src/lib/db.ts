import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

function getTursoConfig() {
  const rawUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!rawUrl || !authToken) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in the environment"
    );
  }

  // Remote Turso must use HTTPS in Next.js/serverless (libsql:// uses native bindings).
  const url = rawUrl.startsWith("libsql://")
    ? rawUrl.replace("libsql://", "https://")
    : rawUrl;

  return { url, authToken };
}

function tursoFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    cache: "no-store",
  });
}

function resetClient(): void {
  if (client && !client.closed) {
    client.close();
  }
  client = null;
  schemaReady = null;
}

function createDbClient(): Client {
  return createClient({
    ...getTursoConfig(),
    fetch: tursoFetch,
  });
}

export function getDb(): Client {
  if (!client || client.closed) {
    client = createDbClient();
  }
  return client;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return result.rows.some((row) => String(row.name) === column);
}

async function initSchema(): Promise<void> {
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS circle_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  if (!(await columnExists("circle_members", "sort_order"))) {
    await db.execute(
      "ALTER TABLE circle_members ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"
    );
    const rows = await db.execute(
      "SELECT id FROM circle_members ORDER BY created_at ASC"
    );
    for (const [index, row] of rows.rows.entries()) {
      await db.execute({
        sql: "UPDATE circle_members SET sort_order = ? WHERE id = ?",
        args: [index, String(row.id)],
      });
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS escalation_sessions (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      step TEXT NOT NULL,
      demo INTEGER NOT NULL DEFAULT 0,
      member_name TEXT NOT NULL,
      member_phone TEXT NOT NULL,
      call_sids TEXT NOT NULL DEFAULT '[]',
      dial_outcome TEXT,
      call_mode TEXT NOT NULL DEFAULT 'sequential',
      member_phones TEXT NOT NULL DEFAULT '[]',
      current_index INTEGER NOT NULL DEFAULT 0,
      confirmed INTEGER NOT NULL DEFAULT 0,
      confirmed_call_sid TEXT,
      active_call_sid TEXT,
      transcript TEXT NOT NULL DEFAULT '',
      supporter_message TEXT NOT NULL DEFAULT '',
      supporter_attempts TEXT NOT NULL DEFAULT '[]'
    )
  `);

  const escalationColumns: Array<{ name: string; sql: string }> = [
    {
      name: "call_mode",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN call_mode TEXT NOT NULL DEFAULT 'sequential'",
    },
    {
      name: "member_phones",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN member_phones TEXT NOT NULL DEFAULT '[]'",
    },
    {
      name: "current_index",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN current_index INTEGER NOT NULL DEFAULT 0",
    },
    {
      name: "confirmed",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN confirmed INTEGER NOT NULL DEFAULT 0",
    },
    {
      name: "confirmed_call_sid",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN confirmed_call_sid TEXT",
    },
    {
      name: "active_call_sid",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN active_call_sid TEXT",
    },
    {
      name: "transcript",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN transcript TEXT NOT NULL DEFAULT ''",
    },
    {
      name: "supporter_message",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN supporter_message TEXT NOT NULL DEFAULT ''",
    },
    {
      name: "supporter_attempts",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN supporter_attempts TEXT NOT NULL DEFAULT '[]'",
    },
  ];

  for (const column of escalationColumns) {
    if (!(await columnExists("escalation_sessions", column.name))) {
      await db.execute(column.sql);
    }
  }

  const countResult = await db.execute(
    "SELECT COUNT(*) as count FROM circle_members"
  );
  const count = Number(countResult.rows[0]?.count ?? 0);

  if (count === 0) {
    const { randomUUID } = await import("crypto");
    await db.execute({
      sql: "INSERT INTO circle_members (id, name, relationship, phone) VALUES (?, ?, ?, ?)",
      args: [
        randomUUID(),
        "Jamie",
        "Sponsor",
        process.env.SUPPORTER_PHONE ?? "",
      ],
    });
  }
}

export async function ensureDbReady(): Promise<Client> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((error) => {
      resetClient();
      throw error;
    });
  }

  try {
    await schemaReady;
  } catch (error) {
    resetClient();
    if (
      error instanceof Error &&
      (error.message.includes("401") ||
        error.message.includes("Unauthorized"))
    ) {
      throw new Error(
        "Turso authentication failed. Create a new token with `turso db tokens create test-ccfrankee` and update TURSO_AUTH_TOKEN in .env"
      );
    }
    throw error;
  }

  return getDb();
}
