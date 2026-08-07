"use client";
import { useState, useMemo } from "react";
import {
  Droplets,
  Wheat,
  Sprout,
  Flower2,
  Leaf,
  Droplet,
  Pipette,
  TreePine,
  Cherry,
  Carrot,
  Zap,
  Fuel,
  IndianRupee,
  Calculator,
  Clock,
  TrendingDown,
  CircleDollarSign,
  Gauge,
  Info,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";
import { cn } from "@/lib/utils";

/* ===================================================================
   Types & Static Data
   =================================================================== */

type CropKey = "Wheat" | "Rice" | "Maize" | "Cotton" | "Sugarcane" | "Tomato" | "Potato";
type SoilKey = "sandy" | "loamy" | "clay" | "black";
type WaterSourceKey = "tubewell" | "canal" | "drip" | "sprinkler" | "rainfed";
type Criticality = "critical" | "moderate" | "low";
type FuelType = "electricity" | "diesel";

interface GrowthStage {
  name: string;
  waterMm: number;
  das: number;
  criticality: Criticality;
}

interface CropData {
  key: CropKey;
  icon: typeof Wheat;
  stages: GrowthStage[];
  totalMm: number;
  seasonDays: number;
}

const CROPS: CropData[] = [
  {
    key: "Wheat",
    icon: Wheat,
    seasonDays: 120,
    stages: [
      { name: "Crown Root", waterMm: 30, das: 20, criticality: "moderate" },
      { name: "Tillering", waterMm: 40, das: 45, criticality: "critical" },
      { name: "Jointing", waterMm: 50, das: 70, criticality: "critical" },
      { name: "Flowering", waterMm: 55, das: 95, criticality: "critical" },
      { name: "Grain Fill", waterMm: 45, das: 110, criticality: "moderate" },
    ],
    totalMm: 220,
  },
  {
    key: "Rice",
    icon: Sprout,
    seasonDays: 110,
    stages: [
      { name: "Transplant", waterMm: 60, das: 1, criticality: "critical" },
      { name: "Tillering", waterMm: 70, das: 25, criticality: "critical" },
      { name: "Panicle", waterMm: 80, das: 50, criticality: "critical" },
      { name: "Flowering", waterMm: 80, das: 75, criticality: "critical" },
      { name: "Grain Fill", waterMm: 60, das: 100, criticality: "moderate" },
    ],
    totalMm: 350,
  },
  {
    key: "Maize",
    icon: TreePine,
    seasonDays: 95,
    stages: [
      { name: "Vegetative", waterMm: 35, das: 20, criticality: "moderate" },
      { name: "Tasseling", waterMm: 50, das: 50, criticality: "critical" },
      { name: "Silking", waterMm: 55, das: 65, criticality: "critical" },
      { name: "Grain Fill", waterMm: 45, das: 85, criticality: "moderate" },
    ],
    totalMm: 185,
  },
  {
    key: "Cotton",
    icon: Flower2,
    seasonDays: 150,
    stages: [
      { name: "Germination", waterMm: 20, das: 15, criticality: "low" },
      { name: "Vegetative", waterMm: 35, das: 45, criticality: "moderate" },
      { name: "Flowering", waterMm: 50, das: 75, criticality: "critical" },
      { name: "Boll Dev", waterMm: 45, das: 105, criticality: "critical" },
      { name: "Maturity", waterMm: 20, das: 135, criticality: "low" },
    ],
    totalMm: 170,
  },
  {
    key: "Sugarcane",
    icon: Cherry,
    seasonDays: 270,
    stages: [
      { name: "Germination", waterMm: 30, das: 30, criticality: "moderate" },
      { name: "Tillering", waterMm: 50, das: 60, criticality: "moderate" },
      { name: "Grand Growth", waterMm: 80, das: 120, criticality: "critical" },
      { name: "Maturity", waterMm: 30, das: 240, criticality: "low" },
    ],
    totalMm: 190,
  },
  {
    key: "Tomato",
    icon: Carrot,
    seasonDays: 105,
    stages: [
      { name: "Establishment", waterMm: 25, das: 15, criticality: "low" },
      { name: "Vegetative", waterMm: 35, das: 35, criticality: "moderate" },
      { name: "Flowering", waterMm: 45, das: 55, criticality: "critical" },
      { name: "Fruit Set", waterMm: 50, das: 75, criticality: "critical" },
      { name: "Fruit Dev", waterMm: 40, das: 95, criticality: "moderate" },
    ],
    totalMm: 195,
  },
  {
    key: "Potato",
    icon: Pipette,
    seasonDays: 110,
    stages: [
      { name: "Emergence", waterMm: 20, das: 20, criticality: "low" },
      { name: "Vegetative", waterMm: 40, das: 40, criticality: "moderate" },
      { name: "Tuber Init", waterMm: 50, das: 60, criticality: "critical" },
      { name: "Tuber Bulking", waterMm: 55, das: 80, criticality: "critical" },
      { name: "Maturity", waterMm: 25, das: 100, criticality: "low" },
    ],
    totalMm: 190,
  },
];

/* Method efficiency: fraction of applied water actually used by crop */
const METHOD_EFFICIENCY: Record<WaterSourceKey, number> = {
  drip: 0.90,
  sprinkler: 0.75,
  tubewell: 0.60,
  canal: 0.55,
  rainfed: 0.45,
};

/* Water-saving tips per method */
const TIPS: Record<WaterSourceKey, string[]> = {
  drip: [
    "Drip irrigation saves 30-50% water vs flood — apply directly to root zone.",
    "Use mulch along drip lines to cut evaporation by another 25%.",
    "Schedule drip runs early morning or late evening to reduce evapo-transpiration.",
    "Flush filters weekly to maintain uniform flow and prevent clogging.",
    "Pair with fertigation for up to 20% better nutrient uptake efficiency.",
  ],
  sprinkler: [
    "Sprinkler systems save 15-25% water over flood irrigation.",
    "Avoid running sprinklers on windy days — drift can waste 20-30% of water.",
    "Use low-pressure sprinkler heads to reduce evaporation losses.",
    "Schedule runs at dawn or dusk for minimal evaporation.",
    "Check nozzle wear annually — worn nozzles increase flow by 10-15%.",
  ],
  tubewell: [
    "Line your water channels to cut seepage losses by up to 40%.",
    "Use check-basin or border-strip method instead of wild flooding.",
    "Apply irrigation at critical growth stages only — skip low-stress periods.",
    "Monitor pump discharge regularly; a 10% drop signals wear or clogging.",
    "Raise field bunds to retain more water per irrigation event.",
  ],
  canal: [
    "Canal water often has seepage and conveyance losses of 30-40%.",
    "Request night-time rotation if available — lower evaporation losses.",
    "Use siphon tubes or gated pipes for controlled field application.",
    "Level your field with laser land leveller for uniform water spread.",
    "Line farm channels from outlet to field to save up to 25% water.",
  ],
  rainfed: [
    "Build farm ponds to capture runoff for supplemental irrigation.",
    "Use drought-tolerant varieties suited to your rainfall pattern.",
    "Apply life-saving irrigation at the most critical growth stage only.",
    "Practice conservation tillage to improve soil moisture retention.",
    "Use contour bunds and trenches to trap rainwater in the field.",
  ],
};

/* Soil adjustment factor — sandy needs more frequent lighter irrigation */
const SOIL_FACTOR: Record<SoilKey, number> = {
  sandy: 1.20,
  loamy: 1.00,
  clay: 0.90,
  black: 0.85,
};

/* ===================================================================
   Pill Selector helper
   =================================================================== */

function PillSelector<T extends string>({
  options,
  selected,
  onSelect,
  labelMap,
  iconMap,
}: {
  options: T[];
  selected: T | null;
  onSelect: (v: T) => void;
  labelMap: Record<string, string>;
  iconMap?: Record<string, React.ComponentType<{ className?: string }>>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = selected === opt;
        const Icon = iconMap?.[opt];
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={cn(
              "inline-flex sticker-interactive items-center gap-1.5 border-[2.5px] border-ink rounded-full px-4 py-2 text-sm font-display font-bold uppercase tracking-wide transition-all select-none",
              isActive
                ? "bg-forest text-white shadow-[2px_2px_0px_0px_#161611] translate-x-[1px] translate-y-[1px]"
                : "bg-white text-ink shadow-[4px_4px_0px_0px_#161611] hover:bg-leaf/20 active:shadow-[2px_2px_0px_0px_#161611] active:translate-x-[1px] active:translate-y-[1px]"
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {labelMap[opt]}
          </button>
        );
      })}
    </div>
  );
}

