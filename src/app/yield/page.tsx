"use client";
import { useState, useEffect, useRef } from "react";
import {
  Wheat,
  Sprout,
  Leaf,
  Droplets,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Calculator,
  IndianRupee,
  BarChart3,
  Lightbulb,
  RotateCcw,
  MapPin,
  Sun,
  Flower2,
  TreePine,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";

/* ──────────────────────────────────────────────────────────────────
   DATA — realistic Indian agriculture yield & price data
   ────────────────────────────────────────────────────────────────── */

type CropId =
  | "wheat"
  | "rice"
  | "maize"
  | "cotton"
  | "soybean"
  | "tomato"
  | "potato"
  | "sugarcane"
  | "mustard"
  | "groundnut";

const CROPS: {
  id: CropId;
  avgQHa: number; // national avg yield in quintals/hectare
  price: number; // MSP or market price per quintal (INR)
  i18nKey: string;
  tipKey: string;
}[] = [
  { id: "wheat", avgQHa: 35, price: 2275, i18nKey: "yield.wheat", tipKey: "yield.tipWheat" },
  { id: "rice", avgQHa: 40, price: 2320, i18nKey: "yield.rice", tipKey: "yield.tipRice" },
  { id: "maize", avgQHa: 30, price: 2090, i18nKey: "yield.maize", tipKey: "yield.tipMaize" },
  { id: "cotton", avgQHa: 15, price: 6620, i18nKey: "yield.cotton", tipKey: "yield.tipCotton" },
  { id: "soybean", avgQHa: 12, price: 4600, i18nKey: "yield.soybean", tipKey: "yield.tipSoybean" },
  { id: "tomato", avgQHa: 250, price: 2000, i18nKey: "yield.tomato", tipKey: "yield.tipTomato" },
  { id: "potato", avgQHa: 220, price: 1500, i18nKey: "yield.potato", tipKey: "yield.tipPotato" },
  { id: "sugarcane", avgQHa: 700, price: 350, i18nKey: "yield.sugarcane", tipKey: "yield.tipSugarcane" },
  { id: "mustard", avgQHa: 12, price: 5650, i18nKey: "yield.mustard", tipKey: "yield.tipMustard" },
  { id: "groundnut", avgQHa: 15, price: 6377, i18nKey: "yield.groundnut", tipKey: "yield.tipGroundnut" },
];

function CropIcon({ id, className }: { id: CropId; className?: string }) {
  const cls = className ?? "w-5 h-5";
  switch (id) {
    case "wheat": return <Wheat className={cls} strokeWidth={2.5} />;
    case "rice": return <Sprout className={cls} strokeWidth={2.5} />;
    case "maize": return <Sun className={cls} strokeWidth={2.5} />;
    case "cotton": return <Flower2 className={cls} strokeWidth={2.5} />;
    case "soybean": return <Leaf className={cls} strokeWidth={2.5} />;
    case "tomato": return <TreePine className={cls} strokeWidth={2.5} />;
    case "potato": return <MapPin className={cls} strokeWidth={2.5} />;
    case "sugarcane": return <Wheat className={cls} strokeWidth={2.5} />;
    case "mustard": return <Flower2 className={cls} strokeWidth={2.5} />;
    case "groundnut": return <Sprout className={cls} strokeWidth={2.5} />;
  }
}

function cropIconTint(id: CropId): string {
  const tints: Record<CropId, string> = {
    wheat: "bg-gold", rice: "bg-leaf", maize: "bg-gold", cotton: "bg-cream", soybean: "bg-leaf",
    tomato: "bg-warn", potato: "bg-gold", sugarcane: "bg-midgreen", mustard: "bg-gold", groundnut: "bg-cream",
  };
  return tints[id];
}

const SOIL_MULT: Record<string, number> = { loam: 1.0, clay: 0.85, sandy: 0.7 };
const IRRIG_MULT: Record<string, number> = { drip: 1.3, tubewell: 1.15, canal: 1.1, rainfed: 0.8 };
const FERT_MULT: Record<string, number> = { both: 1.25, chemical: 1.15, organic: 1.05, none: 0.75 };
const AREA_TO_HA: Record<string, number> = { acres: 0.404686, bigha: 0.2529, hectares: 1.0 };
const SOIL_OPTS = [
  { id: "loam", i18nKey: "yield.soilLoam" }, { id: "clay", i18nKey: "yield.soilClay" }, { id: "sandy", i18nKey: "yield.soilSandy" },
] as const;
const IRRIG_OPTS = [
  { id: "drip", i18nKey: "yield.irrigDrip" }, { id: "tubewell", i18nKey: "yield.irrigTubewell" }, { id: "canal", i18nKey: "yield.irrigCanal" }, { id: "rainfed", i18nKey: "yield.irrigRainfed" },
] as const;
const FERT_OPTS = [
  { id: "none", i18nKey: "yield.fertNone" }, { id: "organic", i18nKey: "yield.fertOrganic" }, { id: "chemical", i18nKey: "yield.fertChemical" }, { id: "both", i18nKey: "yield.fertBoth" },
] as const;
const AREA_UNITS = [
  { id: "acres", i18nKey: "yield.acres" }, { id: "bigha", i18nKey: "yield.bigha" }, { id: "hectares", i18nKey: "yield.hectares" },
] as const;

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    if (diff === 0) { queueMicrotask(() => setDisplay(value)); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    prevValue.current = value;
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);
  return <>{display.toLocaleString("en-IN")}</>;
}

