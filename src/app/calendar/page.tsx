"use client";
import { useEffect, useState, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudRain,
  Snowflake,
  CloudLightning,
  Wind,
  Sprout,
  Droplets,
  Wheat,
  Scissors,
  Lightbulb,
  MapPin,
  AlertTriangle,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { StickerCard, SectionHeader } from "@/components/plantio/sticker";
import { BookOpen, ChevronDown, Sun as SunIcon, Droplets as DropletsIcon, Bug, Leaf, CalendarDays, CloudDrizzle } from "lucide-react";
import { useI18n } from "@/lib/plantio/i18n";

/* ===================================================================
   Crop-specific detailed guides (static, rule-based)
   =================================================================== */
interface CropGuide {
  soil: string;
  temperature: string;
  rainfall: string;
  commonPests: string;
  tip: string;
}

const CROP_GUIDES: Record<string, CropGuide> = {
  Wheat: {
    soil: "Loamy to clay loam, well-drained, pH 6-7.5",
    temperature: "Optimum 10-25°C at sowing; 20-25°C at grain fill",
    rainfall: "80-110 cm; irrigated Rabi crop needs 4-6 irrigations",
    commonPests: "Aphids, termites; diseases — rust, smut, blight",
    tip: "Apply the last irrigation at the dough stage for plump grains. Avoid late sowing after mid-December — yield drops sharply.",
  },
  Rice: {
    soil: "Clay to clay loam with good water retention, pH 5.5-6.5",
    temperature: "22-32°C; needs warm humid conditions throughout",
    rainfall: "100-200 cm; irrigated lowland needs continuous standing water",
    commonPests: "Stem borer, leaf folder, plant hoppers; blast & sheath blight",
    tip: "Drain the field 10-15 days before harvest for uniform ripening and easier cutting. Maintain 2-5 cm water till grain filling.",
  },
  Maize: {
    soil: "Well-drained sandy loam to loam, pH 5.5-7.0",
    temperature: "18-30°C; frost-sensitive",
    rainfall: "60-90 cm; sensitive to waterlogging at seedling stage",
    commonPests: "Stem borer, fall armyworm; cob rot, leaf blight",
    tip: "Critical irrigation stages: tasseling and silking. Water stress here can cut yield by 30-40%. Keep weed-free in first 30 days.",
  },
  Cotton: {
    soil: "Deep black cotton soil or sandy loam, pH 6-8",
    temperature: "20-30°C; needs warm sunny weather",
    rainfall: "60-100 cm; sensitive to excess rain at boll opening",
    commonPests: "Bollworm (pink, American), whitefly, leaf curl virus",
    tip: "Avoid waterlogging — it causes boll shedding. Pick bolls only when fully open and dry (morning hours to avoid moisture).",
  },
  Soybean: {
    soil: "Well-drained loam, pH 6-7.5",
    temperature: "20-30°C; sensitive to frost",
    rainfall: "60-75 cm; needs uniform moisture at pod-fill",
    commonPests: "Girdle beetle, stem fly; yellow mosaic virus",
    tip: "Treat seed with Rhizobium culture + Thiram before sowing for nitrogen fixation and disease protection. Inoculation can cut N fertilizer by 25%.",
  },
  Tomato: {
    soil: "Well-drained sandy loam, pH 6-7",
    temperature: "15-30°C; fruit set drops above 32°C",
    rainfall: "Irrigated; avoid heavy rain (causes fruit cracking & blight)",
    commonPests: "Fruit borer, whitefly; early/late blight, leaf curl virus",
    tip: "Stake the plants at 30 days to prevent lodging and reduce fruit rot. Mulch around roots to retain moisture and suppress weeds.",
  },
  Potato: {
    soil: "Loose sandy loam, pH 5-6.5 (slightly acidic prevents scab)",
    temperature: "15-25°C; cool nights improve tuber bulking",
    rainfall: "Irrigated; needs even moisture, hates waterlogging",
    commonPests: "Late blight, early blight, aphids, cutworms",
    tip: "Cut seed tubers into 2-3 pieces with 2-3 eyes each; cure 24h before planting to prevent rot. Stop irrigation 10 days before harvest.",
  },
  Onion: {
    soil: "Loose sandy loam, pH 6-7, well-drained",
    temperature: "13-25°C; cool for bulb, warm for curing",
    rainfall: "Irrigated; stop 15 days before harvest for bulb maturity",
    commonPests: "Thrips, purple blotch, stemphylium blight",
    tip: "Stop irrigation 15-20 days before harvest — excess moisture causes bulbs to rot in storage. Cure bulbs in shade for 7-10 days.",
  },
  Sugarcane: {
    soil: "Deep loam to clay loam, pH 6.5-7.5",
    temperature: "20-35°C; long warm growing season",
    rainfall: "100-150 cm over 12-18 month crop",
    commonPests: "Borer, pyrilla, white grub; red rot, smut",
    tip: "Earthing-up at 90 days (covering base with soil) prevents lodging and improves tillering. Trash mulching conserves moisture.",
  },
  Mustard: {
    soil: "Loam to sandy loam, pH 6-7.5, well-drained",
    temperature: "15-25°C; cool Rabi crop",
    rainfall: "25-40 cm; 2-3 irrigations needed",
    commonPests: "Aphids, painted bug; white rust, alternaria blight",
    tip: "One bee-line of irrigation at flowering boosts yield by 20%. Spray sulphur at 45 days to prevent powdery mildew in humid weather.",
  },
};

/* ===================================================================
   Static crop calendar data — rule-based (no AI), realistic for India
   =================================================================== */
const iconMap = {
  Sprout,
  Droplets,
  Wheat,
  Scissors,
} as const;

type StageIcon = keyof typeof iconMap;

interface Stage {
  stage: string;
  month: string;
  icon: StageIcon;
}

const CROP_CALENDAR: Record<string, Stage[]> = {
  Wheat: [
    { stage: "Sow", month: "Mid Nov – early Dec", icon: "Sprout" },
    { stage: "Irrigate", month: "Dec – Feb (3-4 irrigations: CRI, jointing, flowering, grain fill)", icon: "Droplets" },
    { stage: "Fertilize", month: "At sowing (basal NPK) & 4-5 weeks after (top-dress N)", icon: "Wheat" },
    { stage: "Harvest", month: "Mid Mar – Apr", icon: "Scissors" },
  ],
  Rice: [
    { stage: "Sow", month: "Jun – Jul (nursery 25-30 days before transplant)", icon: "Sprout" },
    { stage: "Irrigate", month: "Jul – Sep (keep 2-5 cm standing water)", icon: "Droplets" },
    { stage: "Fertilize", month: "Basal NPK at transplant + N at tillering & panicle initiation", icon: "Wheat" },
    { stage: "Harvest", month: "Oct – Nov (when grains are hard & yellow)", icon: "Scissors" },
  ],
  Maize: [
    { stage: "Sow", month: "Jun – Jul (kharif); Feb (spring, south India)", icon: "Sprout" },
    { stage: "Irrigate", month: "Jul – Sep (critical at tasseling & silking)", icon: "Droplets" },
    { stage: "Fertilize", month: "Basal NPK at sowing + N at knee-high & tasseling", icon: "Wheat" },
    { stage: "Harvest", month: "Sep – Oct (kharif); May (spring)", icon: "Scissors" },
  ],
  Cotton: [
    { stage: "Sow", month: "May – Jun (after monsoon onset)", icon: "Sprout" },
    { stage: "Irrigate", month: "Jul – Sep (light & frequent; avoid waterlogging)", icon: "Droplets" },
    { stage: "Fertilize", month: "Basal NPK at sowing + N at 45 & 75 days", icon: "Wheat" },
    { stage: "Harvest", month: "Oct – Dec (pick when bolls fully open)", icon: "Scissors" },
  ],
  Soybean: [
    { stage: "Sow", month: "Mid Jun – early Jul (with monsoon onset)", icon: "Sprout" },
    { stage: "Irrigate", month: "Jul – Sep (rainfed; one irrigation if dry at pod-fill)", icon: "Droplets" },
    { stage: "Fertilize", month: "Basal NPK + Rhizobium seed treatment", icon: "Wheat" },
    { stage: "Harvest", month: "Oct – early Nov (leaves yellow, pods dry)", icon: "Scissors" },
  ],
  Tomato: [
    { stage: "Sow", month: "Nursery: May-Jun & Oct-Nov; transplant 25-30 days later", icon: "Sprout" },
    { stage: "Irrigate", month: "Throughout (keep soil moist; avoid wilting at flowering)", icon: "Droplets" },
    { stage: "Fertilize", month: "Basal NPK + N top-dress at 30, 50 & 70 days", icon: "Wheat" },
    { stage: "Harvest", month: "70-90 days after transplant, 6-8 pickings", icon: "Scissors" },
  ],
  Potato: [
    { stage: "Sow", month: "Oct – Nov (plant seed tubers in ridges)", icon: "Sprout" },
    { stage: "Irrigate", month: "Nov – Jan (light at stolonization & tuber bulking)", icon: "Droplets" },
    { stage: "Fertilize", month: "Basal NPK at sowing + N at 25-30 days after emergence", icon: "Wheat" },
    { stage: "Harvest", month: "Jan – Feb (vines yellow & dry)", icon: "Scissors" },
  ],
  Onion: [
    { stage: "Sow", month: "Nursery: Jun-Jul & Oct-Nov; transplant 45 days later", icon: "Sprout" },
    { stage: "Irrigate", month: "Transplant to bulb formation (stop 15 days before harvest)", icon: "Droplets" },
    { stage: "Fertilize", month: "Basal NPK + N top-dress at 30 & 45 days after transplant", icon: "Wheat" },
    { stage: "Harvest", month: "100-130 days after transplant (tops fall & dry)", icon: "Scissors" },
  ],
  Sugarcane: [
    { stage: "Sow", month: "Feb – Mar (spring); Oct (autumn)", icon: "Sprout" },
    { stage: "Irrigate", month: "Through 12-18 month crop (critical at tillering & grand growth)", icon: "Droplets" },
    { stage: "Fertilize", month: "Basal NPK at sowing + N splits at 45, 90 & 120 days", icon: "Wheat" },
    { stage: "Harvest", month: "12-18 months after planting (before flowering)", icon: "Scissors" },
  ],
  Mustard: [
    { stage: "Sow", month: "Oct – mid Nov (Rabi)", icon: "Sprout" },
    { stage: "Irrigate", month: "Nov – Jan (2-3 irrigations: rosette, flowering, pod-fill)", icon: "Droplets" },
    { stage: "Fertilize", month: "Basal NPK at sowing + N top-dress at 30 days", icon: "Wheat" },
    { stage: "Harvest", month: "Feb – Mar (pods turn yellow-brown)", icon: "Scissors" },
  ],
};

/* ===================================================================
   Season data — based on current month
   =================================================================== */
type Season = "kharif" | "rabi" | "zaid" | "autumn";

interface SeasonInfo {
  key: Season;
  labelKey: string;
  dates: string;
  tip: string;
  bgClass: string;
  textClass: string;
  iconBg: string;
}

function getCurrentSeason(month: number): SeasonInfo {
  // Kharif: Jun-Sep (5-8), Autumn: Oct-Nov (9-10), Rabi: Dec-Mar (11-2), Zaid: Apr-May (3-4)
  if (month >= 5 && month <= 8) {
    return {
      key: "kharif",
      labelKey: "calendar.seasonKharif",
      dates: "June – September",
      tip: "Monsoon is active — ensure drainage channels are clear and avoid waterlogging in low-lying fields.",
      bgClass: "bg-midgreen",
      textClass: "text-white",
      iconBg: "bg-leaf",
    };
  }
  if (month >= 9 && month <= 10) {
    return {
      key: "autumn",
      labelKey: "calendar.seasonAutumn",
      dates: "October – November",
      tip: "Kharif harvest is underway — dry produce properly before storage to prevent fungal damage.",
      bgClass: "bg-warn",
      textClass: "text-white",
      iconBg: "bg-gold",
    };
  }
  if (month >= 3 && month <= 4) {
    return {
      key: "zaid",
      labelKey: "calendar.seasonZaid",
      dates: "March – May",
      tip: "Summer crops need timely irrigation — water stress in Zaid can cut yields by 40%.",
      bgClass: "bg-leaf",
      textClass: "text-ink",
      iconBg: "bg-forest",
    };
  }
  // Rabi: Dec-Feb (11, 0, 1, 2)
  return {
    key: "rabi",
    labelKey: "calendar.seasonRabi",
    dates: "October – March",
    tip: "Cool season is ideal for wheat & mustard — apply first irrigation at CRI stage (21 days after sowing).",
    bgClass: "bg-gold",
    textClass: "text-ink",
    iconBg: "bg-forest",
  };
}

/* ===================================================================
   Crop stage timeline data — visual horizontal timeline
   =================================================================== */
interface TimelineStage {
  label: string;
  labelKey: string;
  color: string;
  activeColor: string;
}

const TIMELINE_STAGES: TimelineStage[] = [
  { label: "Sowing", labelKey: "calendar.stageSowing", color: "bg-leaf", activeColor: "bg-leaf" },
  { label: "Vegetative", labelKey: "calendar.stageVegetative", color: "bg-midgreen", activeColor: "bg-midgreen" },
  { label: "Flowering", labelKey: "calendar.stageFlowering", color: "bg-gold", activeColor: "bg-gold" },
  { label: "Harvesting", labelKey: "calendar.stageHarvesting", color: "bg-warn", activeColor: "bg-warn" },
];

function getActiveTimelineStage(crop: string, month: number): number {
  // Simple heuristic based on crop and current month
  const kharifCrops = ["Rice", "Maize", "Cotton", "Soybean", "Tomato"];
  const rabiCrops = ["Wheat", "Potato", "Onion", "Mustard"];
  const isKharif = kharifCrops.includes(crop);
  const isRabi = rabiCrops.includes(crop);

  if (isKharif) {
    if (month >= 5 && month <= 6) return 0; // Sowing
    if (month >= 7 && month <= 8) return 1; // Vegetative
    if (month === 9) return 2; // Flowering
    if (month === 10 || month === 11) return 3; // Harvesting
  }
  if (isRabi) {
    if (month >= 10 && month <= 11) return 0; // Sowing
    if (month === 0 || month === 1) return 1; // Vegetative
    if (month === 2) return 2; // Flowering
    if (month === 3) return 3; // Harvesting
  }
  // Sugarcane & others
  if (crop === "Sugarcane") {
    if (month >= 1 && month <= 3) return 0;
    if (month >= 4 && month <= 7) return 1;
    if (month >= 8 && month <= 10) return 2;
    return 3;
  }
  // Default: guess based on month
  if (month >= 5 && month <= 7) return 1;
  if (month >= 8 && month <= 10) return 2;
  if (month >= 11 || month <= 2) return 0;
  return 1;
}

/* ===================================================================
   Upcoming activities data
   =================================================================== */
interface UpcomingActivity {
  titleKey: string;
  icon: LucideIcon;
  dueLabel: string;
}

function getUpcomingActivities(crop: string, season: Season): UpcomingActivity[] {
  const activities: UpcomingActivity[] = [];

  // Add irrigation check for most crops
  activities.push({
    titleKey: "calendar.irrigationDue",
    icon: Droplets,
    dueLabel: season === "kharif" ? "Due in 1 week" : "Due now",
  });

  // Add fertilizer for growing season
  if (season === "rabi" || season === "kharif") {
    activities.push({
      titleKey: "calendar.fertilizerDue",
      icon: Wheat,
      dueLabel: "Due in 2 weeks",
    });
  }

  // Pruning/weeding
  activities.push({
    titleKey: "calendar.pruningDue",
    icon: Scissors,
    dueLabel: "Due in 3 weeks",
  });

  // Harvest or sowing based on season
  if (season === "autumn") {
    activities.push({
      titleKey: "calendar.harvestDue",
      icon: Scissors,
      dueLabel: "Due in 1 week",
    });
  } else if (season === "zaid" || season === "rabi") {
    activities.push({
      titleKey: "calendar.sowingDue",
      icon: Sprout,
      dueLabel: season === "zaid" ? "Due now" : "Due in 2 weeks",
    });
  }

  return activities.slice(0, 4);
}

/* ===================================================================
   Weather code -> icon + label (WMO codes used by Open-Meteo)
   =================================================================== */
const WEATHER_CODE_MAP: Record<number, { icon: LucideIcon; labelKey: string }> = {
  0: { icon: Sun, labelKey: "calendar.weatherSunny" },
  1: { icon: CloudSun, labelKey: "calendar.weatherMainlyClear" },
  2: { icon: CloudSun, labelKey: "calendar.weatherPartlyCloudy" },
  3: { icon: Cloud, labelKey: "calendar.weatherOvercast" },
  45: { icon: CloudFog, labelKey: "calendar.weatherFog" },
  48: { icon: CloudFog, labelKey: "calendar.weatherRimeFog" },
  51: { icon: CloudRain, labelKey: "calendar.weatherLightDrizzle" },
  53: { icon: CloudRain, labelKey: "calendar.weatherDrizzle" },
  55: { icon: CloudRain, labelKey: "calendar.weatherHeavyDrizzle" },
  56: { icon: CloudRain, labelKey: "calendar.weatherFreezingDrizzle" },
  57: { icon: CloudRain, labelKey: "calendar.weatherFreezingDrizzle" },
  61: { icon: CloudRain, labelKey: "calendar.weatherLightRain" },
  63: { icon: CloudRain, labelKey: "calendar.weatherRain" },
  65: { icon: CloudRain, labelKey: "calendar.weatherHeavyRain" },
  66: { icon: CloudRain, labelKey: "calendar.weatherFreezingRain" },
  67: { icon: CloudRain, labelKey: "calendar.weatherFreezingRain" },
  71: { icon: Snowflake, labelKey: "calendar.weatherLightSnow" },
  73: { icon: Snowflake, labelKey: "calendar.weatherSnow" },
  75: { icon: Snowflake, labelKey: "calendar.weatherHeavySnow" },
  77: { icon: Snowflake, labelKey: "calendar.weatherSnowGrains" },
  80: { icon: CloudRain, labelKey: "calendar.weatherLightShowers" },
  81: { icon: CloudRain, labelKey: "calendar.weatherShowers" },
  82: { icon: CloudRain, labelKey: "calendar.weatherViolentShowers" },
  85: { icon: Snowflake, labelKey: "calendar.weatherSnowShowers" },
  86: { icon: Snowflake, labelKey: "calendar.weatherHeavySnowShowers" },
  95: { icon: CloudLightning, labelKey: "calendar.weatherThunderstorm" },
  96: { icon: CloudLightning, labelKey: "calendar.weatherThunderstormHail" },
  99: { icon: CloudLightning, labelKey: "calendar.weatherSevereThunderstorm" },
};

function weatherForCode(code: number | undefined): { icon: LucideIcon; labelKey: string } {
  if (code === undefined) return { icon: Cloud, labelKey: "calendar.weatherUnknown" };
  return WEATHER_CODE_MAP[code] ?? { icon: Cloud, labelKey: "calendar.weatherUnknown" };
}

/* Estimate UV index from weather code when not available from API */
function estimateUvFromCode(code: number): number {
  if (code <= 1) return 7;
  if (code <= 2) return 5;
  if (code <= 3) return 3;
  if (code >= 51 && code <= 67) return 2;
  if (code >= 71 && code <= 77) return 1;
  if (code >= 80 && code <= 82) return 2;
  if (code >= 95) return 1;
  return 4;
}

/* Check if weather code indicates rain */
function isRainyCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

/* ===================================================================
   Types
   =================================================================== */
interface DayForecast {
  date: string;
  code: number;
  tMax: number;
  tMin: number;
  precip: number;
}

interface WeatherData {
  current: { temp: number; code: number; humidity: number; windSpeed: number; uvIndex: number };
  daily: DayForecast[];
}

interface LocationInfo {
  lat: number;
  lng: number;
  isDefault: boolean;
}

const DEFAULT_LOCATION: LocationInfo = {
  lat: 22.97,
  lng: 78.65,
  isDefault: true,
};

/* ===================================================================
   Helpers
   =================================================================== */
function dayName(iso: string, idx: number, t: (key: string) => string): string {
  if (idx === 0) return t("calendar.today");
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d);
  } catch {
    return `Day ${idx + 1}`;
  }
}

