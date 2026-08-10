"use client";

import { useEffect, useState } from "react";

import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudFog,
  Droplets,
  Wind,
  Thermometer,
  AlertTriangle,
  CloudDrizzle,
  Sprout,
  Scissors,
  FlaskConical,
  Wheat,
  Info,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Leaf,
  Zap,
} from "lucide-react";
import {
  StickerCard,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";

/* ===================================================================
   Mock weather data — realistic Indian Rabi season day
   =================================================================== */

interface ForecastDay {
  day: string;
  icon: "sun" | "cloud-sun" | "cloud" | "cloud-rain" | "cloud-fog" | "cloud-drizzle";
  high: number;
  low: number;
  humidity: number;
  windKmh: number;
  rainMm: number;
}

interface AlertItem {
  type: "rain" | "frost" | "wind" | "spray-good" | "spray-bad" | "sow-good";
  titleKey: string;
  descKey: string;
  icon: typeof AlertTriangle;
  variant: "warn" | "leaf" | "forest";
}

interface FarmingWindow {
  activityKey: string;
  status: "good" | "fair" | "avoid";
  note: string;
}

const EMPTY_CURRENT = {
  tempC: 0,
  feelsLikeC: 0,
  humidity: 0,
  windKmh: 0,
  condition: "sun" as const,
  soilMoisturePct: 0,
  location: "Your current location",
};

function weatherCodeToIcon(code: number): ForecastDay["icon"] {
  if (code === 0 || code === 1) return "sun";
  if (code === 2) return "cloud-sun";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "cloud-fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "cloud-drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "cloud-rain";
  return "cloud";
}

function getDayName(dateString: string, index: number): string {
  if (index === 0) return "Today";

  return new Date(`${dateString}T12:00:00`).toLocaleDateString([], {
    weekday: "short",
  });
}

const ALERTS: AlertItem[] = [
  {
    type: "rain",
    titleKey: "weather.rainWarning",
    descKey: "weather.rainWarningDesc",
    icon: CloudRain,
    variant: "warn",
  },
  {
    type: "spray-good",
    titleKey: "weather.sprayTimeGood",
    descKey: "weather.sprayTimeGoodDesc",
    icon: FlaskConical,
    variant: "leaf",
  },
  {
    type: "sow-good",
    titleKey: "weather.goodForSowing",
    descKey: "weather.goodForSowingDesc",
    icon: Sprout,
    variant: "forest",
  },
];

const FARMING_WINDOWS: FarmingWindow[] = [
  { activityKey: "weather.windowSpray", status: "good", note: "Low wind, dry — spray now" },
  { activityKey: "weather.windowSow", status: "good", note: "Soil moisture adequate" },
  { activityKey: "weather.windowIrrigate", status: "fair", note: "Light rain Thu may help" },
  { activityKey: "weather.windowHarvest", status: "avoid", note: "Rain Thu-Fri, delay harvest" },
];

/* ===================================================================
   Weather icon renderer
   =================================================================== */
function WeatherIcon({
  kind,
  className = "w-7 h-7",
}: {
  kind: ForecastDay["icon"] | typeof CURRENT["condition"];
  className?: string;
}) {
  const cls = className;
  switch (kind) {
    case "sun":
      return <Sun className={cls} strokeWidth={2.5} />;
    case "cloud-sun":
    case "partly-cloudy":
      return <CloudSun className={cls} strokeWidth={2.5} />;
    case "cloud":
      return <Cloud className={cls} strokeWidth={2.5} />;
    case "cloud-rain":
      return <CloudRain className={cls} strokeWidth={2.5} />;
    case "cloud-fog":
      return <CloudFog className={cls} strokeWidth={2.5} />;
    case "cloud-drizzle":
      return <CloudDrizzle className={cls} strokeWidth={2.5} />;
    default:
      return <Sun className={cls} strokeWidth={2.5} />;
  }
}

function forecastIconToCondition(icon: ForecastDay["icon"]): ForecastDay["icon"] {
  return icon;
}

/* ===================================================================
   Soil moisture bar
   =================================================================== */
function SoilMoistureBar({ pct }: { pct: number }) {
  const { t } = useI18n();
  const barColor =
    pct >= 60 ? "bg-midgreen" : pct >= 35 ? "bg-leaf" : "bg-gold";
  const statusLabel =
    pct >= 60
      ? t("weather.windowGood")
      : pct >= 35
      ? t("weather.windowFair")
      : t("weather.windowAvoid");

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-xs font-bold uppercase tracking-wide text-ink/70">
          {statusLabel}
        </span>
        <span className="font-display text-sm font-bold">{pct}%</span>
      </div>
      <div className="h-5 rounded-full border-[2.5px] border-ink bg-cream overflow-hidden shadow-[2px_2px_0px_0px_#161611]">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

/* ===================================================================
   Main page
   =================================================================== */
export default function WeatherPage() {
  const { t } = useI18n();
  const [current, setCurrent] = useState(EMPTY_CURRENT);
const [forecast, setForecast] = useState<ForecastDay[]>([]);
const [weatherLoading, setWeatherLoading] = useState(true);
const [weatherError, setWeatherError] = useState(false);
const [locationName, setLocationName] = useState("Your current location");
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
useEffect(() => {
  let cancelled = false;

  const loadWeather = async (lat: number, lon: number) => {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}` +
        `&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
        `&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max,precipitation_sum,weather_code` +
        `&forecast_days=5` +
        `&timezone=auto`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Weather request failed");
      }

      const data = await response.json();

      if (cancelled || !data.current || !data.daily) return;

      const c = data.current;
      const d = data.daily;

      setCurrent({
        tempC: Math.round(c.temperature_2m),
        feelsLikeC: Math.round(c.apparent_temperature),
        humidity: Math.round(c.relative_humidity_2m),
        windKmh: Math.round(c.wind_speed_10m),
        condition: weatherCodeToIcon(c.weather_code),
        soilMoisturePct: Math.round(c.relative_humidity_2m),
        location: "Your current location",
      });

      const realForecast: ForecastDay[] = d.time.map(
        (date: string, index: number) => ({
          day: getDayName(date, index),
          icon: weatherCodeToIcon(d.weather_code[index]),
          high: Math.round(d.temperature_2m_max[index]),
          low: Math.round(d.temperature_2m_min[index]),
          humidity: Math.round(d.relative_humidity_2m_mean[index]),
          windKmh: Math.round(d.wind_speed_10m_max[index]),
          rainMm: Math.round(d.precipitation_sum[index] * 10) / 10,
        })
      );

      setForecast(realForecast);
      setWeatherError(false);
    } catch (error) {
      console.error("Weather error:", error);

      if (!cancelled) {
        setWeatherError(true);
      }
    } finally {
      if (!cancelled) {
        setWeatherLoading(false);
      }
    }
  };

  try {
    const cached = sessionStorage.getItem("plantio-session-location");

    if (cached) {
      const loc = JSON.parse(cached);

      if (typeof loc.lat === "number" && typeof loc.lng === "number") {
        loadWeather(loc.lat, loc.lng);
        return () => {
          cancelled = true;
        };
      }
    }
  } catch {}

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          sessionStorage.setItem(
            "plantio-session-location",
            JSON.stringify({
              lat,
              lng: lon,
              isDefault: false,
            })
          );
        } catch {}

        loadWeather(lat, lon);
      },
      () => {
        if (!cancelled) {
          setWeatherError(true);
          setWeatherLoading(false);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 15_000,
        maximumAge: 10 * 60 * 1000,
      }
    );
  } else {
    setWeatherError(true);
    setWeatherLoading(false);
  }

  return () => {
    cancelled = true;
  };
}, []);
  
  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      {/* FOREST header */}
      <SectionHeader
        bg="forest"
        title={t("weather.title")}
        subtitle={t("weather.subtitle")}
        icon={Sun}
        iconTint="bg-gold"
      >
        <div className="mt-4 flex items-center gap-2">
          <span className="shrink-0 w-11 h-11 rounded-2xl bg-cream border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
            <Sun className="w-5 h-5 text-gold" strokeWidth={2.5} />
          </span>
          <StickerBadge variant="gold">
            <span className="plantio-status-dot mr-1.5 inline-block align-middle" />
            {t("weather.today")}
          </StickerBadge>
        </div>
      </SectionHeader>

      {/* CREAM content */}
      <section className="plantio-grain px-5 py-4 bg-cream plantio-section-gap">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* ---- Sample data notice ---- */}
          <div className="rounded-2xl border-[2.5px] border-ink bg-gold/10 p-3 flex gap-2">
            <Info className="w-4 h-4 text-forest shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="text-xs text-ink/80">
              <span className="font-display text-[11px] font-bold uppercase">
                {t("weather.sampleData")}:{" "}
              </span>
              {t("weather.sampleDataNote")}
            </p>
          </div>

          {/* ---- Current Conditions Card ---- */}
          <StickerCard className="bg-white plantio-stripes">
            <div className="flex items-center gap-3 mb-4">
              <span className="shrink-0 w-11 h-11 rounded-2xl bg-midgreen border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Thermometer className="w-5 h-5 text-white" strokeWidth={2.5} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold uppercase leading-tight">
                  {t("weather.currentConditions")}
                </h2>
                <p className="text-xs opacity-70">{t("weather.defaultLocation")}</p>
              </div>
            </div>

            {/* Large temperature + icon */}
            <div className="flex items-center gap-4 mb-4">
              <span className="shrink-0 w-20 h-20 rounded-2xl bg-cream border-[3px] border-ink flex items-center justify-center shadow-[5px_5px_0px_0px_#161611]">
                <WeatherIcon kind={current.condition} className="w-10 h-10 text-gold" />
              </span>
              <div>
                <p className="font-display text-5xl sm:text-6xl font-bold leading-none">
                  {current.tempC}
                  <span className="text-2xl sm:text-3xl align-top ml-0.5">
                    {t("weather.celsius")}
                  </span>
                </p>
                <p className="text-sm text-ink/70 mt-1">
                  {t("weather.feelsLike")} {current.feelsLikeC}
                  {t("weather.celsius")}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Humidity */}
              <div className="rounded-2xl border-[2.5px] border-ink bg-cream p-3 flex flex-col items-center gap-1.5">
                <Droplets className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
                <p className="font-display text-lg font-bold">{current.humidity}%</p>
                <p className="text-[10px] text-ink/60 uppercase font-display font-bold tracking-wide">
                  {t("weather.humidity")}
                </p>
              </div>
              {/* Wind */}
              <div className="rounded-2xl border-[2.5px] border-ink bg-cream p-3 flex flex-col items-center gap-1.5">
                <Wind className="w-5 h-5 text-forest" strokeWidth={2.5} />
                <p className="font-display text-lg font-bold">{current.windKmh}</p>
                <p className="text-[10px] text-ink/60 uppercase font-display font-bold tracking-wide">
                  {t("weather.kmh")}
                </p>
              </div>
              {/* Feels like */}
              <div className="rounded-2xl border-[2.5px] border-ink bg-cream p-3 flex flex-col items-center gap-1.5">
                <Thermometer className="w-5 h-5 text-warn" strokeWidth={2.5} />
                <p className="font-display text-lg font-bold">{current.feelsLikeC}</p>
                <p className="text-[10px] text-ink/60 uppercase font-display font-bold tracking-wide">
                  {t("weather.feelsLike")}
                </p>
              </div>
            </div>

            {/* Location + time */}
            <div className="mt-3 flex items-center gap-4 text-xs text-ink/60">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                {t("weather.defaultLocation")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                {t("weather.lastUpdated")} {timeStr}
              </span>
            </div>
          </StickerCard>

          {/* ---- 5-Day Forecast ---- */}
          <StickerCard className="bg-white plantio-card-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="shrink-0 w-11 h-11 rounded-2xl bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <CloudSun className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold uppercase leading-tight">
                  {t("weather.forecast")}
                </h2>
              </div>
            </div>

            {/* Horizontal scroll row */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
              {FORECAST.map((d, i) => (
                <div
                  key={d.day}
                  className="snap-start shrink-0 w-[130px] rounded-2xl border-[3px] border-ink bg-cream p-3 flex flex-col items-center gap-2 shadow-[3px_3px_0px_0px_#161611]"
                >
                  <p className="font-display text-xs font-bold uppercase tracking-wide">
                    {i === 0 ? t("weather.today") : d.day}
                  </p>
                  <WeatherIcon
                    kind={forecastIconToCondition(d.icon)}
                    className="w-8 h-8 text-gold"
                  />
                  <div className="flex gap-2 items-baseline">
                    <span className="font-display text-lg font-bold">{d.high}</span>
                    <span className="font-display text-sm text-ink/50">{d.low}</span>
                  </div>
                  <div className="flex gap-2 text-[10px] text-ink/60">
                    <span className="flex items-center gap-0.5">
                      <Droplets className="w-3 h-3" strokeWidth={2.5} />
                      {d.humidity}%
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Wind className="w-3 h-3" strokeWidth={2.5} />
                      {d.windKmh}
                    </span>
                  </div>
                  {d.rainMm > 0 && (
                    <StickerBadge variant="warn" className="text-[9px]">
                      {d.rainMm}mm
                    </StickerBadge>
                  )}
                </div>
              ))}
            </div>
          </StickerCard>

          {/* ---- Agricultural Alerts ---- */}
          <StickerCard className="bg-white plantio-stripes">
            <div className="flex items-center gap-3 mb-4">
              <span className="shrink-0 w-11 h-11 rounded-2xl bg-warn border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold uppercase leading-tight">
                  {t("weather.agriAlerts")}
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {ALERTS.map((a, i) => {
                const IconComp = a.icon;
                const bgMap: Record<string, string> = {
                  warn: "bg-warn/10 border-warn/30",
                  leaf: "bg-leaf/10 border-leaf/30",
                  forest: "bg-midgreen/10 border-midgreen/30",
                };
                const iconBgMap: Record<string, string> = {
                  warn: "bg-warn text-white",
                  leaf: "bg-leaf text-ink",
                  forest: "bg-midgreen text-white",
                };
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border-[2.5px] border-ink ${bgMap[a.variant]} p-3 flex gap-3`}
                  >
                    <span
                      className={`shrink-0 w-10 h-10 rounded-xl border-[2.5px] border-ink flex items-center justify-center ${iconBgMap[a.variant]}`}
                    >
                      <IconComp className="w-5 h-5" strokeWidth={2.5} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-bold uppercase leading-tight">
                        {t(a.titleKey)}
                      </p>
                      <p className="text-xs text-ink/75 mt-0.5 leading-relaxed">
                        {t(a.descKey)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </StickerCard>

          {/* ---- Soil Moisture ---- */}
          <StickerCard className="bg-white plantio-card-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="shrink-0 w-11 h-11 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Droplets className="w-5 h-5 text-white" strokeWidth={2.5} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold uppercase leading-tight">
                  {t("weather.soilMoisture")}
                </h2>
                <p className="text-xs opacity-70">{t("weather.soilMoistureDesc")}</p>
              </div>
            </div>

            <SoilMoistureBar pct={CURRENT.soilMoisturePct} />

            {/* Soil moisture context markers */}
            <div className="flex justify-between text-[10px] text-ink/50 mt-1 font-display">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </StickerCard>

          {/* ---- Best Farming Window ---- */}
          <StickerCard className="bg-white plantio-stripes">
            <div className="flex items-center gap-3 mb-4">
              <span className="shrink-0 w-11 h-11 rounded-2xl bg-midgreen border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Sprout className="w-5 h-5 text-white" strokeWidth={2.5} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold uppercase leading-tight">
                  {t("weather.bestWindow")}
                </h2>
                <p className="text-xs opacity-70">{t("weather.bestWindowDesc")}</p>
              </div>
            </div>

            <div className="space-y-3">
              {FARMING_WINDOWS.map((w, i) => {
                const statusColors: Record<string, string> = {
                  good: "bg-leaf text-ink",
                  fair: "bg-gold text-ink",
                  avoid: "bg-warn text-white",
                };
                const statusKeys: Record<string, string> = {
                  good: "weather.windowGood",
                  fair: "weather.windowFair",
                  avoid: "weather.windowAvoid",
                };
                const activityIcons: Record<string, typeof Sprout> = {
                  "weather.windowSpray": FlaskConical,
                  "weather.windowSow": Sprout,
                  "weather.windowIrrigate": Droplets,
                  "weather.windowHarvest": Scissors,
                };
                const ActIcon = activityIcons[w.activityKey] || Leaf;

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-cream p-3"
                  >
                    <span className="shrink-0 w-10 h-10 rounded-xl border-[2.5px] border-ink bg-white flex items-center justify-center">
                      <ActIcon className="w-5 h-5 text-forest" strokeWidth={2.5} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-bold uppercase leading-tight">
                        {t(w.activityKey)}
                      </p>
                      <p className="text-xs text-ink/70 mt-0.5">{w.note}</p>
                    </div>
                    <StickerBadge variant={w.status === "good" ? "leaf" : w.status === "fair" ? "gold" : "warn"}>
                      {t(statusKeys[w.status])}
                    </StickerBadge>
                  </div>
                );
              })}
            </div>

            {/* 48h window summary */}
            <div className="mt-4 rounded-2xl border-[2.5px] border-ink bg-forest/5 p-3 flex gap-2">
              <Zap className="w-4 h-4 text-midgreen shrink-0 mt-0.5" strokeWidth={2.5} />
              <p className="text-xs text-ink/80 leading-relaxed">
                <span className="font-display text-[11px] font-bold uppercase">
                  {t("weather.bestWindow")}:{" "}
                </span>
                Next 24h are ideal for spraying and sowing. Rain arrives Thu — delay harvest and outdoor work until Fri afternoon.
              </p>
            </div>
          </StickerCard>
        </div>
      </section>
    </main>
  );
}
