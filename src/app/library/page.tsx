"use client";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Search,
  SearchX,
  ChevronDown,
  AlertTriangle,
  Sprout,
  FlaskConical,
  ShieldCheck,
  Wheat,
  Cherry,
  Apple,
  Cloud,
  Leaf,
  Trees,
  Carrot,
  Grape,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n, type Lang } from "@/lib/plantio/i18n";
import { cn } from "@/lib/utils";

/* ===================================================================
   Disease data model
   =================================================================== */
interface Disease {
  id: string;
  name: string;
  nameHi: string;
  crop: string;
  cropHi: string;
  severity: "low" | "medium" | "high";
  symptoms: string[];
  cause: string;
  organicCure: string[];
  chemicalCure: string[];
  prevention: string[];
  iconHint: string;
}

/* ===================================================================
   12 common crop diseases (real agricultural knowledge, India context)
   =================================================================== */
const DISEASES: Disease[] = [
  {
    id: "wheat-rust",
    name: "Wheat Rust (Yellow / Brown)",
    nameHi: "गेहूँ रस्ट (पीला / भूरा)",
    crop: "Wheat",
    cropHi: "गेहूँ",
    severity: "high",
    symptoms: [
      "Orange-brown pustules on leaves and stems",
      "Yellow streaks along leaf blades",
      "Grains become shrivelled and lightweight",
      "Heavy infection causes early leaf drying",
    ],
    cause:
      "Caused by Puccinia rust fungi spread by wind. Favoured by cool moist weather (10–20°C) with prolonged dew periods.",
    organicCure: [
      "Spray 5% neem oil emulsion at first sign of pustules",
      "Remove and burn infected plant debris after harvest",
      "Grow resistant varieties like HD-2967 or PBW-343",
    ],
    chemicalCure: [
      "Propiconazole 25 EC @ 0.1% (1 ml/litre) at first pustule sight",
      "Mancozeb 75 WP @ 0.25% (2.5 g/litre) as protective spray",
    ],
    prevention: [
      "Remove volunteer wheat plants and alternate hosts (barberry)",
      "Avoid late sowing after mid-December",
      "Treat seed with Carboxin or Tebuconazole before sowing",
    ],
    iconHint: "wheat",
  },
  {
    id: "rice-blast",
    name: "Rice Blast",
    nameHi: "चावल ब्लास्ट",
    crop: "Rice",
    cropHi: "चावल",
    severity: "high",
    symptoms: [
      "Diamond-shaped grey-white lesions with brown borders on leaves",
      "Neck blast — girdling of panicle neck causes empty panicles",
      "Nodes turn black and break easily",
      "White chalky grains on infected panicles",
    ],
    cause:
      "Caused by Magnaporthe oryzae fungus. Favoured by high humidity (>90%) and warm nights (25–28°C) with long dew periods.",
    organicCure: [
      "Spray 3% pongamia (karanj) oil emulsion",
      "Apply rice husk ash to add silicon and strengthen cell walls",
      "Avoid excess nitrogen — it increases blast susceptibility",
    ],
    chemicalCure: [
      "Tricyclazole 75 WP @ 0.6 g/litre at booting and 50% flowering",
      "Azoxystrobin 23 SC @ 1 ml/litre as alternate spray",
    ],
    prevention: [
      "Grow resistant varieties like BPT-5204 or MTU-1010",
      "Maintain 2–5 cm standing water to reduce humidity spikes",
      "Treat seed with Carbendazim 50 WP @ 2 g/kg seed",
    ],
    iconHint: "sprout",
  },
  {
    id: "tomato-early-blight",
    name: "Tomato Early Blight",
    nameHi: "टमाटर अर्ली ब्लाइट",
    crop: "Tomato",
    cropHi: "टमाटर",
    severity: "medium",
    symptoms: [
      "Concentric ring spots (target-board) on older lower leaves",
      "Yellow halos around dark brown lesions",
      "Lesions on stems near the soil line",
      "Leaf drop starting from bottom upward",
    ],
    cause:
      "Caused by Alternaria solani fungus. Favoured by warm humid weather (24–29°C) and prolonged leaf wetness.",
    organicCure: [
      "Spray 3 g/litre Bacillus subtilis or Trichoderma viride",
      "Remove and destroy infected lower leaves weekly",
      "Mulch around plants to prevent soil splash on leaves",
    ],
    chemicalCure: [
      "Mancozeb 75 WP @ 2.5 g/litre every 7–10 days",
      "Azoxystrobin 23 SC @ 1 ml/litre — rotate to avoid resistance",
    ],
    prevention: [
      "Stake plants to improve air circulation",
      "Avoid overhead irrigation — use drip or furrow",
      "Rotate with non-solanaceous crops for 2 years",
    ],
    iconHint: "cherry",
  },
  {
    id: "tomato-late-blight",
    name: "Tomato Late Blight",
    nameHi: "टमाटर लेट ब्लाइट",
    crop: "Tomato",
    cropHi: "टमाटर",
    severity: "high",
    symptoms: [
      "Water-soaked grey-green patches on leaves that turn brown",
      "White fuzzy mould on leaf undersides in humid weather",
      "Dark greasy lesions on stems and fruits",
      "Fruit rot — firm brown patches that enlarge rapidly",
    ],
    cause:
      "Caused by Phytophthora infestans oomycete. Spreads rapidly in cool wet weather (13–20°C) with rain and high humidity.",
    organicCure: [
      "Remove and burn infected plants immediately",
      "Spray 10% cow urine + 5% buttermilk solution",
      "Ensure good drainage — avoid waterlogging",
    ],
    chemicalCure: [
      "Cymoxanil + Mancozeb 8:64 WP @ 2.5 g/litre at 7-day intervals",
      "Metalaxyl 8% + Mancozeb 64% WP @ 2.5 g/litre",
    ],
    prevention: [
      "Plant certified disease-free seedlings",
      "Avoid planting near potato fields",
      "Space plants 60×60 cm for airflow",
    ],
    iconHint: "cherry",
  },
  {
    id: "potato-late-blight",
    name: "Potato Late Blight",
    nameHi: "आलू लेट ब्लाइट",
    crop: "Potato",
    cropHi: "आलू",
    severity: "high",
    symptoms: [
      "Dark water-soaked lesions on leaves turning brown-black",
      "White sporulation on leaf undersides in morning dampness",
      "Brown sunken lesions on tubers",
      "Tubers rot in storage with foul smell",
    ],
    cause:
      "Caused by Phytophthora infestans — same pathogen as tomato late blight. Devastating in cool wet weather (12–18°C) with night frost and daytime warmth.",
    organicCure: [
      "Destroy cull piles and volunteer plants",
      "Hill up soil to cover tubers and prevent infection",
      "Apply Bordeaux mixture 0.5% as a copper-based organic spray",
    ],
    chemicalCure: [
      "Metalaxyl 8% + Mancozeb 64% WP @ 2.5 g/litre",
      "Dimethomorph 50 WP @ 1 g/litre — alternate to prevent resistance",
    ],
    prevention: [
      "Use certified disease-free seed tubers",
      "Plant resistant varieties like Kufri Pukhraj",
      "Stop irrigation 2 weeks before haulm destruction",
    ],
    iconHint: "apple",
  },
  {
    id: "cotton-bollworm",
    name: "Cotton Bollworm",
    nameHi: "कपास बॉलवर्म",
    crop: "Cotton",
    cropHi: "कपास",
    severity: "high",
    symptoms: [
      "Holes and feeding damage on squares and bolls",
      "Frass (droppings) inside damaged bolls",
      "Shedding of squares and young bolls",
      "Stained or rotting lint in open bolls",
    ],
    cause:
      "Caused by Helicoverpa armigera (American bollworm) and Pectinophora gossypiella (pink bollworm) larvae. Favoured by warm weather and continuous cotton cultivation.",
    organicCure: [
      "Release Trichogramma chilonis parasitoids @ 1.5 lakh/ha",
      "Spray 5% neem seed kernel extract (NSKE)",
      "Install pheromone traps @ 8/ha for monitoring",
    ],
    chemicalCure: [
      "Chlorantraniliprole 18.5 SC @ 0.25 ml/litre",
      "Emamectin benzoate 5 SG @ 0.4 g/litre",
      "Spinosad 45 SC @ 0.2 ml/litre",
    ],
    prevention: [
      "Grow Bt cotton (Bollgard II) hybrids",
      "Avoid prolonged retention of cotton crop in the field",
      "Sow trap crops like marigold around field edges",
    ],
    iconHint: "cloud",
  },
  {
    id: "maize-stem-borer",
    name: "Maize Stem Borer",
    nameHi: "मक्का तना छेदक",
    crop: "Maize",
    cropHi: "मक्का",
    severity: "medium",
    symptoms: [
      "Shot-hole appearance on young leaves",
      "Dead-heart symptom in whorl stage (central shoot dries)",
      "Boreholes and frass at the stem base",
      "Lodging and broken stems in severe cases",
    ],
    cause:
      "Caused by Chilo partellus larvae that bore into the stem and feed internally. Favoured by warm weather (24–30°C) and late sowing.",
    organicCure: [
      "Apply neem cake @ 10 kg/ha into the leaf whorl",
      "Release Trichogramma chilonis @ 50,000/ha at 15-day intervals",
      "Uproot and burn infested plants",
    ],
    chemicalCure: [
      "Carbofuran 3G @ 8 kg/ha in leaf whorls",
      "Emamectin benzoate 5 SG @ 0.4 g/litre foliar spray",
    ],
    prevention: [
      "Sow early — before monsoon onset to escape peak infestation",
      "Remove crop residues after harvest to destroy pupae",
      "Grow tolerant varieties like HM-4 or HM-8",
    ],
    iconHint: "leaf",
  },
  {
    id: "sugarcane-red-rot",
    name: "Sugarcane Red Rot",
    nameHi: "गन्ना लाल सड़न",
    crop: "Sugarcane",
    cropHi: "गन्ना",
    severity: "high",
    symptoms: [
      "Reddening of internal stalk tissue with white patches",
      "Leaves yellow and droop; canes become hollow",
      "Sour alcoholic smell when split open",
      "Black sooty spore masses on infected nodes",
    ],
    cause:
      "Caused by Colletotrichum falcatum fungus. Spreads through setts (seed cane) and soil. Favoured by waterlogging and continuous ratoon cropping.",
    organicCure: [
      "Use disease-free setts from certified nurseries",
      "Dip setts in 10% cow urine before planting",
      "Avoid ratooning infected fields — plough out and rotate",
    ],
    chemicalCure: [
      "Carbendazim 50 WP @ 2.5 g/litre sett dip for 10 minutes",
      "Azoxystrobin 23 SC @ 1 ml/litre foliar spray",
    ],
    prevention: [
      "Select resistant varieties like Co-86032 or Co-94012",
      "Improve field drainage — avoid waterlogging",
      "Practice 2-year crop rotation with rice or pulses",
    ],
    iconHint: "trees",
  },
  {
    id: "onion-purple-blotch",
    name: "Onion Purple Blotch",
    nameHi: "प्याज़ पर्पल ब्लॉच",
    crop: "Onion",
    cropHi: "प्याज़",
    severity: "medium",
    symptoms: [
      "Small water-soaked lesions on leaves",
      "Purple-brown concentric spots with yellow halos",
      "Lesions enlarge and girdle the leaf",
      "Leaves bend and die from the tip downward",
    ],
    cause:
      "Caused by Alternaria porri fungus. Favoured by warm humid weather (18–30°C) with prolonged leaf wetness from dew or rain.",
    organicCure: [
      "Spray 5% neem oil with a sticker",
      "Remove and destroy infected leaves",
      "Apply Trichoderma viride as a biocontrol",
    ],
    chemicalCure: [
      "Mancozeb 75 WP @ 2.5 g/litre at 7-day intervals",
      "Difenoconazole 25 EC @ 0.5 ml/litre — alternate",
    ],
    prevention: [
      "Stop overhead irrigation — use drip",
      "Maintain 60×10 cm spacing for airflow",
      "Avoid excessive nitrogen — it softens leaves",
    ],
    iconHint: "carrot",
  },
  {
    id: "grape-powdery-mildew",
    name: "Grape Powdery Mildew",
    nameHi: "अंगूर पाउडरी मिल्ड्यू",
    crop: "Grape",
    cropHi: "अंगूर",
    severity: "medium",
    symptoms: [
      "White-grey powdery patches on upper leaf surface",
      "Leaves curl, dry and drop prematurely",
      "Powdery coating on berries and shoots",
      "Berries crack and rot in severe infection",
    ],
    cause:
      "Caused by Erysiphe necator fungus. Favoured by warm dry weather (25–28°C) with high humidity and shady conditions.",
    organicCure: [
      "Spray wettable sulphur 0.4% at first sign",
      "Remove and burn infected shoots",
      "Maintain an open canopy by proper pruning",
    ],
    chemicalCure: [
      "Myclobutanil 10 WP @ 0.5 g/litre",
      "Azoxystrobin 23 SC @ 1 ml/litre — rotate",
    ],
    prevention: [
      "Prune to maintain an open canopy for sunlight",
      "Avoid excess nitrogen fertilization",
      "Plant resistant varieties like Thompson Seedless (treated)",
    ],
    iconHint: "grape",
  },
  {
    id: "rice-bacterial-blight",
    name: "Rice Bacterial Blight",
    nameHi: "चावल जीवाणु ब्लाइट",
    crop: "Rice",
    cropHi: "चावल",
    severity: "high",
    symptoms: [
      "Yellow wavy lesions starting from leaf tips",
      "Lesions turn straw-yellow and dry up",
      "Kresek phase — whole seedling wilts and dies",
      "Yellow bacterial ooze on cut leaves in the morning",
    ],
    cause:
      "Caused by Xanthomonas oryzae pv. oryzae bacterium. Spreads through irrigation water, rain splash and infected seed. Favoured by warm humid weather (25–30°C) and storms.",
    organicCure: [
      "Burn infected crop residues",
      "Apply 25 kg/ha zinc sulphate to reduce severity",
      "Spray 5% cow urine solution",
    ],
    chemicalCure: [
      "Streptocycline 100 ppm + Copper oxychloride 0.3% spray",
      "Plantomycin (streptomycin sulphate) @ 1 g/litre",
    ],
    prevention: [
      "Grow resistant varieties like Pusa-1460 or Improved Samba Mashuri",
      "Avoid standing water in the nursery",
      "Keep the field free of weeds and volunteer plants",
    ],
    iconHint: "sprout",
  },
  {
    id: "wheat-smut",
    name: "Wheat Smut",
    nameHi: "गेहूँ स्मट",
    crop: "Wheat",
    cropHi: "गेहूँ",
    severity: "medium",
    symptoms: [
      "Black smutty masses replace grain in the ear",
      "Smell of rotting fish from infected ears",
      "Ears remain green longer than healthy ones",
      "Black sooty powder covers grain when ruptured",
    ],
    cause:
      "Caused by Tilletia (stinking smut) and Ustilago (loose smut) fungi. Spreads through seed-borne spores. Favoured by cool moist soil at germination.",
    organicCure: [
      "Soak seed in 5% salt solution — discard the floaters (infected)",
      "Solar heat treatment of seed in hot summer",
      "Use disease-free seed from certified sources",
    ],
    chemicalCure: [
      "Carboxin 75 WP @ 2 g/kg seed treatment",
      "Tebuconazole 2 DS @ 1.5 g/kg seed treatment",
    ],
    prevention: [
      "Use certified disease-free seed every season",
      "Treat seed with fungicide before sowing",
      "Avoid sowing in cold wet soil — wait for optimum temperature",
    ],
    iconHint: "wheat",
  },
];

