"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IndianRupee,
  MapPin,
  CalendarDays,
  Search,
  TrendingUp,
  TrendingDown,
  Info,
  Store,
  Layers,
  RotateCw,
  Mic,
  Square,
  Star,
  Minus,
  Clock,
} from "lucide-react";
import { useVoiceInput } from "@/hooks/use-voice-input";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
  SkeletonCard,
  ErrorRetryCard,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";
import { getFavoriteCrops, toggleFavoriteCrop, getRecentMandiSearches, addRecentMandiSearch, type RecentMandiSearch } from "@/lib/plantio/storage";

type Status = "idle" | "loading" | "results" | "empty" | "error";

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

interface MandiResponse {
  prices: MandiPrice[];
  source: "live" | "sample" | "empty";
  note?: string;
}

const CROPS = ["Wheat", "Rice", "Maize", "Onion", "Tomato", "Potato", "Soybean", "Cotton"];

const CROP_KEYS: Record<string, string> = {
  Wheat: "mandi.wheat",
  Rice: "mandi.rice",
  Maize: "mandi.maize",
  Onion: "mandi.onion",
  Tomato: "mandi.tomato",
  Potato: "mandi.potato",
  Soybean: "mandi.soybean",
  Cotton: "mandi.cotton",
};

const STATES = [
  "Punjab",
  "Haryana",
  "Madhya Pradesh",
  "Maharashtra",
  "Uttar Pradesh",
  "Karnataka",
  "Gujarat",
  "Bihar",
  "Rajasthan",
  "Tamil Nadu",
  "West Bengal",
  "Andhra Pradesh",
  "Telangana",
];

const STATE_KEYS: Record<string, string> = {
  "Punjab": "mandi.punjab",
  "Haryana": "mandi.haryana",
  "Madhya Pradesh": "mandi.madhyaPradesh",
  "Maharashtra": "mandi.maharashtra",
  "Uttar Pradesh": "mandi.uttarPradesh",
  "Karnataka": "mandi.karnataka",
  "Gujarat": "mandi.gujarat",
  "Bihar": "mandi.bihar",
  "Rajasthan": "mandi.rajasthan",
  "Tamil Nadu": "mandi.tamilNadu",
  "West Bengal": "mandi.westBengal",
  "Andhra Pradesh": "mandi.andhraPradesh",
  "Telangana": "mandi.telangana",
};

const ALL_STATES_VALUE = "__all__";

/* Best time to sell — static seasonal suggestions per crop */
const BEST_TIME_TO_SELL: Record<string, string> = {
  Wheat: "Feb – Apr (when Rabi harvest peaks, sell early before market gluts)",
  Rice: "Nov – Jan (post-Kharif, prices often rise as stocks deplete)",
  Maize: "Oct – Nov (Kharif maize sells best before Rabi arrivals flood the market)",
  Onion: "Dec – Feb (stored Rabi onion fetches premium in lean season)",
  Tomato: "Mar – May (off-season supply drops, prices climb sharply)",
  Potato: "Jan – Mar (cold storage release in lean season commands higher rates)",
  Soybean: "Nov – Dec (global demand for oilseeds peaks post-harvest)",
  Cotton: "Dec – Feb (ginning demand is high, fiber quality is at its best)",
};

/* Nearby mandis heuristic — count unique mandis in results or estimate */
function estimateNearbyMandis(crop: string): number {
  const base: Record<string, number> = {
    Wheat: 12, Rice: 15, Maize: 8, Onion: 10,
    Tomato: 9, Potato: 11, Soybean: 7, Cotton: 10,
  };
  return base[crop] ?? 8;
}