function weatherSummary(w: WeatherData | null, t: (key: string) => string): string {
  if (!w || !w.daily?.length) return "no data";
  const today = w.daily[0];
  const codes = w.daily.slice(0, 3).map((d) => t(weatherForCode(d.code).labelKey));
  return `${codes.join(", ")}. Max ${Math.round(today.tMax)}°C, ${today.precip}% rain chance.`;
}

/* UV index helpers */
function uvBg(uv: number): string {
  if (uv <= 2) return "bg-leaf/30";
  if (uv <= 5) return "bg-gold/30";
  if (uv <= 7) return "bg-gold/60";
  return "bg-warn/30";
}
function uvLabel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Mod";
  if (uv <= 7) return "High";
  return "V.High";
}

/* ===================================================================
   Main component
   =================================================================== */
export default function CalendarPage() {
  const { t } = useI18n();
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState<string>("Wheat");
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);

  /* Current month & season */
  const currentMonth = useMemo(() => new Date().getMonth(), []);
  const season = useMemo(() => getCurrentSeason(currentMonth), [currentMonth]);
  const activeStageIdx = useMemo(() => getActiveTimelineStage(selectedCrop, currentMonth), [selectedCrop, currentMonth]);
  const upcomingActivities = useMemo(() => getUpcomingActivities(selectedCrop, season.key), [selectedCrop, season.key]);

  /* ---------- 1. geolocation + weather fetch on mount ---------- */
  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async (loc: LocationInfo) => {
      if (cancelled) return;
      setWeatherLoading(true);
      setWeatherError(false);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
          `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,uv_index` +
          `&timezone=auto&forecast_days=5`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error("weather fetch failed");
        const j = await res.json();
        const daily: DayForecast[] = (j.daily?.time || []).map(
          (ts: string, i: number) => ({
            date: ts,
            code: j.daily.weather_code?.[i] ?? 0,
            tMax: j.daily.temperature_2m_max?.[i] ?? 0,
            tMin: j.daily.temperature_2m_min?.[i] ?? 0,
            precip: j.daily.precipitation_probability_max?.[i] ?? 0,
          })
        );
        const data: WeatherData = {
          current: {
            temp: j.current?.temperature_2m ?? 0,
            code: j.current?.weather_code ?? 0,
            humidity: j.current?.relative_humidity_2m ?? 0,
            windSpeed: j.current?.wind_speed_10m ?? 0,
            uvIndex: j.current?.uv_index ?? 0,
          },
          daily,
        };
        if (!cancelled) {
          setWeather(data);
          setWeatherLoading(false);
        }
      } catch {
        clearTimeout(timeout);
        if (!cancelled) {
          setWeatherError(true);
          setWeatherLoading(false);
        }
      }
    };

    const startGeolocation = () => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setLocation(DEFAULT_LOCATION);
        fetchWeather(DEFAULT_LOCATION);
        return;
      }
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            const loc: LocationInfo = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              isDefault: false,
            };
            setLocation(loc);
            fetchWeather(loc);
          },
          () => {
            if (cancelled) return;
            setLocation(DEFAULT_LOCATION);
            fetchWeather(DEFAULT_LOCATION);
          },
          { timeout: 6_000, maximumAge: 30 * 60 * 1000 }
        );
      } catch {
        if (cancelled) return;
        setLocation(DEFAULT_LOCATION);
        fetchWeather(DEFAULT_LOCATION);
      }
    };

    startGeolocation();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- 2. advisory fetch when crop changes or weather is ready ---------- */
  useEffect(() => {
    let cancelled = false;
    if (weatherLoading) return;

    const fetchAdvisory = async () => {
      setAdvisoryLoading(true);
      setAdvisory(null);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      const crop = selectedCrop;
      const stages = CROP_CALENDAR[crop] || [];
      const stageStr = stages.map((s) => `${s.stage} (${s.month})`).join("; ");
      const wSummary = weatherSummary(weather, t);
      try {
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ crop, stage: stageStr, weather: wSummary }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error("advisory failed");
        const j = await res.json();
        if (!cancelled) {
          setAdvisory(
            typeof j.advisory === "string" && j.advisory.trim()
              ? j.advisory.trim()
              : null
          );
          setAdvisoryLoading(false);
        }
      } catch {
        clearTimeout(timeout);
        if (!cancelled) {
          setAdvisory(null);
          setAdvisoryLoading(false);
        }
      }
    };

    fetchAdvisory();
    return () => {
      cancelled = true;
    };
  }, [selectedCrop, weather, weatherLoading]);

  const stages = CROP_CALENDAR[selectedCrop] || [];
  const guide = CROP_GUIDES[selectedCrop];
  const [guideOpen, setGuideOpen] = useState(false);

  /* alternating card colors for the 4-stage timeline */
  const cardTints = [
    "bg-leaf text-ink",
    "bg-gold text-ink",
    "bg-cream text-ink",
    "bg-midgreen text-white",
  ];
  const circleTints = [
    "bg-forest text-white",
    "bg-ink text-gold",
    "bg-forest text-white",
    "bg-gold text-ink",
  ];

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)] plantio-grain">
      <SectionHeader
        title={t("calendar.title")}
        subtitle={t("calendar.subtitle")}
        bg="midgreen"
        icon={CalendarDays}
        iconTint="bg-gold"
      />

      {/* Decorative header strip with gradient + dot texture */}
      <div aria-hidden className="relative h-5 plantio-hero-gradient overflow-hidden">
        <div className="absolute inset-0 plantio-dots-ink pointer-events-none opacity-20" />
        <div className="plantio-leaf-1 absolute top-0 right-8" />
        <div className="plantio-leaf-2 absolute bottom-0 left-6" />
      </div>
      <div aria-hidden className="plantio-torn-edge -mt-px" />

      {/* ============ Current Season Indicator Banner ============ */}
      <section className="px-5 pt-4 pb-2 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <StickerCard className={`${season.bgClass} ${season.textClass} plantio-pop-in`}>
            <div className="flex items-start gap-3">
              <span className={`shrink-0 w-12 h-12 rounded-full border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611] ${season.iconBg} text-ink`}>
                <CalendarDays className="w-6 h-6" strokeWidth={2.5} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-bold uppercase leading-tight plantio-embossed">
                  {t(season.labelKey)}
                </p>
                <p className="mt-0.5 text-sm opacity-80">{season.dates}</p>
                <p className="mt-2 text-sm leading-snug font-medium">
                  {season.tip}
                </p>
              </div>
            </div>
          </StickerCard>
        </div>
      </section>

      {/* ============ 5-day forecast strip ============ */}
      <section className="px-5 py-6 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-display text-xl font-bold uppercase flex items-center gap-2">
              <Sun className="w-5 h-5 text-gold" strokeWidth={2.5} /> {t("calendar.fiveDayForecast")}
            </h2>
            {location?.isDefault && (
              <span className="inline-flex items-center gap-1 text-xs text-ink/70">
                <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("calendar.usingDefaultLocation")}
              </span>
            )}
          </div>

          {weatherLoading && <WeatherSkeleton />}

          {weatherError && !weatherLoading && (
            <StickerCard className="bg-cream">
              <div className="flex items-center gap-3">
                <span className="shrink-0 w-10 h-10 rounded-2xl bg-warn border-[2.5px] border-ink flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="font-display text-sm font-bold uppercase">{t("calendar.weatherUnavailable")}</p>
                  <p className="text-xs text-ink/70">
                    {t("calendar.weatherUnavailableDesc")}
                  </p>
                </div>
              </div>
            </StickerCard>
          )}

          {weather && !weatherLoading && (
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto scroll-plantio pb-2 -mx-1 px-1">
                {weather.daily.map((d, i) => {
                  const w = weatherForCode(i === 0 ? weather.current.code : d.code);
                  const Icon = w.icon;
                  const isToday = i === 0;
                  const uvEst = i === 0 ? weather.current.uvIndex : estimateUvFromCode(d.code);
                  const feelsLike = Math.round(d.tMax - (isToday ? 0 : 1) + (weather.current.humidity > 70 ? 2 : 0));
                  const rainy = isRainyCode(d.code);
                  return (
                    <StickerCard
                      key={d.date + i}
                      className={`shrink-0 w-[128px] p-3 plantio-list-item ${isToday ? "bg-leaf" : "bg-white"}`}
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      <p className="font-display text-xs font-bold uppercase text-ink/70">
                        {dayName(d.date, i, t)}
                      </p>
                      <div className="mt-2 flex items-center justify-center">
                        <span className="w-12 h-12 rounded-full bg-forest border-[2.5px] border-ink flex items-center justify-center">
                          <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                        </span>
                      </div>
                      <p className="mt-2 text-center font-display text-[11px] font-bold uppercase leading-tight min-h-[28px] line-clamp-2">
                        {t(w.labelKey)}
                      </p>
                      {/* Larger temperature display */}
                      <p className="mt-1 text-center font-display text-2xl font-bold leading-none">
                        {Math.round(d.tMax)}°
                      </p>
                      <p className="mt-0.5 text-center text-xs text-ink/60">
                        Low {Math.round(d.tMin)}°
                      </p>
                      {/* Feels Like */}
                      <p className="mt-1 text-center text-[10px] text-ink/60 leading-tight">
                        Feels {feelsLike}°
                      </p>
                      {/* UV index */}
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-display font-bold uppercase rounded-full px-1.5 py-0.5 border-[2px] border-ink ${uvBg(uvEst)}`}>
                          <Sun className="w-2.5 h-2.5" strokeWidth={2.5} /> UV {uvLabel(uvEst)}
                        </span>
                      </div>
                      <p className="mt-1 text-center text-[11px] text-ink/70 flex items-center justify-center gap-1">
                        <Droplets className="w-3 h-3" strokeWidth={2.5} /> {d.precip}%
                      </p>
                      {/* Farming Advice */}
                      <p className={`mt-1 text-center text-[10px] font-display font-bold uppercase leading-tight flex items-center justify-center gap-0.5 ${rainy ? "text-warn" : "text-forest"}`}>
                        {rainy ? (
                          <>
                            <ShieldAlert className="w-3 h-3" strokeWidth={2.5} />
                            {t("calendar.avoidSpraying")}
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
                            {t("calendar.goodForSpraying")}
                          </>
                        )}
                      </p>
                    </StickerCard>
                  );
                })}
              </div>
              {/* Right-edge fade hint signalling horizontal scroll */}
              <div
                aria-hidden
                className="pointer-events-none absolute top-0 right-0 bottom-2 w-8 bg-gradient-to-l from-cream to-transparent"
              />
            </div>
          )}
        </div>
      </section>

      {/* ============ Today's Weather Detail Card ============ */}
      {weather && !weatherLoading && (
        <section className="px-5 pb-4">
          <div className="mx-auto max-w-2xl">
            <StickerCard className="bg-white plantio-pop-in">
              <div className="flex items-center gap-3 mb-3">
                <span className="shrink-0 w-10 h-10 rounded-2xl bg-forest border-[2.5px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                  <Wind className="w-5 h-5 text-white" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="font-display text-base font-bold uppercase leading-tight">
                    {t("calendar.today")}
                  </p>
                  <p className="text-xs text-ink/60">{Math.round(weather.current.temp)}°C — {t(weatherForCode(weather.current.code).labelKey)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {/* Humidity */}
                <div className="rounded-2xl border-[2.5px] border-ink bg-leaf/30 p-3 flex flex-col items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                  <Droplets className="w-5 h-5 text-midgreen mb-1" strokeWidth={2.5} />
                  <span className="font-display text-lg font-bold leading-none">{Math.round(weather.current.humidity)}%</span>
                  <span className="text-[10px] font-display font-bold uppercase text-ink/70 mt-0.5">Humidity</span>
                </div>
                {/* Wind */}
                <div className="rounded-2xl border-[2.5px] border-ink bg-gold/30 p-3 flex flex-col items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                  <Wind className="w-5 h-5 text-forest mb-1" strokeWidth={2.5} />
                  <span className="font-display text-lg font-bold leading-none">{Math.round(weather.current.windSpeed)}</span>
                  <span className="text-[10px] font-display font-bold uppercase text-ink/70 mt-0.5">km/h Wind</span>
                </div>
                {/* UV Index */}
                <div className={`rounded-2xl border-[2.5px] border-ink ${uvBg(weather.current.uvIndex)} p-3 flex flex-col items-center justify-center shadow-[3px_3px_0px_0px_#161611]`}>
                  <Sun className="w-5 h-5 text-ink/80 mb-1" strokeWidth={2.5} />
                  <span className="font-display text-lg font-bold leading-none">{weather.current.uvIndex.toFixed(1)}</span>
                  <span className="text-[10px] font-display font-bold uppercase text-ink/70 mt-0.5">{uvLabel(weather.current.uvIndex)} UV</span>
                </div>
              </div>
            </StickerCard>
          </div>
        </section>
      )}

      {/* ============ Crop picker ============ */}
      <section className="px-5 pb-2 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-xl font-bold uppercase mb-3 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-forest" strokeWidth={2.5} /> {t("calendar.pickACrop")}
          </h2>
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto scroll-plantio pb-2 -mx-1 px-1">
              {Object.keys(CROP_CALENDAR).map((crop) => {
                const selected = crop === selectedCrop;
                return (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => setSelectedCrop(crop)}
                    className={`shrink-0 sticker-pill px-4 py-2 font-display text-sm font-bold uppercase tracking-wide ${
                      selected ? "bg-leaf text-ink" : "bg-white text-ink"
                  }`}
                >
                  {crop}
                </button>
              );
            })}
            </div>
            {/* Right-edge fade hint */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 right-0 bottom-2 w-8 bg-gradient-to-l from-cream to-transparent rounded-r-lg"
            />
          </div>
        </div>
      </section>

      {/* ============ Today's Advisory banner (AI) ============ */}
      {(advisoryLoading || advisory) && (
        <section className="px-5 py-4">
          <div className="mx-auto max-w-2xl">
            <StickerCard className="bg-gold">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-12 h-12 rounded-full bg-ink border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                  <Lightbulb className="w-6 h-6 text-gold" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-bold uppercase text-ink/70">
                    {t("calendar.todaysAdvisory")}
                  </p>
                  {advisoryLoading ? (
                    <div className="mt-2 space-y-2">
                      <div className="skeleton-plantio h-4 w-full" />
                      <div className="skeleton-plantio h-4 w-2/3" />
                    </div>
                  ) : (
                    <p className="mt-1 text-base font-medium leading-snug">{advisory}</p>
                  )}
                </div>
              </div>
            </StickerCard>
          </div>
        </section>
      )}

      {/* ============ Crop Stage Timeline (horizontal visual) ============ */}
      <section className="px-5 py-4 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-xl font-bold uppercase mb-4 flex items-center gap-2">
            <Wheat className="w-5 h-5 text-forest" strokeWidth={2.5} /> {t("calendar.stageTimeline")} — {selectedCrop}
          </h2>
          <StickerCard className="bg-cream overflow-x-auto">
            <div className="flex items-center justify-between min-w-[320px] py-2 px-1">
              {TIMELINE_STAGES.map((s, i) => {
                const isActive = i === activeStageIdx;
                const isPast = i < activeStageIdx;
                return (
                  <div key={s.labelKey} className="flex items-center flex-1 last:flex-none">
                    {/* Node */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611] transition-all ${
                          isActive
                            ? `${s.activeColor} text-ink scale-110`
                            : isPast
                            ? `${s.color} text-ink`
                            : "bg-white text-ink/40"
                        }`}
                      >
                        {isActive && <Sun className="w-4 h-4" strokeWidth={3} />}
                        {isPast && !isActive && <CloudSun className="w-4 h-4" strokeWidth={2.5} />}
                        {!isPast && !isActive && <Cloud className="w-4 h-4" strokeWidth={2} />}
                      </div>
                      <span
                        className={`mt-1.5 font-display text-[10px] font-bold uppercase text-center leading-tight ${
                          isActive ? "text-ink" : "text-ink/50"
                        }`}
                      >
                        {t(s.labelKey)}
                      </span>
                    </div>
                    {/* Connector line */}
                    {i < TIMELINE_STAGES.length - 1 && (
                      <div
                        className={`flex-1 h-[3px] mx-1 rounded-full ${
                          isPast ? "bg-forest" : "bg-ink/15"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Current stage indicator */}
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className={`inline-flex items-center gap-1 font-display text-xs font-bold uppercase rounded-full px-3 py-1 border-[2.5px] border-ink shadow-[2px_2px_0px_0px_#161611] ${TIMELINE_STAGES[activeStageIdx].activeColor} text-ink`}>
                <MapPin className="w-3 h-3" strokeWidth={2.5} />
                {t(TIMELINE_STAGES[activeStageIdx].labelKey)}
              </span>
            </div>
          </StickerCard>
        </div>
      </section>

      {/* ============ Calendar timeline (4 stages) ============ */}
      <section className="px-5 py-4 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-xl font-bold uppercase mb-3 flex items-center gap-2">
            <Wheat className="w-5 h-5 text-forest" strokeWidth={2.5} /> {selectedCrop} — stages
          </h2>
          <div className="flex gap-4 overflow-x-auto scroll-plantio pb-3 -mx-1 px-1">
            {stages.map((s, i) => {
              const Icon = iconMap[s.icon];
              const tint = cardTints[i % cardTints.length];
              const circleTint = circleTints[i % circleTints.length];
              return (
                <StickerCard key={s.stage} className={`shrink-0 w-64 ${tint}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`w-14 h-14 rounded-full border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611] ${circleTint}`}
                    >
                      <Icon className="w-7 h-7" strokeWidth={2.5} />
                    </span>
                    <span className="font-display text-xs font-bold uppercase opacity-70">
                      Step {i + 1} / 4
                    </span>
                  </div>
                  <p className="font-display text-2xl font-bold uppercase leading-tight">{s.stage}</p>
                  <p className="mt-2 text-sm leading-snug">{s.month}</p>
                </StickerCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ Upcoming Activities ============ */}
      <section className="px-5 pb-4 plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-xl font-bold uppercase mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-gold" strokeWidth={2.5} /> {t("calendar.upcomingActivities")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {upcomingActivities.map((act, i) => {
              const Icon = act.icon;
              const tints = ["bg-leaf text-ink", "bg-gold text-ink", "bg-midgreen text-white", "bg-warn text-white"];
              return (
                <StickerCard key={act.titleKey + i} className={tints[i % tints.length]}>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 w-9 h-9 rounded-full border-[2.5px] border-ink flex items-center justify-center bg-white shadow-[2px_2px_0px_0px_#161611]">
                      <Icon className="w-4 h-4 text-ink" strokeWidth={2.5} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-bold uppercase leading-tight">
                        {t(act.titleKey)}
                      </p>
                      <p className="mt-1 text-[11px] font-display font-bold uppercase opacity-70 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" strokeWidth={2.5} /> {act.dueLabel}
                      </p>
                    </div>
                  </div>
                </StickerCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ Crop-specific detailed guide (expandable) ============ */}
      {guide && (
        <section className="px-5 pb-6">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => setGuideOpen((v) => !v)}
              className="sticker-card sticker-interactive bg-forest text-white p-4 w-full flex items-center gap-3 active:translate-y-0.5 transition-transform"
              aria-expanded={guideOpen}
            >
              <span className="shrink-0 w-11 h-11 rounded-2xl bg-gold border-[2.5px] border-ink flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </span>
              <div className="flex-1 text-left">
                <p className="font-display text-base font-bold uppercase leading-tight">
                  {selectedCrop} — Growing Guide
                </p>
                <p className="text-xs text-white/80">
                  Soil, climate, pests & a pro tip
                </p>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-leaf shrink-0 transition-transform ${guideOpen ? "rotate-180" : ""}`}
                strokeWidth={2.5}
              />
            </button>

            {guideOpen && (
              <div className="mt-4 space-y-3">
                <GuideRow icon={Leaf} tint="bg-leaf" title="Ideal Soil" value={guide.soil} />
                <GuideRow icon={SunIcon} tint="bg-gold" title="Temperature" value={guide.temperature} />
                <GuideRow icon={DropletsIcon} tint="bg-midgreen text-white" title="Water / Rainfall" value={guide.rainfall} textColor="text-white" />
                <GuideRow icon={Bug} tint="bg-warn text-white" title="Common Pests & Diseases" value={guide.commonPests} textColor="text-white" />
                <StickerCard className="bg-gold">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-10 h-10 rounded-xl bg-forest border-[2.5px] border-ink flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-gold" strokeWidth={2.5} />
                    </span>
                    <div>
                      <p className="font-display text-sm font-bold uppercase leading-tight">Pro Tip</p>
                      <p className="mt-1 text-sm text-ink/85 leading-relaxed">{guide.tip}</p>
                    </div>
                  </div>
                </StickerCard>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============ Helper note ============ */}
      <section className="px-5 pb-6">
        <div className="mx-auto max-w-2xl">
          <StickerCard className="bg-cream">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-9 h-9 rounded-full bg-white border-[2.5px] border-ink flex items-center justify-center">
                <Wind className="w-4 h-4 text-forest" strokeWidth={2.5} />
              </span>
              <p className="text-xs text-ink/80 leading-relaxed">
                {t("calendar.guidanceNote")}
              </p>
            </div>
          </StickerCard>
        </div>
      </section>
    </main>
  );
}

/* ===================================================================
   Weather skeleton — shown while forecast loads
   =================================================================== */
function WeatherSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden pb-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="shrink-0 w-32 sticker-card p-3 space-y-2">
          <div className="skeleton-plantio h-3 w-1/2" />
          <div className="skeleton-plantio h-12 w-12 mx-auto rounded-full" />
          <div className="skeleton-plantio h-3 w-3/4 mx-auto" />
          <div className="skeleton-plantio h-3 w-2/3 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/* ===================================================================
   Guide row — icon + title + value for the crop growing guide
   =================================================================== */
function GuideRow({
  icon: Icon,
  tint,
  title,
  value,
  textColor = "text-ink",
}: {
  icon: LucideIcon;
  tint: string;
  title: string;
  value: string;
  textColor?: string;
}) {
  return (
    <div className={`sticker-card p-4 flex items-start gap-3 ${tint} ${textColor}`}>
      <span className="shrink-0 w-10 h-10 rounded-xl bg-white border-[2.5px] border-ink flex items-center justify-center">
        <Icon className="w-5 h-5 text-ink" strokeWidth={2.5} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-xs font-bold uppercase opacity-80">{title}</p>
        <p className="mt-0.5 text-sm leading-snug">{value}</p>
      </div>
    </div>
  );
}