/* ===================================================================
   Crop filter list (ordered, with localized labels)
   =================================================================== */
const CROPS = [
  "Wheat",
  "Rice",
  "Tomato",
  "Potato",
  "Cotton",
  "Maize",
  "Sugarcane",
  "Onion",
  "Grape",
] as const;

const CROP_LABELS: Record<string, Record<Lang, string>> = {
  Wheat: { en: "Wheat", hi: "गेहूँ", mr: "गहू" },
  Rice: { en: "Rice", hi: "चावल", mr: "तांदूळ" },
  Tomato: { en: "Tomato", hi: "टमाटर", mr: "टोमॅटो" },
  Potato: { en: "Potato", hi: "आलू", mr: "बटाटा" },
  Cotton: { en: "Cotton", hi: "कपास", mr: "कापूस" },
  Maize: { en: "Maize", hi: "मक्का", mr: "मका" },
  Sugarcane: { en: "Sugarcane", hi: "गन्ना", mr: "ऊस" },
  Onion: { en: "Onion", hi: "प्याज़", mr: "कांदा" },
  Grape: { en: "Grape", hi: "अंगूर", mr: "द्राक्ष" },
};

/* Per-crop lucide icon (visual hint on each card) */
const CROP_ICONS: Record<string, LucideIcon> = {
  Wheat: Wheat,
  Rice: Sprout,
  Tomato: Cherry,
  Potato: Apple,
  Cotton: Cloud,
  Maize: Leaf,
  Sugarcane: Trees,
  Onion: Carrot,
  Grape: Grape,
};