function ComparisonBar({ yourYield, avgYield, yourLabel, avgLabel }: { yourYield: number; avgYield: number; yourLabel: string; avgLabel: string }) {
  const maxVal = Math.max(yourYield, avgYield, 1);
  const yourPct = Math.round((yourYield / maxVal) * 100);
  const avgPct = Math.round((avgYield / maxVal) * 100);
  const isAbove = yourYield >= avgYield;
  return (
    <div className="space-y-3">
      <div><div className="flex items-center justify-between mb-1"><span className="font-display text-[11px] font-bold uppercase tracking-wide">{yourLabel}</span><span className="font-display text-xs font-bold">{yourYield.toLocaleString("en-IN")} q/ha</span></div><div className="h-5 rounded-full bg-cream border-[2.5px] border-ink overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ease-out ${isAbove ? "bg-leaf" : "bg-gold"}`} style={{ width: `${yourPct}%` }} /></div></div>
      <div><div className="flex items-center justify-between mb-1"><span className="font-display text-[11px] font-bold uppercase tracking-wide text-ink/70">{avgLabel}</span><span className="font-display text-xs font-bold text-ink/70">{avgYield.toLocaleString("en-IN")} q/ha</span></div><div className="h-5 rounded-full bg-cream border-[2.5px] border-ink overflow-hidden"><div className="h-full rounded-full bg-midgreen transition-all duration-700 ease-out" style={{ width: `${avgPct}%` }} /></div></div>
    </div>
  );
}

