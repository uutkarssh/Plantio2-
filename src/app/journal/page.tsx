"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  NotebookPen,
  Sprout,
  Droplets,
  FlaskConical,
  SprayCan,
  Wheat,
  Eye,
  Trash2,
  CalendarDays,
  Camera,
  StickyNote,
  TrendingUp,
  Hash,
  Trophy,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";
import {
  getJournalEntries,
  addJournalEntry,
  deleteJournalEntry,
  getJournalStats,
  compressImage,
  makeThumbnail,
  type JournalEntry,
} from "@/lib/plantio/storage";
import { cn } from "@/lib/utils";

/* ===================================================================
   Activity type definitions
   =================================================================== */

type ActivityType =
  | "planting"
  | "watering"
  | "fertilizing"
  | "spraying"
  | "harvesting"
  | "observation";

interface ActivityOption {
  id: ActivityType;
  labelKey: string;
  icon: LucideIcon;
  tint: string;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  { id: "planting", labelKey: "journal.planting", icon: Sprout, tint: "bg-leaf" },
  { id: "watering", labelKey: "journal.watering", icon: Droplets, tint: "bg-midgreen" },
  { id: "fertilizing", labelKey: "journal.fertilizing", icon: FlaskConical, tint: "bg-gold" },
  { id: "spraying", labelKey: "journal.spraying", icon: SprayCan, tint: "bg-warn" },
  { id: "harvesting", labelKey: "journal.harvesting", icon: Wheat, tint: "bg-gold" },
  { id: "observation", labelKey: "journal.observation", icon: Eye, tint: "bg-cream" },
];

const ACTIVITY_MAP = Object.fromEntries(
  ACTIVITY_OPTIONS.map((a) => [a.id, a])
) as Record<string, ActivityOption>;

/* ===================================================================
   Helper: today's date as YYYY-MM-DD
   =================================================================== */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86_400_000);

  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* ===================================================================
   Main page component
   =================================================================== */

