"use client";
/* localStorage helpers for Plantio (scan results + saved land parcels) */

export interface ScanResult {
  id: string;
  timestamp: number;
  imageDataUrl: string; // compressed thumbnail (small)
  plant_name: string | null;
  is_healthy: boolean;
  disease_name: string | null;
  confidence: number;
  symptoms_summary: string;
}

const SCAN_KEY = "plantio-last-scan";
const HISTORY_KEY = "plantio-scan-history";
const FIELDS_KEY = "plantio-saved-fields";

export interface SavedField {
  id: string;
  name: string;
  coordinates: [number, number][]; // [lat, lng][]
  areaSqm: number;
  createdAt: number;
}

export function getLastScan(): ScanResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SCAN_KEY);
    return raw ? (JSON.parse(raw) as ScanResult) : null;
  } catch {
    return null;
  }
}

export function setLastScan(scan: ScanResult) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SCAN_KEY, JSON.stringify(scan));
    window.dispatchEvent(new Event("plantio-scan-updated"));
  } catch {
    /* storage full — ignore */
  }
}

/* ---- Scan history (full timeline, max 30 entries) ---- */
export function getScanHistory(): ScanResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ScanResult[]) : [];
  } catch {
    return [];
  }
}

export function addScanToHistory(scan: ScanResult) {
  if (typeof window === "undefined") return;
  try {
    const history = getScanHistory();
    history.unshift(scan);
    // cap at 30 entries to avoid localStorage bloat from base64 thumbnails
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
    window.dispatchEvent(new Event("plantio-history-updated"));
  } catch {
    /* storage full — drop oldest and retry once */
    try {
      const history = getScanHistory().slice(0, 10);
      history.unshift(scan);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
      window.dispatchEvent(new Event("plantio-history-updated"));
    } catch {
      /* give up silently */
    }
  }
}

export function deleteScanFromHistory(id: string) {
  if (typeof window === "undefined") return;
  const history = getScanHistory().filter((s) => s.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  window.dispatchEvent(new Event("plantio-history-updated"));
}

export function clearScanHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
  window.dispatchEvent(new Event("plantio-history-updated"));
}

export function clearLastScan() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SCAN_KEY);
  window.dispatchEvent(new Event("plantio-scan-updated"));
}

export function getSavedFields(): SavedField[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FIELDS_KEY);
    return raw ? (JSON.parse(raw) as SavedField[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedField(field: SavedField) {
  if (typeof window === "undefined") return;
  const fields = getSavedFields();
  fields.unshift(field);
  localStorage.setItem(FIELDS_KEY, JSON.stringify(fields.slice(0, 50)));
  window.dispatchEvent(new Event("plantio-fields-updated"));
}

export function deleteSavedField(id: string) {
  if (typeof window === "undefined") return;
  const fields = getSavedFields().filter((f) => f.id !== id);
  localStorage.setItem(FIELDS_KEY, JSON.stringify(fields));
  window.dispatchEvent(new Event("plantio-fields-updated"));
}

export function clearSavedFields() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FIELDS_KEY);
  window.dispatchEvent(new Event("plantio-fields-updated"));
}

/* Rename a saved field in place (used by /measure saved-chip edit). */
export function renameSavedField(id: string, newName: string) {
  if (typeof window === "undefined") return;
  const name = newName.trim();
  if (!name) return;
  const fields = getSavedFields().map((f) =>
    f.id === id ? { ...f, name } : f
  );
  localStorage.setItem(FIELDS_KEY, JSON.stringify(fields));
  window.dispatchEvent(new Event("plantio-fields-updated"));
}

/* ---- Offline scan queue ----
 * When the user scans a plant offline, the image is queued here. The home
 * page banner picks it up when the network returns and replays each entry
 * through /api/scan. */

export interface OfflineScanItem {
  id: string;
  imageDataUrl: string;
  queuedAt: number;
}

const QUEUE_KEY = "plantio-offline-queue";

export function getOfflineQueue(): OfflineScanItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineScanItem[]) : [];
  } catch {
    return [];
  }
}