/* ===================================================================
   Main Page
   =================================================================== */

export default function IrrigationPage() {
  const { t } = useI18n();

  /* --- state --- */
  const [cropKey, setCropKey] = useState<CropKey | null>(null);
  const [area, setArea] = useState("5");
  const [soil, setSoil] = useState<SoilKey>("loamy");
  const [waterSource, setWaterSource] = useState<WaterSourceKey>("tubewell");
  const [fuelType, setFuelType] = useState<FuelType>("electricity");
  const [pumpHP, setPumpHP] = useState("5");
  const [hoursPerIrrigation, setHoursPerIrrigation] = useState("4");
  const [rate, setRate] = useState("8");
  const [costCalculated, setCostCalculated] = useState(false);

  /* --- derived --- */
  const crop = useMemo(() => CROPS.find((c) => c.key === cropKey) ?? null, [cropKey]);
  const areaNum = parseFloat(area) || 0;
  const pumpHPNum = parseFloat(pumpHP) || 0;
  const hoursNum = parseFloat(hoursPerIrrigation) || 0;
  const rateNum = parseFloat(rate) || 0;

  const efficiency = METHOD_EFFICIENCY[waterSource];
  const soilFactor = SOIL_FACTOR[soil];

  /* Total water in mm for the selected crop, adjusted for soil */
  const totalWaterMm = crop ? crop.totalMm * soilFactor : 0;
  /* Convert mm to litres per acre: 1 mm over 1 acre = 4046.86 m2 * 0.001 m = 4.047 m3 = 4047 litres */
  const litresPerAcre = totalWaterMm * 4047;
  const totalLitres = litresPerAcre * areaNum;
  /* Accounting for method efficiency, actual water to apply */
  const actualLitresToApply = efficiency > 0 ? totalLitres / efficiency : 0;
  /* Number of irrigation events: based on stages count and soil */
  const numIrrigations = crop ? Math.ceil(crop.stages.length * soilFactor * (waterSource === "drip" ? 1.5 : waterSource === "sprinkler" ? 1.2 : 1)) : 0;
  const litresPerEvent = numIrrigations > 0 ? actualLitresToApply / numIrrigations : 0;

  /* Cost calculation */
  const costPerIrrigation = useMemo(() => {
    if (!costCalculated || pumpHPNum <= 0 || hoursNum <= 0 || rateNum <= 0) return 0;
    if (fuelType === "electricity") {
      // kWh = HP * 0.746 * hours
      const kwh = pumpHPNum * 0.746 * hoursNum;
      return kwh * rateNum;
    } else {
      // Diesel consumption ~0.18 litres per HP per hour
      const litres = pumpHPNum * 0.18 * hoursNum;
      return litres * rateNum;
    }
  }, [costCalculated, pumpHPNum, hoursNum, rateNum, fuelType]);

  const totalSeasonCost = costPerIrrigation * numIrrigations;

  /* Efficiency rating label */
  const efficiencyLabel = efficiency >= 0.85 ? t("irrigation.excellent") : efficiency >= 0.70 ? t("irrigation.good") : efficiency >= 0.55 ? t("irrigation.fair") : t("irrigation.poor");
  const efficiencyVariant = efficiency >= 0.85 ? "leaf" as const : efficiency >= 0.70 ? "gold" as const : efficiency >= 0.55 ? "gold" as const : "warn" as const;

  /* --- label maps --- */
  const soilLabels: Record<string, string> = {
    sandy: t("irrigation.sandy"),
    loamy: t("irrigation.loamy"),
    clay: t("irrigation.clay"),
    black: t("irrigation.black"),
  };
  const sourceLabels: Record<string, string> = {
    tubewell: t("irrigation.tubewell"),
    canal: t("irrigation.canal"),
    drip: t("irrigation.drip"),
    sprinkler: t("irrigation.sprinkler"),
    rainfed: t("irrigation.rainfed"),
  };
  const cropLabels: Record<string, string> = {
    Wheat: "Wheat",
    Rice: "Rice",
    Maize: "Maize",
    Cotton: "Cotton",
    Sugarcane: "Sugarcane",
    Tomato: "Tomato",
    Potato: "Potato",
  };
  const cropIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Wheat,
    Rice: Sprout,
    Maize: TreePine,
    Cotton: Flower2,
    Sugarcane: Cherry,
    Tomato: Carrot,
    Potato: Pipette,
  };

  const criticalityVariant = (c: Criticality): "warn" | "gold" | "leaf" =>
    c === "critical" ? "warn" : c === "moderate" ? "gold" : "leaf";

  const criticalityLabel = (c: Criticality): string =>
    c === "critical" ? t("irrigation.critical") : c === "moderate" ? t("irrigation.moderate") : t("irrigation.low");

  /* ===================================================================
     Render
     =================================================================== */
  return (
    <main className="min-h-screen bg-cream plantio-grain">
      {/* ---- Section Header ---- */}
      <SectionHeader
        title={t("irrigation.title")}
        subtitle={t("irrigation.subtitle")}
        bg="midgreen"
        icon={Droplets}
        iconTint="bg-gold"
      />

      <div className="mx-auto max-w-2xl px-4 pb-20 space-y-6 pt-6 plantio-section-gap">
        {/* ============================================================
            1. Crop Selection
            ============================================================ */}
        <StickerCard className="plantio-pop-in plantio-grain">
          <h2 className="font-display text-xl font-bold uppercase text-ink flex items-center gap-2 mb-4">
            <Sprout className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
            {t("irrigation.selectCrop")}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            {CROPS.map((c) => {
              const Icon = c.icon;
              const isActive = cropKey === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => { setCropKey(c.key); setCostCalculated(false); }}
                  className={cn(
                    "shrink-0 sticker-interactive inline-flex flex-col items-center gap-1.5 border-[2.5px] border-ink rounded-2xl px-5 py-3 transition-all select-none min-w-[80px]",
                    isActive
                      ? "bg-forest text-white shadow-[2px_2px_0px_0px_#161611] translate-x-[1px] translate-y-[1px]"
                      : "bg-white text-ink shadow-[4px_4px_0px_0px_#161611] hover:bg-leaf/20 active:shadow-[2px_2px_0px_0px_#161611] active:translate-x-[1px] active:translate-y-[1px]"
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-display font-bold uppercase tracking-wide">{cropLabels[c.key]}</span>
                </button>
              );
            })}
          </div>
        </StickerCard>

        {/* ============================================================
            2. Field Setup
            ============================================================ */}
        <StickerCard className="plantio-pop-in plantio-grain" style={{ animationDelay: "60ms" }}>
          <h2 className="font-display text-xl font-bold uppercase text-ink flex items-center gap-2 mb-4">
            <Gauge className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
            {t("irrigation.fieldSetup")}
          </h2>

          {/* Area */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-ink mb-1.5 font-display uppercase tracking-wide">
              {t("irrigation.areaAcres")}
            </label>
            <input
              type="number"
              min="0.1"
              step="0.5"
              value={area}
              onChange={(e) => { setArea(e.target.value); setCostCalculated(false); }}
              placeholder={t("irrigation.areaPlaceholder")}
              className="w-full border-[2.5px] border-ink rounded-xl px-4 py-3 text-base font-body bg-white shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-midgreen text-ink"
            />
          </div>

          {/* Soil Type */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-ink mb-2 font-display uppercase tracking-wide">
              {t("irrigation.soilType")}
            </label>
            <PillSelector
              options={["sandy", "loamy", "clay", "black"] as SoilKey[]}
              selected={soil}
              onSelect={(v) => { setSoil(v); setCostCalculated(false); }}
              labelMap={soilLabels}
            />
          </div>

          {/* Water Source */}
          <div>
            <label className="block text-sm font-bold text-ink mb-2 font-display uppercase tracking-wide">
              {t("irrigation.waterSource")}
            </label>
            <PillSelector
              options={["tubewell", "canal", "drip", "sprinkler", "rainfed"] as WaterSourceKey[]}
              selected={waterSource}
              onSelect={(v) => { setWaterSource(v); setCostCalculated(false); }}
              labelMap={sourceLabels}
            />
          </div>
        </StickerCard>

        {/* ============================================================
            3. Irrigation Schedule (only when crop selected)
            ============================================================ */}
        {crop ? (
          <>
            {/* Schedule Table */}
            <StickerCard className="plantio-pop-in plantio-grain" style={{ animationDelay: "120ms" }}>
              <h2 className="font-display text-xl font-bold uppercase text-ink flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
                {t("irrigation.schedule")}
              </h2>

              {/* Stage cards */}
              <div className="space-y-3">
                {crop.stages.map((stage, i) => {
                  const maxWater = Math.max(...crop.stages.map((s) => s.waterMm));
                  const barPct = (stage.waterMm / maxWater) * 100;
                  const pctOfTotal = ((stage.waterMm / crop.totalMm) * 100).toFixed(0);
                  return (
                    <div
                      key={i}
                      className="plantio-list-item plantio-pop-in border-[2.5px] border-ink rounded-xl p-3 bg-white shadow-[3px_3px_0px_0px_#161611]"
                      style={{ animationDelay: `${140 + i * 50}ms`, "--i": i } as React.CSSProperties}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm uppercase text-ink">{stage.name}</span>
                          <StickerBadge variant={criticalityVariant(stage.criticality)} className="plantio-badge-shine">
                            {criticalityLabel(stage.criticality)}
                          </StickerBadge>
                        </div>
                        <span className="text-xs font-display font-bold text-ink/60">
                          {t("irrigation.das")}: {stage.das}
                        </span>
                      </div>
                      {/* Water bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-5 bg-cream rounded-full border-[2px] border-ink/20 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor: stage.criticality === "critical" ? "#E85D3D" : stage.criticality === "moderate" ? "#F5C518" : "#8FD14F",
                            }}
                          />
                        </div>
                        <span className="text-sm font-display font-bold text-ink min-w-[60px] text-right">
                          {stage.waterMm} mm
                        </span>
                        <span className="text-xs font-body text-ink/50">({pctOfTotal}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </StickerCard>

            {/* Visual Timeline */}
            <StickerCard className="plantio-pop-in plantio-grain" style={{ animationDelay: "180ms" }}>
              <h2 className="font-display text-lg font-bold uppercase text-ink flex items-center gap-2 mb-4">
                <ArrowRight className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
                {t("irrigation.timeline")}
              </h2>
              <div className="relative pl-6">
                {/* Vertical line */}
                <div className="absolute left-3 top-0 bottom-0 w-[3px] bg-ink/20 rounded-full" />
                {crop.stages.map((stage, i) => {
                  const isLast = i === crop.stages.length - 1;
                  return (
                    <div key={i} className="relative pb-4 last:pb-0 plantio-list-item" style={{ "--i": i } as React.CSSProperties}>
                      {/* Dot */}
                      <div
                        className={cn(
                          "absolute -left-6 top-1 w-5 h-5 rounded-full border-[2.5px] border-ink flex items-center justify-center",
                          stage.criticality === "critical"
                            ? "bg-warn"
                            : stage.criticality === "moderate"
                            ? "bg-gold"
                            : "bg-leaf"
                        )}
                      >
                        <Droplets className="w-2.5 h-2.5 text-ink" strokeWidth={3} />
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-display font-bold text-sm uppercase text-ink">{stage.name}</span>
                        {stage.criticality === "critical" && <span className="plantio-status-dot" />}
                        <span className="text-xs font-body text-ink/60">
                          Day {stage.das}
                        </span>
                        <span className="text-xs font-display font-bold text-midgreen">
                          {stage.waterMm} mm
                        </span>
                      </div>
                      {/* Connector arrow */}
                      {!isLast && (
                        <div className="absolute -left-[14px] top-6">
                          <ArrowDown className="w-2 h-2 text-ink/30" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </StickerCard>
          </>
        ) : (
          <StickerCard className="plantio-pop-in bg-cream border-dashed">
            <p className="text-center text-ink/60 font-body text-sm py-4">
              {t("irrigation.noCropSelected")}
            </p>
          </StickerCard>
        )}

        {/* ============================================================
            4. Water Budget
            ============================================================ */}
        {crop && (
          <StickerCard className="plantio-pop-in plantio-grain" style={{ animationDelay: "200ms" }}>
            <h2 className="font-display text-xl font-bold uppercase text-ink flex items-center gap-2 mb-4">
              <Droplet className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
              {t("irrigation.waterBudget")}
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Total water mm */}
              <div className="border-[2.5px] border-ink rounded-xl p-3 bg-white shadow-[3px_3px_0px_0px_#161611] text-center">
                <p className="text-xs font-display font-bold uppercase text-ink/50 mb-1">{t("irrigation.totalWater")}</p>
                <p className="text-2xl font-display font-bold text-forest">{totalWaterMm.toFixed(0)} mm</p>
                <p className="text-xs font-body text-ink/50">{t("irrigation.perAcre")}</p>
              </div>
              {/* Efficiency */}
              <div className="border-[2.5px] border-ink rounded-xl p-3 bg-white shadow-[3px_3px_0px_0px_#161611] text-center">
                <p className="text-xs font-display font-bold uppercase text-ink/50 mb-1">{t("irrigation.efficiencyRating")}</p>
                <p className="text-2xl font-display font-bold text-forest">{(efficiency * 100).toFixed(0)}%</p>
                <StickerBadge variant={efficiencyVariant} className="mt-1 mx-auto">{efficiencyLabel}</StickerBadge>
              </div>
            </div>

            {/* Litres breakdown */}
            <div className="border-[2.5px] border-ink rounded-xl p-4 bg-midgreen/10 shadow-[3px_3px_0px_0px_#161611] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-display font-bold uppercase text-ink">{t("irrigation.waterLitresPerAcre")}</span>
                <span className="text-sm font-display font-bold text-forest">{Math.round(litresPerAcre).toLocaleString()} L</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-display font-bold uppercase text-ink">{t("irrigation.totalLitres")}</span>
                <span className="text-sm font-display font-bold text-forest">{Math.round(actualLitresToApply).toLocaleString()} L</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-display font-bold uppercase text-ink">{t("irrigation.numIrrigations")}</span>
                <span className="text-sm font-display font-bold text-forest">{numIrrigations}</span>
              </div>
              <div className="flex justify-between items-center border-t-[2px] border-ink/10 pt-2">
                <span className="text-sm font-display font-bold uppercase text-ink">{t("irrigation.perEvent")}</span>
                <span className="text-sm font-display font-bold text-forest">{Math.round(litresPerEvent).toLocaleString()} L</span>
              </div>
            </div>

            {/* Method efficiency note */}
            <div className="mt-3 flex items-start gap-2 text-xs font-body text-ink/60">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-midgreen" strokeWidth={2} />
              <span>{t("irrigation.methodEfficiency")}: {sourceLabels[waterSource]} &mdash; {(efficiency * 100).toFixed(0)}%</span>
            </div>
          </StickerCard>
        )}

        {/* ============================================================
            5. Efficiency Tips
            ============================================================ */}
        {crop && (
          <StickerCard className="plantio-pop-in plantio-grain" style={{ animationDelay: "260ms" }}>
            <h2 className="font-display text-xl font-bold uppercase text-ink flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
              {t("irrigation.tips")}
            </h2>
            <div className="space-y-3">
              {TIPS[waterSource].map((tip, i) => (
                <div
                  key={i}
                  className="plantio-pop-in flex items-start gap-3 border-[2px] border-ink/15 rounded-xl p-3 bg-white"
                  style={{ animationDelay: `${280 + i * 40}ms` }}
                >
                  <div className="shrink-0 w-7 h-7 rounded-full bg-leaf/30 border-[2px] border-ink flex items-center justify-center">
                    <span className="text-xs font-display font-bold text-ink">{i + 1}</span>
                  </div>
                  <p className="text-sm font-body text-ink leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </StickerCard>
        )}

        {/* ============================================================
            6. Cost Estimator
            ============================================================ */}
        {crop && (
          <StickerCard className="plantio-pop-in plantio-grain" style={{ animationDelay: "320ms" }}>
            <h2 className="font-display text-xl font-bold uppercase text-ink flex items-center gap-2 mb-4">
              <CircleDollarSign className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
              {t("irrigation.costEstimator")}
            </h2>

            {/* Pump HP */}
            <div className="mb-3">
              <label className="block text-sm font-bold text-ink mb-1.5 font-display uppercase tracking-wide">
                {t("irrigation.pumpHP")}
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={pumpHP}
                onChange={(e) => { setPumpHP(e.target.value); setCostCalculated(false); }}
                placeholder={t("irrigation.hpPlaceholder")}
                className="w-full border-[2.5px] border-ink rounded-xl px-4 py-3 text-base font-body bg-white shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-midgreen text-ink"
              />
            </div>

            {/* Hours per irrigation */}
            <div className="mb-3">
              <label className="block text-sm font-bold text-ink mb-1.5 font-display uppercase tracking-wide">
                {t("irrigation.hoursPerIrrigation")}
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={hoursPerIrrigation}
                onChange={(e) => { setHoursPerIrrigation(e.target.value); setCostCalculated(false); }}
                placeholder={t("irrigation.hoursPlaceholder")}
                className="w-full border-[2.5px] border-ink rounded-xl px-4 py-3 text-base font-body bg-white shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-midgreen text-ink"
              />
            </div>

            {/* Fuel Type */}
            <div className="mb-3">
              <label className="block text-sm font-bold text-ink mb-2 font-display uppercase tracking-wide">
                {t("irrigation.fuelType")}
              </label>
              <div className="flex gap-3">
                {(["electricity", "diesel"] as FuelType[]).map((ft) => {
                  const isActive = fuelType === ft;
                  const FuelIcon = ft === "electricity" ? Zap : Fuel;
                  return (
                    <button
                      key={ft}
                      onClick={() => { setFuelType(ft); setRate(ft === "electricity" ? "8" : "90"); setCostCalculated(false); }}
                      className={cn(
                        "inline-flex items-center gap-2 border-[2.5px] border-ink rounded-full px-5 py-2.5 text-sm font-display font-bold uppercase tracking-wide transition-all select-none",
                        isActive
                          ? "bg-forest text-white shadow-[2px_2px_0px_0px_#161611] translate-x-[1px] translate-y-[1px]"
                          : "bg-white text-ink shadow-[4px_4px_0px_0px_#161611] hover:bg-leaf/20 active:shadow-[2px_2px_0px_0px_#161611] active:translate-x-[1px] active:translate-y-[1px]"
                      )}
                    >
                      <FuelIcon className="w-4 h-4" />
                      {t(`irrigation.${ft}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rate */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-ink mb-1.5 font-display uppercase tracking-wide">
                {t("irrigation.ratePerUnit")} ({fuelType === "electricity" ? t("irrigation.perKwh") : t("irrigation.perLitre")})
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={rate}
                onChange={(e) => { setRate(e.target.value); setCostCalculated(false); }}
                placeholder={fuelType === "electricity" ? t("irrigation.electricityRatePlaceholder") : t("irrigation.dieselRatePlaceholder")}
                className="w-full border-[2.5px] border-ink rounded-xl px-4 py-3 text-base font-body bg-white shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-midgreen text-ink"
              />
            </div>

            {/* Calculate button */}
            <StickerButton
              variant="forest"
              size="md"
              className="w-full"
              onClick={() => setCostCalculated(true)}
            >
              <Calculator className="w-5 h-5" />
              {t("irrigation.calculateCost")}
            </StickerButton>

            {/* Results */}
            {costCalculated && costPerIrrigation > 0 && (
              <div className="mt-4 space-y-3 plantio-pop-in">
                {/* Per-irrigation cost */}
                <div className="border-[2.5px] border-ink rounded-xl p-4 bg-gold/15 shadow-[3px_3px_0px_0px_#161611]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-display font-bold uppercase text-ink">{t("irrigation.costPerIrrigation")}</span>
                    <span className="text-xl font-display font-bold text-forest">
                      {t("irrigation.rupees")} {Math.round(costPerIrrigation).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-body text-ink/60">{t("irrigation.consumption")}</span>
                    <span className="text-xs font-body text-ink/60">
                      {fuelType === "electricity"
                        ? `${(pumpHPNum * 0.746 * hoursNum).toFixed(1)} ${t("irrigation.kwhPerEvent")}`
                        : `${(pumpHPNum * 0.18 * hoursNum).toFixed(1)} ${t("irrigation.litresPerEvent")}`}
                    </span>
                  </div>
                </div>

                {/* Season total */}
                <div className="border-[2.5px] border-ink rounded-xl p-4 bg-forest/10 shadow-[3px_3px_0px_0px_#161611]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-display font-bold uppercase text-ink">{t("irrigation.totalSeasonCost")}</span>
                    <span className="text-xl font-display font-bold text-forest">
                      {t("irrigation.rupees")} {Math.round(totalSeasonCost).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-body text-ink/60">{t("irrigation.numIrrigations")}: {numIrrigations}</span>
                    <span className="text-xs font-body text-ink/60">{t("irrigation.seasonTotal")}</span>
                  </div>
                </div>
              </div>
            )}
          </StickerCard>
        )}
      </div>
    </main>
  );
}
