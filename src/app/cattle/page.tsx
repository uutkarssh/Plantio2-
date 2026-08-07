"use client";
import { useEffect, useRef, useState } from "react";
import {
  Beef,
  Wheat,
  Leaf,
  Sprout,
  AlertTriangle,
  RefreshCw,
  Weight,
  Milk,
  Calculator,
  ClipboardList,
  Info,
  Mic,
  Square,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
  SkeletonCard,
  ErrorRetryCard,
} from "@/components/plantio/sticker";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useI18n } from "@/lib/plantio/i18n";

/* ---------- types (match the /api/cattle response shape) ---------- */
interface FeedItem {
  name: string;
  amount_kg_per_day: string | number;
  icon: string;
}
interface FeedPlan {
  animal_type: string;
  dry_fodder: FeedItem;
  green_fodder: FeedItem;
  concentrate: FeedItem;
  weekly_note: string;
  warnings: string[];
}

const ANIMALS = ["Cow", "Buffalo", "Goat", "Sheep"] as const;
type Animal = (typeof ANIMALS)[number];

const ANIMAL_KEYS: Record<Animal, string> = {
  Cow: "cattle.cow",
  Buffalo: "cattle.buffalo",
  Goat: "cattle.goat",
  Sheep: "cattle.sheep",
};

const TIMEOUT_MS = 15_000;

/* ---------- icon helpers ---------- */
function renderFeedIcon(icon?: string) {
  const cls = "w-6 h-6 text-ink";
  switch (icon) {
    case "wheat":
      return <Wheat className={cls} strokeWidth={2.5} />;
    case "leaf":
      return <Leaf className={cls} strokeWidth={2.5} />;
    case "grain":
    default:
      return <Sprout className={cls} strokeWidth={2.5} />;
  }
}
function tintFor(icon?: string): string {
  switch (icon) {
    case "wheat":
      return "bg-gold";
    case "leaf":
      return "bg-leaf";
    case "grain":
      return "bg-midgreen";
    default:
      return "bg-cream";
  }
}

