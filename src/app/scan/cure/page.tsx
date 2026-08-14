"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getIdToken } from "firebase/auth";
import {
  ArrowLeft,
  FlaskConical,
  Leaf,
  Wheat,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Beaker,
  Share2,
} from "lucide-react";
import { StickerCard, StickerButton, StickerBadge, SkeletonCard, ErrorRetryCard } from "@/components/plantio/sticker";
import { getLastScan } from "@/lib/plantio/storage";
import { firebaseAuth } from "@/lib/firebase/config";

interface CureStep { step: string; detail: string; }
interface FertilizerItem { name: string; amount: string; frequency: string; }
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
  const [scan, setScan] = useState<any>(null);
  const [plan, setPlan] = useState<CurePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    const last = getLastScan() as any;
    setScan(last);
    if (!last) {
      setLoading(false);
      return;
    }

    if (last.cure_plan) {
      setPlan(last.cure_plan as CurePlan);
      setLoading(false);
      return;
    }

    if (!last.disease_name) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const user = firebaseAuth.currentUser;
      const token = user ? await getIdToken(user, true) : null;
      const res = await fetch("/api/cure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          disease_name: last.disease_name,
          plant_name: last.plant_name,
          scan_id: last.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setPlan(data.plan);
      setScan({ ...last, cure_plan: data.plan });
      try {
        localStorage.setItem("plantio-last-scan", JSON.stringify({ ...last, cure_plan: data.plan }));
      } catch {}
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleShare = async () => {
    if (!plan || !scan) return;
    const lines = [
      `Cure Plan for ${scan.disease_name || "Your Plant"}`,
      `Plant: ${scan.plant_name || "Unknown"}`,
      "",
      "IMMEDIATE TREATMENT:",
      ...(plan.immediate_treatment || []).map((s, i) => `${i + 1}. ${s.step}: ${s.detail}`),
      "",
      "ORGANIC OPTION:",
      ...(plan.organic_option || []).map((s) => `- ${s.step}: ${s.detail}`),
      "",
      "CHEMICAL OPTION:",
      ...(plan.chemical_option || []).map((s) => `- ${s.step}: ${s.detail}`),
      "",
      "PREVENTION:",
      ...(plan.prevention_tips || []).map((s) => `- ${s}`),
      "",
      "— Made with Plantio",
    ];
    const text = lines.join("\n");
    try {
      if (navigator.share) await navigator.share({ title: `Cure Plan: ${scan.disease_name}`, text });
      else await navigator.clipboard.writeText(text);
    } catch {}
  };

  if (!loading && !scan) {
    return (
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
        <section className="bg-gold border-b-[3px] border-ink px-5 py-8">
          <div className="mx-auto max-w-2xl">
            <button onClick={() => router.push("/scan")} className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase bg-cream border-[2.5px] border-ink rounded-full px-3 py-1.5 shadow-[3px_3px_0px_0px_#161611]"><ArrowLeft className="w-3.5 h-3.5" /> Back to Scan</button>
          </div>
        </section>
        <section className="px-5 py-6"><div className="mx-auto max-w-2xl"><StickerCard className="bg-cream"><h1 className="font-display text-2xl font-bold uppercase">No scan to cure yet</h1><p className="mt-2 text-sm text-ink/70">Scan a plant first, then come back here for a cure plan.</p><StickerButton className="mt-4" variant="forest" size="md" onClick={() => router.push("/scan")}>Scan a Plant <ArrowRight className="w-4 h-4" /></StickerButton></StickerCard></div></section>
      </main>
    );
  }

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <section className="bg-gold border-b-[3px] border-ink px-5 py-8 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 plantio-dots-ink pointer-events-none" />
        <div className="relative mx-auto max-w-2xl">
          <button onClick={() => router.push("/scan")} className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase mb-4 bg-cream border-[2.5px] border-ink rounded-full px-3 py-1.5 shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5"><ArrowLeft className="w-3.5 h-3.5" /> Back to Scan</button>
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-14 h-14 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0px_0px_#161611]"><FlaskConical className="w-7 h-7 text-white" /></span>
            <div className="min-w-0">
              <p className="font-display text-xs font-bold uppercase text-ink/70">Cure & Fertilizer Plan</p>
              <h1 className="font-display text-2xl sm:text-4xl font-bold uppercase leading-tight">{scan?.disease_name || "Your Plant"}</h1>
              <div className="mt-2 flex flex-wrap gap-2">{scan?.plant_name && <StickerBadge variant="forest">{scan.plant_name}</StickerBadge>}{scan && <StickerBadge variant="warn">{Math.round((scan.confidence || 0) * 100)}% confident</StickerBadge>}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {loading && <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}
          {error && !loading && <ErrorRetryCard message="Couldn't build the cure plan right now. Please retry." onRetry={load} secondaryLabel="Back to Scan" onSecondary={() => router.push("/scan")} />}
          {!loading && !error && plan && (
            <>
              <StickerCard className="bg-white">
                <CardHeader icon={Beaker} tint="bg-warn" title="Immediate Treatment" subtitle="Do these steps right away" />
                <ol className="mt-4 space-y-3">{plan.immediate_treatment?.map((s, i) => <li key={i} className="flex gap-3"><span className="shrink-0 w-8 h-8 rounded-full bg-gold border-[2.5px] border-ink flex items-center justify-center font-display font-bold">{i + 1}</span><div><p className="font-display text-sm font-bold uppercase">{s.step}</p><p className="text-sm text-ink/80">{s.detail}</p></div></li>)}</ol>
              </StickerCard>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <StickerCard className="bg-leaf"><CardHeader icon={Leaf} tint="bg-forest" title="Organic Option" subtitle="Gentle, natural" /><ul className="mt-4 space-y-3">{plan.organic_option?.map((s, i) => <li key={i} className="flex gap-2"><Leaf className="w-5 h-5 text-forest shrink-0 mt-0.5" /><div><p className="font-display text-sm font-bold uppercase">{s.step}</p><p className="text-xs text-ink/80">{s.detail}</p></div></li>)}</ul></StickerCard>
                <StickerCard className="bg-warn text-white"><CardHeader icon={FlaskConical} tint="bg-white" iconColor="text-warn" title="Chemical Option" subtitle="Use carefully" /><ul className="mt-4 space-y-3">{plan.chemical_option?.map((s, i) => <li key={i} className="flex gap-2"><FlaskConical className="w-5 h-5 text-white shrink-0 mt-0.5" /><div><p className="font-display text-sm font-bold uppercase text-white">{s.step}</p><p className="text-xs text-white/90">{s.detail}</p></div></li>)}</ul><p className="mt-3 text-[11px] bg-ink/30 rounded-lg p-2 text-white/90">Follow label dosage and use appropriate protective equipment.</p></StickerCard>
              </div>

              <StickerCard className="bg-white"><CardHeader icon={Wheat} tint="bg-gold" title="Fertilizer & Nutrients" subtitle="What to apply, how much, how often" /><ul className="mt-4 space-y-2">{plan.fertilizer_and_nutrients?.map((f, i) => <li key={i} className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-cream p-3"><span className="shrink-0 w-10 h-10 rounded-xl bg-forest border-[2.5px] border-ink flex items-center justify-center"><Wheat className="w-5 h-5 text-white" /></span><div className="flex-1 min-w-0"><p className="font-display text-sm font-bold uppercase">{f.name}</p><p className="text-xs text-ink/70">{f.frequency}</p></div><StickerBadge variant="leaf">{f.amount}</StickerBadge></li>)}</ul></StickerCard>

              <StickerCard className="bg-midgreen text-white"><CardHeader icon={ShieldCheck} tint="bg-gold" title="Prevention Tips" subtitle="Stop it spreading or coming back" /><ul className="mt-4 space-y-2">{plan.prevention_tips?.map((item, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-leaf shrink-0" /><span className="text-sm text-white/95">{item}</span></li>)}</ul></StickerCard>

              <div className="rounded-2xl border-[3px] border-ink bg-cream p-4 flex gap-2"><AlertTriangle className="w-5 h-5 text-warn shrink-0" /><p className="text-xs text-ink/80">Plantio gives a fast first opinion. For high-value crops or when in doubt, confirm with a local agricultural officer before applying chemicals.</p></div>

              <div className="flex flex-col gap-3">
                <StickerButton variant="forest" size="lg" className="w-full" onClick={() => router.push("/scan")}><RefreshCw className="w-5 h-5" /> Scan Another Plant</StickerButton>
                <StickerButton variant="gold" size="md" className="w-full" onClick={handleShare}><Share2 className="w-4 h-4" /> Share Cure Plan</StickerButton>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function CardHeader({ icon: Icon, tint, iconColor = "text-white", title, subtitle }: { icon: any; tint: string; iconColor?: string; title: string; subtitle: string }) {
  return <div className="flex items-center gap-3"><span className={`shrink-0 w-11 h-11 rounded-2xl ${tint} border-[2.5px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]`}><Icon className={`w-5 h-5 ${iconColor}`} /></span><div><p className="font-display text-base font-bold uppercase">{title}</p><p className="text-xs text-ink/65">{subtitle}</p></div></div>;
}