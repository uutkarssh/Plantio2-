import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

interface MandiPrice {
  mandi: string;
  district: string;
  state: string;
  crop: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  date: string;
  source: "live" | "sample";
}

/* Curated representative mandi prices (per quintal, INR).
 * Used as a fallback when the live Agmarknet/data.gov.in API is unavailable
 * or when no API key is configured, so the page is never broken/empty.
 * Clearly flagged with source: "sample". */
const SAMPLE: Record<string, MandiPrice[]> = {
  Wheat: [
    { mandi: "Khanna", district: "Ludhiana", state: "Punjab", crop: "Wheat", min_price: 2120, max_price: 2240, modal_price: 2180, date: today(-1), source: "sample" },
    { mandi: "Karnal", district: "Karnal", state: "Haryana", crop: "Wheat", min_price: 2080, max_price: 2200, modal_price: 2140, date: today(-1), source: "sample" },
    { mandi: "Vidisha", district: "Vidisha", state: "Madhya Pradesh", crop: "Wheat", min_price: 2050, max_price: 2160, modal_price: 2100, date: today(-2), source: "sample" },
  ],
  Rice: [
    { mandi: "Tarn Taran", district: "Tarn Taran", state: "Punjab", crop: "Rice", min_price: 2950, max_price: 3120, modal_price: 3030, date: today(-1), source: "sample" },
    { mandi: "Karnal", district: "Karnal", state: "Haryana", crop: "Rice", min_price: 2880, max_price: 3050, modal_price: 2960, date: today(-1), source: "sample" },
  ],
  Maize: [
    { mandi: "Nawanshahr", district: "Shahid Bhagat Singh Nagar", state: "Punjab", crop: "Maize", min_price: 1960, max_price: 2080, modal_price: 2020, date: today(-1), source: "sample" },
    { mandi: "Begusarai", district: "Begusarai", state: "Bihar", crop: "Maize", min_price: 1880, max_price: 1980, modal_price: 1930, date: today(-2), source: "sample" },
  ],
  Onion: [
    { mandi: "Lasalgaon", district: "Nashik", state: "Maharashtra", crop: "Onion", min_price: 1600, max_price: 2400, modal_price: 2000, date: today(-1), source: "sample" },
    { mandi: "Indore", district: "Indore", state: "Madhya Pradesh", crop: "Onion", min_price: 1700, max_price: 2300, modal_price: 1950, date: today(-1), source: "sample" },
  ],
  Tomato: [
    { mandi: "Kolar", district: "Kolar", state: "Karnataka", crop: "Tomato", min_price: 1200, max_price: 2200, modal_price: 1700, date: today(-1), source: "sample" },
    { mandi: "Nashik", district: "Nashik", state: "Maharashtra", crop: "Tomato", min_price: 1100, max_price: 2100, modal_price: 1600, date: today(-2), source: "sample" },
  ],
  Potato: [
    { mandi: "Agra", district: "Agra", state: "Uttar Pradesh", crop: "Potato", min_price: 900, max_price: 1400, modal_price: 1150, date: today(-1), source: "sample" },
    { mandi: "Indore", district: "Indore", state: "Madhya Pradesh", crop: "Potato", min_price: 950, max_price: 1350, modal_price: 1120, date: today(-1), source: "sample" },
  ],
  Soybean: [
    { mandi: "Ujjain", district: "Ujjain", state: "Madhya Pradesh", crop: "Soybean", min_price: 4200, max_price: 4480, modal_price: 4340, date: today(-1), source: "sample" },
    { mandi: "Latur", district: "Latur", state: "Maharashtra", crop: "Soybean", min_price: 4150, max_price: 4400, modal_price: 4280, date: today(-2), source: "sample" },
  ],
  Cotton: [
    { mandi: "Yavatmal", district: "Yavatmal", state: "Maharashtra", crop: "Cotton", min_price: 6800, max_price: 7300, modal_price: 7050, date: today(-1), source: "sample" },
    { mandi: "Rajkot", district: "Rajkot", state: "Gujarat", crop: "Cotton", min_price: 6700, max_price: 7200, modal_price: 6950, date: today(-2), source: "sample" },
  ],
};

function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function fetchLive(crop: string, state?: string): Promise<MandiPrice[] | null> {
  const apiKey = process.env.AGMARKNET_API_KEY || process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) return null;
  try {
    const url = new URL("https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0078");
    url.searchParams.set("api-key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "50");
        if (state) {
      url.searchParams.set("filters[state]", state);
        }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const records: any[] = data?.records || [];
    const filtered = records
      .filter((r) => !crop || r?.commodity?.toLowerCase().includes(crop.toLowerCase()))
      .map<MandiPrice>((r) => ({
        mandi: r.market || "Unknown",
        district: r.district || "",
        state: r.state || "",
        crop: r.commodity || crop,
        min_price: Number(r.min_price) || 0,
        max_price: Number(r.max_price) || 0,
        modal_price: Number(r.modal_price) || 0,
        date: r.arrival_date || today(),
        source: "live",
      }));
    return filtered.length ? filtered : null;
  } catch (e) {
    console.error("mandi live fetch error:", e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get("crop") || "";
  const state = searchParams.get("state") || undefined;

  const live = await fetchLive(crop, state);
  if (live) {
    return NextResponse.json({ prices: live, source: "live" });
  }

  // curated fallback
  const sample = SAMPLE[crop] || [];
  const filtered = state ? sample.filter((p) => p.state.toLowerCase() === state.toLowerCase()) : sample;
  return NextResponse.json({
    prices: filtered,
    source: filtered.length ? "sample" : "empty",
    note: filtered.length
      ? "Showing representative sample prices — live mandi data is unavailable right now."
      : "No price data available for this crop/area right now — try a nearby district.",
  });
}
