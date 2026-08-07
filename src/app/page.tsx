"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScanLine,
  MapPinned,
  Beef,
  IndianRupee,
  CalendarDays,
  ArrowRight,
  Leaf,
  Sparkles,
  ChevronRight,
  History,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  X,
  ChevronLeft,
  Cloud,
  Sun,
  CloudRain,
  Droplets,
  Wind,
  Droplet,
  Layers,
  Bug,
  Wheat,
  Sprout,
  CloudRain as CloudRainIcon,
  Snowflake,
  Shield,
  Cherry,
  FlaskConical,
  CloudLightning,
  NotebookPen,
  Wallet,
  Lightbulb,
  TreePine,
  Flower2,
  Grape,
  ScanSearch,
  BarChart3,
  Languages,
  BookOpen,
  Repeat,
  MessageSquareHeart,
  Calculator,
  Droplets as DropletIcon,
  Sprout as SproutIcon,
  RotateCw,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  Timer,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { StickerCard, StickerButton, StickerBadge } from "@/components/plantio/sticker";
import {
  getLastScan,
  addScanToHistory,
  setLastScan,
  getOfflineQueue,
  removeFromOfflineQueue,
  getScanHistory,
  makeThumbnail,
  getJournalEntries,
  getExpenseEntries,
  getExpenseStats,
  getReminders,
  getSavedFields,
  type ScanResult,
  type OfflineScanItem,
  type JournalEntry,
  type ExpenseEntry,
} from "@/lib/plantio/storage";
import { useI18n } from "@/lib/plantio/i18n";
import { getTipOfDay, getTipForOffset, type AgriTip } from "@/lib/plantio/tips";

const TIP_ICONS: Record<string, LucideIcon> = {
  Droplets,
  Layers,
  Bug,
  Wheat,
  Sprout,
  CloudRain,
  CloudRainIcon,
  Snowflake,
  Shield,
  Cherry,
  FlaskConical,
  CloudLightning,
  NotebookPen,
  Droplet,
  Leaf,
};

const WEATHER_ICON: Record<number, LucideIcon> = {
  0: Sun,
  1: Sun,
  2: Cloud,
  3: Cloud,
  45: Cloud,
  48: Cloud,
  51: CloudRain,
  53: CloudRain,
  55: CloudRain,
  61: CloudRain,
  63: CloudRain,
  65: CloudRain,
  71: Snowflake,
  73: Snowflake,
  75: Snowflake,
  80: CloudRain,
  81: CloudRain,
  82: CloudRain,
  95: CloudLightning,
  96: CloudLightning,
  99: CloudLightning,
};

/* ─── Seasonal data ─── */
type Season = "winter" | "spring" | "kharif" | "autumn";

interface SeasonCrop {
  name: string;
  nameHi: string;
  icon: LucideIcon;
  tip: string;
  tipHi: string;
}

const SEASON_CROPS: Record<Season, SeasonCrop[]> = {
  winter: [
    { name: "Wheat", nameHi: "गेहूँ", icon: Wheat, tip: "Sow by mid-November for best yield", tipHi: "बेहतर उपज के लिए नवंबर मध्य तक बोएँ" },
    { name: "Mustard", nameHi: "सरसों", icon: Flower2, tip: "Needs cool weather, irrigate at flowering", tipHi: "ठंड चाहिए, फूल आने पर सिंचाई करें" },
    { name: "Gram", nameHi: "चना", icon: Sprout, tip: "Sow in Oct–Nov, avoid waterlogging", tipHi: "अक्टू–नवं में बोएँ, जलभराव से बचें" },
    { name: "Pea", nameHi: "मटर", icon: TreePine, tip: "Support vines, pick pods when plump", tipHi: "बेल को सहारा दें, फूले फली तोड़ें" },
  ],
  spring: [
    { name: "Watermelon", nameHi: "तरबूज़", icon: Cherry, tip: "Sow Feb–Mar, needs sandy warm soil", tipHi: "फ़रवरी–मार्च बोएँ, बलुई गर्म मिट्टी" },
    { name: "Cucumber", nameHi: "खीरा", icon: Sprout, tip: "Trellis vines for straighter fruit", tipHi: "सीधे फ़ल के लिए बेल चढ़ाएँ" },
    { name: "Muskmelon", nameHi: "खरबूज़ा", icon: Flower2, tip: "Harvest when skin turns golden", tipHi: "छिलका सुनहला होने पर तोड़ें" },
    { name: "Bitter Gourd", nameHi: "करेला", icon: Leaf, tip: "Sow Feb–Mar, pick while green", tipHi: "फ़रवरी–मार्च बोएँ, हरा ही तोड़ें" },
  ],
  kharif: [
    { name: "Rice", nameHi: "धान", icon: Grape, tip: "Transplant seedlings by mid-July", tipHi: "जुलाई मध्य तक रोपण करें" },
    { name: "Maize", nameHi: "मक्का", icon: Wheat, tip: "Sow with first monsoon rain", tipHi: "पहली बारिश के साथ बोएँ" },
    { name: "Soybean", nameHi: "सोयाबीन", icon: Sprout, tip: "Inoculate seeds, avoid waterlogging", tipHi: "बीज उपचार करें, जलभराव से बचें" },
    { name: "Cotton", nameHi: "कपास", icon: Cherry, tip: "Sow May–Jun, pick bolls when open", tipHi: "मई–जून बोएँ, कपास खुलने पर तोड़ें" },
  ],
  autumn: [
    { name: "Sorghum", nameHi: "ज्वार", icon: Wheat, tip: "Sow by early Oct for rabi prep", tipHi: "रबी की तैयारी के लिए अक्टू शुरू में बोएँ" },
    { name: "Pigeon Pea", nameHi: "अरहर", icon: Sprout, tip: "Long-season crop, harvest Nov–Dec", tipHi: "लंबे मौसम की फ़सल, नवं–दिसं तोड़ें" },
    { name: "Groundnut", nameHi: "मूँगफ़ली", icon: Flower2, tip: "Harvest when leaves yellow", tipHi: "पत्ते पीले होने पर खोदें" },
  ],
};

