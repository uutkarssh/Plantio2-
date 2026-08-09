"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FlaskConical,
  Leaf,
  Wheat,
  Sprout,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Beaker,
  Share2,
  Lightbulb,
} from "lucide-react";
import { StickerCard, StickerButton, StickerBadge, SkeletonCard, ErrorRetryCard } from "@/components/plantio/sticker";
import { getLastScan } from "@/lib/plantio/storage";

interface CureStep {
  step: string;
  detail: string;
}
interface FertilizerItem {
  name: string;
  amount: string;
  frequency: string;
}
interface CurePlan {
  disease_name: string;
  immediate_treatment: CureStep[];
  organic_option: CureStep[];
  chemical_option: CureStep[];
  fertilizer_and_nutrients: FertilizerItem[];
  prevention_tips: string[];
}

export default function CurePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CurePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scan, setScan] = useState<ReturnType<typeof getLastScan>>(null);

  const load = async () => {
    const last = getLastScan();
    setScan(last);
    if (!last || !last.disease_name) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/cure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease_name: last.disease_name, plant_name: last.plant_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setPlan(data.plan);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* Share Cure Plan handler */
  const handleShareCurePlan = async () => {
    if (!plan || !scan) return;
    const lines: string[] = [];
    lines.push(`Cure Plan for ${scan.disease_name || "Your Plant"}`);
    if (scan.plant_name) lines.push(`Plant: ${scan.plant_name}`);
    lines.push("");
    if (plan.immediate_treatment?.length) {
      lines.push("IMMEDIATE TREATMENT:");
      plan.immediate_treatment.forEach((s, i) => lines.push(`  ${i + 1}. ${s.step}: ${s.detail}`));
      lines.push("");
    }
    if (plan.organic_option?.length) {
      lines.push("ORGANIC OPTION:");
      plan.organic_option.forEach((s) => lines.push(`  - ${s.step}: ${s.detail}`));
      lines.push("");
    }
    if (plan.chemical_option?.length) {
      lines.push("CHEMICAL OPTION:");
      plan.chemical_option.forEach((s) => lines.push(`  - ${s.step}: ${s.detail}`));
      lines.push("");
    }
    if (plan.fertilizer_and_nutrients?.length) {
      lines.push("FERTILIZER & NUTRIENTS:");
      plan.fertilizer_and_nutrients.forEach((f) => lines.push(`  - ${f.name}: ${f.amount} (${f.frequency})`));
      lines.push("");
    }
    if (plan.prevention_tips?.length) {
      lines.push("PREVENTION TIPS:");
      plan.prevention_tips.forEach((t) => lines.push(`  - ${t}`));
    }
    lines.push("");
    lines.push("— Made with Plantio");
    const text = lines.join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: `Cure Plan: ${scan.disease_name}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Cure plan copied to clipboard — paste it anywhere to share.");
      }
    } catch {
      /* user cancelled */
    }
  };

  // No disease data — nothing to cure
  if (!loading && !scan) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-2xl">
          <BackToScan />
          <StickerCard className="bg-cream mt-4">
            <h1 className="font-display text-2xl font-bold uppercase">No scan to cure yet</h1>
            <p className="mt-2 text-sm text-ink/70">Scan a plant first, then come back here for a cure plan.</p>
            <div className="mt-4">
              <StickerButton variant="forest" size="md" onClick={() => router.push("/scan")}>
                Scan a Plant <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </StickerButton>
            </div>
          </StickerCard>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      {/* GOLDEN YELLOW header */}
      <section className="bg-gold border-b-[3px] border-ink px-5 py-8 relative overflow-hidden">
        {/* Decorative dot pattern */}
        <div aria-hidden className="absolute inset-0 plantio-dots-ink pointer-events-none" />
        <div className="relative mx-auto max-w-2xl">
          <button
            onClick={() => router.push("/scan")}
            className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase mb-3 bg-cream border-[2.5px] border-ink rounded-full px-3 py-1.5 shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} /> Back to Scan
          </button>

          {/* Scan → Cure flow progress visual */}
          <ScanCureFlow />

          <div className="flex items-start gap-3 mt-5">
            <span className="shrink-0 w-14 h-14 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0px_0px_#161611]">
              <FlaskConical className="w-7 h-7 text-white" strokeWidth={2.5} />
            </span>
            <div>
              <p className="font-display text-xs font-bold uppercase text-ink/70">Cure & Fertilizer Plan</p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase leading-[1.05]">
                {scan?.disease_name || "Your Plant"}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2">
                {scan?.plant_name && <StickerBadge variant="forest">{scan.plant_name}</StickerBadge>}
                {scan && <StickerBadge variant="warn">{Math.round(scan.confidence * 100)}% confident</StickerBadge>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {error && !loading && (
            <ErrorRetryCard
              message="Couldn't build the cure plan right now. Please retry."
              onRetry={load}
              secondaryLabel="Back to Scan"
              onSecondary={() => router.push("/scan")}
            />
          )}

          {!loading && !error && plan && (
            <>
              {/* Immediate Treatment */}
              <StickerCard className="bg-white">
                <CardHeader icon={Beaker} tint="bg-warn" title="Immediate Treatment" subtitle="Do these steps right away" />
                <ol className="mt-4 space-y-0">
                  {plan.immediate_treatment?.map((s, i) => (
                    <StepRow key={i} n={i + 1} step={s.step} detail={s.detail} isLast={i === (plan.immediate_treatment?.length ?? 0) - 1} />
                  ))}
                </ol>
              </StickerCard>

              {/* Organic vs Chemical */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <StickerCard className="bg-leaf">
                  <CardHeader icon={Leaf} tint="bg-forest" title="Organic Option" subtitle="Gentle, natural" />
                  <ul className="mt-4 space-y-3">
                    {plan.organic_option?.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <Sprout className="w-5 h-5 text-forest shrink-0 mt-0.5" strokeWidth={2.5} />
                        <div>
                          <p className="font-display text-sm font-bold uppercase">{s.step}</p>
                          <p className="text-xs text-ink/80">{s.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </StickerCard>
                <StickerCard className="bg-warn text-white">
                  <CardHeader icon={FlaskConical} tint="bg-white" iconColor="text-warn" title="Chemical Option" subtitle="Use carefully" />
                  <ul className="mt-4 space-y-3">
                    {plan.chemical_option?.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <FlaskConical className="w-5 h-5 text-white shrink-0 mt-0.5" strokeWidth={2.5} />
                        <div>
                          <p className="font-display text-sm font-bold uppercase text-white">{s.step}</p>
                          <p className="text-xs text-white/90">{s.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] bg-ink/30 rounded-lg p-2 text-white/90">
                    Follow label dosage. Wear gloves. Confirm with a local agricultural officer for high-value crops.
                  </p>
                </StickerCard>
              </div>

              {/* Fertilizer & Nutrients */}
              <StickerCard className="bg-white">
                <CardHeader icon={Wheat} tint="bg-gold" title="Fertilizer & Nutrients" subtitle="What to apply, how much, how often" />
                <ul className="mt-4 space-y-2">
                  {plan.fertilizer_and_nutrients?.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-cream p-3">
                      <span className="shrink-0 w-10 h-10 rounded-xl bg-forest border-[2.5px] border-ink flex items-center justify-center">
                        <Wheat className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm font-bold uppercase leading-tight">{f.name}</p>
                        <p className="text-xs text-ink/70">{f.frequency}</p>
                      </div>
                      <StickerBadge variant="leaf">{f.amount}</StickerBadge>
                    </li>
                  ))}
                </ul>
              </StickerCard>

              {/* Prevention */}
              <StickerCard className="bg-midgreen text-white">
                <CardHeader icon={ShieldCheck} tint="bg-gold" title="Prevention Tips" subtitle="Stop it spreading or coming back" />
                <ul className="mt-4 space-y-2">
                  {plan.prevention_tips?.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <CheckCircle2 className="w-5 h-5 text-leaf shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span className="text-sm text-white/95">{t}</span>
                    </li>
                  ))}
                </ul>
                {/* Key Takeaway box */}
                {plan.prevention_tips && plan.prevention_tips.length > 0 && (
                  <KeyTakeaway tip={plan.prevention_tips[0]} />
                )}
              </StickerCard>

              <div className="rounded-2xl border-[3px] border-ink bg-cream p-4 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-xs text-ink/80">
                  Plantio gives a fast first opinion. For high-value crops or when in doubt, confirm with a local agricultural officer before applying chemicals.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <StickerButton variant="forest" size="lg" className="w-full" onClick={() => router.push("/scan")}>
                  <RefreshCw className="w-5 h-5" strokeWidth={2.5} /> Scan Another Plant
                </StickerButton>
                {/* Share Cure Plan button */}
                <StickerButton variant="gold" size="md" className="w-full" onClick={handleShareCurePlan}>
                  <Share2 className="w-4 h-4" strokeWidth={2.5} /> Share Cure Plan
                </StickerButton>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function BackToScan() {
  return null;
}

/* ---------- Scan → Cure Flow Visual ---------- */
function ScanCureFlow() {
  return (
    <div className="flex items-center gap-0 justify-center">
      {/* Scan circle — completed */}
      <div className="flex flex-col items-center">
        <span className="w-12 h-12 rounded-full bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
          <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
        </span>
        <span className="mt-1 font-display text-[10px] font-bold uppercase text-ink">Scan</span>
      </div>

      {/* Connecting line with animated dot */}
      <div className="relative w-16 sm:w-24 h-[3px] bg-ink/20 mx-2 rounded-full overflow-visible">
        <div className="absolute inset-y-0 left-0 right-0 bg-forest rounded-full" />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-leaf border-[2px] border-ink plantio-dot-bounce" />
      </div>

      {/* Cure circle — active */}
      <div className="flex flex-col items-center">
        <span className="w-12 h-12 rounded-full bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611] plantio-step-pulse">
          <FlaskConical className="w-5 h-5 text-ink" strokeWidth={2.5} />
        </span>
        <span className="mt-1 font-display text-[10px] font-bold uppercase text-ink">Cure</span>
      </div>
    </div>
  );
}

/* ---------- Key Takeaway Box ---------- */
function KeyTakeaway({ tip }: { tip: string }) {
  return (
    <div className="mt-5 rounded-2xl border-[3px] border-ink bg-white text-ink p-4 shadow-[3px_3px_0px_0px_#161611]">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-10 h-10 rounded-xl bg-gold border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611]">
          <Lightbulb className="w-5 h-5 text-ink" strokeWidth={2.5} />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase">Key Takeaway</p>
          <p className="mt-1 text-sm text-ink/80 leading-relaxed">{tip}</p>
        </div>
      </div>
    </div>
  );
}

function CardHeader({
  icon: Icon,
  tint,
  iconColor = "text-white",
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tint: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`shrink-0 w-11 h-11 rounded-2xl ${tint} border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]`}>
        <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={2.5} />
      </span>
      <div>
        <h2 className="font-display text-xl font-bold uppercase leading-tight">{title}</h2>
        {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ---------- Enhanced Step Row with vertical connector ---------- */
function StepRow({ n, step, detail, isLast }: { n: number; step: string; detail: string; isLast?: boolean }) {
  return (
    <li className="flex gap-3 relative">
      {/* Vertical connecting line (behind the step number) */}
      {!isLast && (
        <div className="absolute top-10 bottom-0 left-[17px] w-[3px] bg-forest/30 rounded-full" aria-hidden />
      )}
      <span className="relative z-10 shrink-0 w-9 h-9 rounded-xl bg-forest border-[2.5px] border-ink text-white font-display text-base font-bold flex items-center justify-center shadow-[2px_2px_0px_0px_#161611]">
        {n}
      </span>
      <div className="flex-1 border-l-[3px] border-forest/20 pl-4 pb-4">
        <p className="font-display text-sm font-bold uppercase">{step}</p>
        <p className="text-sm text-ink/75">{detail}</p>
      </div>
    </li>
  );
}
