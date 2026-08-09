"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Settings,
  MapPin,
  Ruler,
  Database,
  Bell,
  Info,
  AlertTriangle,
  Download,
  Trash2,
  HardDrive,
  CloudSun,
  IndianRupee,
  CalendarDays,
  Shield,
  FileText,
  Code2,
  RotateCcw,
  Save,
  Check,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  SectionHeader,
} from "@/components/plantio/sticker";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/plantio/i18n";
import {
  getScanHistory,
  clearScanHistory,
  getSavedFields,
} from "@/lib/plantio/storage";

/* ---- localStorage helpers for settings ---- */
const SETTINGS_KEY = "plantio-settings";

interface FarmProfile {
  farmName: string;
  state: string;
  district: string;
  farmSize: string;
}

interface NotificationPrefs {
  weatherAlerts: boolean;
  mandiAlerts: boolean;
  cropReminders: boolean;
}

interface AppSettings {
  profile: FarmProfile;
  measurementSystem: "metric" | "imperial";
  areaUnit: "acres" | "bigha" | "hectares";
  notifications: NotificationPrefs;
}

const DEFAULT_SETTINGS: AppSettings = {
  profile: { farmName: "", state: "", district: "", farmSize: "" },
  measurementSystem: "metric",
  areaUnit: "acres",
  notifications: {
    weatherAlerts: true,
    mandiAlerts: true,
    cropReminders: true,
  },
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function getStorageUsage(): string {
  if (typeof window === "undefined") return "0 KB";
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += key.length + (localStorage.getItem(key)?.length ?? 0);
      }
    }
    const bytes = total * 2;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } catch {
    return "0 KB";
  }
}

function exportAllData() {
  if (typeof window === "undefined") return;
  try {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("plantio-")) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) ?? "null");
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantio-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

function clearAllAppData() {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("plantio-")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

function resetAllSettings() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    /* ignore */
  }
}

