"use client";

import { useEffect } from "react";
import { getCloudScanHistory } from "@/lib/plantio/scan-cloud";
import { setLastScan } from "@/lib/plantio/storage";

const HISTORY_KEY = "plantio-scan-history";
const SYNCED_KEY = "plantio-cloud-scan-synced-v1";

export function CloudScanSync() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        if (sessionStorage.getItem(SYNCED_KEY) === "1") return;
        const scans = await getCloudScanHistory(5);
        if (cancelled || scans.length === 0) return;

        const raw = localStorage.getItem(HISTORY_KEY);
        const local = raw ? JSON.parse(raw) : [];
        const byId = new Map<string, any>();
        for (const scan of [...scans, ...local]) byId.set(scan.id, scan);
        const merged = Array.from(byId.values())
          .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
          .slice(0, 5);

        localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
        setLastScan(scans[0]);
        sessionStorage.setItem(SYNCED_KEY, "1");
        window.dispatchEvent(new Event("plantio-history-updated"));
      } catch {
        // Local cache remains usable if the cloud is temporarily unavailable.
      }
    }

    sync();
    return () => { cancelled = true; };
  }, []);

  return null;
}