export function addToOfflineQueue(item: OfflineScanItem) {
  if (typeof window === "undefined") return;
  try {
    const q = getOfflineQueue();
    q.push(item);
    // cap at 10 queued scans — each holds a base64 image
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-10)));
    window.dispatchEvent(new Event("plantio-queue-updated"));
  } catch {
    /* storage full — drop oldest and retry once */
    try {
      const q = getOfflineQueue().slice(-5);
      q.push(item);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-10)));
      window.dispatchEvent(new Event("plantio-queue-updated"));
    } catch {
      /* give up silently */
    }
  }
}

export function removeFromOfflineQueue(id: string) {
  if (typeof window === "undefined") return;
  const q = getOfflineQueue().filter((it) => it.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  window.dispatchEvent(new Event("plantio-queue-updated"));
}

export function clearOfflineQueue() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUEUE_KEY);
  window.dispatchEvent(new Event("plantio-queue-updated"));
}

/* ---- Mandi crop favorites (quick-access starred crops) ---- */

const FAV_CROPS_KEY = "plantio-fav-crops";

export function getFavoriteCrops(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAV_CROPS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteCrop(crop: string): string[] {
  if (typeof window === "undefined") return [];
  const trimmed = crop.trim();
  if (!trimmed) return getFavoriteCrops();
  const current = getFavoriteCrops();
  const next = current.includes(trimmed)
    ? current.filter((c) => c !== trimmed)
    : [trimmed, ...current].slice(0, 8); // cap at 8 favorites
  localStorage.setItem(FAV_CROPS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("plantio-favs-updated"));
  return next;
}

export function isFavoriteCrop(crop: string): boolean {
  return getFavoriteCrops().includes(crop);
}

/* ---- Mandi recent searches (quick-access pills above crop selector) ---- */

const RECENT_MANDI_KEY = "plantio-recent-mandi-searches";

export interface RecentMandiSearch {
  crop: string;
  state: string;
  searchedAt: number; // Date.now()
}

export function getRecentMandiSearches(): RecentMandiSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_MANDI_KEY);
    return raw ? (JSON.parse(raw) as RecentMandiSearch[]) : [];
  } catch {
    return [];
  }
}

export function addRecentMandiSearch(crop: string, state: string): void {
  if (typeof window === "undefined") return;
  const trimmed = crop.trim();
  if (!trimmed) return;
  const current = getRecentMandiSearches();
  // Remove duplicate entry for same crop+state
  const filtered = current.filter(
    (s) => !(s.crop === trimmed && s.state === state)
  );
  filtered.unshift({ crop: trimmed, state, searchedAt: Date.now() });
  // Keep last 5
  localStorage.setItem(RECENT_MANDI_KEY, JSON.stringify(filtered.slice(0, 5)));
  window.dispatchEvent(new Event("plantio-recent-mandi-updated"));
}

export function clearRecentMandiSearches(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_MANDI_KEY);
  window.dispatchEvent(new Event("plantio-recent-mandi-updated"));
}

/* ---- Scan history analytics (used by /scan/history stats dashboard) ---- */

export interface ScanStats {
  total: number;
  healthy: number;
  disease: number;
  uncertain: number;
  avgConfidence: number;
  topPlant: string | null;
  topPlantCount: number;
  last7Days: number;
  diseaseRate: number; // 0..1 — share of scans flagged as diseased
}

export function getScanStats(): ScanStats {
  const history = getScanHistory();
  const total = history.length;
  if (total === 0) {
    return {
      total: 0,
      healthy: 0,
      disease: 0,
      uncertain: 0,
      avgConfidence: 0,
      topPlant: null,
      topPlantCount: 0,
      last7Days: 0,
      diseaseRate: 0,
    };
  }
  let healthy = 0;
  let disease = 0;
  let uncertain = 0;
  let confSum = 0;
  let last7 = 0;
  const weekAgo = Date.now() - 7 * 86_400_000;
  const plantCounts: Record<string, number> = {};
  for (const s of history) {
    if (s.is_healthy) healthy += 1;
    else if (s.disease_name) disease += 1;
    else uncertain += 1;
    confSum += s.confidence;
    if (s.timestamp >= weekAgo) last7 += 1;
    if (s.plant_name) {
      plantCounts[s.plant_name] = (plantCounts[s.plant_name] || 0) + 1;
    }
  }
  let topPlant: string | null = null;
  let topPlantCount = 0;
  for (const [p, c] of Object.entries(plantCounts)) {
    if (c > topPlantCount) {
      topPlant = p;
      topPlantCount = c;
    }
  }
  return {
    total,
    healthy,
    disease,
    uncertain,
    avgConfidence: confSum / total,
    topPlant,
    topPlantCount,
    last7Days: last7,
    diseaseRate: disease / total,
  };
}

