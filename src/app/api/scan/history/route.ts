import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const FIREBASE_API_KEY = "AIzaSyDRZczZyqxzO_pIgmXhIdaNM7xL6IcB-rY";

async function getFirebaseUid(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      cache: "no-store",
    }
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data?.users?.[0]?.localId || null;
}

function mapScan(row: any) {
  return {
    id: row.id,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    imageDataUrl: row.image_url || "",
    plant_name: row.plant_name ?? null,
    plant_name_hi: row.plant_name_hi ?? null,
    plant_name_local: row.plant_name_local ?? null,
    is_healthy: Boolean(row.is_healthy),
    disease_name: row.disease_name ?? null,
    disease_name_hi: row.disease_name_hi ?? null,
    confidence: Number(row.confidence ?? 0),
    symptoms_summary: row.symptoms_summary ?? "",
    symptoms_summary_hi: row.symptoms_summary_hi ?? null,
    plant_description_en: row.plant_description_en ?? null,
    plant_description_hi: row.plant_description_hi ?? null,
    cure_plan: row.cure_plan ?? null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const uid = await getFirebaseUid(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limitParam = Number(req.nextUrl.searchParams.get("limit") || "5");
    const limit = Math.min(30, Math.max(1, Number.isFinite(limitParam) ? limitParam : 5));
    const { data, error } = await supabaseServer
      .from("scan_history")
      .select("*")
      .eq("userId", uid)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ scans: (data || []).map(mapScan) });
  } catch (error) {
    console.error("scan history GET error", error);
    return NextResponse.json({ error: "Could not load scan history" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = await getFirebaseUid(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id : null;
    if (id) {
      const { error } = await supabaseServer.from("scan_history").delete().eq("id", id).eq("userId", uid);
      if (error) throw error;
    } else {
      const { error } = await supabaseServer.from("scan_history").delete().eq("userId", uid);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("scan history DELETE error", error);
    return NextResponse.json({ error: "Could not delete scan history" }, { status: 500 });
  }
}