export default function CattlePage() {
  const { t } = useI18n();
  const [animal, setAnimal] = useState<Animal | "">("");
  const [weight, setWeight] = useState<string>("");
  const [milk, setMilk] = useState<string>("");
  const [plan, setPlan] = useState<FeedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false); // only true after >1s of loading
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>(t("cattle.timeoutMessage"));

  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Voice input — lets the farmer speak the weight & milk yield instead of
   * typing. Hook reports supported=false on browsers without SpeechRecognition
   * and the mic buttons stay hidden. */
  const weightVoice = useVoiceInput({
    mode: "number",
    onResult: (v) => setWeight(v),
  });
  const milkVoice = useVoiceInput({
    mode: "number",
    onResult: (v) => setMilk(v),
  });

  const startSlowTimer = () => {
    stopSlowTimer();
    slowTimer.current = setTimeout(() => setSlow(true), 1000);
  };
  const stopSlowTimer = () => {
    if (slowTimer.current) {
      clearTimeout(slowTimer.current);
      slowTimer.current = null;
    }
    setSlow(false);
  };

  // clean up any in-flight slow timer on unmount
  useEffect(() => () => stopSlowTimer(), []);

  const weightNum = Number(weight);
  const canSubmit =
    animal !== "" &&
    weight !== "" &&
    Number.isFinite(weightNum) &&
    weightNum > 0;

  const load = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(false);
    setPlan(null);
    startSlowTimer();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch("/api/cattle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animal_type: animal,
          weight: weightNum,
          milk_yield: Number(milk) || 0,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      if (!data?.plan) throw new Error("no plan in response");
      setPlan(data.plan as FeedPlan);
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      setError(true);
      setErrorMsg(t("cattle.timeoutMessage"));
    } finally {
      clearTimeout(timeoutId);
      stopSlowTimer();
      setLoading(false);
    }
  };

  const reset = () => {
    setAnimal("");
    setWeight("");
    setMilk("");
    setPlan(null);
    setError(false);
    setErrorMsg(t("cattle.timeoutMessage"));
  };

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      {/* MIDGREEN header */}
      <SectionHeader
        bg="midgreen"
        title={t("cattle.title")}
        subtitle={t("cattle.subtitle")}
        icon={Beef}
        iconTint="bg-gold"
      >
        <div className="mt-4 flex items-center gap-2">
          <span className="shrink-0 w-11 h-11 rounded-2xl bg-cream border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
            <Beef className="w-5 h-5 text-forest" strokeWidth={2.5} />
          </span>
          <StickerBadge variant="gold"><span className="plantio-status-dot mr-1.5 inline-block align-middle" />{t("cattle.dailyFeedPlan")}</StickerBadge>
        </div>
      </SectionHeader>

      {/* CREAM form + results section */}
      <section className="plantio-grain px-5 py-4 bg-cream">
        <div className="mx-auto max-w-2xl space-y-4 plantio-section-gap">
          {/* ---------- FORM ---------- */}
          <StickerCard className="bg-white plantio-stripes">
            <div className="flex items-center gap-3 mb-4">
              <span className="shrink-0 w-11 h-11 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <ClipboardList className="w-5 h-5 text-white" strokeWidth={2.5} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold uppercase leading-tight">
                  {t("cattle.animalDetails")}
                </h2>
                <p className="text-xs opacity-70">{t("cattle.tellUs")}</p>
              </div>
            </div>

            {/* Animal type — pill toggles */}
            <div>
              <label className="block font-display text-xs font-bold uppercase tracking-wide mb-2">
                {t("cattle.animalType")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ANIMALS.map((a) => {
                  const active = animal === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAnimal(a)}
                      aria-pressed={active}
                      className={[
                        "sticker-interactive sticker-pill px-3 py-2.5 text-sm font-display font-bold uppercase tracking-wide border-[3px] border-ink rounded-full",
                        active
                          ? "bg-leaf text-ink shadow-[3px_3px_0px_0px_#161611]"
                          : "bg-cream text-ink/80 shadow-[3px_3px_0px_0px_#161611]",
                      ].join(" ")}
                    >
                      {t(ANIMAL_KEYS[a])}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weight (kg) */}
            <div className="mt-4">
              <label
                htmlFor="cattle-weight"
                className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide mb-2"
              >
                <Weight className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("cattle.weightKg")}
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  id="cattle-weight"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={t("cattle.weightPlaceholder")}
                  className="flex-1 min-w-0 rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 text-base font-medium outline-none focus:bg-white focus:ring-[3px] focus:ring-forest/40"
                />
                {weightVoice.supported && (
                  <button
                    type="button"
                    aria-label={
                      weightVoice.listening
                        ? t("cattle.stopVoiceWeight")
                        : t("cattle.speakWeight")
                    }
                    onClick={() =>
                      weightVoice.listening ? weightVoice.stop() : weightVoice.start()
                    }
                    className={`shrink-0 w-12 rounded-2xl border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all ${
                      weightVoice.listening
                        ? "bg-warn text-white animate-pulse"
                        : "bg-leaf text-ink"
                    }`}
                  >
                    {weightVoice.listening ? (
                      <Square className="w-4 h-4" fill="currentColor" strokeWidth={2.5} />
                    ) : (
                      <Mic className="w-4 h-4" strokeWidth={2.5} />
                    )}
                  </button>
                )}
              </div>
              {weightVoice.error && (
                <p className="mt-1 text-[11px] text-warn font-semibold">{weightVoice.error}</p>
              )}
              {weightVoice.supported && !weightVoice.error && (
                <p className="mt-1 text-[11px] text-ink/60">
                  {t("cattle.voiceHint")}
                </p>
              )}
            </div>

            {/* Daily milk yield (litres) */}
            <div className="mt-4">
              <label
                htmlFor="cattle-milk"
                className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide mb-2"
              >
                <Milk className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("cattle.dailyMilkYield")}
                <span className="font-sans text-[10px] font-medium opacity-60 normal-case">
                  {t("cattle.ifApplicable")}
                </span>
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  id="cattle-milk"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={0.5}
                  value={milk}
                  onChange={(e) => setMilk(e.target.value)}
                  placeholder={t("cattle.milkPlaceholder")}
                  className="flex-1 min-w-0 rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 text-base font-medium outline-none focus:bg-white focus:ring-[3px] focus:ring-forest/40"
                />
                {milkVoice.supported && (
                  <button
                    type="button"
                    aria-label={
                      milkVoice.listening
                        ? t("cattle.stopVoiceMilk")
                        : t("cattle.speakMilk")
                    }
                    onClick={() =>
                      milkVoice.listening ? milkVoice.stop() : milkVoice.start()
                    }
                    className={`shrink-0 w-12 rounded-2xl border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all ${
                      milkVoice.listening
                        ? "bg-warn text-white animate-pulse"
                        : "bg-leaf text-ink"
                    }`}
                  >
                    {milkVoice.listening ? (
                      <Square className="w-4 h-4" fill="currentColor" strokeWidth={2.5} />
                    ) : (
                      <Mic className="w-4 h-4" strokeWidth={2.5} />
                    )}
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-ink/60">
                {t("cattle.milkHint")}
              </p>
              {milkVoice.error && (
                <p className="mt-1 text-[11px] text-warn font-semibold">{milkVoice.error}</p>
              )}
            </div>

            <div className="mt-4">
              <StickerButton
                variant="gold"
                size="lg"
                className="w-full"
                onClick={load}
                disabled={!canSubmit || loading}
              >
                <Calculator className="w-5 h-5" strokeWidth={2.5} /> {t("cattle.getFeedPlan")}
              </StickerButton>
            </div>
          </StickerCard>

          {/* ---------- LOADING (skeletons only after 1s) ---------- */}
          {loading && slow && (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* ---------- ERROR ---------- */}
          {error && !loading && (
            <ErrorRetryCard message={errorMsg} onRetry={load} />
          )}

          {/* ---------- RESULT ---------- */}
          {!loading && !error && plan && (
            <>
              <StickerCard className="bg-white plantio-card-in plantio-corner-fold">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 w-11 h-11 rounded-2xl bg-midgreen border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                      <Beef className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-bold uppercase leading-tight">
                        {plan.animal_type || t("cattle.yourAnimal")}
                      </h2>
                      <p className="text-xs opacity-70">{t("cattle.dailyFeedPlanLower")}</p>
                    </div>
                  </div>
                  <StickerBadge variant="gold" className="plantio-badge-shine">{t("cattle.perDay")}</StickerBadge>
                </div>

                <div className="space-y-3">
                  <FeedRow item={plan.dry_fodder} fallbackLabel={t("cattle.dryFodder")} />
                  <FeedRow item={plan.green_fodder} fallbackLabel={t("cattle.greenFodder")} />
                  <FeedRow item={plan.concentrate} fallbackLabel={t("cattle.concentrate")} />
                </div>

                {/* Weekly note */}
                <div className="mt-4 rounded-2xl border-[2.5px] border-ink bg-cream p-3 flex gap-2">
                  <Info className="w-4 h-4 text-forest shrink-0 mt-0.5" strokeWidth={2.5} />
                  <p className="text-xs text-ink/80">
                    <span className="font-display text-[11px] font-bold uppercase">
                      {t("cattle.weeklyNote")}{" "}
                    </span>
                    {plan.weekly_note}
                  </p>
                </div>
              </StickerCard>

              {/* Watch out for */}
              {plan.warnings && plan.warnings.length > 0 && (
                <StickerCard className="bg-warn text-white plantio-corner-fold">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 w-11 h-11 rounded-2xl bg-white border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                      <AlertTriangle className="w-5 h-5 text-warn" strokeWidth={2.5} />
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-bold uppercase text-white leading-tight">
                        {t("cattle.watchOutFor")}
                      </h2>
                      <p className="text-xs text-white/90">
                        {t("cattle.warningSigns")}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {plan.warnings.map((w, i) => (
                      <li key={i} className="flex gap-2">
                        <AlertTriangle
                          className="w-5 h-5 text-white shrink-0 mt-0.5"
                          strokeWidth={2.5}
                        />
                        <span className="text-sm text-white/95">{w}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] bg-ink/30 rounded-lg p-2 text-white/90">
                    {t("cattle.guidanceNotDiagnosis")}
                  </p>
                </StickerCard>
              )}

              <StickerButton
                variant="forest"
                size="lg"
                className="w-full"
                onClick={reset}
              >
                <RefreshCw className="w-5 h-5" strokeWidth={2.5} /> {t("cattle.planAgain")}
              </StickerButton>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

/* ---------- single feed row (icon + name + amount badge) ---------- */
function FeedRow({
  item,
  fallbackLabel,
}: {
  item: FeedItem;
  fallbackLabel: string;
}) {
  const tint = tintFor(item?.icon);
  const amount =
    item?.amount_kg_per_day != null ? String(item.amount_kg_per_day) : "—";
  return (
    <div className="plantio-list-item flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-cream p-3">
      <span
        className={`shrink-0 w-12 h-12 rounded-xl ${tint} border-[2.5px] border-ink flex items-center justify-center`}
      >
        {renderFeedIcon(item?.icon)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[11px] font-bold uppercase text-forest/80 tracking-wide">
          {fallbackLabel}
        </p>
        <p className="font-display text-sm font-bold uppercase leading-tight">
          {item?.name || fallbackLabel}
        </p>
      </div>
      <StickerBadge variant="leaf">{amount}</StickerBadge>
    </div>
  );
}