const SEVERITY_VARIANT: Record<
  Disease["severity"],
  "leaf" | "gold" | "warn"
> = {
  low: "leaf",
  medium: "gold",
  high: "warn",
};

const SEVERITY_LABEL_KEY: Record<Disease["severity"], string> = {
  low: "library.severityLow",
  medium: "library.severityMedium",
  high: "library.severityHigh",
};

/* ===================================================================
   Disease card — expandable
   =================================================================== */
function DiseaseCard({
  disease,
  index,
}: {
  disease: Disease;
  index: number;
}) {
  const { lang, t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [cureExpanded, setCureExpanded] = useState(false);

  const isDevanagari = lang === "hi" || lang === "mr";
  const displayName = isDevanagari ? disease.nameHi : disease.name;
  const cropLabel = CROP_LABELS[disease.crop]?.[lang] ?? disease.crop;
  const CropIcon = CROP_ICONS[disease.crop] ?? Leaf;

  const panelId = `disease-panel-${disease.id}`;
  const headerId = `disease-header-${disease.id}`;

  return (
    <StickerCard
      className={`plantio-card-in plantio-stamp p-0 overflow-hidden ${disease.severity === "high" ? "plantio-corner-fold" : ""}`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      {/* Severity indicator bar */}
      <div
        aria-hidden
        className={`h-2 rounded-t-2xl ${disease.severity === "low" ? "bg-leaf" : disease.severity === "medium" ? "bg-gold" : "bg-warn"}`}
      />
      {/* Header — clickable to toggle */}
      <button
        type="button"
        id={headerId}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${t("library.tapToExpand")} — ${displayName}`}
        className="w-full text-left p-4 sm:p-5 flex items-start gap-3 cursor-pointer"
      >
        {/* Crop icon badge */}
        <span
          className="shrink-0 w-12 h-12 rounded-2xl bg-cream border-[2.5px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"
          aria-hidden
        >
          <CropIcon className="w-6 h-6 text-forest" strokeWidth={2.5} />
        </span>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase leading-tight text-ink">
            {displayName}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StickerBadge variant="forest">{cropLabel}</StickerBadge>
            <StickerBadge variant={SEVERITY_VARIANT[disease.severity]}>
              {t(SEVERITY_LABEL_KEY[disease.severity])}
            </StickerBadge>
          </div>
          <p className="mt-2 text-sm text-ink/80 leading-snug line-clamp-2">
            {disease.symptoms[0]}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "shrink-0 w-6 h-6 text-ink transition-transform duration-200 mt-1",
            expanded && "rotate-180"
          )}
          strokeWidth={2.5}
          aria-hidden
        />
      </button>

      {/* Expandable body */}
      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3"
        >
          {/* Symptoms */}
          <SubCard
            icon={AlertTriangle}
            title={t("library.symptoms")}
            bg="bg-cream"
            iconBg="bg-warn"
            iconColor="text-white"
            items={disease.symptoms}
          />

          {/* Cause */}
          <div className="bg-cream border-[2.5px] border-ink rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-forest border-[2px] border-ink flex items-center justify-center">
                <AlertTriangle
                  className="w-4 h-4 text-white"
                  strokeWidth={2.5}
                />
              </span>
              <h4 className="font-display text-sm font-bold uppercase tracking-wide text-ink">
                {t("library.cause")}
              </h4>
            </div>
            <p className="text-sm text-ink/85 leading-snug pl-9">
              {disease.cause}
            </p>
          </div>

          {/* Cure sections — expandable */}
          <button
            type="button"
            onClick={() => setCureExpanded((v) => !v)}
            aria-expanded={cureExpanded}
            className="w-full flex items-center gap-2 rounded-2xl border-[2.5px] border-ink bg-cream px-3 py-2.5 cursor-pointer active:translate-y-0.5 transition-transform"
          >
            <Sprout className="w-5 h-5 text-forest" strokeWidth={2.5} />
            <span className="font-display text-sm font-bold uppercase tracking-wide text-ink flex-1 text-left">
              {t("library.organicCure")} & {t("library.chemicalCure")}
            </span>
            <ChevronDown
              className={cn(
                "shrink-0 w-5 h-5 text-ink transition-transform duration-200",
                cureExpanded && "rotate-180"
              )}
              strokeWidth={2.5}
              aria-hidden
            />
          </button>
          {cureExpanded && (
            <div className="space-y-3 plantio-card-in">
              {/* Organic Cure */}
              <SubCard
                icon={Sprout}
                title={t("library.organicCure")}
                bg="bg-leaf/40"
                iconBg="bg-forest"
                iconColor="text-white"
                items={disease.organicCure}
              />

              {/* Chemical Cure */}
              <SubCard
                icon={FlaskConical}
                title={t("library.chemicalCure")}
                bg="bg-gold/40"
                iconBg="bg-warn"
                iconColor="text-white"
                items={disease.chemicalCure}
              />
            </div>
          )}

          {/* Prevention */}
          <SubCard
            icon={ShieldCheck}
            title={t("library.prevention")}
            bg="bg-midgreen/20"
            iconBg="bg-midgreen"
            iconColor="text-white"
            items={disease.prevention}
          />
        </div>
      )}
    </StickerCard>
  );
}

/* Sub-card used inside the expanded disease body */
function SubCard({
  icon: Icon,
  title,
  bg,
  iconBg,
  iconColor,
  items,
}: {
  icon: LucideIcon;
  title: string;
  bg: string;
  iconBg: string;
  iconColor: string;
  items: string[];
}) {
  return (
    <div className={`${bg} border-[2.5px] border-ink rounded-2xl p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`shrink-0 w-7 h-7 rounded-lg border-[2px] border-ink flex items-center justify-center ${iconBg} ${iconColor}`}
        >
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </span>
        <h4 className="font-display text-sm font-bold uppercase tracking-wide text-ink">
          {title}
        </h4>
      </div>
      <ul className="space-y-1.5 pl-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-ink/90 leading-snug"
          >
            <span
              aria-hidden
              className="shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full bg-ink"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ===================================================================
   Library page
   =================================================================== */
export default function LibraryPage() {
  const { lang, t } = useI18n();
  const [query, setQuery] = useState("");
  const [activeCrop, setActiveCrop] = useState<string>("all");

  /* Filter diseases by search query + active crop.
     Search matches name, crop and symptoms (English + Hindi). */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DISEASES.filter((d) => {
      if (activeCrop !== "all" && d.crop !== activeCrop) return false;
      if (!q) return true;
      const haystack = [
        d.name,
        d.nameHi,
        d.crop,
        d.cropHi,
        ...d.symptoms,
        ...d.organicCure,
        ...d.chemicalCure,
        ...d.prevention,
        d.cause,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, activeCrop]);

  const clearFilters = () => {
    setQuery("");
    setActiveCrop("all");
  };

  const allCropsLabel = t("library.allCrops");

  return (
    <main className="plantio-grain flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <SectionHeader
        title={t("library.title")}
        subtitle={t("library.subtitle")}
        bg="forest"
        text="white"
        icon={BookOpen}
        iconTint="bg-leaf"
      />

      {/* ============ Sticky Search & Filter Bar ============ */}
      <div className="sticky top-0 z-20 bg-cream">
        <div className="mx-auto max-w-2xl px-5 py-3">
          <StickerCard className="bg-white p-3 sm:p-4">
            {/* Search input */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/60 pointer-events-none"
                strokeWidth={2.5}
                aria-hidden
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("library.searchPlaceholder")}
                aria-label={t("library.searchPlaceholder")}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border-[3px] border-ink bg-cream text-ink placeholder:text-ink/50 font-sans text-sm focus:outline-none focus:ring-[3px] focus:ring-forest/30 focus:bg-white transition-colors"
              />
            </div>

            {/* Crop filter pills — horizontal scroll */}
            <div className="mt-3 relative">
              <div
                className="flex gap-2 overflow-x-auto scroll-plantio pb-1 -mx-1 px-1"
                role="radiogroup"
                aria-label={t("library.allCrops")}
              >
                <FilterPill
                  active={activeCrop === "all"}
                  onClick={() => setActiveCrop("all")}
                  label={allCropsLabel}
                />
                {CROPS.map((crop) => (
                  <FilterPill
                    key={crop}
                    active={activeCrop === crop}
                    onClick={() => setActiveCrop(crop)}
                    label={CROP_LABELS[crop]?.[lang] ?? crop}
                  />
                ))}
              </div>
              {/* Right-edge fade hint signalling horizontal scroll */}
              <div
                aria-hidden
                className="pointer-events-none absolute top-0 right-0 bottom-1 w-8 bg-gradient-to-l from-white to-transparent rounded-r-lg"
              />
            </div>
          </StickerCard>
        </div>
      </div>

      {/* ============ Disease List ============ */}
      <section className="px-5 py-4 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          {filtered.length === 0 ? (
            /* Empty state */
            <StickerCard className="plantio-pop-in bg-white text-center flex flex-col items-center gap-3 py-8">
              <span className="shrink-0 w-16 h-16 rounded-full bg-warn/15 border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0px_0px_#161611]">
                <SearchX className="w-8 h-8 text-warn" strokeWidth={2.5} />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold uppercase text-ink">
                  {t("library.noResults")}
                </h3>
                <p className="mt-1 text-sm text-ink/70">
                  {t("library.noResultsDesc")}
                </p>
              </div>
              <StickerButton
                variant="forest"
                size="md"
                onClick={clearFilters}
                className="mt-1"
              >
                {t("library.clearFilters")}
              </StickerButton>
            </StickerCard>
          ) : (
            <div className="space-y-4">
              {filtered.map((d, i) => (
                <DiseaseCard key={d.id} disease={d} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/* Filter pill button — active = bg-forest text-white */
function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 px-4 py-2 rounded-full border-[2.5px] border-ink shadow-[2px_2px_0px_0px_#161611] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all font-display text-xs font-bold uppercase tracking-wide cursor-pointer select-none",
        active ? "bg-forest text-white" : "bg-white text-ink"
      )}
    >
      {label}
    </button>
  );
}