export default function MandiPage() {
  const { t } = useI18n();
  const [crop, setCrop] = useState<string>("Wheat");
  const [stateValue, setStateValue] = useState<string>(ALL_STATES_VALUE);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [source, setSource] = useState<"live" | "sample" | "empty">("live");
  const [note, setNote] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  /* Recent searches from localStorage */
  const [recentSearches, setRecentSearches] = useState<RecentMandiSearch[]>([]);

  /* Price comparison: track the last 2 search results */
  const [lastSearches, setLastSearches] = useState<{ crop: string; state: string; prices: MandiPrice[] }[]>([]);

  /* Voice input — lets the farmer speak the crop or state name instead of
   * tapping pills / using the dropdown. Hook reports supported=false on browsers
   * without SpeechRecognition and the mic buttons stay hidden. */
  const cropVoice = useVoiceInput({
    mode: "text",
    onResult: (transcript) => {
      const lower = transcript.toLowerCase();
      const match = CROPS.find((c) => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase()));
      if (match) setCrop(match);
    },
  });
  const stateVoice = useVoiceInput({
    mode: "text",
    onResult: (transcript) => {
      const lower = transcript.toLowerCase();
      const match = STATES.find((s) => s.toLowerCase().includes(lower) || lower.includes(s.toLowerCase()));
      if (match) setStateValue(match);
    },
  });

  // Load favorites & recent searches on mount + listen for changes
  useEffect(() => {
    setFavorites(getFavoriteCrops());
    setRecentSearches(getRecentMandiSearches());
    const onFavChange = () => setFavorites(getFavoriteCrops());
    const onRecentChange = () => setRecentSearches(getRecentMandiSearches());
    window.addEventListener("plantio-favs-updated", onFavChange);
    window.addEventListener("plantio-recent-mandi-updated", onRecentChange);
    return () => {
      window.removeEventListener("plantio-favs-updated", onFavChange);
      window.removeEventListener("plantio-recent-mandi-updated", onRecentChange);
    };
  }, []);

  const onToggleFav = (c: string) => {
    setFavorites(toggleFavoriteCrop(c));
  };

  const runQuery = useCallback(async (nextCrop: string, nextStateRaw: string) => {
    const nextState = nextStateRaw === ALL_STATES_VALUE ? "" : nextStateRaw;
    setStatus("loading");
    setErrorMsg("");

    // cancel any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const params = new URLSearchParams();
      if (nextCrop) params.set("crop", nextCrop);
      if (nextState) params.set("state", nextState);
      const url = `/api/mandi${params.toString() ? `?${params.toString()}` : ""}`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }
      const data: MandiResponse = await res.json();
      setSource(data.source);
      setNote(data.note);
      setPrices(data.prices || []);
      setStatus(data.prices && data.prices.length > 0 ? "results" : "empty");

      // Save to recent searches
      addRecentMandiSearch(nextCrop, nextState || ALL_STATES_VALUE);
      setRecentSearches(getRecentMandiSearches());

      // Track for comparison
      setLastSearches((prev) => {
        const entry = { crop: nextCrop, state: nextState || ALL_STATES_VALUE, prices: data.prices || [] };
        const next = [...prev, entry];
        // Keep only last 2
        return next.slice(-2);
      });
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.name === "AbortError") {
        setErrorMsg(t("mandi.timeoutError"));
      } else {
        setErrorMsg(
          e?.message || t("mandi.connectionError")
        );
      }
      setStatus("error");
    }
  }, [t]);

  const onSubmit = useCallback(() => {
    void runQuery(crop, stateValue);
  }, [crop, stateValue, runQuery]);

  const onRetry = useCallback(() => {
    void runQuery(crop, stateValue);
  }, [crop, stateValue, runQuery]);

  const onTryAllStates = useCallback(() => {
    setStateValue(ALL_STATES_VALUE);
    void runQuery(crop, ALL_STATES_VALUE);
  }, [crop, runQuery]);

  const onRecentSearch = useCallback((rs: RecentMandiSearch) => {
    setCrop(rs.crop);
    if (rs.state && rs.state !== ALL_STATES_VALUE) {
      setStateValue(rs.state);
    }
    void runQuery(rs.crop, rs.state || ALL_STATES_VALUE);
  }, [runQuery]);

  /* Computed: average prices for trend visualization */
  const avgPrices = useMemo(() => {
    if (prices.length === 0) return null;
    const minAvg = prices.reduce((s, p) => s + p.min_price, 0) / prices.length;
    const maxAvg = prices.reduce((s, p) => s + p.max_price, 0) / prices.length;
    const modalAvg = prices.reduce((s, p) => s + p.modal_price, 0) / prices.length;
    return { min: minAvg, max: maxAvg, modal: modalAvg };
  }, [prices]);

  /* Computed: price trend indicator */
  const priceTrend = useMemo(() => {
    if (!avgPrices) return "stable";
    const spread = avgPrices.max - avgPrices.min;
    const mid = (avgPrices.max + avgPrices.min) / 2;
    if (mid === 0) return "stable";
    const ratio = spread / mid;
    if (ratio > 0.4) return "down";
    if (ratio > 0.2) return "up";
    return "stable";
  }, [avgPrices]);

  /* Computed: comparison data */
  const comparison = useMemo(() => {
    if (lastSearches.length < 2) return null;
    const a = lastSearches[lastSearches.length - 2];
    const b = lastSearches[lastSearches.length - 1];
    if (a.prices.length === 0 || b.prices.length === 0) return null;
    const aModal = a.prices.reduce((s, p) => s + p.modal_price, 0) / a.prices.length;
    const bModal = b.prices.reduce((s, p) => s + p.modal_price, 0) / b.prices.length;
    return { cropA: a.crop, cropB: b.crop, modalA: aModal, modalB: bModal };
  }, [lastSearches]);

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <SectionHeader
        title={t("mandi.title")}
        subtitle={t("mandi.subtitle")}
        bg="gold"
        text="ink"
        icon={IndianRupee}
        iconTint="bg-forest"
      />

      <section className="px-5 py-6 plantio-grain plantio-section-gap">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* RECENT SEARCHES quick-access pills */}
          {recentSearches.length > 0 && (
            <StickerCard className="bg-gold/40 plantio-pop-in">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-forest" strokeWidth={2.5} />
                <p className="font-display text-xs font-bold uppercase text-ink/70">{t("mandi.recentSearches")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((rs, idx) => {
                  const timeAgo = getTimeAgo(rs.searchedAt);
                  return (
                    <button
                      key={rs.crop + rs.state + idx}
                      type="button"
                      onClick={() => onRecentSearch(rs)}
                      className="sticker-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wide bg-white text-ink hover:bg-leaf/60"
                    >
                      <Search className="w-3 h-3 text-forest" strokeWidth={2.5} />
                      {rs.crop}
                      <span className="text-ink/40 font-normal normal-case tracking-normal">{timeAgo}</span>
                    </button>
                  );
                })}
              </div>
            </StickerCard>
          )}

          {/* FAVORITES quick-access row — only shown when the user has starred crops */}
          {favorites.length > 0 && (
            <StickerCard className="bg-leaf/40 plantio-pop-in">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-gold" strokeWidth={2.5} fill="currentColor" />
                <p className="font-display text-xs font-bold uppercase text-ink/70">{t("mandi.favorites")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {favorites.map((fav) => {
                  const active = fav === crop;
                  return (
                    <button
                      key={fav}
                      type="button"
                      onClick={() => setCrop(fav)}
                      className={[
                        "sticker-pill inline-flex items-center gap-1 px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wide",
                        active ? "bg-forest text-white" : "bg-white text-ink hover:bg-leaf/60",
                      ].join(" ")}
                      aria-pressed={active}
                    >
                      <Star className="w-3 h-3 text-gold" strokeWidth={2.5} fill="currentColor" />
                      {t(CROP_KEYS[fav] || fav)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-ink/55">{t("mandi.favoritesHint")}</p>
            </StickerCard>
          )}

          {/* FORM CARD */}
          <StickerCard className="bg-white plantio-gradient-border">
            <div className="flex items-center gap-2 mb-4">
              <span className="shrink-0 w-10 h-10 rounded-2xl bg-leaf border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Search className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold uppercase leading-none">{t("mandi.findPrices")}</h2>
                <p className="text-xs text-ink/60 mt-0.5">{t("mandi.findPricesDesc")}</p>
              </div>
              {/* Star the current crop — toggles favorite */}
              <button
                type="button"
                aria-label={favorites.includes(crop) ? t("mandi.unstar") : t("mandi.star")}
                aria-pressed={favorites.includes(crop)}
                onClick={() => onToggleFav(crop)}
                className="ml-auto shrink-0 w-10 h-10 rounded-2xl bg-gold border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all"
              >
                <Star
                  className={favorites.includes(crop) ? "w-5 h-5 text-ink" : "w-5 h-5 text-ink/30"}
                  strokeWidth={2.5}
                  fill={favorites.includes(crop) ? "currentColor" : "none"}
                />
              </button>
            </div>

            {/* Crop pill toggles */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wide text-ink/70 mb-2">
                <Layers className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("mandi.crop")}
                {cropVoice.supported && (
                  <button
                    type="button"
                    aria-label={
                      cropVoice.listening
                        ? t("mandi.stopVoiceCrop")
                        : t("mandi.speakCropName")
                    }
                    onClick={() =>
                      cropVoice.listening ? cropVoice.stop() : cropVoice.start()
                    }
                    className={`shrink-0 w-7 h-7 rounded-full border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all ${
                      cropVoice.listening
                        ? "bg-warn text-white animate-pulse"
                        : "bg-leaf text-ink"
                    }`}
                  >
                    {cropVoice.listening ? (
                      <Square className="w-3 h-3" fill="currentColor" strokeWidth={2.5} />
                    ) : (
                      <Mic className="w-3 h-3" strokeWidth={2.5} />
                    )}
                  </button>
                )}
              </label>
              {cropVoice.listening && (
                <p className="text-[11px] text-forest font-semibold mb-2">
                  {t("mandi.cropVoiceHint")}
                </p>
              )}
              {cropVoice.error && (
                <p className="mt-0 mb-2 text-[11px] text-warn font-semibold">{cropVoice.error}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {CROPS.map((c) => {
                  const active = c === crop;
                  const isFav = favorites.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCrop(c)}
                      className={[
                        "sticker-pill inline-flex items-center gap-1 px-4 py-2 text-sm font-display font-bold uppercase tracking-wide",
                        active
                          ? "bg-forest text-white plantio-glow-ring"
                          : "bg-cream text-ink hover:bg-leaf/40",
                      ].join(" ")}
                      aria-pressed={active}
                    >
                      {isFav && <Star className="w-3 h-3 text-gold" strokeWidth={2.5} fill="currentColor" />}
                      {t(CROP_KEYS[c] || c)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* State select */}
            <div className="mt-4">
              <label
                htmlFor="mandi-state"
                className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wide text-ink/70 mb-2"
              >
                <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("mandi.state")}
                {stateVoice.supported && (
                  <button
                    type="button"
                    aria-label={
                      stateVoice.listening
                        ? t("mandi.stopVoiceState")
                        : t("mandi.speakStateName")
                    }
                    onClick={() =>
                      stateVoice.listening ? stateVoice.stop() : stateVoice.start()
                    }
                    className={`shrink-0 w-7 h-7 rounded-full border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all ${
                      stateVoice.listening
                        ? "bg-warn text-white animate-pulse"
                        : "bg-leaf text-ink"
                    }`}
                  >
                    {stateVoice.listening ? (
                      <Square className="w-3 h-3" fill="currentColor" strokeWidth={2.5} />
                    ) : (
                      <Mic className="w-3 h-3" strokeWidth={2.5} />
                    )}
                  </button>
                )}
              </label>
              {stateVoice.listening && (
                <p className="text-[11px] text-forest font-semibold mb-2">
                  {t("mandi.stateVoiceHint")}
                </p>
              )}
              {stateVoice.error && (
                <p className="mt-0 mb-2 text-[11px] text-warn font-semibold">{stateVoice.error}</p>
              )}
              <div className="flex items-stretch gap-2">
                <div className="relative flex-1">
                  <select
                    id="mandi-state"
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full appearance-none bg-cream border-[3px] border-ink rounded-2xl px-4 py-3 pr-10 font-display font-bold uppercase tracking-wide text-ink focus:outline-none focus:ring-[3px] focus:ring-leaf shadow-[3px_3px_0px_0px_#161611] cursor-pointer"
                  >
                    <option value={ALL_STATES_VALUE}>{t("mandi.allStates")}</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        {t(STATE_KEYS[s] || s)}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </div>
                {stateVoice.supported && (
                  <button
                    type="button"
                    aria-label={
                      stateVoice.listening
                        ? t("mandi.stopVoiceState")
                        : t("mandi.speakStateName")
                    }
                    onClick={() =>
                      stateVoice.listening ? stateVoice.stop() : stateVoice.start()
                    }
                    className={`shrink-0 w-12 rounded-2xl border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all ${
                      stateVoice.listening
                        ? "bg-warn text-white animate-pulse"
                        : "bg-leaf text-ink"
                    }`}
                  >
                    {stateVoice.listening ? (
                      <Square className="w-4 h-4" fill="currentColor" strokeWidth={2.5} />
                    ) : (
                      <Mic className="w-4 h-4" strokeWidth={2.5} />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5">
              <StickerButton
                variant="forest"
                size="lg"
                className="w-full"
                onClick={onSubmit}
                disabled={status === "loading"}
              >
                <Search className="w-5 h-5" strokeWidth={2.5} />
                {t("mandi.checkPrices")}
              </StickerButton>
            </div>

            {/* IDLE hint — inline note inside the form card so it never pushes
                content behind the bottom nav. */}
            {status === "idle" && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-leaf/40 border-[2.5px] border-ink px-3 py-2">
                <IndianRupee className="w-4 h-4 text-forest shrink-0" strokeWidth={2.5} />
                <p className="text-xs text-ink/80 leading-snug">
                  <span className="font-display font-bold uppercase mr-1">{t("mandi.checkTodaysRates")}</span>
                  {t("mandi.checkTodaysRatesDesc")}
                </p>
              </div>
            )}
          </StickerCard>

          {/* SAMPLE NOTE BANNER */}
          {status === "results" && source === "sample" && note && (
            <div className="sticker-card plantio-stamp bg-gold p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
              <p className="text-sm text-ink">
                <span className="font-display font-bold uppercase mr-1">{t("mandi.headsUp")}</span>
                {note}
              </p>
            </div>
          )}

          {/* LOADING */}
          {status === "loading" && (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* ERROR */}
          {status === "error" && (
            <ErrorRetryCard
              message={errorMsg}
              onRetry={onRetry}
              onSecondary={onTryAllStates}
              secondaryLabel={t("mandi.tryAllStates")}
            />
          )}

          {/* RESULTS */}
          {status === "results" && prices.length > 0 && (
            <div className="max-h-[60vh] overflow-y-auto scroll-plantio space-y-4 pr-1 -mr-1">
              {prices.map((p, idx) => (
                <div key={`${p.mandi}-${p.district}-${idx}`} className={`plantio-list-item${idx === 0 ? " plantio-corner-fold" : ""}`} style={{ ["--i" as string]: Math.min(idx, 6) }}>
                  <MandiCard price={p} />
                </div>
              ))}
            </div>
          )}

          {/* ============ Price Trend Visualization (div-based bar chart) ============ */}
          {status === "results" && avgPrices && (
            <StickerCard className="bg-white plantio-pop-in">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-forest" strokeWidth={2.5} />
                <p className="font-display text-sm font-bold uppercase text-ink/70">{t("mandi.priceTrend")}</p>
              </div>
              {/* Bar chart: min, modal, max */}
              <div className="space-y-3">
                <PriceBarRow label={t("mandi.min")} value={avgPrices.min} maxValue={avgPrices.max} color="bg-leaf" />
                <PriceBarRow label={t("mandi.modal")} value={avgPrices.modal} maxValue={avgPrices.max} color="bg-gold" />
                <PriceBarRow label={t("mandi.max")} value={avgPrices.max} maxValue={avgPrices.max} color="bg-warn" />
              </div>
              {/* Legend */}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] font-display font-bold uppercase text-ink/60">
                  <span className="w-3 h-3 rounded-sm bg-leaf border border-ink" /> {t("mandi.min")}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-display font-bold uppercase text-ink/60">
                  <span className="w-3 h-3 rounded-sm bg-gold border border-ink" /> {t("mandi.modal")}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-display font-bold uppercase text-ink/60">
                  <span className="w-3 h-3 rounded-sm bg-warn border border-ink" /> {t("mandi.max")}
                </span>
              </div>
            </StickerCard>
          )}

          {/* ============ Price Comparison ============ */}
          {comparison && (
            <StickerCard className="bg-leaf/40 plantio-pop-in">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-forest" strokeWidth={2.5} />
                <p className="font-display text-sm font-bold uppercase text-ink/70">{t("mandi.priceComparison")}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border-[2.5px] border-ink bg-white p-3 shadow-[3px_3px_0px_0px_#161611] flex flex-col items-center">
                  <p className="font-display text-sm font-bold uppercase text-ink/70">{comparison.cropA}</p>
                  <p className="font-display text-xl font-bold leading-none mt-1">
                    <IndianRupee className="w-4 h-4 inline -mt-0.5" strokeWidth={2.5} />
                    {formatNumber(Math.round(comparison.modalA))}
                  </p>
                </div>
                <div className="rounded-2xl border-[2.5px] border-ink bg-white p-3 shadow-[3px_3px_0px_0px_#161611] flex flex-col items-center">
                  <p className="font-display text-sm font-bold uppercase text-ink/70">{comparison.cropB}</p>
                  <p className="font-display text-xl font-bold leading-none mt-1">
                    <IndianRupee className="w-4 h-4 inline -mt-0.5" strokeWidth={2.5} />
                    {formatNumber(Math.round(comparison.modalB))}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-ink/70 text-center font-display font-bold uppercase">
                {comparison.modalA !== comparison.modalB && (
                  <>
                    {comparison.modalA > comparison.modalB ? comparison.cropA : comparison.cropB}
                    {" "}{t("mandi.higherModal")}
                  </>
                )}
                {comparison.modalA === comparison.modalB && (
                  <span className="flex items-center justify-center gap-1">
                    <Minus className="w-3 h-3" strokeWidth={2.5} /> {t("mandi.priceTrendStable")}
                  </span>
                )}
              </p>
            </StickerCard>
          )}

          {/* ============ Market Insights Card ============ */}
          {status === "results" && prices.length > 0 && (
            <StickerCard className="bg-forest text-white plantio-pop-in">
              <div className="flex items-center gap-2 mb-3">
                <Store className="w-4 h-4 text-gold" strokeWidth={2.5} />
                <p className="font-display text-sm font-bold uppercase text-white/80">{t("mandi.marketInsights")}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {/* Best time to sell */}
                <div className="rounded-2xl border-[2.5px] border-ink bg-white p-3 shadow-[3px_3px_0px_0px_#161611] flex flex-col items-center justify-center">
                  <Clock className="w-5 h-5 text-forest mb-1" strokeWidth={2.5} />
                  <span className="font-display text-[10px] font-bold uppercase text-ink/60 text-center leading-tight">{t("mandi.bestTimeToSell")}</span>
                  <span className="text-[10px] text-ink/80 text-center mt-1 leading-snug">{BEST_TIME_TO_SELL[crop] || "Check local mandi trends"}</span>
                </div>
                {/* Nearby mandis count */}
                <div className="rounded-2xl border-[2.5px] border-ink bg-gold p-3 shadow-[3px_3px_0px_0px_#161611] flex flex-col items-center justify-center">
                  <Store className="w-5 h-5 text-ink mb-1" strokeWidth={2.5} />
                  <span className="font-display text-lg font-bold leading-none text-ink">{estimateNearbyMandis(crop)}</span>
                  <span className="font-display text-[10px] font-bold uppercase text-ink/70 mt-0.5 text-center">{t("mandi.nearbyMandis")}</span>
                </div>
                {/* Price trend indicator */}
                <div className={`rounded-2xl border-[2.5px] border-ink p-3 shadow-[3px_3px_0px_0px_#161611] flex flex-col items-center justify-center ${priceTrend === "up" ? "bg-leaf" : priceTrend === "down" ? "bg-warn" : "bg-cream"}`}>
                  {priceTrend === "up" && <TrendingUp className="w-5 h-5 text-ink mb-1" strokeWidth={2.5} />}
                  {priceTrend === "down" && <TrendingDown className="w-5 h-5 text-white mb-1" strokeWidth={2.5} />}
                  {priceTrend === "stable" && <Minus className="w-5 h-5 text-ink mb-1" strokeWidth={2.5} />}
                  <span className={`font-display text-[10px] font-bold uppercase text-center ${priceTrend === "down" ? "text-white" : "text-ink/70"}`}>
                    {priceTrend === "up" ? t("mandi.priceTrendUp") : priceTrend === "down" ? t("mandi.priceTrendDown") : t("mandi.priceTrendStable")}
                  </span>
                </div>
              </div>
            </StickerCard>
          )}

          {/* EMPTY FALLBACK */}
          {status === "empty" && (
            <StickerCard className="bg-cream">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-12 h-12 rounded-2xl bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                  <Store className="w-6 h-6 text-ink" strokeWidth={2.5} />
                </span>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold uppercase">{t("mandi.noPricesHereYet")}</h3>
                  <p className="mt-1 text-sm text-ink/75">{note || t("mandi.defaultNote")}</p>
                </div>
              </div>
              <div className="mt-4">
                <StickerButton variant="forest" size="md" className="w-full" onClick={onTryAllStates}>
                  <RotateCw className="w-4 h-4" strokeWidth={2.5} /> {t("mandi.tryAllStates")}
                </StickerButton>
              </div>
            </StickerCard>
          )}

          {/* IDLE hint is now inline inside the form card (above) so it never
              pushes content behind the bottom nav. */}
        </div>
      </section>
    </main>
  );
}

/* ===================================================================
   PriceBarRow — div-based horizontal bar for price trend visualization
   =================================================================== */
function PriceBarRow({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const pct = maxValue > 0 ? Math.max(8, (value / maxValue) * 100) : 8;
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right font-display text-[10px] font-bold uppercase text-ink/60">{label}</span>
      <div className="flex-1 h-6 rounded-lg border-[2px] border-ink bg-cream overflow-hidden shadow-[2px_2px_0px_0px_#161611]">
        <div className={`h-full ${color} rounded-md transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right font-display text-xs font-bold text-ink">
        <IndianRupee className="w-3 h-3 inline -mt-0.5" strokeWidth={2.5} />{formatNumber(Math.round(value))}
      </span>
    </div>
  );
}

/* ===================================================================
   MandiCard — individual price card
   =================================================================== */
function MandiCard({ price }: { price: MandiPrice }) {
  const { t } = useI18n();
  const isSample = price.source === "sample";
  const dateText = formatDate(price.date);

  // Deterministic 7-day trend derived from the modal price — sample data, but
  // stable per mandi+crop so the chart doesn't jump around on every render.
  // In live mode this would be a real historical series from the API.
  const trend = useMemo(() => buildTrend(price.modal_price, price.mandi + price.crop), [price.modal_price, price.mandi, price.crop]);
  const trendUp = trend[trend.length - 1] >= trend[0];

  return (
    <StickerCard className="bg-white plantio-card-in sticker-interactive">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold uppercase leading-tight truncate">
            {price.mandi}
          </h3>
          <p className="mt-0.5 text-sm text-ink/70 flex items-center gap-1 flex-wrap">
            <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
            <span className="truncate">
              {price.district}
              {price.district ? ", " : ""}
              {price.state}
            </span>
          </p>
        </div>
        {isSample ? (
          <StickerBadge variant="cream">{t("mandi.sample")}</StickerBadge>
        ) : (
          <StickerBadge variant="leaf" className="plantio-badge-shine">
            <span className="plantio-status-dot mr-1 inline-block" /> LIVE
          </StickerBadge>
        )}
      </div>

      {/* Price pills */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <PriceBox label={t("mandi.min")} value={price.min_price} icon={<TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />} />
        <PriceBox label={t("mandi.max")} value={price.max_price} icon={<TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />} />
        <div className="rounded-2xl bg-leaf border-[3px] border-ink px-3 py-2 shadow-[3px_3px_0px_0px_#161611] flex flex-col items-center justify-center">
          <span className="flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-wide text-ink/80">
            <IndianRupee className="w-3 h-3" strokeWidth={2.5} /> {t("mandi.modal")}
          </span>
          <span className="font-display text-lg font-bold leading-none mt-0.5">
            ₹{formatNumber(price.modal_price)}
          </span>
        </div>
      </div>

      {/* 7-day trend sparkline */}
      <div className="mt-3 rounded-2xl border-[2.5px] border-ink bg-cream p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-wide text-ink/70">
            <Layers className="w-3 h-3" strokeWidth={2.5} /> {t("mandi.sevenDayTrend")}
          </span>
          <span
            className={`flex items-center gap-0.5 text-[10px] font-display font-bold uppercase tracking-wide ${
              trendUp ? "text-forest" : "text-warn"
            }`}
          >
            {trendUp ? (
              <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
            )}
            {trendUp ? t("mandi.up") : t("mandi.down")}
          </span>
        </div>
        <Sparkline values={trend} up={trendUp} />
        <div className="mt-1 flex items-center justify-between text-[9px] text-ink/55 font-medium">
          <span>{t("mandi.sevenDaysAgo")}</span>
          <span>{t("mandi.today")}</span>
        </div>
      </div>

      {/* Date */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-ink/55">
        <CalendarDays className="w-3.5 h-3.5" strokeWidth={2.5} />
        <span>{t("mandi.recorded")} {dateText}</span>
      </div>
    </StickerCard>
  );
}

/* Build a stable 7-point trend around the given modal price. Deterministic
 * from the seed string so the same mandi+crop always shows the same shape. */
function buildTrend(modal: number, seed: string): number[] {
  if (!Number.isFinite(modal) || modal <= 0) {
    return [0, 0, 0, 0, 0, 0, 0];
  }
  // simple seeded PRNG (mulberry32)
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const rng = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967296);
  };
  const out: number[] = [];
  // start ~10% below modal, wander up or down, end near modal
  let v = modal * (0.88 + rng() * 0.08);
  for (let i = 0; i < 7; i++) {
    out.push(Math.max(1, Math.round(v)));
    // step
    const drift = (rng() - 0.45) * modal * 0.05;
    v = v + drift;
  }
  // force the final value close to the current modal price
  out[out.length - 1] = modal;
  return out;
}

/* Inline SVG sparkline — sticker-book style with a hard black outline. */
function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  const W = 240;
  const H = 44;
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = W / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = H - ((v - min) / span) * (H - 8) - 4;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `M0 ${H} ` +
    points.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") +
    ` L${W} ${H} Z`;
  const stroke = up ? "#1F4D36" : "#E85D3D";
  const fill = up ? "#8FD14F" : "#E85D3D";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-11"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* soft fill */}
      <path d={areaPath} fill={fill} opacity={0.35} />
      {/* main line — sticker style: thick black underlay + colored top */}
      <path d={linePath} fill="none" stroke="#161611" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* end dot */}
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={3.5} fill={stroke} stroke="#161611" strokeWidth={2} />
    </svg>
  );
}

function PriceBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-cream border-[3px] border-ink px-3 py-2 shadow-[3px_3px_0px_0px_#161611] flex flex-col items-center justify-center">
      <span className="flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-wide text-ink/70">
        {icon}
        {label}
      </span>
      <span className="font-display text-lg font-bold leading-none mt-0.5">
        ₹{formatNumber(value)}
      </span>
    </div>
  );
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN");
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  // accept YYYY-MM-DD or full ISO
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
