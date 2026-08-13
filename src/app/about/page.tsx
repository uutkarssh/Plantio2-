"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Leaf,
  ShieldCheck,
  AlertTriangle,
  ScanLine,
  MapPinned,
  Beef,
  IndianRupee,
  CalendarDays,
  Mail,
  ArrowRight,
  Scan,
  MapPin,
  Heart,
  Quote,
  Code2,
  Cpu,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Sparkles,
  Keyboard,
} from "lucide-react";
import {
  StickerCard,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";
import {
  getScanHistory,
  getSavedFields,
  getFavoriteCrops,
} from "@/lib/plantio/storage";

/* Small tool row used inside the "What's inside" card */
function InsideTool({
  icon: Icon,
  label,
  tint,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  tint: string;
}) {
  return (
    <div className="sticker-interactive flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-cream px-3 py-2.5 shadow-[3px_3px_0px_0px_#161611] cursor-pointer">
      <span
        className={`shrink-0 w-9 h-9 rounded-xl ${tint} border-[2.5px] border-ink flex items-center justify-center`}
      >
        <Icon className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
      </span>
      <span className="font-display text-sm font-bold uppercase leading-tight">
        {label}
      </span>
    </div>
  );
}

/* Animated counter — counts from 0 to `target` over 600ms using requestAnimationFrame */
function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  const rafRef = useState<number | null>(null)[0];

  useEffect(() => {
    if (target === 0) return;
    const duration = 600;
    const steps = 20;
    const stepTime = duration / steps;
    let current = 0;
    const inc = Math.max(1, Math.ceil(target / steps));
    const timer = setInterval(() => {
      current += inc;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [target]);

  // silence unused var lint
  void rafRef;

  return <>{count}</>;
}

export default function AboutPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ scans: 0, fields: 0, favs: 0 });

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setStats({
        scans: getScanHistory().length,
        fields: getSavedFields().length,
        favs: getFavoriteCrops().length,
      });
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  const scanCount = stats.scans;
  const fieldCount = stats.fields;
  const favCount = stats.favs;

  return (
    <main className="plantio-grain flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      {/* HEADER */}
      <SectionHeader
        bg="forest"
        title={<div className="flex items-center gap-2"><span className="plantio-embossed">{t("about.title")}</span><StickerBadge variant="leaf">BETA</StickerBadge></div>}
        subtitle={t("about.subtitle")}
        icon={Leaf}
        iconTint="bg-leaf"
      >
        {/* Decorative floating leaves */}
        <span aria-hidden className="plantio-leaf-1 absolute right-8 top-8 text-leaf/20">
          <Leaf className="w-12 h-12" strokeWidth={1.5} />
        </span>
        <span aria-hidden className="plantio-leaf-2 absolute right-24 top-20 text-leaf/15">
          <Leaf className="w-8 h-8" strokeWidth={1.5} />
        </span>
      </SectionHeader>

      {/* STACKED CARDS */}
      <section className="plantio-grain px-5 py-8">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* 1 — WHAT PLANTIO DOES */}
          <StickerCard className="bg-white plantio-pop-in" style={{ animationDelay: "0ms" }}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 rounded-full bg-leaf border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Leaf className="w-7 h-7 text-forest" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-2xl font-bold uppercase">
                  {t("about.whatPlantioDoes")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">
                  {t("about.whatPlantioDoesDesc")}
                </p>
              </div>
            </div>
          </StickerCard>

          {/* 2 — HOW ACCURATE IS THIS? */}
          <StickerCard className="bg-gold plantio-pop-in" style={{ animationDelay: "60ms" }}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 rounded-full bg-white border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <ShieldCheck className="w-7 h-7 text-forest" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-2xl font-bold uppercase">
                    {t("about.howAccurate")}
                  </h2>
                  <StickerBadge variant="warn">
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
                    {t("about.firstOpinion")}
                  </StickerBadge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">
                  {t("about.howAccurateDesc1")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">
                  {t("about.howAccurateDesc2")}
                </p>
              </div>
            </div>
          </StickerCard>

          {/* 3 — WHAT'S INSIDE */}
          <StickerCard className="bg-white plantio-pop-in" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("about.whatsInside")}
              </h2>
            </div>
            <p className="mt-1 text-sm text-ink/70">
              {t("about.fiveGrowerTools")}
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InsideTool icon={ScanLine} label={t("about.diseaseScanner")} tint="bg-forest" />
              <InsideTool icon={MapPinned} label={t("about.landMeasure")} tint="bg-midgreen" />
              <InsideTool icon={Beef} label={t("about.cattleFeed")} tint="bg-warn" />
              <InsideTool icon={IndianRupee} label={t("about.mandiPrices")} tint="bg-gold" />
              <InsideTool
                icon={CalendarDays}
                label={t("about.cropCalendar")}
                tint="bg-forest"
              />
            </div>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1 font-display text-sm font-bold uppercase text-forest"
            >
              {t("about.goToDashboard")} <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </Link>
          </StickerCard>

          {/* 4 — APP STATS DASHBOARD */}
          <StickerCard className="bg-cream plantio-pop-in" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Scan className="w-5 h-5 text-leaf" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("about.appStats")}
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {/* Total Scans */}
              <div className="bg-white border-[2.5px] border-ink rounded-2xl p-3 text-center shadow-[3px_3px_0px_0px_#161611]">
                <Scan className="w-5 h-5 text-forest mx-auto" strokeWidth={2.5} />
                <div className="font-display text-2xl font-bold text-forest mt-2 leading-none">
                  <AnimatedCounter target={scanCount} />
                </div>
                <div className="font-display text-[10px] font-bold uppercase tracking-wide text-ink/70 mt-1">
                  {t("about.totalScans")}
                </div>
              </div>
              {/* Fields Measured */}
              <div className="bg-white border-[2.5px] border-ink rounded-2xl p-3 text-center shadow-[3px_3px_0px_0px_#161611]">
                <MapPin className="w-5 h-5 text-midgreen mx-auto" strokeWidth={2.5} />
                <div className="font-display text-2xl font-bold text-midgreen mt-2 leading-none">
                  <AnimatedCounter target={fieldCount} />
                </div>
                <div className="font-display text-[10px] font-bold uppercase tracking-wide text-ink/70 mt-1">
                  {t("about.fieldsMeasured")}
                </div>
              </div>
              {/* Favorite Crops */}
              <div className="bg-white border-[2.5px] border-ink rounded-2xl p-3 text-center shadow-[3px_3px_0px_0px_#161611]">
                <Heart className="w-5 h-5 text-warn mx-auto" strokeWidth={2.5} />
                <div className="font-display text-2xl font-bold text-warn mt-2 leading-none">
                  <AnimatedCounter target={favCount} />
                </div>
                <div className="font-display text-[10px] font-bold uppercase tracking-wide text-ink/70 mt-1">
                  {t("about.favCrops")}
                </div>
              </div>
            </div>
          </StickerCard>

          {/* 5 — VERSION & TECH */}
          <StickerCard className="bg-white plantio-pop-in" style={{ animationDelay: "180ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Code2 className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("about.versionTech")}
              </h2>
            </div>
            <div className="space-y-3">
              {/* App Version */}
              <div className="flex items-center gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 w-24 shrink-0">
                  {t("about.appVersion")}
                </span>
                <span className="inline-flex items-center border-[2.5px] border-ink rounded-full px-3 py-1 text-xs font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-leaf text-ink">
                  v1.0.0
                </span>
              </div>
              {/* Built With */}
              <div className="flex items-center gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 w-24 shrink-0">
                  {t("about.builtWith")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center border-[2px] border-ink rounded-full px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-cream text-ink">
                    Next.js 16
                  </span>
                  <span className="inline-flex items-center border-[2px] border-ink rounded-full px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-cream text-ink">
                    TypeScript
                  </span>
                  <span className="inline-flex items-center border-[2px] border-ink rounded-full px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-cream text-ink">
                    Tailwind CSS 4
                  </span>
                </div>
              </div>
              {/* AI Power */}
              <div className="flex items-center gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 w-24 shrink-0">
                  {t("about.aiPower")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 border-[2px] border-ink rounded-full px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-forest text-white">
                    <Cpu className="w-3 h-3" strokeWidth={2.5} />
                    GLM-4V Vision
                  </span>
                  <span className="inline-flex items-center gap-1 border-[2px] border-ink rounded-full px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-forest text-white">
                    <Cpu className="w-3 h-3" strokeWidth={2.5} />
                    GLM LLM
                  </span>
                </div>
              </div>
              {/* Icons */}
              <div className="flex items-center gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 w-24 shrink-0">
                  {t("about.icons")}
                </span>
                <span className="inline-flex items-center gap-1 border-[2px] border-ink rounded-full px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-cream text-ink">
                  <ImageIcon className="w-3 h-3" strokeWidth={2.5} />
                  lucide-react
                </span>
              </div>
            </div>
          </StickerCard>

          {/* 6 — TESTIMONIALS */}
          <StickerCard className="bg-gold plantio-pop-in" style={{ animationDelay: "210ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Quote className="w-5 h-5 text-leaf" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("about.whatGrowersSay")}
              </h2>
            </div>
            <div className="space-y-3">
              {[
                { text: t("about.testimonial1"), author: t("about.testimonial1Author") },
                { text: t("about.testimonial2"), author: t("about.testimonial2Author") },
                { text: t("about.testimonial3"), author: t("about.testimonial3Author") },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white border-[2.5px] border-ink rounded-2xl p-4 shadow-[3px_3px_0px_0px_#161611] relative"
                >
                  <Quote
                    className="w-6 h-6 text-leaf/30 absolute top-3 left-3"
                    strokeWidth={2}
                  />
                  <p className="text-sm leading-relaxed text-ink/85 pl-5 italic">
                    {item.text}
                  </p>
                  <p className="mt-2 font-display text-xs font-bold uppercase tracking-wide text-forest pl-5">
                    -- {item.author}
                  </p>
                </div>
              ))}
            </div>
          </StickerCard>

          {/* 7 — FEATURE COMPARISON TABLE */}
          <StickerCard className="bg-white plantio-pop-in" style={{ animationDelay: "240ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-leaf border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <CheckCircle2 className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("about.featureComparison")}
              </h2>
            </div>
            {/* Header row */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div />
              <div className="text-center">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-forest">
                  {t("about.plantio")}
                </span>
              </div>
              <div className="text-center">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-ink/60">
                  {t("about.traditional")}
                </span>
              </div>
            </div>
            {/* Rows */}
            {[
              { label: t("about.featureDisease"), plantio: t("about.featureDiseasePlantio"), traditional: t("about.featureDiseaseTraditional") },
              { label: t("about.featureMeasure"), plantio: t("about.featureMeasurePlantio"), traditional: t("about.featureMeasureTraditional") },
              { label: t("about.featureMandi"), plantio: t("about.featureMandiPlantio"), traditional: t("about.featureMandiTraditional") },
            ].map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-3 gap-2 mb-2"
              >
                <div className="flex items-center">
                  <span className="font-display text-[11px] font-bold uppercase tracking-wide text-ink leading-tight">
                    {row.label}
                  </span>
                </div>
                <div className="bg-leaf border-[2.5px] border-ink rounded-2xl p-2.5 text-center shadow-[2px_2px_0px_0px_#161611] flex flex-col items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-ink" strokeWidth={2.5} />
                  <span className="font-display text-[10px] font-bold uppercase tracking-wide text-ink">
                    {row.plantio}
                  </span>
                </div>
                <div className="bg-cream border-[2.5px] border-ink rounded-2xl p-2.5 text-center shadow-[2px_2px_0px_0px_#161611] flex flex-col items-center justify-center gap-1">
                  <XCircle className="w-4 h-4 text-ink/40" strokeWidth={2.5} />
                  <span className="font-display text-[10px] font-bold uppercase tracking-wide text-ink/60">
                    {row.traditional}
                  </span>
                </div>
              </div>
            ))}
          </StickerCard>

          {/* 8 — WHAT'S NEW (v1.2) */}
          <StickerCard className="bg-cream plantio-pop-in" style={{ animationDelay: "270ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Sparkles className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("about.whatsNew")}
              </h2>
              <StickerBadge variant="leaf">v1.2</StickerBadge>
            </div>
            <ul className="space-y-2">
              <p className="text-sm text-ink/70 mb-2">{t("about.whatsNewDesc")}</p>
              {[
                t("about.featureWeather"),
                t("about.featureGuides"),
                t("about.featureSettings"),
                t("about.featureNotifications"),
                t("about.featureExpenses"),
                t("about.featureJournal"),
                t("about.featureRotation"),
                t("about.featureLibrary"),
                t("about.featureTips"),
                t("about.featureI18n"),
              ].map((feat, i) => (
                <li key={i} className="plantio-list-item flex items-center gap-2" style={{ animationDelay: `${i * 40}ms` }}>
                  <span className="shrink-0 w-2 h-2 rounded-full bg-forest" />
                  <span className="text-sm text-ink/85">{feat}</span>
                </li>
              ))}
            </ul>
          </StickerCard>

          {/* 9 — KEYBOARD SHORTCUTS */}
          <StickerCard className="bg-white plantio-pop-in" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Keyboard className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("about.keyboardShortcuts")}
              </h2>
            </div>
            <div className="space-y-2">
              {[
                { key: "S", desc: t("about.shortcutScan") },
                { key: "M", desc: t("about.shortcutMeasure") },
                { key: "C", desc: t("about.shortcutCattle") },
                { key: "A", desc: t("about.shortcutAbout") },
                { key: "H", desc: t("about.shortcutHome") },
              ].map((sc, i) => (
                <div key={i} className="plantio-list-item flex items-center gap-3" style={{ animationDelay: `${i * 40}ms` }}>
                  <kbd className="inline-flex items-center justify-center w-8 h-8 rounded-lg border-[2.5px] border-ink bg-cream font-display text-sm font-bold uppercase shadow-[2px_2px_0px_0px_#161611]">
                    {sc.key}
                  </kbd>
                  <span className="text-sm text-ink/85">{sc.desc}</span>
                </div>
              ))}
            </div>
          </StickerCard>

          {/* 10 — CONTACT / FEEDBACK */}
          <StickerCard className="bg-leaf plantio-pop-in" style={{ animationDelay: "330ms" }}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 rounded-full bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Mail className="w-7 h-7 text-leaf" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-2xl font-bold uppercase">
                  {t("about.contactFeedback")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">
                  {t("about.contactDesc")}
                </p>
                <a
                  href="mailto:utkarshmaurya917027@gmail.com"
                  className="mt-3 inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-white px-4 py-2 font-display text-sm font-bold uppercase shadow-[3px_3px_0px_0px_#161611] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
                >
                  <Mail className="w-4 h-4 text-forest" strokeWidth={2.5} />
                  utkarshmaurya917027@gmail.com
                </a>
                <p className="mt-2 text-xs text-ink/70">
                  {t("about.demoAddress")}
                </p>
              </div>
            </div>
          </StickerCard>

          {/* 11 — MEET THE BUILDER */}
          <StickerCard className="bg-white plantio-pop-in" style={{ animationDelay: "360ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <StickerBadge variant="forest">{t("about.meetTheBuilder")}</StickerBadge>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Avatar — prefer the Plantio icon image */}
              <div className="shrink-0 w-20 h-20 rounded-full overflow-hidden border-[3px] border-ink bg-forest flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <img
                  src="/icons/icon-192.png"
                  alt="Plantio icon"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-3xl font-bold uppercase leading-none">
                  {t("about.utkarshMaurya")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">
                  {t("about.builderDesc")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StickerBadge variant="leaf">
                <Leaf className="w-3.5 h-3.5" strokeWidth={2.5} />
                {t("about.soloBuild")}
              </StickerBadge>
              <StickerBadge variant="gold">{t("about.aiForGrowers")}</StickerBadge>
            </div>
          </StickerCard>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-8 text-center">
        {/* Decorative line */}
        <div className="mx-auto w-24 h-1 rounded-full bg-forest/30 mb-4" />
        <div className="flex items-center justify-center gap-2 mb-3">
          <img
            src="/icons/icon-192.png"
            alt="Plantio"
            className="w-6 h-6 rounded"
          />
          <span className="font-display text-sm font-bold uppercase tracking-wide text-ink">Plantio</span>
        </div>
        <span className="inline-flex items-center border-[2px] border-ink rounded-full px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-leaf text-ink mb-3">
          v1.2.0
        </span>
        <p className="font-display text-xs font-bold uppercase tracking-wide text-ink/70">
          {t("about.madeForGrowers")}
        </p>
      </footer>
    </main>
  );
}