export default function YieldPage() {
  const { t } = useI18n();
  const [crop, setCrop] = useState<CropId | "">("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("acres");
  const [soil, setSoil] = useState("");
  const [irrig, setIrrig] = useState("");
  const [fert, setFert] = useState("");
  const [prevYield, setPrevYield] = useState("");
  const [result, setResult] = useState<{ yieldQHa: number; yieldTotal: number; revenue: number; nationalAvgQHa: number } | null>(null);

  const canCalculate = crop !== "" && area !== "" && Number(area) > 0 && soil !== "" && irrig !== "" && fert !== "";

  const calculate = () => {
    if (!canCalculate || !crop) return;
    const cropData = CROPS.find((c) => c.id === crop)!;
    const areaNum = Number(area);
    const hectares = areaNum * (AREA_TO_HA[areaUnit] ?? 0.404686);
    let yieldQHa = cropData.avgQHa;
    yieldQHa *= SOIL_MULT[soil] ?? 1;
    yieldQHa *= IRRIG_MULT[irrig] ?? 1;
    yieldQHa *= FERT_MULT[fert] ?? 1;
    const prevNum = Number(prevYield);
    if (prevNum > 0) {
      const prevQHa = prevNum / (AREA_TO_HA[areaUnit] ?? 0.404686);
      yieldQHa = yieldQHa * 0.7 + prevQHa * 0.3;
    }
    const yieldTotal = yieldQHa * hectares;
    const revenue = yieldTotal * cropData.price;
    setResult({ yieldQHa: Math.round(yieldQHa * 10) / 10, yieldTotal: Math.round(yieldTotal * 10) / 10, revenue: Math.round(revenue), nationalAvgQHa: cropData.avgQHa });
  };

  const reset = () => { setCrop(""); setArea(""); setAreaUnit("acres"); setSoil(""); setIrrig(""); setFert(""); setPrevYield(""); setResult(null); };
  const selectedCropData = crop ? CROPS.find((c) => c.id === crop) : null;

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <SectionHeader bg="gold" text="ink" title={t("yield.title")} subtitle={t("yield.subtitle")} icon={Wheat} iconTint="bg-forest">
        <div className="mt-4 flex items-center gap-2"><span className="shrink-0 w-11 h-11 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"><Calculator className="w-5 h-5 text-white" strokeWidth={2.5} /></span><StickerBadge variant="forest"><span className="plantio-status-dot mr-1.5 inline-block align-middle" />{t("yield.estimatedYield")}</StickerBadge></div>
      </SectionHeader>
      <section className="plantio-grain px-5 py-4 bg-cream"><div className="mx-auto max-w-2xl space-y-4 plantio-section-gap">
        <StickerCard className="bg-white plantio-pop-in"><div className="flex items-center gap-3 mb-4"><span className="shrink-0 w-11 h-11 rounded-2xl bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"><Sprout className="w-5 h-5 text-ink" strokeWidth={2.5} /></span><div><h2 className="font-display text-xl font-bold uppercase leading-tight">{t("yield.selectCrop")}</h2><p className="text-xs opacity-70">{t("yield.subtitle")}</p></div></div><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{CROPS.map((c) => { const active = crop === c.id; return <button key={c.id} type="button" onClick={() => setCrop(c.id)} aria-pressed={active} className={["sticker-interactive flex items-center gap-2 px-3 py-2.5 text-sm font-display font-bold uppercase tracking-wide border-[3px] border-ink rounded-full transition-all", active ? "bg-leaf text-ink shadow-[3px_3px_0px_0px_#161611]" : "bg-cream text-ink/80 shadow-[3px_3px_0px_0px_#161611]"].join(" ")}><span className={`shrink-0 w-7 h-7 rounded-lg ${active ? "bg-ink" : cropIconTint(c.id)} border-[2px] border-ink flex items-center justify-center`}><CropIcon id={c.id} className={`w-3.5 h-3.5 ${active ? "text-leaf" : "text-ink"}`} /></span>{t(c.i18nKey)}</button>; })}</div></StickerCard>
        <StickerCard className="bg-white plantio-pop-in"><div className="flex items-center gap-3 mb-4"><span className="shrink-0 w-11 h-11 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"><Calculator className="w-5 h-5 text-white" strokeWidth={2.5} /></span><div><h2 className="font-display text-xl font-bold uppercase leading-tight">{t("yield.area")}</h2></div></div>
          <div className="flex items-stretch gap-2"><input id="yield-area" type="number" inputMode="decimal" min={0} step={0.5} value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("yield.areaPlaceholder")} className="flex-1 min-w-0 rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 text-base font-medium outline-none focus:bg-white focus:ring-[3px] focus:ring-forest/40" /><div className="flex gap-1">{AREA_UNITS.map((u) => { const active = areaUnit === u.id; return <button key={u.id} type="button" onClick={() => setAreaUnit(u.id)} aria-pressed={active} className={["sticker-interactive px-3 py-2 text-xs font-display font-bold uppercase tracking-wide border-[3px] border-ink rounded-full transition-all whitespace-nowrap", active ? "bg-gold text-ink shadow-[2px_2px_0px_0px_#161611]" : "bg-cream text-ink/70 shadow-[2px_2px_0px_0px_#161611]"].join(" ")}>{t(u.i18nKey)}</button>; })}</div></div>
          <div className="mt-5"><label className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide mb-2"><MapPin className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("yield.soilType")}</label><div className="grid grid-cols-3 gap-2">{SOIL_OPTS.map((s) => { const active = soil === s.id; return <button key={s.id} type="button" onClick={() => setSoil(s.id)} aria-pressed={active} className={["sticker-interactive sticker-pill px-3 py-2.5 text-sm font-display font-bold uppercase tracking-wide border-[3px] border-ink rounded-full transition-all", active ? "bg-leaf text-ink shadow-[3px_3px_0px_0px_#161611]" : "bg-cream text-ink/80 shadow-[3px_3px_0px_0px_#161611]"].join(" ")}>{t(s.i18nKey)}</button>; })}</div></div>
          <div className="mt-5"><label className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide mb-2"><Droplets className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("yield.irrigation")}</label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{IRRIG_OPTS.map((i) => { const active = irrig === i.id; return <button key={i.id} type="button" onClick={() => setIrrig(i.id)} aria-pressed={active} className={["sticker-interactive sticker-pill px-3 py-2.5 text-sm font-display font-bold uppercase tracking-wide border-[3px] border-ink rounded-full transition-all", active ? "bg-midgreen text-white shadow-[3px_3px_0px_0px_#161611]" : "bg-cream text-ink/80 shadow-[3px_3px_0px_0px_#161611]"].join(" ")}>{t(i.i18nKey)}</button>; })}</div></div>
          <div className="mt-5"><label className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide mb-2"><FlaskConical className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("yield.fertilizer")}</label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{FERT_OPTS.map((f) => { const active = fert === f.id; return <button key={f.id} type="button" onClick={() => setFert(f.id)} aria-pressed={active} className={["sticker-interactive sticker-pill px-3 py-2.5 text-sm font-display font-bold uppercase tracking-wide border-[3px] border-ink rounded-full transition-all", active ? "bg-gold text-ink shadow-[3px_3px_0px_0px_#161611]" : "bg-cream text-ink/80 shadow-[3px_3px_0px_0px_#161611]"].join(" ")}>{t(f.i18nKey)}</button>; })}</div></div>
          <div className="mt-5"><label htmlFor="yield-prev" className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide mb-2"><BarChart3 className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("yield.previousYield")}</label><div className="flex items-stretch gap-2"><input id="yield-prev" type="number" inputMode="decimal" min={0} step={1} value={prevYield} onChange={(e) => setPrevYield(e.target.value)} placeholder={t("yield.previousYieldPlaceholder")} className="flex-1 min-w-0 rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 text-base font-medium outline-none focus:bg-white focus:ring-[3px] focus:ring-forest/40" /><span className="shrink-0 flex items-center px-3 rounded-2xl border-[3px] border-ink bg-cream text-xs font-display font-bold uppercase text-ink/60">{t("yield.previousYieldUnit")}</span></div></div>
          <div className="mt-5"><StickerButton variant="gold" size="lg" className="w-full" onClick={calculate} disabled={!canCalculate}><Calculator className="w-5 h-5" strokeWidth={2.5} /> {t("yield.calculate")}</StickerButton></div>
        </StickerCard>
        {result && selectedCropData && <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 plantio-pop-in"><StickerCard className="bg-white plantio-corner-fold"><div className="flex items-center gap-3 mb-3"><span className={`shrink-0 w-11 h-11 rounded-2xl ${cropIconTint(crop as CropId)} border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]`}><CropIcon id={crop as CropId} className="w-5 h-5 text-ink" /></span><div><h2 className="font-display text-lg font-bold uppercase leading-tight">{t("yield.estimatedYield")}</h2><p className="text-[11px] opacity-70">{t(selectedCropData.i18nKey)}</p></div></div><div className="text-center py-3"><p className="font-display text-4xl sm:text-5xl font-bold text-forest leading-none plantio-embossed"><AnimatedNumber value={result.yieldTotal} /></p><p className="mt-1 font-display text-xs font-bold uppercase tracking-wide text-ink/60">{t("yield.quintals")} ({t("yield.perHectare")}: <AnimatedNumber value={result.yieldQHa} />)</p></div></StickerCard>
            <StickerCard className="bg-white plantio-corner-fold"><div className="flex items-center gap-3 mb-3"><span className="shrink-0 w-11 h-11 rounded-2xl bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"><IndianRupee className="w-5 h-5 text-ink" strokeWidth={2.5} /></span><div><h2 className="font-display text-lg font-bold uppercase leading-tight">{t("yield.estimatedRevenue")}</h2><p className="text-[11px] opacity-70">{t("yield.revenueNote")}</p></div></div><div className="text-center py-3"><p className="font-display text-4xl sm:text-5xl font-bold text-forest leading-none plantio-embossed"><span className="text-2xl sm:text-3xl">&#8377;</span><AnimatedNumber value={result.revenue} /></p><p className="mt-1 font-display text-xs font-bold uppercase tracking-wide text-ink/60">{t("yield.revenueNote")}</p></div></StickerCard></div>
          <StickerCard className="bg-white plantio-pop-in"><div className="flex items-center gap-3 mb-4"><span className="shrink-0 w-11 h-11 rounded-2xl bg-midgreen border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"><BarChart3 className="w-5 h-5 text-white" strokeWidth={2.5} /></span><div><h2 className="font-display text-xl font-bold uppercase leading-tight">{t("yield.comparison")}</h2><div className="mt-0.5"><StickerBadge variant={result.yieldQHa >= result.nationalAvgQHa ? "leaf" : "warn"} className="plantio-badge-shine">{result.yieldQHa >= result.nationalAvgQHa ? <><TrendingUp className="w-3 h-3" strokeWidth={2.5} /> {t("yield.aboveAvg")}</> : <><TrendingDown className="w-3 h-3" strokeWidth={2.5} /> {t("yield.belowAvg")}</>}</StickerBadge></div></div></div><ComparisonBar yourYield={result.yieldQHa} avgYield={result.nationalAvgQHa} yourLabel={t("yield.yourYield")} avgLabel={t("yield.nationalAvg")} /></StickerCard>
          <StickerCard className="bg-white plantio-pop-in"><div className="flex items-center gap-3 mb-4"><span className="shrink-0 w-11 h-11 rounded-2xl bg-leaf border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"><Lightbulb className="w-5 h-5 text-ink" strokeWidth={2.5} /></span><div><h2 className="font-display text-xl font-bold uppercase leading-tight">{t("yield.tips")}</h2><p className="text-xs opacity-70">{t(selectedCropData.i18nKey)}</p></div></div><div className="space-y-3"><div className="plantio-list-item rounded-2xl border-[2.5px] border-ink bg-cream p-4" style={{ "--i": 0 } as React.CSSProperties}><p className="text-sm text-ink/90 leading-relaxed">{t(selectedCropData.tipKey)}</p></div></div></StickerCard>
          <StickerButton variant="forest" size="lg" className="w-full plantio-pop-in" onClick={reset}><RotateCcw className="w-5 h-5" strokeWidth={2.5} /> {t("yield.recalculate")}</StickerButton>
        </>}
      </div></section>
    </main>
  );
}
