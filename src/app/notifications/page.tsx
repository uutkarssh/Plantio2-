"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Circle,
  Trash2,
  Pencil,
  SprayCan,
  Droplets,
  Wheat,
  ScanSearch,
  MoreHorizontal,
  CloudRain,
  Snowflake,
  Wind,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  Clock,
  StickyNote,
  Plus,
  Lightbulb,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";
import {
  getReminders,
  addReminder,
  updateReminder,
  deleteReminder,
  toggleReminderDone,
  getScanHistory,
  type Reminder,
  type ScanResult,
} from "@/lib/plantio/storage";
import { cn } from "@/lib/utils";

/* ===================================================================
   Types
   =================================================================== */

type Category = Reminder["category"];
type Recurrence = Reminder["recurrence"];

interface CategoryOption {
  id: Category;
  labelKey: string;
  icon: typeof SprayCan;
  tint: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "spray", labelKey: "notifications.categorySpray", icon: SprayCan, tint: "bg-warn" },
  { id: "irrigate", labelKey: "notifications.categoryIrrigate", icon: Droplets, tint: "bg-midgreen" },
  { id: "harvest", labelKey: "notifications.categoryHarvest", icon: Wheat, tint: "bg-gold" },
  { id: "scan", labelKey: "notifications.categoryScan", icon: ScanSearch, tint: "bg-leaf" },
  { id: "other", labelKey: "notifications.categoryOther", icon: MoreHorizontal, tint: "bg-cream" },
];

const CATEGORY_MAP = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.id, c])
) as Record<string, CategoryOption>;

const RECURRENCE_OPTIONS: { id: Recurrence; labelKey: string }[] = [
  { id: "once", labelKey: "notifications.recurrenceOnce" },
  { id: "daily", labelKey: "notifications.recurrenceDaily" },
  { id: "weekly", labelKey: "notifications.recurrenceWeekly" },
];

/* ===================================================================
   Mock data — weather alerts & mandi price alerts
   =================================================================== */

interface WeatherAlert {
  type: "rain" | "frost" | "wind";
  titleKey: string;
  description: string;
  timing: string;
}

const MOCK_WEATHER_ALERTS: WeatherAlert[] = [
  { type: "rain", titleKey: "notifications.rainAlert", description: "Heavy rain expected in your area. Consider delaying spraying.", timing: "Tomorrow 6 AM - 12 PM" },
  { type: "frost", titleKey: "notifications.frostAlert", description: "Temperature may drop below 4 C tonight. Protect seedlings.", timing: "Tonight 2 AM - 6 AM" },
  { type: "wind", titleKey: "notifications.windAlert", description: "Wind speeds above 30 km/h expected. Avoid spraying.", timing: "Today 4 PM - 8 PM" },
];

const WEATHER_ICONS: Record<string, typeof CloudRain> = {
  rain: CloudRain,
  frost: Snowflake,
  wind: Wind,
};
const WEATHER_TINTS: Record<string, string> = {
  rain: "bg-midgreen",
  frost: "bg-cream",
  wind: "bg-warn",
};

interface MandiAlert {
  crop: string;
  direction: "up" | "down";
  change: string;
  price: string;
  market: string;
}

const MOCK_MANDI_ALERTS: MandiAlert[] = [
  { crop: "Wheat", direction: "up", change: "+Rs 42/qtl", price: "Rs 2,275/qtl", market: "Azadpur Mandi" },
  { crop: "Rice", direction: "down", change: "-Rs 28/qtl", price: "Rs 3,150/qtl", market: "Khanna Mandi" },
  { crop: "Soybean", direction: "up", change: "+Rs 65/qtl", price: "Rs 4,520/qtl", market: "Indore Mandi" },
];