/* ---- Indian states & districts (representative subset) ---- */
const INDIAN_STATES: Record<string, string[]> = {
  "Andhra Pradesh": ["Anantapur", "Guntur", "Krishna", "Kurnool", "Prakasam", "Vizag"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  Chhattisgarh: ["Raipur", "Bilaspur", "Durg", "Korba", "Rajnandgaon"],
  Gujarat: ["Ahmedabad", "Rajkot", "Surat", "Vadodara", "Junagadh", "Kutch"],
  Haryana: ["Hisar", "Karnal", "Kurukshetra", "Panipat", "Rohtak", "Sirsa"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribag"],
  Karnataka: ["Bengaluru", "Mysuru", "Dharwad", "Bellary", "Raichur"],
  Kerala: ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur", "Palakkad"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa", "Satna"],
  Maharashtra: ["Pune", "Nagpur", "Nashik", "Aurangabad", "Kolhapur", "Solapur", "Jalgaon"],
  Odisha: ["Bhubaneswar", "Cuttack", "Sambalpur", "Berhampur", "Rourkela"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Firozpur"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Alwar"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Trichy", "Thanjavur"],
  Telangana: ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad", "Meerut", "Bareilly", "Gorakhpur"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Burdwan", "Malda"],
};

/* ---- Toggle Pill ---- */
function TogglePill({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-full border-[2.5px] border-ink font-display text-sm font-bold uppercase tracking-wide transition-all cursor-pointer select-none ${
            value === opt.value
              ? "bg-forest text-white shadow-[3px_3px_0px_0px_#161611]"
              : "bg-cream text-ink shadow-[3px_3px_0px_0px_#161611] hover:bg-leaf/20"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ---- Toast-like feedback ---- */
function FeedbackToast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-leaf px-5 py-3 shadow-[5px_5px_0px_0px_#161611]">
        <Check className="w-5 h-5 text-ink" strokeWidth={2.5} />
        <span className="font-display text-sm font-bold uppercase tracking-wide text-ink">
          {message}
        </span>
      </div>
    </div>
  );
}

/* ---- Main Settings Page ---- */
export default function SettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [storageUsage, setStorageUsage] = useState("0 KB");
  const [scanCount, setScanCount] = useState(0);
  const [fieldCount, setFieldCount] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<
    "clearScans" | "clearAll" | "resetSettings" | null
  >(null);
  const [districts, setDistricts] = useState<string[]>([]);

  /* Load settings from localStorage on mount */
  useEffect(() => {
    const loaded = loadSettings();
    const usage = getStorageUsage();
    const scans = getScanHistory().length;
    const fields = getSavedFields().length;
    const dists = loaded.profile.state && INDIAN_STATES[loaded.profile.state]
      ? INDIAN_STATES[loaded.profile.state]
      : [] as string[];
    queueMicrotask(() => {
      setSettings(loaded);
      setStorageUsage(usage);
      setScanCount(scans);
      setFieldCount(fields);
      setDistricts(dists);
    });
  }, []);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2500);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<FarmProfile>) => {
      const newProfile = { ...settings.profile, ...patch };
      updateSettings({ profile: newProfile });
    },
    [settings.profile, updateSettings]
  );

  const updateNotifications = useCallback(
    (patch: Partial<NotificationPrefs>) => {
      const newNotifs = { ...settings.notifications, ...patch };
      updateSettings({ notifications: newNotifs });
    },
    [settings.notifications, updateSettings]
  );

  const handleStateChange = useCallback(
    (state: string) => {
      const dists = INDIAN_STATES[state] ?? [];
      setDistricts(dists);
      updateProfile({ state, district: "" });
    },
    [updateProfile]
  );

  const handleExport = useCallback(() => {
    exportAllData();
    showFeedback(t("settings.exportSuccess"));
  }, [t, showFeedback]);

  const handleClearScans = useCallback(() => {
    clearScanHistory();
    setScanCount(0);
    setStorageUsage(getStorageUsage());
    setConfirmDialog(null);
    showFeedback(t("settings.cleared"));
  }, [showFeedback, t]);

  const handleClearAll = useCallback(() => {
    clearAllAppData();
    setSettings(DEFAULT_SETTINGS);
    setScanCount(0);
    setFieldCount(0);
    setStorageUsage(getStorageUsage());
    setDistricts([]);
    setConfirmDialog(null);
    showFeedback(t("settings.allDataCleared"));
  }, [showFeedback, t]);

  const handleResetSettings = useCallback(() => {
    resetAllSettings();
    setSettings(DEFAULT_SETTINGS);
    setDistricts([]);
    setConfirmDialog(null);
    showFeedback(t("settings.resetDone"));
  }, [showFeedback, t]);

  const iconBadgeClass =
    "shrink-0 w-10 h-10 rounded-full border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]";

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <FeedbackToast message={feedback} />

      {/* HEADER */}
      <SectionHeader
        bg="midgreen"
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        icon={Settings}
        iconTint="bg-leaf"
      />

      {/* STACKED CARDS */}
      <section className="plantio-grain px-5 py-8 plantio-section-gap">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* 1 — FARM PROFILE */}
          <StickerCard className="bg-white plantio-pop-in">
            <div className="flex items-center gap-2 mb-4">
              <div className={`${iconBadgeClass} bg-forest`}>
                <MapPin className="w-5 h-5 text-leaf" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("settings.profile")}
              </h2>
            </div>

            {/* Farm Name */}
            <div className="mb-4">
              <label className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 mb-1.5 block">
                {t("settings.farmName")}
              </label>
              <input
                type="text"
                value={settings.profile.farmName}
                onChange={(e) => updateProfile({ farmName: e.target.value })}
                placeholder={t("settings.farmNamePlaceholder")}
                className="w-full rounded-2xl border-[2.5px] border-ink bg-cream px-4 py-3 font-body text-sm text-ink shadow-[3px_3px_0px_0px_#161611] outline-none focus:ring-2 focus:ring-forest placeholder:text-ink/40"
              />
            </div>

            {/* State & District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 mb-1.5 block">
                  {t("settings.state")}
                </label>
                <Select
                  value={settings.profile.state}
                  onValueChange={handleStateChange}
                >
                  <SelectTrigger className="w-full rounded-2xl border-[2.5px] border-ink bg-cream shadow-[3px_3px_0px_0px_#161611] h-12 font-body text-sm">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-[2.5px] border-ink">
                    {Object.keys(INDIAN_STATES).map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 mb-1.5 block">
                  {t("settings.district")}
                </label>
                <Select
                  value={settings.profile.district}
                  onValueChange={(d) => updateProfile({ district: d })}
                  disabled={!settings.profile.state}
                >
                  <SelectTrigger className="w-full rounded-2xl border-[2.5px] border-ink bg-cream shadow-[3px_3px_0px_0px_#161611] h-12 font-body text-sm disabled:opacity-50">
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-[2.5px] border-ink">
                    {districts.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Farm Size */}
            <div className="mb-4">
              <label className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 mb-1.5 block">
                {t("settings.farmSize")} ({settings.areaUnit})
              </label>
              <input
                type="number"
                min="0"
                value={settings.profile.farmSize}
                onChange={(e) => updateProfile({ farmSize: e.target.value })}
                placeholder={t("settings.farmSizePlaceholder")}
                className="w-full rounded-2xl border-[2.5px] border-ink bg-cream px-4 py-3 font-body text-sm text-ink shadow-[3px_3px_0px_0px_#161611] outline-none focus:ring-2 focus:ring-forest placeholder:text-ink/40"
              />
            </div>

            <StickerButton
              variant="forest"
              size="sm"
              className="w-full"
              onClick={() => showFeedback(t("settings.profileSaved"))}
            >
              <Save className="w-4 h-4" strokeWidth={2.5} />
              {t("settings.saveProfile")}
            </StickerButton>
          </StickerCard>

          {/* 2 — UNITS & MEASUREMENTS */}
          <StickerCard
            className="bg-cream plantio-pop-in"
            style={{ animationDelay: "60ms" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`${iconBadgeClass} bg-midgreen`}>
                <Ruler className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("settings.units")}
              </h2>
            </div>

            {/* Measurement System */}
            <div className="mb-5">
              <label className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 mb-2 block">
                {t("settings.system")}
              </label>
              <TogglePill
                options={[
                  { value: "metric", label: t("settings.metric") },
                  { value: "imperial", label: t("settings.imperial") },
                ]}
                value={settings.measurementSystem}
                onChange={(v) =>
                  updateSettings({
                    measurementSystem: v as "metric" | "imperial",
                  })
                }
              />
            </div>

            {/* Area Unit */}
            <div>
              <label className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 mb-2 block">
                {t("settings.areaUnit")}
              </label>
              <TogglePill
                options={[
                  { value: "acres", label: t("settings.acres") },
                  { value: "bigha", label: t("settings.bigha") },
                  { value: "hectares", label: t("settings.hectares") },
                ]}
                value={settings.areaUnit}
                onChange={(v) =>
                  updateSettings({
                    areaUnit: v as "acres" | "bigha" | "hectares",
                  })
                }
              />
            </div>
          </StickerCard>

          {/* 3 — DATA MANAGEMENT */}
          <StickerCard
            className="bg-white plantio-pop-in"
            style={{ animationDelay: "120ms" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`${iconBadgeClass} bg-gold`}>
                <Database className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("settings.dataManagement")}
              </h2>
            </div>

            {/* Export */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <p className="font-display text-sm font-bold uppercase text-ink">
                  {t("settings.exportAllData")}
                </p>
                <p className="text-xs text-ink/70 mt-0.5">
                  {t("settings.exportDesc")}
                </p>
              </div>
              <StickerButton variant="leaf" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4" strokeWidth={2.5} />
                {t("settings.exportAllData")}
              </StickerButton>
            </div>

            {/* Divider */}
            <div className="border-t-[2px] border-ink/10 my-3" />

            {/* Clear Scan History */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <p className="font-display text-sm font-bold uppercase text-ink">
                  {t("settings.clearScanHistory")}
                </p>
                <p className="text-xs text-ink/70 mt-0.5">
                  {t("settings.clearScanHistoryDesc")} ({scanCount}{" "}
                  {scanCount === 1 ? "scan" : "scans"})
                </p>
              </div>
              <StickerButton
                variant="warn"
                size="sm"
                onClick={() => setConfirmDialog("clearScans")}
                disabled={scanCount === 0}
              >
                <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                {t("common.clear")}
              </StickerButton>
            </div>

            {/* Divider */}
            <div className="border-t-[2px] border-ink/10 my-3" />

            {/* Clear All Data */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <p className="font-display text-sm font-bold uppercase text-ink">
                  {t("settings.clearAllData")}
                </p>
                <p className="text-xs text-ink/70 mt-0.5">
                  {t("settings.clearAllDataDesc")}
                </p>
              </div>
              <StickerButton
                variant="warn"
                size="sm"
                onClick={() => setConfirmDialog("clearAll")}
              >
                <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                {t("common.clear")}
              </StickerButton>
            </div>

            {/* Divider */}
            <div className="border-t-[2px] border-ink/10 my-3" />

            {/* Storage Usage */}
            <div className="flex items-center gap-3 flex-wrap">
              <HardDrive
                className="w-5 h-5 text-ink/50"
                strokeWidth={2.5}
              />
              <span className="font-display text-xs font-bold uppercase tracking-wide text-ink/70">
                {t("settings.storageUsage")}:
              </span>
              <span className="inline-flex items-center border-[2.5px] border-ink rounded-full px-3 py-1 text-xs font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-leaf text-ink">
                {storageUsage}
              </span>
              <span className="inline-flex items-center border-[2.5px] border-ink rounded-full px-3 py-1 text-xs font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-cream text-ink">
                {scanCount} scans, {fieldCount} fields
              </span>
            </div>
          </StickerCard>

          {/* 4 — NOTIFICATIONS */}
          <StickerCard
            className="bg-cream plantio-pop-in"
            style={{ animationDelay: "180ms" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`${iconBadgeClass} bg-forest`}>
                <Bell className="w-5 h-5 text-leaf" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("settings.notifications")}
              </h2>
            </div>

            {/* Weather Alerts */}
            <div className="flex items-center justify-between gap-4 py-3 border-b-[2px] border-ink/10">
              <div className="flex items-start gap-3">
                <CloudSun
                  className="w-5 h-5 text-forest shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <div>
                  <p className="font-display text-sm font-bold uppercase text-ink">
                    {t("settings.weatherAlerts")}
                  </p>
                  <p className="text-xs text-ink/70 mt-0.5">
                    {t("settings.weatherAlertsDesc")}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.notifications.weatherAlerts}
                onCheckedChange={(v) =>
                  updateNotifications({ weatherAlerts: v })
                }
                className="data-[state=checked]:bg-forest data-[state=unchecked]:bg-ink/20"
              />
            </div>

            {/* Mandi Alerts */}
            <div className="flex items-center justify-between gap-4 py-3 border-b-[2px] border-ink/10">
              <div className="flex items-start gap-3">
                <IndianRupee
                  className="w-5 h-5 text-gold shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <div>
                  <p className="font-display text-sm font-bold uppercase text-ink">
                    {t("settings.mandiAlerts")}
                  </p>
                  <p className="text-xs text-ink/70 mt-0.5">
                    {t("settings.mandiAlertsDesc")}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.notifications.mandiAlerts}
                onCheckedChange={(v) =>
                  updateNotifications({ mandiAlerts: v })
                }
                className="data-[state=checked]:bg-forest data-[state=unchecked]:bg-ink/20"
              />
            </div>

            {/* Crop Reminders */}
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-start gap-3">
                <CalendarDays
                  className="w-5 h-5 text-midgreen shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <div>
                  <p className="font-display text-sm font-bold uppercase text-ink">
                    {t("settings.cropReminders")}
                  </p>
                  <p className="text-xs text-ink/70 mt-0.5">
                    {t("settings.cropRemindersDesc")}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.notifications.cropReminders}
                onCheckedChange={(v) =>
                  updateNotifications({ cropReminders: v })
                }
                className="data-[state=checked]:bg-forest data-[state=unchecked]:bg-ink/20"
              />
            </div>
          </StickerCard>

          {/* 5 — ABOUT & LEGAL */}
          <StickerCard
            className="bg-white plantio-pop-in"
            style={{ animationDelay: "240ms" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`${iconBadgeClass} bg-leaf`}>
                <Info className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {t("settings.aboutLegal")}
              </h2>
            </div>

            <div className="space-y-4">
              {/* App Version */}
              <div className="flex items-center gap-3">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-ink/70 w-28 shrink-0">
                  {t("settings.appVersion")}
                </span>
                <span className="inline-flex items-center border-[2.5px] border-ink rounded-full px-3 py-1 text-xs font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-leaf text-ink">
                  v1.0.0
                </span>
              </div>

              {/* Privacy Policy */}
              <div className="bg-cream border-[2.5px] border-ink rounded-2xl p-4 shadow-[3px_3px_0px_0px_#161611]">
                <div className="flex items-center gap-2 mb-1">
                  <Shield
                    className="w-4 h-4 text-forest"
                    strokeWidth={2.5}
                  />
                  <span className="font-display text-sm font-bold uppercase text-ink">
                    {t("settings.privacyPolicy")}
                  </span>
                </div>
                <p className="text-xs text-ink/70 leading-relaxed">
                  {t("settings.privacyDesc")}
                </p>
              </div>

              {/* Terms of Service */}
              <div className="bg-cream border-[2.5px] border-ink rounded-2xl p-4 shadow-[3px_3px_0px_0px_#161611]">
                <div className="flex items-center gap-2 mb-1">
                  <FileText
                    className="w-4 h-4 text-forest"
                    strokeWidth={2.5}
                  />
                  <span className="font-display text-sm font-bold uppercase text-ink">
                    {t("settings.termsOfService")}
                  </span>
                </div>
                <p className="text-xs text-ink/70 leading-relaxed">
                  {t("settings.termsDesc")}
                </p>
              </div>

              {/* Open Source Licenses */}
              <div className="bg-cream border-[2.5px] border-ink rounded-2xl p-4 shadow-[3px_3px_0px_0px_#161611]">
                <div className="flex items-center gap-2 mb-1">
                  <Code2
                    className="w-4 h-4 text-forest"
                    strokeWidth={2.5}
                  />
                  <span className="font-display text-sm font-bold uppercase text-ink">
                    {t("settings.openSourceLicenses")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {[
                    "Next.js",
                    "React",
                    "TypeScript",
                    "Tailwind CSS",
                    "Radix UI",
                    "Lucide",
                    "Leaflet",
                    "Turf.js",
                  ].map((lib) => (
                    <span
                      key={lib}
                      className="inline-flex items-center border-[2px] border-ink rounded-full px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_#161611] bg-white text-ink"
                    >
                      {lib}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </StickerCard>

          {/* 6 — DANGER ZONE */}
          <StickerCard
            className="bg-warn/10 plantio-pop-in border-warn"
            style={{ animationDelay: "300ms" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`${iconBadgeClass} bg-warn`}>
                <AlertTriangle
                  className="w-5 h-5 text-white"
                  strokeWidth={2.5}
                />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase text-warn">
                {t("settings.dangerZone")}
              </h2>
            </div>

            {/* Reset All Settings */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <p className="font-display text-sm font-bold uppercase text-ink">
                  {t("settings.resetSettings")}
                </p>
                <p className="text-xs text-ink/70 mt-0.5">
                  {t("settings.resetSettingsDesc")}
                </p>
              </div>
              <StickerButton
                variant="warn"
                size="sm"
                onClick={() => setConfirmDialog("resetSettings")}
              >
                <RotateCcw className="w-4 h-4" strokeWidth={2.5} />
                {t("common.clear")}
              </StickerButton>
            </div>

            {/* Divider */}
            <div className="border-t-[2px] border-warn/20 my-3" />

            {/* Delete All Data */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-display text-sm font-bold uppercase text-ink">
                  {t("settings.deleteAllData")}
                </p>
                <p className="text-xs text-ink/70 mt-0.5">
                  {t("settings.deleteAllDataDesc")}
                </p>
              </div>
              <StickerButton
                variant="warn"
                size="sm"
                onClick={() => setConfirmDialog("clearAll")}
              >
                <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                {t("common.delete")}
              </StickerButton>
            </div>
          </StickerCard>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-8 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-wide text-ink/70">
          {t("common.madeForGrowers")}
        </p>
      </footer>

      {/* CONFIRMATION DIALOGS */}
      <AlertDialog
        open={confirmDialog === "clearScans"}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent className="rounded-2xl border-[3px] border-ink shadow-[5px_5px_0px_0px_#161611]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-bold uppercase">
              {t("settings.confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-ink/70">
              {t("settings.clearScanHistoryDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-[2.5px] border-ink font-display text-sm font-bold uppercase">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearScans}
              className="rounded-full border-[2.5px] border-ink bg-warn text-white font-display text-sm font-bold uppercase shadow-[3px_3px_0px_0px_#161611]"
            >
              {t("settings.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDialog === "clearAll"}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent className="rounded-2xl border-[3px] border-ink shadow-[5px_5px_0px_0px_#161611]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-bold uppercase text-warn">
              {t("settings.confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-ink/70">
              {t("settings.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-[2.5px] border-ink font-display text-sm font-bold uppercase">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="rounded-full border-[2.5px] border-ink bg-warn text-white font-display text-sm font-bold uppercase shadow-[3px_3px_0px_0px_#161611]"
            >
              {t("settings.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDialog === "resetSettings"}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent className="rounded-2xl border-[3px] border-ink shadow-[5px_5px_0px_0px_#161611]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-bold uppercase">
              {t("settings.confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-ink/70">
              {t("settings.confirmReset")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-[2.5px] border-ink font-display text-sm font-bold uppercase">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetSettings}
              className="rounded-full border-[2.5px] border-ink bg-warn text-white font-display text-sm font-bold uppercase shadow-[3px_3px_0px_0px_#161611]"
            >
              {t("settings.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