/* Build a 7-day histogram (counts of scans per day, oldest first) for the
 * stats dashboard mini-chart. */
export function getScanHistogram7d(): { label: string; count: number; date: Date }[] {
  const history = getScanHistory();
  const days: { label: string; count: number; date: Date }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const next = new Date(d.getTime() + 86_400_000);
    const count = history.filter(
      (s) => s.timestamp >= d.getTime() && s.timestamp < next.getTime()
    ).length;
    days.push({ label: dayLabels[d.getDay()], count, date: d });
  }
  return days;
}

/* Compress an image File to a JPEG data URL (longest edge <= maxEdge). */
export function compressImage(file: File, maxEdge = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxEdge) {
          height = Math.round((height * maxEdge) / width);
          width = maxEdge;
        } else if (height > maxEdge) {
          width = Math.round((width * maxEdge) / height);
          height = maxEdge;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/* Make a small thumbnail data URL for storage (max 240px). */
export function makeThumbnail(dataUrl: string, maxEdge = 240): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxEdge) {
        height = Math.round((height * maxEdge) / width);
        width = maxEdge;
      } else if (height > maxEdge) {
        width = Math.round((width * maxEdge) / height);
        height = maxEdge;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/* Build a shareable "result card" image (PNG blob) for a scan result.
 * Renders the leaf photo + diagnosis overlay in the Plantio sticker style. */
export async function buildShareCard(scan: ScanResult): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // cream background
  ctx.fillStyle = "#F6F3EA";
  ctx.fillRect(0, 0, W, H);

  // top forest band
  ctx.fillStyle = "#1F4D36";
  ctx.fillRect(0, 0, W, 150);

  // "PLANTIO" wordmark
  ctx.fillStyle = "#8FD14F";
  ctx.font = "bold 64px 'Bakbak One', sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("PLANTIO", 60, 75);

  // leaf photo (white card with black border + shadow)
  const PAD = 60;
  const photoW = W - PAD * 2;
  const photoH = 620;
  const photoX = PAD;
  const photoY = 200;
  // hard shadow
  ctx.fillStyle = "#161611";
  ctx.fillRect(photoX + 8, photoY + 8, photoW, photoH);
  // white card
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(photoX, photoY, photoW, photoH);
  // draw image (cover)
  try {
    const img = await loadImage(scan.imageDataUrl);
    const ir = img.width / img.height;
    const cr = photoW / photoH;
    let dw = photoW, dh = photoH, dx = photoX, dy = photoY;
    if (ir > cr) {
      dw = photoH * ir;
      dx = photoX - (dw - photoW) / 2;
    } else {
      dh = photoW / ir;
      dy = photoY - (dh - photoH) / 2;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoW, photoH);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  } catch {
    /* skip image */
  }
  // black border around photo card
  ctx.strokeStyle = "#161611";
  ctx.lineWidth = 6;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  // diagnosis card (gold or warn)
  const diagY = photoY + photoH + 40;
  const diagH = 260;
  ctx.fillStyle = "#161611";
  ctx.fillRect(PAD + 8, diagY + 8, photoW, diagH);
  ctx.fillStyle = scan.is_healthy ? "#8FD14F" : "#E85D3D";
  ctx.fillRect(PAD, diagY, photoW, diagH);
  ctx.strokeStyle = "#161611";
  ctx.lineWidth = 6;
  ctx.strokeRect(PAD, diagY, photoW, diagH);

  ctx.fillStyle = "#161611";
  ctx.font = "bold 40px 'Bakbak One', sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(scan.is_healthy ? "HEALTHY PLANT" : "DISEASE DETECTED", PAD + 30, diagY + 30);

  ctx.fillStyle = scan.is_healthy ? "#1F4D36" : "#FFFFFF";
  ctx.font = "bold 56px 'Bakbak One', sans-serif";
  const diagText = scan.is_healthy
    ? (scan.plant_name || "Looking good")
    : (scan.disease_name || "Disease found");
  ctx.fillText(truncate(ctx, diagText, photoW - 60), PAD + 30, diagY + 85);

  ctx.font = "32px 'Poppins', sans-serif";
  ctx.fillStyle = scan.is_healthy ? "rgba(22,22,17,0.75)" : "rgba(255,255,255,0.95)";
  const conf = `${Math.round(scan.confidence * 100)}% confident`;
  const plant = scan.plant_name ? `  ·  ${scan.plant_name}` : "";
  ctx.fillText(truncate(ctx, conf + plant, photoW - 60), PAD + 30, diagY + 165);

  // footer
  ctx.fillStyle = "#1F4D36";
  ctx.font = "bold 28px 'Bakbak One', sans-serif";
  ctx.fillText("Made for growers, by growers.", PAD, H - 70);

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png", 0.9);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

/* ---- Feedback & Help ----
 * Stores user-submitted feedback (bug reports, feature requests, questions,
 * appreciation) locally on the device. Plantio has no backend database, so
 * these stay in localStorage. Capped at 20 entries to avoid bloat. */

export interface FeedbackEntry {
  id: string;
  type: "bug" | "feature" | "question" | "appreciation";
  subject: string;
  message: string;
  email?: string;
  createdAt: number;
}

const FEEDBACK_KEY = "plantio-feedback";

export function getFeedback(): FeedbackEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? (JSON.parse(raw) as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

export function addFeedback(entry: Omit<FeedbackEntry, "id" | "createdAt">): void {
  if (typeof window === "undefined") return;
  try {
    const current = getFeedback();
    const next: FeedbackEntry = {
      ...entry,
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    // newest first, cap at 20 entries
    current.unshift(next);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(current.slice(0, 20)));
    window.dispatchEvent(new Event("plantio-feedback-updated"));
  } catch {
    /* storage full — drop oldest and retry once */
    try {
      const trimmed = getFeedback().slice(0, 10);
      const next: FeedbackEntry = {
        ...entry,
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
      };
      trimmed.unshift(next);
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(trimmed.slice(0, 20)));
      window.dispatchEvent(new Event("plantio-feedback-updated"));
    } catch {
      /* give up silently */
    }
  }
}

export function clearFeedback(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FEEDBACK_KEY);
  window.dispatchEvent(new Event("plantio-feedback-updated"));
}

