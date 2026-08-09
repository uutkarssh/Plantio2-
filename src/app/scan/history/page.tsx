"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  History,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Leaf,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Share2,
  ScanLine,
  GitCompareArrows,
  Check,
  X,
  Search,
  BarChart3,
  TrendingUp,
  Award,
  Activity,
  ChevronRight,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import {
  getScanHistory,
  deleteScanFromHistory,
  clearScanHistory,
  setLastScan,
  buildShareCard,
  getScanStats,
  getScanHistogram7d,
  type ScanResult,
  type ScanStats,
} from "@/lib/plantio/storage";
import { useI18n } from "@/lib/plantio/i18n";

type Filter = "all" | "healthy" | "issues";
type Sort = "newest" | "oldest" | "confidence";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function ScanHistoryPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [history, setHistory] = useState<ScanResult[] | null>(null);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [histogram, setHistogram] = useState<{ label: string; count: number; date: Date }[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search + filter + sort
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  useEffect(() => {
    const load = () => {
      setHistory(getScanHistory());
      setStats(getScanStats());
      setHistogram(getScanHistogram7d());
    };
    load();
    window.addEventListener("plantio-history-updated", load);
    window.addEventListener("plantio-scan-updated", load);
    return () => {
      window.removeEventListener("plantio-history-updated", load);
      window.removeEventListener("plantio-scan-updated", load);
    };
  }, []);

  const handleDelete = (id: string) => {
    deleteScanFromHistory(id);
  };

  const handleClearAll = () => {
    if (history && history.length > 0) {
      clearScanHistory();
    }
  };

  const handleView = (scan: ScanResult) => {
    setLastScan(scan);
    router.push("/scan/cure");
  };

  const handleShare = async (scan: ScanResult) => {
    try {
      const blob = await buildShareCard(scan);
      const text = scan.is_healthy
        ? `Plantio scan: healthy ${scan.plant_name || "plant"} (${Math.round(scan.confidence * 100)}% confident)`
        : `Plantio scan: ${scan.disease_name || "disease"} on ${scan.plant_name || "plant"} (${Math.round(scan.confidence * 100)}% confident)`;
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "plantio-scan.png", { type: "image/png" })] })) {
        await navigator.share({ title: "Plantio scan", text, files: [new File([blob], "plantio-scan.png", { type: "image/png" })] });
      } else if (navigator.share) {
        await navigator.share({ title: "Plantio scan", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* cancelled */
    }
  };

  const toggleCompareSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedIds(new Set());
  };

  const resetFilters = () => {
    setQuery("");
    setFilter("all");
    setSort("newest");
  };

  // Derived: filtered + sorted list
  const filtered = useMemo(() => {
    if (!history) return [];
    const q = query.trim().toLowerCase();
    let list = history.filter((s) => {
      if (filter === "healthy" && !s.is_healthy) return false;
      if (filter === "issues" && s.is_healthy) return false;
      if (!q) return true;
      const plant = (s.plant_name || "").toLowerCase();
      const disease = (s.disease_name || "").toLowerCase();
      return plant.includes(q) || disease.includes(q);
    });
    list = list.slice().sort((a, b) => {
      if (sort === "newest") return b.timestamp - a.timestamp;
      if (sort === "oldest") return a.timestamp - b.timestamp;
      return b.confidence - a.confidence;
    });
    return list;
  }, [history, query, filter, sort]);

  const selectedScans = history?.filter((s) => selectedIds.has(s.id)) ?? [];

  const count = history?.length ?? 0;
  const healthyCount = stats?.healthy ?? 0;
  const diseaseCount = stats?.disease ?? 0;

  const maxBar = Math.max(1, ...histogram.map((h) => h.count));

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <SectionHeader
        title={t("nav.history")}
        subtitle={t("home.scanQueuedDesc").split(".")[0] + " — saved on this device."}
        bg="forest"
        icon={History}
        iconTint="bg-leaf"
      />

      <section className="px-5 py-6">
        <div className="mx-auto max-w-2xl">
          {/* Back link */}
          <button
            onClick={() => router.push("/scan")}
            className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase mb-4 bg-cream border-[2.5px] border-ink rounded-full px-3 py-1.5 shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("detail.newScan")}
          </button>

          {history === null ? (
            <div className="space-y-3">
              <div className="skeleton-plantio h-24" />
              <div className="skeleton-plantio h-24" />
              <div className="skeleton-plantio h-24" />
            </div>
          ) : count === 0 ? (
            <StickerCard className="bg-cream text-center plantio-pop-in">
              {/* Decorative floating dots */}
              <div className="relative h-12 mb-2">
                <Leaf className="absolute left-1/4 w-6 h-6 text-leaf plantio-float" strokeWidth={2.5} />
                <Leaf className="absolute left-1/2 -translate-x-1/2 w-8 h-8 text-midgreen plantio-float-2" strokeWidth={2.5} />
                <Leaf className="absolute right-1/4 w-6 h-6 text-forest plantio-float-3" strokeWidth={2.5} />
              </div>
              <div className="mx-auto w-16 h-16 rounded-2xl bg-leaf border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0px_0px_#161611]">
                <History className="w-8 h-8 text-ink" strokeWidth={2.5} />
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold uppercase">No scans yet</h2>
              <p className="mt-2 text-sm text-ink/70">
                Scan your first plant and it will appear here as a history entry you can revisit anytime.
              </p>
              <div className="mt-5">
                <StickerButton variant="forest" size="md" onClick={() => router.push("/scan")}>
                  <ScanLine className="w-4 h-4" strokeWidth={2.5} /> {t("home.scanAPlant")}
                </StickerButton>
              </div>
            </StickerCard>
          ) : (
            <>
              {/* STATS DASHBOARD */}
              {stats && (
                <StickerCard className="bg-white mb-5 plantio-pop-in">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="shrink-0 w-9 h-9 rounded-xl bg-forest border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611]">
                      <BarChart3 className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </span>
                    <p className="font-display text-sm font-bold uppercase">{t("history.statsTitle")}</p>
                  </div>

                  {/* 7-day histogram */}
                  <p className="font-display text-[10px] font-bold uppercase text-ink/60 mb-1.5">{t("history.last7Days")}</p>
                  <div className="flex items-end justify-between gap-1.5 h-20 mb-3 px-1">
                    {histogram.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="font-display text-[9px] font-bold text-ink/70 mb-0.5">{d.count || ""}</span>
                        <div
                          className="plantio-bar w-full rounded-t-md border-[2px] border-ink border-b-0"
                          style={{
                            height: `${(d.count / maxBar) * 60 + 4}px`,
                            background: d.count > 0 ? "#8FD14F" : "#ECE7D6",
                          }}
                        />
                        <span className="font-display text-[9px] font-bold uppercase text-ink/55 mt-1">{d.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* 4 stat tiles */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <StatTile icon={Activity} label={t("history.last7Days")} value={`${stats.last7Days}`} tint="bg-leaf text-ink" />
                    <StatTile icon={TrendingUp} label={t("history.avgConfidence")} value={`${Math.round(stats.avgConfidence * 100)}%`} tint="bg-gold text-ink" />
                    <StatTile icon={Award} label={t("history.mostScannedPlant")} value={stats.topPlant || "—"} tint="bg-forest text-white" small />
                    <StatTile icon={AlertTriangle} label={t("history.diseaseRate")} value={`${Math.round(stats.diseaseRate * 100)}%`} tint="bg-warn text-white" />
                  </div>
                </StickerCard>
              )}

              {/* stats strip — keep the simple Total/Healthy/Issues chips */}
              <div className="grid grid-cols-3 gap-3 mb-4 plantio-pop-in">
                <StatCard label="Total" value={count} tint="bg-forest text-white" />
                <StatCard label="Healthy" value={healthyCount} tint="bg-leaf text-ink" />
                <StatCard label="Issues" value={diseaseCount} tint="bg-warn text-white" />
              </div>

              {/* SEARCH + FILTER + SORT row */}
              <div className="mb-4 space-y-3">
                {/* search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50" strokeWidth={2.5} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("history.searchPlaceholder")}
                    className="w-full pl-9 pr-9 py-2.5 rounded-full border-[2.5px] border-ink bg-white font-poppins text-sm shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-forest"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-cream border-[2px] border-ink flex items-center justify-center"
                    >
                      <X className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
                {/* filter pills + sort dropdown */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button className="tab-pill" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                      {t("history.filterAll")}
                    </button>
                    <button className="tab-pill" aria-pressed={filter === "healthy"} onClick={() => setFilter("healthy")}>
                      {t("history.filterHealthy")}
                    </button>
                    <button className="tab-pill" aria-pressed={filter === "issues"} onClick={() => setFilter("issues")}>
                      {t("history.filterIssues")}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="font-display text-[10px] font-bold uppercase text-ink/55">{t("history.sortBy")}</label>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as Sort)}
                      className="font-display text-[11px] font-bold uppercase rounded-full border-[2.5px] border-ink bg-white px-2.5 py-1 shadow-[2px_2px_0px_0px_#161611] focus:outline-none"
                    >
                      <option value="newest">{t("history.sortNewest")}</option>
                      <option value="oldest">{t("history.sortOldest")}</option>
                      <option value="confidence">{t("history.sortConfidence")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* action bar: compare + clear all */}
              <div className="flex items-center justify-between gap-2 mb-3">
                {count >= 2 && !compareMode ? (
                  <button
                    onClick={() => setCompareMode(true)}
                    className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase text-forest bg-white border-[2.5px] border-ink rounded-full px-3 py-1.5 shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5"
                  >
                    <GitCompareArrows className="w-3.5 h-3.5" strokeWidth={2.5} /> Compare
                  </button>
                ) : compareMode ? (
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold uppercase text-ink/70">
                      {selectedIds.size}/2 selected
                    </span>
                    {selectedIds.size === 2 && (
                      <StickerButton variant="leaf" size="sm">
                        <GitCompareArrows className="w-3.5 h-3.5" strokeWidth={2.5} /> Compare
                      </StickerButton>
                    )}
                    <button
                      onClick={exitCompareMode}
                      className="inline-flex items-center gap-1 font-display text-xs font-bold uppercase text-warn"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} /> Cancel
                    </button>
                  </div>
                ) : <div />}
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase text-warn bg-white border-[2.5px] border-ink rounded-full px-3 py-1.5 shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} /> Clear All
                </button>
              </div>

              {/* results count + reset */}
              {(query || filter !== "all" || sort !== "newest") && (
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-display text-[11px] font-bold uppercase text-ink/60">
                    {filtered.length === 1 ? t("history.singleResult") : t("history.resultsCount").replace("{n}", String(filtered.length))}
                  </span>
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase text-forest"
                  >
                    <X className="w-3 h-3" strokeWidth={2.5} /> {t("history.resetFilters")}
                  </button>
                </div>
              )}

              {/* Compare view — side by side */}
              {compareMode && selectedIds.size === 2 && selectedScans.length === 2 && (
                <StickerCard className="bg-cream mb-5 plantio-pop-in">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="shrink-0 w-10 h-10 rounded-2xl bg-forest border-[2.5px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                      <GitCompareArrows className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </span>
                    <p className="font-display text-base font-bold uppercase">Scan Comparison</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedScans.map((scan, i) => (
                      <div key={scan.id} className={`rounded-2xl border-[3px] border-ink p-3 shadow-[3px_3px_0px_0px_#161611] ${i === 0 ? "bg-white" : "bg-gold/20"}`}>
                        {scan.imageDataUrl ? (
                          <img src={scan.imageDataUrl} alt={`Scan ${i+1}`} className="w-full h-24 rounded-xl border-[2.5px] border-ink object-cover" />
                        ) : (
                          <div className="w-full h-24 rounded-xl border-[2.5px] border-ink bg-cream flex items-center justify-center">
                            <Leaf className="w-8 h-8 text-forest" strokeWidth={2.5} />
                          </div>
                        )}
                        <p className="mt-2 font-display text-sm font-bold uppercase leading-tight truncate">
                          {scan.is_healthy ? "Healthy" : scan.disease_name || "Uncertain"}
                        </p>
                        <p className="text-xs text-ink/70 truncate">{scan.plant_name || "Unknown"}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <StickerBadge variant={scan.is_healthy ? "leaf" : "warn"}>
                            {Math.round(scan.confidence * 100)}%
                          </StickerBadge>
                          <span className="text-[10px] text-ink/55">{timeAgo(scan.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-2xl border-[2.5px] border-ink bg-white p-3">
                    <ComparisonVerdict a={selectedScans[0]} b={selectedScans[1]} />
                  </div>
                </StickerCard>
              )}

              {/* Empty filtered state */}
              {filtered.length === 0 ? (
                <StickerCard className="bg-cream text-center">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-gold border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611]">
                    <Search className="w-5 h-5 text-ink" strokeWidth={2.5} />
                  </div>
                  <h3 className="mt-3 font-display text-base font-bold uppercase">{t("history.noResults")}</h3>
                  <button
                    onClick={resetFilters}
                    className="mt-3 inline-flex items-center gap-1 font-display text-xs font-bold uppercase text-forest"
                  >
                    {t("history.resetFilters")} <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </StickerCard>
              ) : (
                /* history list */
                <div className="space-y-4">
                  {filtered.map((scan, i) => (
                    <div key={scan.id} className="plantio-list-item" style={{ ["--i" as string]: Math.min(i, 6) }}>
                      <HistoryRow
                        scan={scan}
                        compareMode={compareMode}
                        isSelected={selectedIds.has(scan.id)}
                        onToggleSelect={() => toggleCompareSelect(scan.id)}
                        onView={() => handleView(scan)}
                        onDetail={() => router.push(`/scan/${scan.id}`)}
                        onDelete={() => handleDelete(scan.id)}
                        onShare={() => handleShare(scan)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-6 text-center text-xs text-ink/50 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                History is stored only on this device. Clearing browser data will remove it.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function ComparisonVerdict({ a, b }: { a: ScanResult; b: ScanResult }) {
  const sameDisease = !a.is_healthy && !b.is_healthy && a.disease_name === b.disease_name;
  const samePlant = a.plant_name === b.plant_name;
  const bothHealthy = a.is_healthy && b.is_healthy;
  const confDiff = Math.abs(Math.round(a.confidence * 100) - Math.round(b.confidence * 100));

  return (
    <div className="flex items-start gap-3">
      {bothHealthy ? (
        <>
          <CheckCircle2 className="w-5 h-5 text-forest shrink-0 mt-0.5" strokeWidth={2.5} />
          <div>
            <p className="font-display text-sm font-bold uppercase text-forest">Both healthy</p>
            <p className="text-xs text-ink/70">Both scans show healthy plants{confDiff > 5 ? `, but confidence differs by ${confDiff}%` : " with similar confidence"}.</p>
          </div>
        </>
      ) : sameDisease ? (
        <>
          <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" strokeWidth={2.5} />
          <div>
            <p className="font-display text-sm font-bold uppercase text-warn">Same disease</p>
            <p className="text-xs text-ink/70">Both show <span className="font-bold">{a.disease_name}</span>{samePlant ? ` on ${a.plant_name}` : ""}{confDiff > 5 ? `. Confidence gap: ${confDiff}%` : "."}</p>
          </div>
        </>
      ) : (
        <>
          <GitCompareArrows className="w-5 h-5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
          <div>
            <p className="font-display text-sm font-bold uppercase">Different results</p>
            <p className="text-xs text-ink/70">
              {a.is_healthy ? "Scan 1 is healthy" : `Scan 1: ${a.disease_name}`}
              {" vs "}
              {b.is_healthy ? "Scan 2 is healthy" : `Scan 2: ${b.disease_name || "unknown"}`}.
              {samePlant ? " Same plant type." : " Different plants."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tint, small }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: string; tint: string; small?: boolean }) {
  return (
    <div className={`rounded-2xl border-[2.5px] border-ink p-2.5 shadow-[2px_2px_0px_0px_#161611] ${tint}`}>
      <Icon className="w-3.5 h-3.5 opacity-80" strokeWidth={2.5} />
      <p className={`mt-1 font-display font-bold leading-none ${small ? "text-sm truncate" : "text-lg"}`} title={value}>{value}</p>
      <p className="font-display text-[9px] font-bold uppercase opacity-75 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function StatCard({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className={`sticker-card p-3 text-center ${tint}`}>
      <p className="font-display text-2xl font-bold leading-none">{value}</p>
      <p className="font-display text-[10px] font-bold uppercase opacity-80 mt-1">{label}</p>
    </div>
  );
}

function HistoryRow({
  scan,
  compareMode,
  isSelected,
  onToggleSelect,
  onView,
  onDetail,
  onDelete,
  onShare,
}: {
  scan: ScanResult;
  compareMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onDetail: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  return (
    <StickerCard className="bg-white p-0 overflow-hidden">
      <div className="flex">
        {/* thumbnail — click opens detail */}
        <button
          onClick={onDetail}
          className="shrink-0 w-24 sm:w-28 bg-cream border-r-[3px] border-ink relative block"
          aria-label="Open scan detail"
        >
          {scan.imageDataUrl ? (
            <img src={scan.imageDataUrl} alt="Scan" className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Leaf className="w-8 h-8 text-forest" strokeWidth={2.5} />
            </div>
          )}
          <span
            className={`absolute top-2 left-2 w-4 h-4 rounded-full border-[2px] border-ink ${
              scan.is_healthy ? "bg-leaf" : scan.disease_name ? "bg-warn" : "bg-gold"
            }`}
          />
          {compareMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
              className={`absolute top-2 right-2 w-6 h-6 rounded-lg border-[2.5px] border-ink flex items-center justify-center transition-all ${
                isSelected ? "bg-leaf text-ink" : "bg-white text-transparent"
              }`}
            >
              <Check className="w-4 h-4" strokeWidth={3} />
            </button>
          )}
        </button>
        {/* content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-base font-bold uppercase leading-tight truncate">
                {scan.is_healthy
                  ? "Healthy"
                  : scan.disease_name || "Uncertain"}
              </p>
              <p className="text-xs text-ink/70 truncate">
                {scan.plant_name || "Unknown plant"}
              </p>
            </div>
            <StickerBadge variant={scan.is_healthy ? "leaf" : scan.disease_name ? "warn" : "gold"}>
              {Math.round(scan.confidence * 100)}%
            </StickerBadge>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink/55">
            <Clock className="w-3 h-3" strokeWidth={2.5} /> {timeAgo(scan.timestamp)}
          </p>
          {!compareMode && (
            <div className="mt-3 flex items-center gap-2">
              {!scan.is_healthy && scan.disease_name ? (
                <StickerButton variant="gold" size="sm" onClick={onView} className="flex-1">
                  View Cure <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </StickerButton>
              ) : (
                <StickerButton variant="forest" size="sm" onClick={onDetail} className="flex-1">
                  View <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </StickerButton>
              )}
              <button
                onClick={onShare}
                aria-label="Share"
                className="shrink-0 w-10 h-10 rounded-xl bg-cream border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all"
              >
                <Share2 className="w-4 h-4 text-ink" strokeWidth={2.5} />
              </button>
              <button
                onClick={onDelete}
                aria-label="Delete"
                className="shrink-0 w-10 h-10 rounded-xl bg-warn border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all"
              >
                <Trash2 className="w-4 h-4 text-white" strokeWidth={2.5} />
              </button>
            </div>
          )}
          {compareMode && (
            <button
              onClick={onToggleSelect}
              className={`mt-3 inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase rounded-full px-3 py-1.5 border-[2.5px] border-ink transition-all ${
                isSelected
                  ? "bg-leaf text-ink shadow-[2px_2px_0px_0px_#161611]"
                  : "bg-cream text-ink/70 shadow-[2px_2px_0px_0px_#161611]"
              }`}
            >
              {isSelected ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : null}
              {isSelected ? "Selected" : "Select to compare"}
            </button>
          )}
        </div>
      </div>
    </StickerCard>
  );
}