export default function JournalPage() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<{ total: number; thisWeek: number; topActivity: string }>({
    total: 0,
    thisWeek: 0,
    topActivity: "\u2014",
  });

  /* --- Form state --- */
  const [date, setDate] = useState(todayStr());
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* --- Load entries from localStorage --- */
  const refresh = useCallback(() => {
    setEntries(getJournalEntries());
    setStats(getJournalStats());
  }, []);

  useEffect(() => {
    queueMicrotask(() => refresh());
    window.addEventListener("plantio-journal-updated", refresh);
    return () => window.removeEventListener("plantio-journal-updated", refresh);
  }, [refresh]);

  /* --- Group entries by date (most recent first) --- */
  const grouped = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    // Sort dates descending
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  /* --- Handle photo upload --- */
  const handlePhoto = useCallback(async (file: File) => {
    try {
      const compressed = await compressImage(file, 1024, 0.8);
      const thumb = await makeThumbnail(compressed, 240);
      setPhotoPreview(thumb);
      setPhotoData(thumb);
    } catch {
      /* ignore failed compression */
    }
  }, []);

  /* --- Save entry --- */
  const handleSave = useCallback(() => {
    if (!activityType || !notes.trim()) return;
    setSaving(true);
    const entry: JournalEntry = {
      id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      date,
      activityType,
      notes: notes.trim(),
      photoUrl: photoData ?? undefined,
    };
    addJournalEntry(entry);
    // Reset form
    setDate(todayStr());
    setActivityType(null);
    setNotes("");
    setPhotoPreview(null);
    setPhotoData(null);
    setSaving(false);
    refresh();
  }, [activityType, notes, date, photoData, refresh]);

  /* --- Delete entry --- */
  const handleDelete = useCallback(
    (id: string) => {
      deleteJournalEntry(id);
      refresh();
    },
    [refresh]
  );

  const canSave = activityType && notes.trim().length > 0;

  return (
    <div className="min-h-screen bg-cream">
      {/* Section Header */}
      <SectionHeader
        bg="forest"
        icon={NotebookPen}
        title={t("journal.title")}
        subtitle={t("journal.subtitle")}
      />

      <main className="plantio-grain mx-auto max-w-2xl px-4 pb-20 space-y-5 mt-5 plantio-section-gap">
        {/* ---- Stats summary ---- */}
        <StickerCard className="bg-white">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl border-[2.5px] border-ink bg-leaf mx-auto mb-1.5">
                <Hash className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </div>
              <p className="font-display text-2xl font-bold text-ink">{stats.total}</p>
              <p className="text-xs text-ink/70 mt-0.5">{t("journal.totalEntries")}</p>
            </div>
            <div>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl border-[2.5px] border-ink bg-midgreen mx-auto mb-1.5">
                <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <p className="font-display text-2xl font-bold text-ink">{stats.thisWeek}</p>
              <p className="text-xs text-ink/70 mt-0.5">{t("journal.thisWeek")}</p>
            </div>
            <div>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl border-[2.5px] border-ink bg-gold mx-auto mb-1.5">
                <Trophy className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </div>
              <p className="font-display text-lg font-bold text-ink leading-tight">
                {ACTIVITY_MAP[stats.topActivity]
                  ? t(ACTIVITY_MAP[stats.topActivity].labelKey)
                  : stats.topActivity}
              </p>
              <p className="text-xs text-ink/70 mt-0.5">{t("journal.mostCommon")}</p>
            </div>
          </div>
        </StickerCard>

        {/* ---- New Entry Form ---- */}
        <StickerCard className="bg-white">
          <h2 className="font-display text-xl font-bold uppercase text-ink flex items-center gap-2 mb-4">
            <NotebookPen className="w-5 h-5 text-forest" strokeWidth={2.5} />
            {t("journal.newEntry")}
          </h2>

          {/* Date */}
          <label className="block mb-3">
            <span className="font-display text-sm font-bold uppercase text-ink/80 flex items-center gap-1.5 mb-1.5">
              <CalendarDays className="w-4 h-4" strokeWidth={2.5} />
              {t("journal.date")}
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 bg-cream font-body text-base text-ink shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-midgreen"
            />
          </label>

          {/* Activity Type Pills */}
          <div className="mb-3">
            <span className="font-display text-sm font-bold uppercase text-ink/80 flex items-center gap-1.5 mb-2">
              <StickyNote className="w-4 h-4" strokeWidth={2.5} />
              {t("journal.activityType")}
            </span>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = activityType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setActivityType(active ? null : opt.id)}
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

          {/* Notes */}
          <label className="block mb-3">
            <span className="font-display text-sm font-bold uppercase text-ink/80 mb-1.5 block">
              {t("journal.notes")}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder=""
              className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 bg-cream font-body text-base text-ink shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-midgreen resize-none"
            />
          </label>

          {/* Photo Upload */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhoto(file);
              }}
            />
            <StickerButton
              variant="outline"
              size="sm"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-4 h-4" strokeWidth={2.5} />
              Add Photo
            </StickerButton>
            {photoPreview && (
              <div className="mt-2 relative inline-block">
                <img
                  src={photoPreview}
                  alt="Photo preview"
                  className="w-24 h-24 object-cover rounded-xl border-[2.5px] border-ink shadow-[3px_3px_0px_0px_#161611]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoData(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-warn border-[2px] border-ink flex items-center justify-center text-white"
                  aria-label="Remove photo"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>

          {/* Save Button */}
          <StickerButton
            variant="forest"
            size="md"
            className="w-full"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {t("journal.saveEntry")}
          </StickerButton>
        </StickerCard>

        {/* ---- Timeline or Empty State ---- */}
        {entries.length === 0 ? (
          <StickerCard className="bg-white text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl border-[3px] border-ink bg-leaf mx-auto mb-3">
              <NotebookPen className="w-8 h-8 text-ink" strokeWidth={2.5} />
            </div>
            <h3 className="font-display text-xl font-bold uppercase text-ink">
              {t("journal.noEntries")}
            </h3>
            <p className="mt-1 text-sm text-ink/70">{t("journal.noEntriesDesc")}</p>
          </StickerCard>
        ) : (
          <div className="space-y-4">
            {grouped.map(([dateStr, dayEntries]) => (
              <div key={dateStr}>
                {/* Date header pill */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-display text-sm font-bold uppercase text-white bg-forest border-[2.5px] border-ink rounded-full px-3 py-1 shadow-[2px_2px_0px_0px_#161611]">
                    {formatDateHeader(dateStr)}
                  </span>
                  <span className="text-xs text-ink/50">{dateStr}</span>
                </div>

                {/* Entries for this date */}
                <div className="space-y-3">
                  {dayEntries.map((entry) => {
                    const act = ACTIVITY_MAP[entry.activityType];
                    const Icon = act?.icon ?? StickyNote;
                    return (
                      <StickerCard key={entry.id} className="bg-white">
                        <div className="flex items-start gap-3">
                          {/* Activity icon */}
                          <div
                            className={cn(
                              "shrink-0 w-10 h-10 rounded-xl border-[2.5px] border-ink flex items-center justify-center",
                              act?.tint ?? "bg-cream"
                            )}
                          >
                            <Icon className="w-5 h-5 text-ink" strokeWidth={2.5} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <StickerBadge
                                variant={
                                  entry.activityType === "harvesting"
                                    ? "gold"
                                    : entry.activityType === "spraying"
                                    ? "warn"
                                    : "leaf"
                                }
                              >
                                {act ? t(act.labelKey) : entry.activityType}
                              </StickerBadge>
                            </div>
                            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">
                              {entry.notes}
                            </p>
                            {entry.photoUrl && (
                              <img
                                src={entry.photoUrl}
                                alt="Entry photo"
                                className="mt-2 w-20 h-20 object-cover rounded-xl border-[2.5px] border-ink shadow-[2px_2px_0px_0px_#161611]"
                              />
                            )}
                          </div>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="shrink-0 w-9 h-9 rounded-xl border-[2.5px] border-ink bg-cream flex items-center justify-center text-ink/50 hover:text-warn hover:bg-warn/10 active:translate-y-0.5 transition-all"
                            aria-label={t("journal.deleteEntry")}
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      </StickerCard>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
