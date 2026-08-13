import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const textArg = (value: string | null) => ({ type: "text", value: value ?? "" });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = String(body?.type ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();
    const email = String(body?.email ?? "").trim() || null;

    if (!subject || !message || message.length < 10) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
    }

    const databaseUrl = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!databaseUrl || !authToken) {
      return NextResponse.json({ error: "Feedback database is not configured" }, { status: 500 });
    }

    const baseUrl = databaseUrl.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/v2/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          { type: "execute", stmt: { sql: CREATE_TABLE_SQL } },
          {
            type: "execute",
            stmt: {
              sql: "INSERT INTO feedback (type, subject, message, email) VALUES (?, ?, ?, ?)",
              args: [textArg(type), textArg(subject), textArg(message), textArg(email)],
            },
          },
          { type: "close" },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Turso feedback request failed", response.status, await response.text());
      return NextResponse.json({ error: "Could not save feedback" }, { status: 502 });
    }

    const result = await response.json();
    if (result?.results?.some((item: { type?: string }) => item?.type === "error")) {
      console.error("Turso returned an error", result);
      return NextResponse.json({ error: "Could not save feedback" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Feedback API error", error);
    return NextResponse.json({ error: "Could not save feedback" }, { status: 500 });
  }
}
