"use client";
import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  ChevronDown,
  Sprout,
  FlaskConical,
  ShieldCheck,
  Leaf,
  Bug,
  Worm,
  Landmark,
  IndianRupee,
  Beaker,
  MessageSquarePlus,
  Trash2,
  Send,
  Sun,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";
import {
  getCommunityTips,
  addCommunityTip,
  deleteCommunityTip,
  type CommunityTip,
} from "@/lib/plantio/storage";

/* ================================================================
   Collapsible section
   ================================================================ */
function CollapsibleSection({
  title,
  badge,
  badgeVariant = "leaf",
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  badge?: string;
  badgeVariant?: "leaf" | "gold" | "warn" | "forest" | "cream";
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <StickerCard className={className}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase text-ink">
            {title}
          </h3>
          {badge && <StickerBadge variant={badgeVariant}>{badge}</StickerBadge>}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-ink shrink-0 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2.5}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-[2000px] mt-4 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </StickerCard>
  );
}

/* ================================================================
   NPK data (static)
   ================================================================ */
const NPK_DATA = [
  { key: "urea", ratio: "46-0-0", useEn: "Top dressing for all crops" },
  { key: "dap", ratio: "18-46-0", useEn: "Basal dose at sowing" },
  { key: "mop", ratio: "0-0-60", useEn: "Potash for fruits & tubers" },
  { key: "npk191919", ratio: "19-19-19", useEn: "Balanced basal for all crops" },
  { key: "npk201010", ratio: "20-10-10", useEn: "Cereals (wheat, rice)" },
  { key: "ssp", ratio: "0-16-0", useEn: "Phosphorus for legumes & oilseeds" },
  { key: "npk12816", ratio: "12-8-16", useEn: "Vegetables & horticulture" },
  { key: "npk101020", ratio: "10-10-20", useEn: "Root crops & sugarcane" },
];

/* ================================================================
   Soil pH data (static)
   ================================================================ */
const PH_DATA = [
  { range: "< 4.5", label: "Strongly Acidic", color: "bg-warn", cropsEn: "Tea, cassava, sweet potato" },
  { range: "4.5 – 5.5", label: "Acidic", color: "bg-gold", cropsEn: "Rice, potato, tea, rubber" },
  { range: "5.5 – 6.5", label: "Slightly Acidic", color: "bg-leaf", cropsEn: "Most crops, maize, soybean, groundnut" },
  { range: "6.5 – 7.5", label: "Neutral (Ideal)", color: "bg-midgreen", cropsEn: "Wheat, cotton, sugarcane, most vegetables" },
  { range: "7.5 – 8.5", label: "Alkaline", color: "bg-gold", cropsEn: "Barley, sugarbeet, alfalfa, mustard" },
  { range: "> 8.5", label: "Strongly Alkaline", color: "bg-warn", cropsEn: "Very few — needs amendment" },
];

/* ================================================================
   Main page
   ================================================================ */