/* ===================================================================
   Helpers
   =================================================================== */

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(dateStr: string): number {
  const then = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

function formatReminderDate(dateStr: string, t: (k: string) => string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = daysBetween(dateStr);

  if (diff < 0) return t("notifications.overdue");
  if (diff === 0) return t("notifications.today");
  if (diff === 1) return t("notifications.tomorrow");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ===================================================================
   Smart suggestions — derived from scan history
   =================================================================== */

interface SmartSuggestion {
  id: string;
  messageKey: string;
  messageParams: Record<string, string>;
  category: Category;
}

function buildSmartSuggestions(history: ScanResult[]): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const now = Date.now();

  for (const scan of history) {
    const daysSince = Math.floor((now - scan.timestamp) / 86_400_000);
    if (daysSince < 2 || daysSince > 14) continue; // only suggest for scans 2-14 days old

    if (scan.is_healthy && scan.plant_name) {
      suggestions.push({
        id: `sug-healthy-${scan.id}`,
        messageKey: "notifications.smartSuggestionHealthy",
        messageParams: { plant: scan.plant_name, days: String(daysSince) },
        category: "scan",
      });
    } else if (scan.disease_name) {
      suggestions.push({
        id: `sug-disease-${scan.id}`,
        messageKey: "notifications.smartSuggestionDisease",
        messageParams: { disease: scan.disease_name, days: String(daysSince) },
        category: "spray",
      });
    }

    if (suggestions.length >= 5) break; // cap at 5 suggestions
  }

  return suggestions;
}

/* ===================================================================
   Main page component
   =================================================================== */

export default function NotificationsPage() {
  const { t } = useI18n();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* Form state */
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(todayStr());
  const [formTime, setFormTime] = useState("08:00");
  const [formCategory, setFormCategory] = useState<Category>("spray");
  const [formRecurrence, setFormRecurrence] = useState<Recurrence>("once");

  /* Load data */
  const refresh = useCallback(() => {
    setReminders(getReminders());
    setScanHistory(getScanHistory());
  }, []);

  useEffect(() => {
    queueMicrotask(() => refresh());
    window.addEventListener("plantio-reminders-updated", refresh);
    window.addEventListener("plantio-scan-updated", refresh);
    return () => {
      window.removeEventListener("plantio-reminders-updated", refresh);
      window.removeEventListener("plantio-scan-updated", refresh);
    };
  }, [refresh]);

  /* Smart suggestions */
  const suggestions = useMemo(() => buildSmartSuggestions(scanHistory), [scanHistory]);

  /* Sort reminders: undone first (by date ascending), then done */
  const sortedReminders = useMemo(() => {
    const undone = reminders
      .filter((r) => !r.done)
      .sort((a, b) => a.date.localeCompare(b.date));
    const done = reminders
      .filter((r) => r.done)
      .sort((a, b) => b.createdAt - a.createdAt);
    return [...undone, ...done];
  }, [reminders]);

  /* --- Form helpers --- */
  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormDate(todayStr());
    setFormTime("08:00");
    setFormCategory("spray");
    setFormRecurrence("once");
    setEditingId(null);
    setShowForm(false);
  }, []);

  const startEdit = useCallback((r: Reminder) => {
    setFormTitle(r.title);
    setFormDate(r.date);
    setFormTime(r.time ?? "08:00");
    setFormCategory(r.category);
    setFormRecurrence(r.recurrence);
    setEditingId(r.id);
    setShowForm(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!formTitle.trim()) return;
    if (editingId) {
      updateReminder(editingId, {
        title: formTitle.trim(),
        date: formDate,
        time: formTime || undefined,
        category: formCategory,
        recurrence: formRecurrence,
      });
    } else {
      addReminder({
        title: formTitle.trim(),
        date: formDate,
        time: formTime || undefined,
        category: formCategory,
        recurrence: formRecurrence,
        done: false,
      });
    }
    resetForm();
    refresh();
  }, [editingId, formTitle, formDate, formTime, formCategory, formRecurrence, resetForm, refresh]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteReminder(id);
      refresh();
    },
    [refresh]
  );

  const handleToggleDone = useCallback(
    (id: string) => {
      toggleReminderDone(id);
      refresh();
    },
    [refresh]
  );

  const handleSetSuggestionReminder = useCallback(
    (sug: SmartSuggestion) => {
      addReminder({
        title: sug.messageKey === "notifications.smartSuggestionHealthy"
          ? `${t("notifications.categoryScan")} — ${sug.messageParams.plant || sug.messageParams.disease}`
          : `${t("notifications.categorySpray")} — ${sug.messageParams.disease || sug.messageParams.plant}`,
        date: daysAgo(-1), // tomorrow
        time: "09:00",
        category: sug.category,
        recurrence: "once",
        done: false,
      });
      refresh();
    },
    [t, refresh]
  );

  const canSave = formTitle.trim().length > 0;

  /* Render a localized message with {key} interpolation */
  const renderSuggestionMessage = (sug: SmartSuggestion) => {
    let msg = t(sug.messageKey);
    for (const [key, val] of Object.entries(sug.messageParams)) {
      msg = msg.replace(`{${key}}`, val);
    }
    return msg;
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Section Header */}
      <SectionHeader
        bg="midgreen"
        icon={Bell}
        title={t("notifications.title")}
        subtitle={t("notifications.subtitle")}
      />

      <main className="plantio-grain mx-auto max-w-2xl px-4 pb-20 space-y-5 mt-5 plantio-section-gap">
        {/* ============================================================
            Active Reminders
            ============================================================ */}
        <div>
          <h2 className="font-display text-lg font-bold uppercase text-ink flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
            {t("notifications.activeReminders")}
            {reminders.filter((r) => !r.done).length > 0 && (
              <span className="plantio-status-dot ml-1" />
            )}
          </h2>

          {sortedReminders.length === 0 ? (
            <StickerCard className="bg-white text-center plantio-pop-in">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl border-[3px] border-ink bg-leaf mx-auto mb-3">
                <Bell className="w-7 h-7 text-ink" strokeWidth={2.5} />
              </div>
              <h3 className="font-display text-lg font-bold uppercase text-ink">
                {t("notifications.noReminders")}
              </h3>
              <p className="mt-1 text-sm text-ink/70">
                {t("notifications.noRemindersDesc")}
              </p>
            </StickerCard>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sortedReminders.map((r, idx) => {
                const cat = CATEGORY_MAP[r.category];
                const Icon = cat?.icon ?? StickyNote;
                const dateLabel = formatReminderDate(r.date, t);
                const isOverdue = !r.done && daysBetween(r.date) < 0;
                return (
                  <StickerCard
                    key={r.id}
                    className={cn(
                      "bg-white plantio-pop-in plantio-stagger",
                      r.done && "opacity-60"
                    )}
                    style={{ "--stagger": idx } as React.CSSProperties}
                  >
                    <div className="flex items-start gap-3">
                      {/* Done toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleDone(r.id)}
                        className={cn(
                          "shrink-0 w-9 h-9 rounded-xl border-[2.5px] border-ink flex items-center justify-center transition-all active:translate-y-0.5",
                          r.done ? "bg-leaf" : "bg-cream hover:bg-leaf/20"
                        )}
                        aria-label={r.done ? t("notifications.markUndone") : t("notifications.markDone")}
                      >
                        {r.done ? (
                          <CheckCircle2 className="w-5 h-5 text-ink" strokeWidth={2.5} />
                        ) : (
                          <Circle className="w-5 h-5 text-ink/40" strokeWidth={2.5} />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <StickerBadge
                            variant={
                              r.category === "harvest" ? "gold" :
                              r.category === "spray" ? "warn" :
                              r.category === "irrigate" ? "forest" : "leaf"
                            }
                          >
                            <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                            {cat ? t(cat.labelKey) : r.category}
                          </StickerBadge>
                          {isOverdue && (
                            <StickerBadge variant="warn">{t("notifications.overdue")}</StickerBadge>
                          )}
                        </div>
                        <p className={cn(
                          "text-sm font-body text-ink leading-relaxed",
                          r.done && "line-through"
                        )}>
                          {r.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-ink/60">
                          <CalendarClock className="w-3.5 h-3.5" strokeWidth={2.5} />
                          <span>{dateLabel}</span>
                          {r.time && (
                            <>
                              <Clock className="w-3.5 h-3.5 ml-1" strokeWidth={2.5} />
                              <span>{r.time}</span>
                            </>
                          )}
                          {r.recurrence !== "once" && (
                            <span className="ml-1 font-display uppercase tracking-wide">
                              {t(`notifications.recurrence${r.recurrence.charAt(0).toUpperCase()}${r.recurrence.slice(1)}`)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="w-8 h-8 rounded-xl border-[2.5px] border-ink bg-cream flex items-center justify-center text-ink/50 hover:text-forest hover:bg-leaf/10 active:translate-y-0.5 transition-all"
                          aria-label={t("notifications.edit")}
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="w-8 h-8 rounded-xl border-[2.5px] border-ink bg-cream flex items-center justify-center text-ink/50 hover:text-warn hover:bg-warn/10 active:translate-y-0.5 transition-all"
                          aria-label={t("notifications.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </StickerCard>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================
            Smart Suggestions
            ============================================================ */}
        <div>
          <h2 className="font-display text-lg font-bold uppercase text-ink flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-gold" strokeWidth={2.5} />
            {t("notifications.smartSuggestions")}
          </h2>

          {suggestions.length === 0 ? (
            <StickerCard className="bg-white text-center plantio-pop-in">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl border-[3px] border-ink bg-gold mx-auto mb-3">
                <Lightbulb className="w-7 h-7 text-ink" strokeWidth={2.5} />
              </div>
              <p className="text-sm text-ink/70">{t("notifications.noSuggestions")}</p>
            </StickerCard>
          ) : (
            <div className="space-y-3">
              {suggestions.map((sug, idx) => {
                const cat = CATEGORY_MAP[sug.category];
                const Icon = cat?.icon ?? StickyNote;
                return (
                  <StickerCard
                    key={sug.id}
                    className="bg-white plantio-pop-in plantio-stagger"
                    style={{ "--stagger": idx } as React.CSSProperties}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "shrink-0 w-10 h-10 rounded-xl border-[2.5px] border-ink flex items-center justify-center",
                        "bg-gold"
                      )}>
                        <Lightbulb className="w-5 h-5 text-ink" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body text-ink leading-relaxed">
                          {renderSuggestionMessage(sug)}
                        </p>
                        <div className="mt-2">
                          <StickerButton
                            variant="leaf"
                            size="sm"
                            onClick={() => handleSetSuggestionReminder(sug)}
                          >
                            <Icon className="w-4 h-4" strokeWidth={2.5} />
                            {t("notifications.setReminder")}
                          </StickerButton>
                        </div>
                      </div>
                    </div>
                  </StickerCard>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================
            Weather Alerts
            ============================================================ */}
        <div>
          <h2 className="font-display text-lg font-bold uppercase text-ink flex items-center gap-2 mb-3">
            <CloudRain className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
            {t("notifications.weatherAlerts")}
          </h2>

          <div className="space-y-3">
            {MOCK_WEATHER_ALERTS.map((alert, idx) => {
              const Icon = WEATHER_ICONS[alert.type] ?? CloudRain;
              const tint = WEATHER_TINTS[alert.type] ?? "bg-cream";
              return (
                <StickerCard
                  key={alert.type}
                  className={cn(
                    "plantio-pop-in plantio-stagger",
                    alert.type === "frost" ? "bg-cream" : "bg-white"
                  )}
                  style={{ "--stagger": idx } as React.CSSProperties}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "shrink-0 w-10 h-10 rounded-xl border-[2.5px] border-ink flex items-center justify-center",
                      tint
                    )}>
                      <Icon className="w-5 h-5 text-ink" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StickerBadge variant={alert.type === "frost" ? "warn" : "forest"}>
                          {t(alert.titleKey)}
                        </StickerBadge>
                      </div>
                      <p className="text-sm text-ink leading-relaxed">{alert.description}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-ink/60">
                        <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <span>{alert.timing}</span>
                      </div>
                    </div>
                  </div>
                </StickerCard>
              );
            })}
          </div>
        </div>

        {/* ============================================================
            Mandi Price Alerts
            ============================================================ */}
        <div>
          <h2 className="font-display text-lg font-bold uppercase text-ink flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-gold" strokeWidth={2.5} />
            {t("notifications.mandiAlerts")}
          </h2>

          <div className="space-y-3">
            {MOCK_MANDI_ALERTS.map((alert, idx) => {
              const isUp = alert.direction === "up";
              return (
                <StickerCard
                  key={alert.crop}
                  className="bg-white plantio-pop-in plantio-stagger"
                  style={{ "--stagger": idx } as React.CSSProperties}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "shrink-0 w-10 h-10 rounded-xl border-[2.5px] border-ink flex items-center justify-center",
                      isUp ? "bg-leaf" : "bg-warn"
                    )}>
                      {isUp ? (
                        <TrendingUp className="w-5 h-5 text-ink" strokeWidth={2.5} />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-white" strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-display text-base font-bold text-ink uppercase">
                          {alert.crop}
                        </span>
                        <StickerBadge variant={isUp ? "leaf" : "warn"}>
                          {isUp ? t("notifications.priceUp") : t("notifications.priceDown")}
                        </StickerBadge>
                      </div>
                      <p className="text-sm text-ink leading-relaxed">
                        {alert.change} &mdash; {alert.price}
                      </p>
                      <p className="text-xs text-ink/50 mt-0.5">{alert.market}</p>
                    </div>
                  </div>
                </StickerCard>
              );
            })}
          </div>
        </div>

        {/* ============================================================
            Add / Edit Reminder Form
            ============================================================ */}
        <div>
          {!showForm ? (
            <StickerButton
              variant="forest"
              size="md"
              className="w-full"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              {t("notifications.addReminder")}
            </StickerButton>
          ) : (
            <StickerCard className="bg-white plantio-pop-in">
              <h2 className="font-display text-xl font-bold uppercase text-ink flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-midgreen" strokeWidth={2.5} />
                {editingId ? t("notifications.edit") : t("notifications.addReminder")}
              </h2>

              {/* Title */}
              <label className="block mb-3">
                <span className="font-display text-sm font-bold uppercase text-ink/80 flex items-center gap-1.5 mb-1.5">
                  <StickyNote className="w-4 h-4" strokeWidth={2.5} />
                  {t("notifications.reminderTitle")}
                </span>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t("notifications.reminderTitlePlaceholder")}
                  className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 bg-cream font-body text-base text-ink shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-midgreen placeholder:text-ink/40"
                />
              </label>

              {/* Date & Time row */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="block">
                  <span className="font-display text-sm font-bold uppercase text-ink/80 flex items-center gap-1.5 mb-1.5">
                    <CalendarClock className="w-4 h-4" strokeWidth={2.5} />
                    {t("notifications.reminderDate")}
                  </span>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 bg-cream font-body text-base text-ink shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-midgreen"
                  />
                </label>
                <label className="block">
                  <span className="font-display text-sm font-bold uppercase text-ink/80 flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-4 h-4" strokeWidth={2.5} />
                    {t("notifications.reminderTime")}
                  </span>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 bg-cream font-body text-base text-ink shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-midgreen"
                  />
                </label>
              </div>

              {/* Category Pills */}
              <div className="mb-3">
                <span className="font-display text-sm font-bold uppercase text-ink/80 flex items-center gap-1.5 mb-2">
                  <StickyNote className="w-4 h-4" strokeWidth={2.5} />
                  {t("notifications.reminderCategory")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = formCategory === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormCategory(active ? formCategory : opt.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 border-[2.5px] border-ink rounded-full px-3 py-2 text-xs font-display font-bold uppercase tracking-wide shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all",
                          active ? "bg-forest text-white" : "bg-cream text-ink"
                        )}
                      >
                        <Icon className="w-4 h-4" strokeWidth={2.5} />
                        {t(opt.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recurrence Pills */}
              <div className="mb-4">
                <span className="font-display text-sm font-bold uppercase text-ink/80 flex items-center gap-1.5 mb-2">
                  <Clock className="w-4 h-4" strokeWidth={2.5} />
                  {t("notifications.reminderRecurrence")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {RECURRENCE_OPTIONS.map((opt) => {
                    const active = formRecurrence === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormRecurrence(opt.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 border-[2.5px] border-ink rounded-full px-3 py-2 text-xs font-display font-bold uppercase tracking-wide shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all",
                          active ? "bg-midgreen text-white" : "bg-cream text-ink"
                        )}
                      >
                        {t(opt.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <StickerButton
                  variant="forest"
                  size="md"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={!canSave}
                >
                  {t("notifications.saveReminder")}
                </StickerButton>
                <StickerButton
                  variant="outline"
                  size="md"
                  className="flex-1"
                  onClick={resetForm}
                >
                  {t("common.cancel")}
                </StickerButton>
              </div>
            </StickerCard>
          )}
        </div>
      </main>
    </div>
  );
}