function getCurrentSeason(): Season {
  const m = new Date().getMonth(); // 0-indexed
  if (m === 11 || m === 0 || m === 1) return "winter";
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 8) return "kharif";
  return "autumn";
}

/* ─── Seasonal alert — returns i18n key if in a critical farming period ─── */
function getSeasonalAlertKey(): string | null {
  const m = new Date().getMonth(); // 0-indexed
  if (m >= 5 && m <= 6) return "home.kharifSowing";   // Jun-Jul
  if (m >= 9 && m <= 10) return "home.rabiSowing";     // Oct-Nov
  if (m >= 2 && m <= 3) return "home.harvestSeason";   // Mar-Apr
  return null;
}

/* ─── Time ago helper ─── */
function timeAgo(ts: number, t: (k: string) => string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t("home.minutesAgo").replace("{n}", String(Math.max(mins, 1)));
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("home.hoursAgo").replace("{n}", String(hrs));
  const days = Math.floor(hrs / 24);
  return t("home.daysAgo").replace("{n}", String(days));
}

/* ─── Wave divider ─── */
function WaveDivider({ color = "#1F4D36" }: { color?: string }) {
  return (
    <div className="w-full overflow-hidden leading-[0]" aria-hidden="true">
      <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="w-full h-6 sm:h-8">
        <path d="M0,20 C300,40 600,0 900,20 C1050,30 1150,10 1200,20 L1200,40 L0,40 Z" fill={color} />
      </svg>
    </div>
  );
}