export default function GuidesPage() {
  const { t } = useI18n();
  const [tips, setTips] = useState<CommunityTip[]>([]);
  const [newTip, setNewTip] = useState("");
  const [mounted, setMounted] = useState(false);

  /* hydrate tips from localStorage on mount */
  useEffect(() => {
    /* Defer to microtask to avoid calling setState synchronously in the
     * effect body (react-hooks/set-state-in-effect). Reading from a
     * browser API (localStorage) is an explicitly supported external-
     * system sync pattern. */
    queueMicrotask(() => {
      setMounted(true);
      setTips(getCommunityTips());
    });
  }, []);

  /* listen for storage events (other tabs) */
  useEffect(() => {
    const handler = () => setTips(getCommunityTips());
    window.addEventListener("plantio-tips-updated", handler);
    return () => window.removeEventListener("plantio-tips-updated", handler);
  }, []);

  const handleSubmitTip = useCallback(() => {
    const text = newTip.trim();
    if (!text) return;
    const tip: CommunityTip = {
      id: `tip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      createdAt: Date.now(),
    };
    addCommunityTip(tip);
    setTips(getCommunityTips());
    setNewTip("");
  }, [newTip]);

  const handleDeleteTip = useCallback((id: string) => {
    deleteCommunityTip(id);
    setTips(getCommunityTips());
  }, []);

  return (
    <main className="min-h-screen bg-cream pb-24">
      {/* ─── Section Header ─── */}
      <SectionHeader
        title={t("guides.title")}
        subtitle={t("guides.subtitle")}
        bg="forest"
        icon={BookOpen}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6 mt-6">
        {/* ─── Seasonal Guides ─── */}
        <section aria-labelledby="seasonal-heading">
          <h2
            id="seasonal-heading"
            className="font-display text-xl font-bold uppercase text-ink mb-3 flex items-center gap-2"
          >
            <Sun className="w-5 h-5 text-gold" strokeWidth={2.5} />
            {t("guides.seasonalGuides")}
          </h2>

          {/* Kharif */}
          <div className="plantio-pop-in" style={{ animationDelay: "0ms" }}>
            <CollapsibleSection
              title={t("guides.kharifTitle")}
              badge={t("guides.kharifPeriod")}
              badgeVariant="gold"
              defaultOpen={true}
            >
              <div className="space-y-3">
                <div>
                  <p className="font-display text-sm font-bold uppercase text-forest">
                    {t("guides.kharifCrops")}
                  </p>
                  <p className="text-sm text-ink/80 mt-1 leading-relaxed">
                    {t("guides.kharifCropsList")}
                  </p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold uppercase text-forest">
                    {t("guides.kharifSowing")}
                  </p>
                  <p className="text-sm text-ink/80 mt-1 leading-relaxed">
                    {t("guides.kharifSowingInfo")}
                  </p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold uppercase text-forest">
                    {t("guides.kharifPractices")}
                  </p>
                  <p className="text-sm text-ink/80 mt-1 leading-relaxed">
                    {t("guides.kharifPracticesInfo")}
                  </p>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Rabi */}
          <div className="plantio-pop-in mt-4" style={{ animationDelay: "80ms" }}>
            <CollapsibleSection
              title={t("guides.rabiTitle")}
              badge={t("guides.rabiPeriod")}
              badgeVariant="leaf"
              defaultOpen={false}
            >
              <div className="space-y-3">
                <div>
                  <p className="font-display text-sm font-bold uppercase text-forest">
                    {t("guides.rabiCrops")}
                  </p>
                  <p className="text-sm text-ink/80 mt-1 leading-relaxed">
                    {t("guides.rabiCropsList")}
                  </p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold uppercase text-forest">
                    {t("guides.rabiSowing")}
                  </p>
                  <p className="text-sm text-ink/80 mt-1 leading-relaxed">
                    {t("guides.rabiSowingInfo")}
                  </p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold uppercase text-forest">
                    {t("guides.rabiPractices")}
                  </p>
                  <p className="text-sm text-ink/80 mt-1 leading-relaxed">
                    {t("guides.rabiPracticesInfo")}
                  </p>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </section>

        {/* ─── Organic Farming Tips ─── */}
        <section aria-labelledby="organic-heading">
          <h2
            id="organic-heading"
            className="font-display text-xl font-bold uppercase text-ink mb-3 flex items-center gap-2"
          >
            <Sprout className="w-5 h-5 text-leaf" strokeWidth={2.5} />
            {t("guides.organicFarming")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Worm, titleKey: "guides.organicCompostTitle", descKey: "guides.organicCompostDesc", tint: "bg-leaf", delay: 0 },
              { icon: FlaskConical, titleKey: "guides.organicBiofertTitle", descKey: "guides.organicBiofertDesc", tint: "bg-midgreen", delay: 60 },
              { icon: ShieldCheck, titleKey: "guides.organicIpmTitle", descKey: "guides.organicIpmDesc", tint: "bg-gold", delay: 120 },
              { icon: Bug, titleKey: "guides.organicNeemTitle", descKey: "guides.organicNeemDesc", tint: "bg-warn", delay: 180 },
              { icon: Leaf, titleKey: "guides.organicMulchTitle", descKey: "guides.organicMulchDesc", tint: "bg-leaf", delay: 240 },
              { icon: Sprout, titleKey: "guides.organicVermiTitle", descKey: "guides.organicVermiDesc", tint: "bg-forest", delay: 300 },
            ].map(({ icon: Icon, titleKey, descKey, tint, delay }) => (
              <div key={titleKey} className="plantio-pop-in" style={{ animationDelay: `${delay}ms` }}>
                <StickerCard className="h-full">
                  <div className="flex items-start gap-3">
                    <span
                      className={`shrink-0 w-10 h-10 rounded-xl ${tint} border-[2.5px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]`}
                    >
                      <Icon className="w-5 h-5 text-ink" strokeWidth={2.5} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-bold uppercase text-ink">
                        {t(titleKey)}
                      </h3>
                      <p className="mt-1 text-xs text-ink/75 leading-relaxed">
                        {t(descKey)}
                      </p>
                    </div>
                  </div>
                </StickerCard>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Government Schemes ─── */}
        <section aria-labelledby="govt-heading">
          <h2
            id="govt-heading"
            className="font-display text-xl font-bold uppercase text-ink mb-3 flex items-center gap-2"
          >
            <Landmark className="w-5 h-5 text-forest" strokeWidth={2.5} />
            {t("guides.govtSchemes")}
          </h2>
          <div className="space-y-4">
            {[
              { nameKey: "guides.schemePmkisan", benefitKey: "guides.schemePmkisanBenefit", eligKey: "guides.schemePmkisanElig", delay: 0 },
              { nameKey: "guides.schemeSoil", benefitKey: "guides.schemeSoilBenefit", eligKey: "guides.schemeSoilElig", delay: 60 },
              { nameKey: "guides.schemeEnam", benefitKey: "guides.schemeEnamBenefit", eligKey: "guides.schemeEnamElig", delay: 120 },
              { nameKey: "guides.schemeInsurance", benefitKey: "guides.schemeInsuranceBenefit", eligKey: "guides.schemeInsuranceElig", delay: 180 },
              { nameKey: "guides.schemeKcc", benefitKey: "guides.schemeKccBenefit", eligKey: "guides.schemeKccElig", delay: 240 },
            ].map(({ nameKey, benefitKey, eligKey, delay }) => (
              <div key={nameKey} className="plantio-pop-in" style={{ animationDelay: `${delay}ms` }}>
                <StickerCard className="bg-white">
                  <h3 className="font-display text-base font-bold uppercase text-forest flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-gold shrink-0" strokeWidth={2.5} />
                    {t(nameKey)}
                  </h3>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="font-display text-xs font-bold uppercase text-leaf">
                        {t("guides.benefit")}
                      </p>
                      <p className="text-sm text-ink/80 mt-0.5 leading-relaxed">
                        {t(benefitKey)}
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-xs font-bold uppercase text-leaf">
                        {t("guides.eligibility")}
                      </p>
                      <p className="text-sm text-ink/80 mt-0.5 leading-relaxed">
                        {t(eligKey)}
                      </p>
                    </div>
                  </div>
                </StickerCard>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Quick Reference ─── */}
        <section aria-labelledby="quickref-heading">
          <h2
            id="quickref-heading"
            className="font-display text-xl font-bold uppercase text-ink mb-3 flex items-center gap-2"
          >
            <Beaker className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
            {t("guides.quickReference")}
          </h2>

          {/* NPK Table */}
          <div className="plantio-pop-in" style={{ animationDelay: "0ms" }}>
            <StickerCard className="overflow-x-auto">
              <h3 className="font-display text-base font-bold uppercase text-forest mb-3">
                {t("guides.npkTitle")}
              </h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-[2.5px] border-ink">
                    <th className="text-left py-2 pr-2 font-display font-bold uppercase text-ink">
                      {t("guides.npkFertilizer")}
                    </th>
                    <th className="text-left py-2 pr-2 font-display font-bold uppercase text-ink">
                      {t("guides.npkRatio")}
                    </th>
                    <th className="text-left py-2 font-display font-bold uppercase text-ink">
                      {t("guides.npkUse")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {NPK_DATA.map((row, i) => (
                    <tr
                      key={row.key}
                      className={`border-b border-ink/15 ${i % 2 === 0 ? "bg-cream" : ""}`}
                    >
                      <td className="py-2 pr-2 font-bold text-ink">{row.key.toUpperCase()}</td>
                      <td className="py-2 pr-2">
                        <StickerBadge variant="leaf" className="text-[10px]">
                          {row.ratio}
                        </StickerBadge>
                      </td>
                      <td className="py-2 text-ink/75">{row.useEn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StickerCard>
          </div>

          {/* Soil pH Chart */}
          <div className="plantio-pop-in mt-4" style={{ animationDelay: "80ms" }}>
            <StickerCard>
              <h3 className="font-display text-base font-bold uppercase text-forest mb-3">
                {t("guides.phTitle")}
              </h3>
              <div className="space-y-2">
                {PH_DATA.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border-[2.5px] border-ink p-2 shadow-[3px_3px_0px_0px_#161611] bg-white"
                  >
                    {/* Color band */}
                    <span
                      className={`shrink-0 w-8 h-8 rounded-lg ${row.color} border-[2.5px] border-ink`}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-xs font-bold uppercase text-ink">
                        {row.range} — {row.label}
                      </p>
                      <p className="text-xs text-ink/70 mt-0.5 leading-relaxed">
                        {row.cropsEn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </StickerCard>
          </div>
        </section>

        {/* ─── Community Tips ─── */}
        <section aria-labelledby="community-heading">
          <h2
            id="community-heading"
            className="font-display text-xl font-bold uppercase text-ink mb-3 flex items-center gap-2"
          >
            <MessageSquarePlus className="w-5 h-5 text-leaf" strokeWidth={2.5} />
            {t("guides.communityTips")}
          </h2>

          {/* Add tip form */}
          <div className="plantio-pop-in" style={{ animationDelay: "0ms" }}>
            <StickerCard>
              <h3 className="font-display text-sm font-bold uppercase text-forest mb-2">
                {t("guides.addTip")}
              </h3>
              <textarea
                className="w-full rounded-xl border-[2.5px] border-ink bg-cream p-3 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-leaf shadow-[3px_3px_0px_0px_#161611] resize-none"
                rows={3}
                placeholder={t("guides.tipPlaceholder")}
                value={newTip}
                onChange={(e) => setNewTip(e.target.value)}
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-ink/40">
                  {newTip.length}/500
                </span>
                <StickerButton
                  variant="forest"
                  size="sm"
                  onClick={handleSubmitTip}
                  disabled={!newTip.trim()}
                >
                  <Send className="w-4 h-4" strokeWidth={2.5} />
                  {t("guides.submitTip")}
                </StickerButton>
              </div>
            </StickerCard>
          </div>

          {/* Tips list */}
          {mounted && tips.length === 0 && (
            <div className="plantio-pop-in mt-4" style={{ animationDelay: "80ms" }}>
              <StickerCard className="text-center">
                <p className="text-sm text-ink/60">{t("guides.noTips")}</p>
              </StickerCard>
            </div>
          )}

          {mounted && tips.length > 0 && (
            <div className="space-y-3 mt-4 max-h-96 overflow-y-auto plantio-scroll">
              {tips.map((tip, i) => (
                <div
                  key={tip.id}
                  className="plantio-pop-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <StickerCard className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink leading-relaxed">{tip.text}</p>
                      <p className="text-xs text-ink/40 mt-1">
                        {new Date(tip.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 w-8 h-8 rounded-lg border-[2.5px] border-ink bg-warn/10 hover:bg-warn/25 flex items-center justify-center transition-colors"
                      onClick={() => handleDeleteTip(tip.id)}
                      aria-label={t("guides.deleteTip")}
                    >
                      <Trash2 className="w-4 h-4 text-warn" strokeWidth={2.5} />
                    </button>
                  </StickerCard>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
