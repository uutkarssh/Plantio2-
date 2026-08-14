"use client";

import { getIdToken } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/config";
import type { ScanResult } from "@/lib/plantio/storage";

export type CloudScan = ScanResult & { cure_plan?: unknown };

async function authHeaders(): Promise<HeadersInit> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await getIdToken(user, true);
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function getCloudScanHistory(limit = 5): Promise<CloudScan[]> {
  const headers = await authHeaders();
  const res = await fetch(`/api/scan/history?limit=${Math.min(30, Math.max(1, limit))}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Could not load scan history");
  const data = await res.json();
  return Array.isArray(data?.scans) ? data.scans : [];
}

export async function deleteCloudScan(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch("/api/scan/history", {
    method: "DELETE",
    headers,
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Could not delete scan");
}

export async function clearCloudScanHistory(): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch("/api/scan/history", {
    method: "DELETE",
    headers,
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Could not clear scan history");
}