/* ─── Animated counter hook ─── */
function useAnimatedCounter(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  const [bumping, setBumping] = useState(false);
  const prevRef = useRef(0);

  useEffect(() => {
    if (target === prevRef.current) return;
    prevRef.current = target;
    const start = performance.now();
    const from = 0;
    let rafId: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const newVal = Math.round(from + (target - from) * eased);
      setCount(newVal);
      if (progress < 1) {
        setBumping(true);
        rafId = requestAnimationFrame(tick);
      } else {
        setBumping(false);
      }
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return { count, bumping };
}

export default function HomePage() {
  const [lastScan, setLastScanState] = useState<ScanResult | null>(null);
  const [queue, setQueue] = useState<OfflineScanItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<
    { ok: number; failed: number } | null
  >(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(true);
  const { t, lang } = useI18n();

  // Tip-of-the-day state — cycles via prev/next buttons
  const [tipOffset, setTipOffset] = useState(0);
  const tip: AgriTip = getTipForOffset(tipOffset);
  const TipIcon = TIP_ICONS[tip.icon] || Lightbulb;

  // Weather state
  const [weather, setWeather] = useState<
    | { temp: number; code: number; feels: number; wind: number; humidity: number; loc: string }
    | null
  >(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherFailed, setWeatherFailed] = useState(false);

  // Scan history count for "Plantio in Numbers"
  const [scanCount, setScanCount] = useState(0);
  const { count: animatedScanCount, bumping: scanBumping } = useAnimatedCounter(scanCount);

  // Farm activity stats
  const [farmStats, setFarmStats] = useState({
    scansThisWeek: 0,
    entriesThisWeek: 0,
    expensesThisMonth: 0,
    activeReminders: 0,
    fieldsMeasured: 0,
  });
  // Recent activity items
  const [recentItems, setRecentItems] = useState<
    { type: "scan" | "journal" | "expense"; ts: number; desc: string; href: string }[]
  >([]);

  useEffect(() => {
    const loadScan = () => setLastScanState(getLastScan());
    const loadQueue = () => {
      setQueue(getOfflineQueue());
      if (getOfflineQueue().length === 0) {
        setProcessResult(null);
        setBannerDismissed(false);
      }
    };
    const loadScanCount = () => setScanCount(getScanHistory().length);
    const loadFarmStats = () => {
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const scans = getScanHistory();
      const journals = getJournalEntries();
      const expenseStats = getExpenseStats();
      const reminders = getReminders();
      const fields = getSavedFields();
      setFarmStats({
        scansThisWeek: scans.filter((s) => s.timestamp >= weekAgo).length,
        entriesThisWeek: journals.filter((j) => j.timestamp >= weekAgo).length,
        expensesThisMonth: Math.round(expenseStats.totalThisMonth),
        activeReminders: reminders.filter((r) => !r.done).length,
        fieldsMeasured: fields.length,
      });
      // Build recent activity timeline (max 3)
      const items: { type: "scan" | "journal" | "expense"; ts: number; desc: string; href: string }[] = [];
      if (scans.length > 0) {
        const s = scans[0];
        items.push({ type: "scan", ts: s.timestamp, desc: s.is_healthy ? (s.plant_name || "Plant") : (s.disease_name || "Disease"), href: "/scan/history" });
      }
      if (journals.length > 0) {
        const j = journals[0];
        items.push({ type: "journal", ts: j.timestamp, desc: j.notes || j.activityType, href: "/journal" });
      }
      const expenses = getExpenseEntries();
      if (expenses.length > 0) {
        const e = expenses[0];
        items.push({ type: "expense", ts: e.timestamp, desc: `${e.category}: \u20B9${e.amount}`, href: "/expenses" });
      }
      items.sort((a, b) => b.ts - a.ts);
      setRecentItems(items.slice(0, 3));
    };
    loadScan();
    loadQueue();
    loadScanCount();
    loadFarmStats();
    // Persist "What's New" banner dismissal across sessions
    try {
      if (localStorage.getItem("plantio-whats-new-dismissed-v1") === "1") {
        queueMicrotask(() => setWhatsNewOpen(false));
      }
    } catch { /* localStorage unavailable */ }
    window.addEventListener("plantio-scan-updated", loadScan);
    window.addEventListener("plantio-history-updated", loadScan);
    window.addEventListener("plantio-queue-updated", loadQueue);
    window.addEventListener("plantio-history-updated", loadScanCount);
    window.addEventListener("plantio-history-updated", loadFarmStats);
    window.addEventListener("plantio-journal-updated", loadFarmStats);
    window.addEventListener("plantio-expenses-updated", loadFarmStats);
    window.addEventListener("plantio-reminders-updated", loadFarmStats);
    return () => {
      window.removeEventListener("plantio-scan-updated", loadScan);
      window.removeEventListener("plantio-history-updated", loadScan);
      window.removeEventListener("plantio-queue-updated", loadQueue);
      window.removeEventListener("plantio-history-updated", loadScanCount);
      window.removeEventListener("plantio-history-updated", loadFarmStats);
      window.removeEventListener("plantio-journal-updated", loadFarmStats);
      window.removeEventListener("plantio-expenses-updated", loadFarmStats);
      window.removeEventListener("plantio-reminders-updated", loadFarmStats);
    };
  }, []);

  // Fetch weather once (default location: Nagpur, India — geographic center)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Nagpur: 21.1458 N, 79.0882 E — central India default
        const url = "https://api.open-meteo.com/v1/forecast?latitude=21.1458&longitude=79.0882&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code";
        const controller = new AbortController();
        const tmo = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(tmo);
        if (!res.ok) throw new Error("weather failed");
        const data = await res.json();
        if (cancelled) return;
        const c = data?.current;
        if (!c) throw new Error("no current");
        setWeather({
          temp: Math.round(c.temperature_2m),
          feels: Math.round(c.apparent_temperature),
          wind: Math.round(c.wind_speed_10m),
          humidity: c.relative_humidity_2m,
          code: c.weather_code,
          loc: "Nagpur",
        });
        setWeatherLoading(false);
      } catch {
        if (!cancelled) {
          setWeatherFailed(true);
          setWeatherLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Process queued scans one-by-one when the user taps "Process now" */
  const processQueue = useCallback(async () => {
    const items = getOfflineQueue();
    if (items.length === 0) return;
    setProcessing(true);
    setProcessResult(null);
    let ok = 0;
    let failed = 0;
    for (const item of items) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20_000);
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: item.imageDataUrl }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await res.json();
        const r = data?.result;
        if (!res.ok || !r) throw new Error("scan failed");
        const thumb = await makeThumbnail(item.imageDataUrl, 200);
        const scan: ScanResult = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          imageDataUrl: thumb,
          plant_name: r.plant_name,
          is_healthy: r.is_healthy,
          disease_name: r.disease_name,
          confidence: r.confidence,
          symptoms_summary: r.symptoms_summary,
        };
        setLastScan(scan);
        addScanToHistory(scan);
        removeFromOfflineQueue(item.id);
        ok += 1;
      } catch {
        failed += 1;
        break;
      }
    }
    setProcessing(false);
    setProcessResult({ ok, failed });
  }, []);

  const dismissBanner = useCallback(() => setBannerDismissed(true), []);

  // Tip text by language
  const tipTitle = lang === "hi" ? tip.titleHi : tip.titleEn;
  const tipBody = lang === "hi" ? tip.bodyHi : tip.bodyEn;

  // Weather icon + label by code
  const WxIcon = weather ? (WEATHER_ICON[weather.code] || Cloud) : Cloud;

  // Current season
  const season = getCurrentSeason();
  const seasonCrops = SEASON_CROPS[season];
  const seasonKey: Record<Season, string> = {
    winter: "home.seasonWinter",
    spring: "home.seasonSpring",
    kharif: "home.seasonKharif",
    autumn: "home.seasonAutumn",
  };

  // Parallax scroll state for hero
  const [heroY, setHeroY] = useState(0);
  useEffect(() => {
    const onScroll = () => setHeroY(Math.min(window.scrollY * 0.25, 80));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)] plantio-grain">
      {/* HERO — full-bleed forest green with animated gradient + rich textures */}
      <section className="relative bg-forest text-white border-b-[3px] border-ink overflow-hidden plantio-torn-edge plantio-parallax" style={{ transform: `translateY(${heroY}px)` }}>
        {/* Animated gradient layer */}
        <div className="absolute inset-0 plantio-hero-gradient opacity-30 pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 plantio-crosshatch opacity-70 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 plantio-dots opacity-50 pointer-events-none" aria-hidden />
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-midgreen/40 blur-2xl" aria-hidden />
        <div className="absolute -left-8 top-1/2 opacity-10" aria-hidden>
          <Leaf className="w-40 h-40 text-leaf plantio-leaf-1" strokeWidth={1} />
        </div>
        <div className="absolute right-6 bottom-4 opacity-20" aria-hidden>
          <Leaf className="w-32 h-32 text-leaf plantio-leaf-2" strokeWidth={1.5} />
        </div>
        <div className="relative mx-auto max-w-2xl px-5 pt-16 pb-10">
          <div className="flex items-center gap-2 mb-5">
            <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-xl border-[2.5px] border-ink" />
            <span className="font-display text-lg font-bold uppercase tracking-wide">Plantio</span>
          </div>
          <h1 className="font-display text-[2.5rem] sm:text-5xl font-bold uppercase leading-[1.02] plantio-embossed">
            {t("home.knowYourPlants")}
            <br />
            <span className="text-leaf">{t("home.healThemFast")}</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/90 max-w-md leading-relaxed plantio-text-shimmer">
            {t("home.heroSub")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/scan">
              <StickerButton variant="leaf" size="lg">
                {t("home.scanAPlant")} <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
              </StickerButton>
            </Link>
            <Link href="/scan/history">
              <StickerButton variant="gold" size="lg">
                <History className="w-5 h-5" strokeWidth={2.5} /> {t("nav.history")}
              </StickerButton>
            </Link>
          </div>
          {/* Quick Actions — horizontal scrollable pill row */}
          <div className="mt-5">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-white/70 mb-2">{t("home.quickActions")}</p>
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scroll-plantio">
                <QuickActionChip href="/cattle" icon={Beef} label={t("home.cattle")} delay={0} />
                <QuickActionChip href="/mandi" icon={IndianRupee} label={t("home.mandi")} delay={60} />
                <QuickActionChip href="/calendar" icon={CalendarDays} label={t("home.calendar")} delay={120} />
                <QuickActionChip href="/measure" icon={MapPinned} label={t("home.measure")} delay={180} />
              </div>
              {/* scroll fade hint */}
              <div aria-hidden className="pointer-events-none absolute top-0 right-0 bottom-2 w-6 bg-gradient-to-r from-transparent to-forest/90 rounded-r-lg" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StickerBadge variant="gold">AI Disease Scan</StickerBadge>
            <StickerBadge variant="cream">Land Measure</StickerBadge>
            <StickerBadge variant="leaf">Mandi Prices</StickerBadge>
          </div>
        </div>
      </section>

      {/* Wave divider: hero → tip/weather */}
      <WaveDivider color="#1F4D36" />

      {/* SEASONAL ALERT BANNER — shows during critical farming periods */}
      {(() => {
        const alertKey = getSeasonalAlertKey();
        if (!alertKey) return null;
        return (
          <section className="px-5 pt-5">
            <div className="mx-auto max-w-2xl">
              <StickerCard className="bg-gold/40 plantio-pop-in plantio-gradient-border">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-11 h-11 rounded-2xl bg-leaf border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                    <AlertTriangle className="w-5 h-5 text-ink" strokeWidth={2.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-xs font-bold uppercase text-forest">{t("home.seasonalAlert")}</p>
                      <span className="plantio-status-dot" />
                    </div>
                    <p className="mt-1 text-sm font-medium text-ink leading-snug">
                      {t(alertKey)}
                    </p>
                  </div>
                </div>
              </StickerCard>
            </div>
          </section>
        );
      })()}

      {/* WHATS NEW BANNER — highlights new features (dismissible) */}
      {whatsNewOpen && (
        <section className="px-5 pt-5">
          <div className="mx-auto max-w-2xl">
            <StickerCard className="bg-leaf/60 plantio-pop-in">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-12 h-12 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                  <Sparkles className="w-6 h-6 text-gold" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-bold uppercase leading-tight">
                    What&apos;s new in Plantio
                  </h3>
                  <p className="mt-1 text-xs text-ink/80 leading-snug">
                    Three new tools just landed — explore them below.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/library" className="sticker-pill inline-flex items-center gap-1 px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wide bg-gold text-ink">
                      <BookOpen className="w-3 h-3" strokeWidth={2.5} /> Disease Library
                    </Link>
                    <Link href="/rotation" className="sticker-pill inline-flex items-center gap-1 px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wide bg-white text-ink">
                      <Repeat className="w-3 h-3" strokeWidth={2.5} /> Crop Rotation
                    </Link>
                    <Link href="/feedback" className="sticker-pill inline-flex items-center gap-1 px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wide bg-forest text-white">
                      <MessageSquareHeart className="w-3 h-3" strokeWidth={2.5} /> Feedback
                    </Link>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWhatsNewOpen(false);
                    try { localStorage.setItem("plantio-whats-new-dismissed-v1", "1"); } catch { /* ignore */ }
                  }}
                  aria-label="Dismiss what's new banner"
                  className="shrink-0 w-8 h-8 rounded-full bg-white border-[2.5px] border-ink flex items-center justify-center active:translate-y-0.5 transition-transform"
                >
                  <X className="w-4 h-4 text-ink" strokeWidth={2.5} />
                </button>
              </div>
            </StickerCard>
          </div>
        </section>
      )}

      {/* OFFLINE QUEUE BANNER — shows when there are queued scans and we're online */}
      {queue.length > 0 && !bannerDismissed && (
        <section className="px-5 pt-5">
          <div className="mx-auto max-w-2xl">
            <StickerCard className="bg-gold plantio-pop-in">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-12 h-12 rounded-2xl bg-ink border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                  <CloudUpload className="w-6 h-6 text-gold" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-bold uppercase leading-tight">
                    {queue.length} scan{queue.length > 1 ? "s" : ""} saved offline
                  </h3>
                  <p className="mt-0.5 text-xs text-ink/80 leading-snug">
                    {processResult
                      ? `Processed ${processResult.ok} of ${processResult.ok + processResult.failed + queue.length} scans${
                          processResult.failed ? ` — ${processResult.failed} failed, retry later` : ""
                        }.`
                      : processing
                      ? "Processing your saved scans…"
                      : "Tap below to send them to the plant doctor."}
                  </p>
                  {!processing && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StickerButton
                        variant="forest"
                        size="sm"
                        onClick={processQueue}
                      >
                        <RefreshCw className="w-4 h-4" strokeWidth={2.5} /> Process now
                      </StickerButton>
                      <button
                        type="button"
                        onClick={dismissBanner}
                        className="inline-flex items-center gap-1 font-display text-xs font-bold uppercase text-ink/70 px-3 py-2"
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} /> Dismiss
                      </button>
                    </div>
                  )}
                  {processing && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-ink/80">
                      <span className="w-4 h-4 rounded-full border-[3px] border-ink border-t-transparent animate-spin" />
                      Sending scans…
                    </div>
                  )}
                  {processResult && processResult.ok > 0 && !processing && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-bold text-forest">
                      <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                      Results saved to Scan History.
                    </p>
                  )}
                </div>
              </div>
            </StickerCard>
          </div>
        </section>
      )}

      {/* TIP OF THE DAY + WEATHER — two-up on sm+, stacked on mobile */}
      <section className="px-5 py-8 plantio-section-gap">
        <div className="mx-auto max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Tip of the day */}
          <StickerCard className="bg-cream plantio-pop-in relative" style={{ animationDelay: "0ms" }}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-gold border-[2.5px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <TipIcon className="w-6 h-6 text-ink" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-xs font-bold uppercase text-forest">{t("home.tipOfTheDay")}</p>
                  <span className="tag-chip capitalize plantio-badge-shine">
                    {tip.category}
                  </span>
                </div>
                <h3 className="mt-1 font-display text-base font-bold uppercase leading-tight">
                  {tipTitle}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink/80 relative plantio-quote plantio-tip-fade">
                  {tipBody}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTipOffset((o) => o - 1)}
                  aria-label={t("home.prevTip")}
                  className="w-8 h-8 rounded-lg bg-white border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setTipOffset((o) => o + 1)}
                  aria-label={t("home.nextTip")}
                  className="w-8 h-8 rounded-lg bg-white border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
              <span className="font-display text-[10px] font-bold uppercase text-ink/55">
                {((tipOffset % 16) + 16) % 16 + 1}/16
              </span>
            </div>
          </StickerCard>

          {/* Weather mini-widget */}
          <StickerCard className="bg-white plantio-pop-in plantio-corner-fold plantio-gradient-border" style={{ animationDelay: "80ms" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="plantio-status-dot" />
                <p className="font-display text-xs font-bold uppercase text-forest">{t("home.weatherToday")}</p>
              </div>
              <span className="tag-chip">
                <MapPinned className="w-3 h-3" strokeWidth={2.5} />
                {weather?.loc || "—"}
              </span>
            </div>
            {weatherLoading ? (
              <div className="space-y-2">
                <div className="skeleton-plantio h-12 w-32" />
                <div className="skeleton-plantio h-4 w-48" />
                <div className="skeleton-plantio h-4 w-40" />
              </div>
            ) : weatherFailed ? (
              <div className="flex items-center gap-2 text-sm text-ink/70">
                <Cloud className="w-5 h-5 text-ink/50" strokeWidth={2.5} />
                <span>{t("home.weatherFailed")}</span>
              </div>
            ) : weather ? (
              <>
                <div className="flex items-end gap-3">
                  <WxIcon className="w-12 h-12 text-forest plantio-weather-icon" strokeWidth={2.5} />
                  <div>
                    <p className="font-display text-4xl font-bold leading-none">
                      {weather.temp}°<span className="text-base align-top">C</span>
                    </p>
                    <p className="text-xs text-ink/70 capitalize">
                      {weatherCodeLabel(weather.code, lang)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <WeatherStat icon={Droplets} label={t("home.humidity")} value={`${weather.humidity}%`} />
                  <WeatherStat icon={Wind} label={t("home.wind")} value={`${weather.wind}km/h`} />
                  <WeatherStat icon={Sun} label={t("home.feelsLike")} value={`${weather.feels}°`} />
                </div>
                <Link
                  href="/weather"
                  className="mt-3 inline-flex items-center gap-1 font-display text-xs font-bold uppercase text-forest sticker-interactive"
                >
                  {t("home.viewFullForecast")} <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </Link>
              </>
            ) : null}
          </StickerCard>
        </div>
      </section>

      {/* CREAM SECTION — two big feature cards */}
      <section className="px-5 pb-10 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Link href="/scan" className="block">
              <StickerCard className="h-full bg-leaf flex flex-col group hover:-translate-y-0.5 transition-transform plantio-pop-in sticker-interactive plantio-depth-2 plantio-icon-bounce relative overflow-hidden">
                <span className="plantio-ribbon">AI</span>
                <div className="w-14 h-14 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611] group-hover:shadow-[4px_4px_0px_0px_#161611] transition-shadow">
                  <ScanLine className="w-7 h-7 text-white plantio-icon-target" strokeWidth={2.5} />
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold uppercase">{t("home.diseaseScanner")}</h2>
                <p className="mt-1 text-sm text-ink/80 flex-1 leading-relaxed">
                  {t("home.diseaseScannerDesc")}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 font-display text-sm font-bold uppercase text-forest">
                  {t("home.scanAPlant")} <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </span>
              </StickerCard>
            </Link>
            <Link href="/measure" className="block">
              <StickerCard className="h-full bg-gold flex flex-col group hover:-translate-y-0.5 transition-transform plantio-pop-in sticker-interactive plantio-depth-2 plantio-icon-bounce" style={{ animationDelay: "80ms" }}>
                <div className="w-14 h-14 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611] group-hover:shadow-[4px_4px_0px_0px_#161611] transition-shadow">
                  <MapPinned className="w-7 h-7 text-white plantio-icon-target" strokeWidth={2.5} />
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold uppercase">{t("home.measureLand")}</h2>
                <p className="mt-1 text-sm text-ink/80 flex-1 leading-relaxed">
                  {t("home.measureLandDesc")}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 font-display text-sm font-bold uppercase text-forest">
                  {t("home.measureLand")} <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </span>
              </StickerCard>
            </Link>
          </div>

          {/* Last scan card */}
          {lastScan && (
            <Link href="/scan/cure" className="block mt-5">
              <StickerCard className="bg-white flex items-center gap-4 plantio-pop-in plantio-stamp-card plantio-list-item" style={{ animationDelay: "160ms", "--i": 0 } as React.CSSProperties}>
                {lastScan.imageDataUrl ? (
                  <img
                    src={lastScan.imageDataUrl}
                    alt="Last scan"
                    className="w-20 h-20 rounded-2xl border-[3px] border-ink object-cover shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl border-[3px] border-ink bg-cream flex items-center justify-center shrink-0">
                    <Leaf className="w-8 h-8 text-forest" strokeWidth={2.5} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-xs font-bold uppercase text-forest">{t("home.lastScan")}</p>
                  <p className="font-display text-lg font-bold uppercase truncate">
                    {lastScan.is_healthy
                      ? t("home.healthyPlant")
                      : lastScan.disease_name || t("home.uncertain")}
                  </p>
                  <p className="text-xs text-ink/70 truncate">{lastScan.plant_name || "Unknown plant"}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {lastScan.is_healthy ? (
                    <StickerBadge variant="leaf">Healthy</StickerBadge>
                  ) : (
                    <StickerBadge variant="warn">{Math.round(lastScan.confidence * 100)}%</StickerBadge>
                  )}
                  <span className="inline-flex items-center gap-1 font-display text-xs font-bold uppercase text-forest">
                    {t("home.view")} <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </div>
              </StickerCard>
            </Link>
          )}
        </div>
      </section>

      {/* QUICK CALCULATORS — horizontal scrollable chip buttons */}
      <section className="px-5 pb-6 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-5 h-5 text-forest" strokeWidth={2.5} />
            <h2 className="font-display text-lg font-bold uppercase text-ink">{t("home.quickCalculators")}</h2>
          </div>
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scroll-plantio">
              <QuickCalcChip href="/yield" icon={TrendingUp} label={t("home.yieldCalc")} delay={0} />
              <QuickCalcChip href="/irrigation" icon={DropletIcon} label={t("home.irrigationPlanner")} delay={60} />
              <QuickCalcChip href="/seeds" icon={SproutIcon} label={t("home.seedCalc")} delay={120} />
              <QuickCalcChip href="/rotation" icon={RotateCw} label={t("home.cropRotationChip")} delay={180} />
              <QuickCalcChip href="/expenses" icon={Wallet} label={t("home.expenseTrackerChip")} delay={240} />
            </div>
            <div aria-hidden className="pointer-events-none absolute top-0 right-0 bottom-2 w-6 bg-gradient-to-r from-transparent to-cream/90 rounded-r-lg" />
          </div>
        </div>
      </section>

      {/* FARM ACTIVITY SUMMARY WIDGET */}
      <section className="px-5 pb-8 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-forest" strokeWidth={2.5} />
            <h2 className="font-display text-lg font-bold uppercase text-ink">{t("home.farmActivity")}</h2>
          </div>
          <StickerCard className="bg-cream/60 plantio-pop-in">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <FarmStat icon={ScanSearch} value={farmStats.scansThisWeek} label={t("home.scansThisWeek")} tint="bg-leaf/40" />
              <FarmStat icon={NotebookPen} value={farmStats.entriesThisWeek} label={t("home.entriesThisWeek")} tint="bg-gold/40" />
              <FarmStat icon={Wallet} value={farmStats.expensesThisMonth} label={t("home.expensesThisMonth")} tint="bg-warn/30" prefix="\u20B9" />
              <FarmStat icon={Timer} value={farmStats.activeReminders} label={t("home.activeReminders")} tint="bg-forest/20" />
              <FarmStat icon={LayoutGrid} value={farmStats.fieldsMeasured} label={t("home.fieldsMeasured")} tint="bg-leaf/40" />
            </div>
          </StickerCard>
        </div>
      </section>

      {/* RECENT ACTIVITY TIMELINE */}
      {recentItems.length > 0 && (
        <section className="px-5 pb-8 plantio-section-gap">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-forest" strokeWidth={2.5} />
              <h2 className="font-display text-lg font-bold uppercase text-ink">{t("home.recentActivity")}</h2>
            </div>
            <div className="space-y-2">
              {recentItems.map((item, i) => {
                const ItemIcon = item.type === "scan" ? ScanLine : item.type === "journal" ? NotebookPen : Wallet;
                const itemLabel = item.type === "scan" ? t("home.latestScan") : item.type === "journal" ? t("home.latestEntry") : t("home.latestExpense");
                return (
                  <Link key={item.type} href={item.href} className="block">
                    <div
                      className="sticker-card bg-white p-3 flex items-center gap-3 plantio-pop-in sticker-interactive plantio-list-item"
                      style={{ animationDelay: `${i * 80}ms`, "--i": i } as React.CSSProperties}
                    >
                      <span className="shrink-0 w-9 h-9 rounded-xl bg-forest border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611]">
                        <ItemIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-[11px] font-bold uppercase text-forest">{itemLabel}</p>
                        <p className="text-sm font-medium text-ink truncate">{item.desc}</p>
                      </div>
                      <span className="shrink-0 font-display text-[10px] font-bold uppercase text-ink/60">{timeAgo(item.ts, t)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Wave divider: feature cards → seasonal spotlight */}
      <WaveDivider color="#F6F3EA" />

      {/* SEASONAL SPOTLIGHT — cream/white bg, current season crops */}
      <section className="bg-cream px-5 py-10 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-5 h-5 text-gold" strokeWidth={2.5} />
            <h2 className="font-display text-xl font-bold uppercase text-ink">{t("home.seasonalSpotlight")}</h2>
          </div>
          <p className="font-display text-sm font-bold uppercase text-forest mb-5">
            {t(seasonKey[season])}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {seasonCrops.map((crop, i) => {
              const CropIcon = crop.icon;
              return (
                <div
                  key={crop.name}
                  className="sticker-card bg-white p-4 flex flex-col items-center text-center plantio-pop-in sticker-interactive plantio-depth-1 plantio-icon-bounce plantio-list-item"
                  style={{ animationDelay: `${i * 80}ms`, "--i": i } as React.CSSProperties}
                >
                  <div className="w-11 h-11 rounded-2xl bg-forest border-[2.5px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                    <CropIcon className="w-5 h-5 text-white plantio-icon-target" strokeWidth={2.5} />
                  </div>
                  <p className="mt-2.5 font-display text-sm font-bold uppercase leading-tight">
                    {lang === "hi" ? crop.nameHi : crop.name}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-ink/70">
                    {lang === "hi" ? crop.tipHi : crop.tip}
                  </p>
                  <Link
                    href="/calendar"
                    className="mt-2.5 inline-flex items-center gap-0.5 font-display text-[10px] font-bold uppercase text-forest"
                  >
                    {t("home.viewCalendar")} <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MID GREEN full-bleed strip — more tools */}
      <section className="bg-midgreen border-y-[3px] border-ink px-5 py-10 relative overflow-hidden plantio-section-gap">
        <div className="absolute inset-0 plantio-stripes opacity-80 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 plantio-dots opacity-40 pointer-events-none" aria-hidden />
        <div className="relative mx-auto max-w-2xl">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-6 h-6 text-gold" strokeWidth={2.5} />
            <h2 className="font-display text-2xl font-bold uppercase">{t("home.moreTools")}</h2>
          </div>
          <p className="mt-1 text-sm text-white/90">{t("home.moreToolsSub")}</p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ToolRow href="/journal" icon={NotebookPen} title="Field Journal" desc="Log daily activities & observations" tint="bg-white" index={0} />
            <ToolRow href="/expenses" icon={Wallet} title="Expense Tracker" desc="Track farm spending & stay on budget" tint="bg-gold" index={1} />
            <ToolRow href="/cattle" icon={Beef} title="Cattle Feed Advisor" desc="Daily feed plan for your animals" tint="bg-white" index={2} />
            <ToolRow href="/mandi" icon={IndianRupee} title="Mandi Prices" desc="Latest crop prices near you" tint="bg-white" index={3} />
            <ToolRow href="/calendar" icon={CalendarDays} title="Crop Calendar" desc="Sowing & harvesting windows + weather" tint="bg-white" index={4} />
            <ToolRow href="/library" icon={BookOpen} title="Disease Library" desc="Browse 12 common crop diseases & cures" tint="bg-gold" index={5} />
            <ToolRow href="/rotation" icon={Repeat} title="Crop Rotation Planner" desc="Plan next season to keep soil healthy" tint="bg-leaf/60" index={6} />
            <ToolRow href="/feedback" icon={MessageSquareHeart} title="Feedback & Help" desc="Report issues, suggest features, find answers" tint="bg-white" index={7} />
            <ToolRow href="/about" icon={Leaf} title="About Plantio" desc="How it works & accuracy" tint="bg-white" index={8} />
          </div>
        </div>
      </section>

      {/* PLANTIO IN NUMBERS — animated stat counters */}
      <section className="px-5 py-8 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-forest" strokeWidth={2.5} />
            <h2 className="font-display text-xl font-bold uppercase text-ink">{t("home.plantioInNumbers")}</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 plantio-grain plantio-stitch p-4 rounded-3xl">
            <StatCard
              icon={ScanSearch}
              label={t("home.aiScans")}
              value={animatedScanCount}
              bumping={scanBumping}
              color="bg-leaf"
              progress={Math.min(scanCount / 50, 1)}
            />
            <StatCard
              icon={Wheat}
              label={t("home.cropsTracked")}
              value={10}
              bumping={false}
              color="bg-gold"
              progress={0.2}
            />
            <StatCard
              icon={Languages}
              label={t("home.languages")}
              value={3}
              bumping={false}
              color="bg-cream"
              progress={0.6}
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-8 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-wide text-ink/70">
          {t("common.madeForGrowers")}
        </p>
        <Link href="/about" className="mt-1 inline-block font-display text-xs font-bold uppercase text-forest underline">
          {t("common.aboutLink")}
        </Link>
      </footer>
    </main>
  );
}

/* ─── Quick Action Chip ─── */
function QuickActionChip({
  href,
  icon: Icon,
  label,
  delay,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  delay: number;
}) {
  return (
    <Link href={href} className="shrink-0">
      <div
        className="chip-hover inline-flex items-center gap-1.5 bg-white/15 border-[2.5px] border-white/70 rounded-full px-3.5 py-1.5 plantio-pop-in"
        style={{ animationDelay: `${delay}ms` }}
      >
        <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
        <span className="font-display text-xs font-bold uppercase text-white">{label}</span>
      </div>
    </Link>
  );
}

/* ─── Quick Calculator Chip ─── */
function QuickCalcChip({
  href,
  icon: Icon,
  label,
  delay,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  delay: number;
}) {
  return (
    <Link href={href} className="shrink-0">
      <div
        className="chip-hover inline-flex items-center gap-1.5 bg-white border-[2.5px] border-ink rounded-full px-3.5 py-1.5 shadow-[3px_3px_0px_0px_#161611] plantio-pop-in sticker-interactive"
        style={{ animationDelay: `${delay}ms` }}
      >
        <Icon className="w-4 h-4 text-forest" strokeWidth={2.5} />
        <span className="font-display text-xs font-bold uppercase text-ink">{label}</span>
      </div>
    </Link>
  );
}

/* ─── Farm Stat ─── */
function FarmStat({
  icon: Icon,
  value,
  label,
  tint,
  prefix,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  tint: string;
  prefix?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`w-10 h-10 rounded-2xl ${tint} border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611]`}>
        <Icon className="w-4 h-4 text-ink" strokeWidth={2.5} />
      </div>
      <p className="mt-2 font-display text-lg font-bold leading-none">
        {prefix ? `${prefix}${value}` : value}
      </p>
      <p className="mt-0.5 font-display text-[9px] font-bold uppercase text-ink/60 leading-tight">{label}</p>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  bumping,
  color,
  progress = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  bumping: boolean;
  color: string;
  progress?: number;
}) {
  const ringR = 14;
  const ringC = 2 * Math.PI * ringR;
  const dashOffset = ringC * (1 - Math.min(Math.max(progress, 0), 1));
  return (
    <div className="sticker-card bg-white p-4 flex flex-col items-center text-center plantio-pop-in plantio-list-item" style={{ "--i": 0 } as React.CSSProperties}>
      <div className="relative">
        <div className={`w-11 h-11 rounded-2xl ${color} border-[2.5px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]`}>
          <Icon className="w-5 h-5 text-ink" strokeWidth={2.5} />
        </div>
        <svg className="plantio-progress-ring absolute -inset-1" width="38" height="38" viewBox="0 0 38 38" aria-hidden>
          <circle cx="19" cy="19" r={ringR} fill="none" stroke="#ECE7D6" strokeWidth="2.5" />
          <circle cx="19" cy="19" r={ringR} fill="none" stroke="#3C8C4A" strokeWidth="2.5" strokeDasharray={ringC} strokeDashoffset={dashOffset} strokeLinecap="round" />
        </svg>
      </div>
      <p className={`mt-2.5 font-display text-2xl font-bold leading-none ${bumping ? "plantio-counter-bump" : ""}`}>
        {value}
      </p>
      <p className="mt-1 font-display text-[10px] font-bold uppercase text-ink/60">{label}</p>
    </div>
  );
}

function WeatherStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border-[2.5px] border-ink bg-cream p-2 text-center">
      <Icon className="w-3.5 h-3.5 mx-auto text-forest" strokeWidth={2.5} />
      <p className="mt-1 font-display text-sm font-bold leading-none">{value}</p>
      <p className="font-display text-[9px] font-bold uppercase text-ink/60 mt-0.5">{label}</p>
    </div>
  );
}

function weatherCodeLabel(code: number, lang: string): string {
  const en: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Light showers",
    81: "Showers",
    82: "Violent showers",
    95: "Thunderstorm",
    96: "Thunderstorm + hail",
    99: "Severe thunderstorm",
  };
  const hi: Record<number, string> = {
    0: "साफ़ आसमान",
    1: "ज़्यादातर साफ़",
    2: "आंशिक बादल",
    3: "बादली",
    45: "कोहरा",
    48: "पाला कोहरा",
    51: "हल्की बूंदाबांदी",
    53: "बूंदाबांदी",
    55: "भारी बूंदाबांदी",
    61: "हल्की बारिश",
    63: "बारिश",
    65: "भारी बारिश",
    71: "हल्की बर्फ़",
    73: "बर्फ़",
    75: "भारी बर्फ़",
    80: "हल्की झड़ी",
    81: "झड़ी",
    82: "तेज़ झड़ी",
    95: "आंधी",
    96: "आंधी + ओलावृष्टि",
    99: "प्रचंड आंधी",
  };
  const dict = lang === "hi" ? hi : en;
  return dict[code] || (lang === "hi" ? "अज्ञात" : "Unknown");
}

function ToolRow({
  href,
  icon: Icon,
  title,
  desc,
  tint,
  index = 0,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
  tint: string;
  index?: number;
}) {
  return (
    <Link href={href} className="block">
      <div className={`tool-row-card sticker-card ${tint} p-4 flex items-center gap-3 sticker-interactive plantio-depth-1 plantio-list-item plantio-icon-bounce`} style={{ "--i": index } as React.CSSProperties}>
        <span className="shrink-0 w-11 h-11 rounded-2xl bg-forest border-[2.5px] border-ink flex items-center justify-center">
          <Icon className="w-5 h-5 text-white plantio-icon-target" strokeWidth={2.5} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-bold uppercase leading-tight">{title}</p>
          <p className="text-xs text-ink/70">{desc}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-forest shrink-0" strokeWidth={2.5} />
      </div>
    </Link>
  );
}
