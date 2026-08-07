"use client";
import { useState, useMemo } from "react";
import {
  Sprout,
  Wheat,
  Flower2,
  Sun,
  CloudSun,
  Droplets,
  Leaf,
  TreePine,
  TreePalm,
  Drill,
  ShieldCheck,
  ThermometerSun,
  CalendarDays,
  IndianRupee,
  Scale,
  Info,
  Beaker,
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
   Types
   =================================================================== */

type CropKey =
  | "wheat"
  | "rice"
  | "maize"
  | "cotton"
  | "soybean"
  | "mustard"
  | "groundnut"
  | "sugarcane"
  | "potato"
  | "chickpea";

type AreaUnit = "acres" | "bigha";

interface SowingWindow {
  region: string;
  months: string;
  season: string;
}

interface SeedTreatment {
  nameKey: string;
  descKey: string;
}

interface CropData {
  key: CropKey;
  seedRateKgPerHa: number; // kg per hectare (or quintals for sugarcane/potato)
  costPerKg: number; // rupees per kg (or per quintal for sugarcane)
  germination: number; // percentage
  daysToGerminate: number;
  idealTemp: string;
  idealMoisture: string;
  sowing: SowingWindow[];
  treatments: SeedTreatment[];
  specialNoteKey?: string;
  unit: "kg" | "quintals" | "setts";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

/* ===================================================================
   Static crop data (realistic Indian agriculture)
   =================================================================== */

const CROPS: CropData[] = [
  {
    key: "wheat",
    seedRateKgPerHa: 100,
    costPerKg: 40,
    germination: 90,
    daysToGerminate: 7,
    idealTemp: "15-25 C",
    idealMoisture: "Moist",
    sowing: [
      { region: "northIndia", months: "Nov - Mid Dec", season: "seasonRabi" },
      { region: "southIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "eastIndia", months: "Nov - Dec", season: "seasonRabi" },
      { region: "westIndia", months: "Nov - Dec", season: "seasonRabi" },
    ],
    treatments: [
      { nameKey: "seeds.thiram", descKey: "seeds.thiramDesc" },
      { nameKey: "seeds.carboxin", descKey: "seeds.carboxinDesc" },
      { nameKey: "seeds.azotobacter", descKey: "seeds.azotobacterDesc" },
    ],
    unit: "kg",
    icon: Wheat,
  },
  {
    key: "rice",
    seedRateKgPerHa: 25, // transplanted default
    costPerKg: 50,
    germination: 85,
    daysToGerminate: 5,
    idealTemp: "25-35 C",
    idealMoisture: "Wet",
    sowing: [
      { region: "northIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "southIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "eastIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "westIndia", months: "Dec - Jan", season: "seasonRabi" },
    ],
    treatments: [
      { nameKey: "seeds.carbendazim", descKey: "seeds.carbendazimDesc" },
      { nameKey: "seeds.trichoderma", descKey: "seeds.trichodermaDesc" },
      { nameKey: "seeds.azotobacter", descKey: "seeds.azotobacterDesc" },
    ],
    specialNoteKey: "seeds.riceMethodNote",
    unit: "kg",
    icon: Flower2,
  },
  {
    key: "maize",
    seedRateKgPerHa: 20,
    costPerKg: 80,
    germination: 90,
    daysToGerminate: 5,
    idealTemp: "20-30 C",
    idealMoisture: "Moist",
    sowing: [
      { region: "northIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "southIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "eastIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "westIndia", months: "Jun - Jul", season: "seasonKharif" },
    ],
    treatments: [
      { nameKey: "seeds.thiram", descKey: "seeds.thiramDesc" },
      { nameKey: "seeds.carboxin", descKey: "seeds.carboxinDesc" },
      { nameKey: "seeds.imidachlorprid", descKey: "seeds.imidachlorpridDesc" },
    ],
    unit: "kg",
    icon: Sun,
  },
  {
    key: "cotton",
    seedRateKgPerHa: 15,
    costPerKg: 800,
    germination: 80,
    daysToGerminate: 7,
    idealTemp: "25-35 C",
    idealMoisture: "Moist",
    sowing: [
      { region: "northIndia", months: "May - Jun", season: "seasonKharif" },
      { region: "southIndia", months: "May - Jun", season: "seasonKharif" },
      { region: "eastIndia", months: "May - Jun", season: "seasonKharif" },
      { region: "westIndia", months: "May - Jun", season: "seasonKharif" },
    ],
    treatments: [
      { nameKey: "seeds.imidachlorprid", descKey: "seeds.imidachlorpridDesc" },
      { nameKey: "seeds.thiram", descKey: "seeds.thiramDesc" },
      { nameKey: "seeds.trichoderma", descKey: "seeds.trichodermaDesc" },
    ],
    unit: "kg",
    icon: CloudSun,
  },
  {
    key: "soybean",
    seedRateKgPerHa: 75,
    costPerKg: 80,
    germination: 85,
    daysToGerminate: 5,
    idealTemp: "25-35 C",
    idealMoisture: "Moist",
    sowing: [
      { region: "northIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "southIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "eastIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "westIndia", months: "Jun - Jul", season: "seasonKharif" },
    ],
    treatments: [
      { nameKey: "seeds.rhizobium", descKey: "seeds.rhizobiumDesc" },
      { nameKey: "seeds.thiram", descKey: "seeds.thiramDesc" },
      { nameKey: "seeds.psb", descKey: "seeds.psbDesc" },
    ],
    unit: "kg",
    icon: Leaf,
  },
  {
    key: "mustard",
    seedRateKgPerHa: 5,
    costPerKg: 100,
    germination: 85,
    daysToGerminate: 5,
    idealTemp: "15-25 C",
    idealMoisture: "Moist",
    sowing: [
      { region: "northIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "southIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "eastIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "westIndia", months: "Oct - Nov", season: "seasonRabi" },
    ],
    treatments: [
      { nameKey: "seeds.thiram", descKey: "seeds.thiramDesc" },
      { nameKey: "seeds.azotobacter", descKey: "seeds.azotobacterDesc" },
      { nameKey: "seeds.psb", descKey: "seeds.psbDesc" },
    ],
    unit: "kg",
    icon: Droplets,
  },
  {
    key: "groundnut",
    seedRateKgPerHa: 100,
    costPerKg: 60,
    germination: 80,
    daysToGerminate: 10,
    idealTemp: "25-35 C",
    idealMoisture: "Moist",
    sowing: [
      { region: "northIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "southIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "eastIndia", months: "Jun - Jul", season: "seasonKharif" },
      { region: "westIndia", months: "Jun - Jul", season: "seasonKharif" },
    ],
    treatments: [
      { nameKey: "seeds.thiram", descKey: "seeds.thiramDesc" },
      { nameKey: "seeds.rhizobium", descKey: "seeds.rhizobiumDesc" },
      { nameKey: "seeds.hotWater", descKey: "seeds.hotWaterDesc" },
    ],
    unit: "kg",
    icon: TreePine,
  },
  {
    key: "sugarcane",
    seedRateKgPerHa: 25, // 25 quintals
    costPerKg: 350, // per quintal
    germination: 70,
    daysToGerminate: 15,
    idealTemp: "25-35 C",
    idealMoisture: "Wet",
    sowing: [
      { region: "northIndia", months: "Feb - Mar", season: "seasonSpring" },
      { region: "southIndia", months: "Oct - Nov", season: "seasonAutumn" },
      { region: "eastIndia", months: "Feb - Mar", season: "seasonSpring" },
      { region: "westIndia", months: "Oct - Nov", season: "seasonAutumn" },
    ],
    treatments: [
      { nameKey: "seeds.carbendazim", descKey: "seeds.carbendazimDesc" },
      { nameKey: "seeds.trichoderma", descKey: "seeds.trichodermaDesc" },
      { nameKey: "seeds.imidachlorprid", descKey: "seeds.imidachlorpridDesc" },
    ],
    specialNoteKey: "seeds.sugarcaneNote",
    unit: "quintals",
    icon: TreePalm,
  },
  {
    key: "potato",
    seedRateKgPerHa: 25, // 25 quintals of seed tubers
    costPerKg: 25, // per kg
    germination: 90,
    daysToGerminate: 15,
    idealTemp: "15-25 C",
    idealMoisture: "Moist",
    sowing: [
      { region: "northIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "southIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "eastIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "westIndia", months: "Oct - Nov", season: "seasonRabi" },
    ],
    treatments: [
      { nameKey: "seeds.thiram", descKey: "seeds.thiramDesc" },
      { nameKey: "seeds.carboxin", descKey: "seeds.carboxinDesc" },
      { nameKey: "seeds.imidachlorprid", descKey: "seeds.imidachlorpridDesc" },
    ],
    specialNoteKey: "seeds.potatoNote",
    unit: "quintals",
    icon: Drill,
  },
  {
    key: "chickpea",
    seedRateKgPerHa: 80,
    costPerKg: 90,
    germination: 85,
    daysToGerminate: 8,
    idealTemp: "15-25 C",
    idealMoisture: "Moist",
    sowing: [
      { region: "northIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "southIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "eastIndia", months: "Oct - Nov", season: "seasonRabi" },
      { region: "westIndia", months: "Oct - Nov", season: "seasonRabi" },
    ],
    treatments: [
      { nameKey: "seeds.rhizobium", descKey: "seeds.rhizobiumDesc" },
      { nameKey: "seeds.thiram", descKey: "seeds.thiramDesc" },
      { nameKey: "seeds.psb", descKey: "seeds.psbDesc" },
    ],
    unit: "kg",
    icon: Beaker,
  },
];

/* ===================================================================
   Conversion helpers
   =================================================================== */

// 1 acre = 0.404686 hectare
// 1 bigha (UP/Bihar standard) = 0.2529 hectare (~0.625 acres)
const ACRE_TO_HA = 0.404686;
const BIGHA_TO_HA = 0.2529;

function areaToHectares(value: number, unit: AreaUnit): number {
  if (unit === "acres") return value * ACRE_TO_HA;
  return value * BIGHA_TO_HA;
}

/* ===================================================================
   Component
   =================================================================== */

export default function SeedsPage() {
  const { t } = useI18n();
  const [selectedCrop, setSelectedCrop] = useState<CropKey | null>(null);
  const [areaValue, setAreaValue] = useState<string>("1");
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("acres");

  const cropData = useMemo(
    () => (selectedCrop ? CROPS.find((c) => c.key === selectedCrop) : null),
    [selectedCrop]
  );

  const hectares = useMemo(() => {
    const num = parseFloat(areaValue);
    if (isNaN(num) || num <= 0) return 0;
    return areaToHectares(num, areaUnit);
  }, [areaValue, areaUnit]);

  // For kg-based crops: seedKg = seedRateKgPerHa * hectares
  // For quintal-based crops: seedQuintals = seedRateKgPerHa * hectares (rate is in q/ha)
  const seedQuantity = useMemo(() => {
    if (!cropData || hectares <= 0) return 0;
    return cropData.seedRateKgPerHa * hectares;
  }, [cropData, hectares]);

  // Cost calculation
  const totalCost = useMemo(() => {
    if (!cropData || seedQuantity <= 0) return 0;
    if (cropData.unit === "quintals") {
      // sugarcane: costPerKg is per quintal, seedQuantity is in quintals
      // potato: costPerKg is per kg, but seedQuantity is in quintals -> convert to kg
      if (cropData.key === "sugarcane") {
        return cropData.costPerKg * seedQuantity;
      }
      // potato: seed tubers in quintals, cost per kg
      return cropData.costPerKg * seedQuantity * 100; // quintals to kg
    }
    return cropData.costPerKg * seedQuantity;
  }, [cropData, seedQuantity]);

  // Format numbers for display
  const fmt = (n: number, decimals = 1) => {
    if (n >= 1000) return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
  };

  return (
    <main className="bg-cream min-h-screen pb-8 plantio-grain">
      {/* ── Section Header ── */}
      <SectionHeader
        title={t("seeds.title")}
        subtitle={t("seeds.subtitle")}
        bg="forest"
        icon={Sprout}
      />

      <div className="mx-auto max-w-2xl px-4 space-y-6 mt-6 plantio-section-gap">
        {/* ── Crop Selection ── */}
        <div className="plantio-pop-in" style={{ animationDelay: "0ms" }}>
          <h2 className="font-display text-lg font-bold uppercase text-ink mb-3">
            {t("seeds.selectCrop")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CROPS.map((crop) => {
              const isSelected = selectedCrop === crop.key;
              const Icon = crop.icon;
              return (
                <button
                  key={crop.key}
                  onClick={() => setSelectedCrop(crop.key)}
                  className={cn(
                    "sticker-interactive plantio-pop-in flex flex-col items-center gap-2 p-3 border-[3px] border-ink rounded-2xl transition-all duration-150 cursor-pointer select-none",
                    isSelected
                      ? "bg-forest text-white shadow-[2px_2px_0px_0px_#161611] translate-x-[1px] translate-y-[1px]"
                      : "bg-white text-ink shadow-[5px_5px_0px_0px_#161611] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_#161611] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#161611]"
                  )}
                  style={{ animationDelay: `${CROPS.indexOf(crop) * 40}ms` }}
                >
                  <Icon
                    className={cn("w-7 h-7", isSelected ? "text-leaf" : "text-midgreen")}
                    strokeWidth={2}
                  />
                  <span className="font-display text-xs font-bold uppercase tracking-wide leading-tight text-center">
                    {t(`seeds.${crop.key}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Area Input ── */}
        <div className="plantio-pop-in" style={{ animationDelay: "80ms" }}>
          <StickerCard>
            <h2 className="font-display text-lg font-bold uppercase text-ink mb-4">
              {t("seeds.areaInput")}
            </h2>
            {/* Unit toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAreaUnit("acres")}
                className={cn(
                  "sticker-pill px-4 py-2 text-sm font-display font-bold uppercase tracking-wide cursor-pointer select-none",
                  areaUnit === "acres"
                    ? "bg-forest text-white"
                    : "bg-white text-ink"
                )}
              >
                {t("seeds.acres")}
              </button>
              <button
                onClick={() => setAreaUnit("bigha")}
                className={cn(
                  "sticker-pill px-4 py-2 text-sm font-display font-bold uppercase tracking-wide cursor-pointer select-none",
                  areaUnit === "bigha"
                    ? "bg-forest text-white"
                    : "bg-white text-ink"
                )}
              >
                {t("seeds.bigha")}
              </button>
            </div>
            {/* Number input */}
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.5"
                value={areaValue}
                onChange={(e) => setAreaValue(e.target.value)}
                placeholder={t("seeds.enterArea")}
                className="w-full border-[3px] border-ink rounded-2xl px-4 py-3 text-lg font-display font-bold text-ink bg-cream shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-midgreen focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#161611] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-display text-sm font-bold uppercase text-ink/50">
                {areaUnit === "acres" ? t("seeds.acres") : t("seeds.bigha")}
              </span>
            </div>
          </StickerCard>
        </div>

        {/* ── Results (Seed Quantity + Cost) ── */}
        {cropData && hectares > 0 && (
          <div className="plantio-pop-in space-y-4" style={{ animationDelay: "120ms" }}>
            {/* Seed Rate Badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <StickerBadge variant="forest" className="plantio-badge-shine">
                <Scale className="w-3.5 h-3.5" strokeWidth={2.5} />
                {t("seeds.seedRate")}: {cropData.seedRateKgPerHa}{" "}
                {cropData.unit === "quintals" ? t("seeds.quintals") : cropData.unit === "setts" ? t("seeds.setts") : t("seeds.kg")}{" "}
                {t("seeds.perHectare")}
              </StickerBadge>
              {cropData.specialNoteKey && (
                <StickerBadge variant="gold">
                  <Info className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {t(cropData.specialNoteKey)}
                </StickerBadge>
              )}
            </div>

            {/* Seed Required + Cost cards side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StickerCard className="bg-forest text-white plantio-corner-fold">
                <div className="flex items-center gap-2 mb-2">
                  <Sprout className="w-5 h-5 text-leaf" strokeWidth={2.5} />
                  <span className="font-display text-sm font-bold uppercase tracking-wide text-white/80">
                    {t("seeds.seedRequired")}
                  </span>
                </div>
                <p className="font-display text-3xl font-bold leading-none">
                  {fmt(seedQuantity)}
                </p>
                <p className="font-display text-sm font-bold uppercase mt-1 text-leaf">
                  {cropData.unit === "quintals"
                    ? t("seeds.quintals")
                    : cropData.unit === "setts"
                      ? t("seeds.setts")
                      : t("seeds.kg")}
                </p>
              </StickerCard>

              <StickerCard className="bg-gold text-ink">
                <div className="flex items-center gap-2 mb-2">
                  <IndianRupee className="w-5 h-5 text-ink/70" strokeWidth={2.5} />
                  <span className="font-display text-sm font-bold uppercase tracking-wide text-ink/70">
                    {t("seeds.totalCost")}
                  </span>
                </div>
                <p className="font-display text-3xl font-bold leading-none">
                  {fmt(totalCost, 0)}
                </p>
                <p className="font-display text-sm font-bold uppercase mt-1 text-ink/60">
                  INR
                </p>
              </StickerCard>
            </div>
          </div>
        )}

        {/* ── No crop selected placeholder ── */}
        {!cropData && (
          <div className="plantio-pop-in" style={{ animationDelay: "120ms" }}>
            <StickerCard className="bg-cream border-dashed border-ink text-center">
              <Sprout className="w-10 h-10 text-midgreen mx-auto mb-2" strokeWidth={1.5} />
              <p className="font-display text-base font-bold uppercase text-ink/60">
                {t("seeds.noCropSelected")}
              </p>
            </StickerCard>
          </div>
        )}

        {/* ── Seed Treatment ── */}
        {cropData && (
          <div className="plantio-pop-in" style={{ animationDelay: "160ms" }}>
            <h2 className="font-display text-lg font-bold uppercase text-ink mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
              {t("seeds.treatment")}
            </h2>
            <p className="text-sm text-ink/60 mb-3">{t("seeds.treatmentDesc")}</p>
            <div className="space-y-3">
              {cropData.treatments.map((tr, i) => (
                <StickerCard
                  key={tr.nameKey}
                  className={cn(
                    "plantio-list-item plantio-pop-in",
                    i === 0 ? "bg-leaf/10" : i === 1 ? "bg-gold/10" : "bg-cream"
                  )}
                  style={{ animationDelay: `${160 + i * 40}ms`, "--i": i } as React.CSSProperties}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "shrink-0 w-10 h-10 rounded-full border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]",
                        i === 0
                          ? "bg-leaf"
                          : i === 1
                            ? "bg-gold"
                            : "bg-midgreen"
                      )}
                    >
                      <ShieldCheck
                        className={cn(
                          "w-5 h-5",
                          i === 2 ? "text-white" : "text-ink"
                        )}
                        strokeWidth={2.5}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-base font-bold uppercase text-ink">
                        {t(tr.nameKey)}
                      </h3>
                      <p className="text-sm text-ink/70 leading-relaxed mt-0.5">
                        {t(tr.descKey)}
                      </p>
                    </div>
                  </div>
                </StickerCard>
              ))}
            </div>
          </div>
        )}

        {/* ── Germination Guide ── */}
        {cropData && (
          <div className="plantio-pop-in" style={{ animationDelay: "200ms" }}>
            <h2 className="font-display text-lg font-bold uppercase text-ink mb-3 flex items-center gap-2">
              <ThermometerSun className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
              {t("seeds.germination")}
            </h2>
            <StickerCard>
              {/* Germination % bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-display text-sm font-bold uppercase text-ink/70">
                    {t("seeds.germinationRate")}
                  </span>
                  <span className="font-display text-lg font-bold text-forest">
                    {cropData.germination}%
                  </span>
                </div>
                <div className="w-full h-4 rounded-full bg-cream border-[2.5px] border-ink overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${cropData.germination}%`,
                      backgroundColor:
                        cropData.germination >= 85
                          ? "#3C8C4A"
                          : cropData.germination >= 75
                            ? "#F5C518"
                            : "#E85D3D",
                    }}
                  />
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border-[2.5px] border-ink rounded-2xl p-3 bg-cream shadow-[3px_3px_0px_0px_#161611]">
                  <p className="font-display text-xs font-bold uppercase text-ink/50 mb-1">
                    {t("seeds.daysToGerminate")}
                  </p>
                  <p className="font-display text-xl font-bold text-ink">
                    {cropData.daysToGerminate}{" "}
                    <span className="text-sm text-ink/50">{t("seeds.days")}</span>
                  </p>
                </div>
                <div className="border-[2.5px] border-ink rounded-2xl p-3 bg-cream shadow-[3px_3px_0px_0px_#161611]">
                  <p className="font-display text-xs font-bold uppercase text-ink/50 mb-1">
                    {t("seeds.idealTemp")}
                  </p>
                  <p className="font-display text-xl font-bold text-ink">
                    {cropData.idealTemp}
                  </p>
                </div>
                <div className="col-span-2 border-[2.5px] border-ink rounded-2xl p-3 bg-cream shadow-[3px_3px_0px_0px_#161611]">
                  <p className="font-display text-xs font-bold uppercase text-ink/50 mb-1">
                    {t("seeds.idealMoisture")}
                  </p>
                  <div className="flex items-center gap-2">
                    <Droplets
                      className={cn(
                        "w-5 h-5",
                        cropData.idealMoisture === "Wet"
                          ? "text-midgreen"
                          : "text-leaf"
                      )}
                      strokeWidth={2.5}
                    />
                    <p className="font-display text-base font-bold text-ink">
                      {cropData.idealMoisture === "Wet"
                        ? t("seeds.wet")
                        : t("seeds.moist")}
                    </p>
                  </div>
                </div>
              </div>
            </StickerCard>
          </div>
        )}

        {/* ── Sowing Calendar ── */}
        {cropData && (
          <div className="plantio-pop-in" style={{ animationDelay: "240ms" }}>
            <h2 className="font-display text-lg font-bold uppercase text-ink mb-1 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
              {t("seeds.sowingCalendar")}
            </h2>
            <p className="text-sm text-ink/60 mb-3">{t("seeds.sowingCalendarDesc")}</p>
            <div className="grid grid-cols-2 gap-3">
              {cropData.sowing.map((sw, i) => {
                const regionColors = [
                  { bg: "bg-forest", text: "text-white", accent: "text-leaf" },
                  { bg: "bg-midgreen", text: "text-white", accent: "text-leaf" },
                  { bg: "bg-gold", text: "text-ink", accent: "text-ink/70" },
                  { bg: "bg-leaf", text: "text-ink", accent: "text-ink/70" },
                ];
                const colors = regionColors[i % 4];
                return (
                  <div
                    key={sw.region}
                    className={cn(
                      "plantio-list-item plantio-pop-in border-[3px] border-ink rounded-2xl p-3 shadow-[5px_5px_0px_0px_#161611] relative overflow-hidden",
                      colors.bg,
                      colors.text
                    )}
                    style={{ animationDelay: `${240 + i * 40}ms`, "--i": i } as React.CSSProperties}
                  >
                    {/* Grain texture overlay */}
                    <div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none opacity-20 plantio-grain"
                    />
                    <div className="relative">
                      <p className="font-display text-xs font-bold uppercase opacity-70 mb-1">
                        {t(`seeds.${sw.region}`)}
                      </p>
                      <p className={cn("font-display text-base font-bold", colors.accent)}>
                        {sw.months}
                      </p>
                      <StickerBadge
                        variant={i < 2 ? "gold" : "cream"}
                        className="mt-2"
                      >
                        {t(`seeds.${sw.season}`)}
                      </StickerBadge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom spacer for safe area */}
        <div className="h-4" />
      </div>
    </main>
  );
}