/* ---- Crop rotation history (last 5 crops the farmer planted/selected) ----
 * Stored on the device only (Plantio has no backend). Used by /rotation to
 * show a quick log of past crops so the farmer can plan the next season. */

export interface RotationEntry {
  id: string;
  crop: string;
  createdAt: number; // Date.now()
}

const ROTATION_KEY = "plantio-rotation-history";
const ROTATION_EVENT = "plantio-rotation-updated";
const ROTATION_CAP = 5;

export function getRotationHistory(): RotationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ROTATION_KEY);
    return raw ? (JSON.parse(raw) as RotationEntry[]) : [];
  } catch {
    return [];
  }
}

export function addRotationEntry(crop: string): void {
  if (typeof window === "undefined") return;
  const trimmed = crop.trim();
  if (!trimmed) return;
  const current = getRotationHistory();
  // Drop any earlier entry with the same crop so the list reflects unique
  // recent selections (avoids the same crop filling all 5 slots).
  const filtered = current.filter((e) => e.crop !== trimmed);
  filtered.unshift({
    id: `rot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    crop: trimmed,
    createdAt: Date.now(),
  });
  try {
    localStorage.setItem(
      ROTATION_KEY,
      JSON.stringify(filtered.slice(0, ROTATION_CAP))
    );
    window.dispatchEvent(new Event(ROTATION_EVENT));
  } catch {
    /* storage full — drop oldest and retry once */
    try {
      localStorage.setItem(
        ROTATION_KEY,
        JSON.stringify(filtered.slice(0, ROTATION_CAP - 1))
      );
      window.dispatchEvent(new Event(ROTATION_EVENT));
    } catch {
      /* give up silently */
    }
  }
}

export function clearRotationHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ROTATION_KEY);
  window.dispatchEvent(new Event(ROTATION_EVENT));
}

/* ---- Field Journal ----
 * Stores daily farm activity entries (planting, watering, fertilizing,
 * spraying, harvesting, observation) with optional photo thumbnails.
 * Capped at 100 entries to avoid localStorage bloat from base64 photos. */

export interface JournalEntry {
  id: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  activityType: string;
  notes: string;
  photoUrl?: string; // base64 thumbnail
}

const JOURNAL_KEY = "plantio-journal";
const JOURNAL_EVENT = "plantio-journal-updated";
const JOURNAL_CAP = 100;

export function getJournalEntries(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

export function addJournalEntry(entry: JournalEntry): void {
  if (typeof window === "undefined") return;
  try {
    const current = getJournalEntries();
    current.unshift(entry);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(current.slice(0, JOURNAL_CAP)));
    window.dispatchEvent(new Event(JOURNAL_EVENT));
  } catch {
    /* storage full — drop oldest entries with photos and retry */
    try {
      const trimmed = getJournalEntries().slice(0, JOURNAL_CAP / 2);
      trimmed.unshift(entry);
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(trimmed.slice(0, JOURNAL_CAP)));
      window.dispatchEvent(new Event(JOURNAL_EVENT));
    } catch {
      /* give up silently */
    }
  }
}

export function deleteJournalEntry(id: string): void {
  if (typeof window === "undefined") return;
  const entries = getJournalEntries().filter((e) => e.id !== id);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(JOURNAL_EVENT));
}

export function getJournalStats(): { total: number; thisWeek: number; topActivity: string } {
  const entries = getJournalEntries();
  const total = entries.length;
  if (total === 0) return { total: 0, thisWeek: 0, topActivity: "—" };

  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = entries.filter((e) => e.timestamp >= weekAgo).length;

  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.activityType] = (counts[e.activityType] || 0) + 1;
  }
  let topActivity = "—";
  let topCount = 0;
  for (const [act, cnt] of Object.entries(counts)) {
    if (cnt > topCount) {
      topActivity = act;
      topCount = cnt;
    }
  }

  return { total, thisWeek, topActivity };
}

/* ---- Expense Tracker ----
 * Stores farm expense entries and a monthly budget in localStorage.
 * Used by /expenses to log and visualize spending. */

export interface ExpenseEntry {
  id: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  category: string;
  amount: number;
  description: string;
}

const EXPENSES_KEY = "plantio-expenses";
const EXPENSE_BUDGET_KEY = "plantio-expense-budget";
const EXPENSES_EVENT = "plantio-expenses-updated";

export function getExpenseEntries(): ExpenseEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    return raw ? (JSON.parse(raw) as ExpenseEntry[]) : [];
  } catch {
    return [];
  }
}

export function addExpenseEntry(entry: ExpenseEntry): void {
  if (typeof window === "undefined") return;
  try {
    const current = getExpenseEntries();
    current.unshift(entry);
    // cap at 200 entries
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(current.slice(0, 200)));
    window.dispatchEvent(new Event(EXPENSES_EVENT));
  } catch {
    /* storage full — drop oldest and retry once */
    try {
      const trimmed = getExpenseEntries().slice(0, 100);
      trimmed.unshift(entry);
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(trimmed.slice(0, 200)));
      window.dispatchEvent(new Event(EXPENSES_EVENT));
    } catch {
      /* give up silently */
    }
  }
}

export function deleteExpenseEntry(id: string): void {
  if (typeof window === "undefined") return;
  const entries = getExpenseEntries().filter((e) => e.id !== id);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(EXPENSES_EVENT));
}

export function getMonthlyBudget(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(EXPENSE_BUDGET_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export function setMonthlyBudget(amount: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXPENSE_BUDGET_KEY, String(Math.max(0, amount)));
  window.dispatchEvent(new Event(EXPENSES_EVENT));
}

export function getExpenseStats(): { totalThisMonth: number; budget: number; byCategory: Record<string, number> } {
  const entries = getExpenseEntries();
  const budget = getMonthlyBudget();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let totalThisMonth = 0;
  const byCategory: Record<string, number> = {};
  for (const e of entries) {
    if (e.date.startsWith(thisMonth)) {
      totalThisMonth += e.amount;
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    }
  }
  return { totalThisMonth, budget, byCategory };
}

/* ---- Community Tips (Guides page) ----
 * User-submitted farming tips stored locally. Capped at 30 entries. */

export interface CommunityTip {
  id: string;
  text: string;
  createdAt: number;
}

const TIPS_KEY = "plantio-community-tips";
const TIPS_EVENT = "plantio-tips-updated";
const TIPS_CAP = 30;

export function getCommunityTips(): CommunityTip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TIPS_KEY);
    return raw ? (JSON.parse(raw) as CommunityTip[]) : [];
  } catch {
    return [];
  }
}

export function addCommunityTip(tip: CommunityTip): void {
  if (typeof window === "undefined") return;
  try {
    const current = getCommunityTips();
    current.unshift(tip);
    localStorage.setItem(TIPS_KEY, JSON.stringify(current.slice(0, TIPS_CAP)));
    window.dispatchEvent(new Event(TIPS_EVENT));
  } catch {
    /* storage full — drop oldest and retry once */
    try {
      const trimmed = getCommunityTips().slice(0, TIPS_CAP / 2);
      trimmed.unshift(tip);
      localStorage.setItem(TIPS_KEY, JSON.stringify(trimmed.slice(0, TIPS_CAP)));
      window.dispatchEvent(new Event(TIPS_EVENT));
    } catch {
      /* give up silently */
    }
  }
}

export function deleteCommunityTip(id: string): void {
  if (typeof window === "undefined") return;
  const tips = getCommunityTips().filter((t) => t.id !== id);
  localStorage.setItem(TIPS_KEY, JSON.stringify(tips));
  window.dispatchEvent(new Event(TIPS_EVENT));
}

/* ---- Reminders (Notifications page) ----
 * User-created reminders with category, recurrence, and done state.
 * Used by /notifications to manage active reminders. Capped at 50 entries. */

export interface Reminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  category: "spray" | "irrigate" | "harvest" | "scan" | "other";
  recurrence: "once" | "daily" | "weekly";
  done: boolean;
  createdAt: number;
}

const REMINDERS_KEY = "plantio-reminders";
const REMINDERS_EVENT = "plantio-reminders-updated";
const REMINDERS_CAP = 50;

export function getReminders(): Reminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    return raw ? (JSON.parse(raw) as Reminder[]) : [];
  } catch {
    return [];
  }
}

export function addReminder(reminder: Omit<Reminder, "id" | "createdAt">): void {
  if (typeof window === "undefined") return;
  try {
    const current = getReminders();
    const next: Reminder = {
      ...reminder,
      id: `rm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    current.unshift(next);
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(current.slice(0, REMINDERS_CAP)));
    window.dispatchEvent(new Event(REMINDERS_EVENT));
  } catch {
    /* storage full — drop oldest and retry once */
    try {
      const trimmed = getReminders().slice(0, REMINDERS_CAP / 2);
      const next: Reminder = {
        ...reminder,
        id: `rm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
      };
      trimmed.unshift(next);
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(trimmed.slice(0, REMINDERS_CAP)));
      window.dispatchEvent(new Event(REMINDERS_EVENT));
    } catch {
      /* give up silently */
    }
  }
}

export function updateReminder(id: string, updates: Partial<Omit<Reminder, "id" | "createdAt">>): void {
  if (typeof window === "undefined") return;
  const current = getReminders().map((r) =>
    r.id === id ? { ...r, ...updates } : r
  );
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event(REMINDERS_EVENT));
}

export function deleteReminder(id: string): void {
  if (typeof window === "undefined") return;
  const current = getReminders().filter((r) => r.id !== id);
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event(REMINDERS_EVENT));
}

export function toggleReminderDone(id: string): void {
  if (typeof window === "undefined") return;
  const current = getReminders().map((r) =>
    r.id === id ? { ...r, done: !r.done } : r
  );
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event(REMINDERS_EVENT));
}
