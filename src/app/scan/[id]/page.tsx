"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Share2,
  Trash2,
  ScanLine,
  Leaf,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sprout,
  Activity,
  FileText,
  Stethoscope,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import {
  getScanHistory,
  deleteScanFromHistory,
  setLastScan,
  buildShareCard,
  type ScanResult,
} from "@/lib/plantio/storage";
import { useI18n } from "@/lib/plantio/i18n";

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// t() returns a string, but our detail.scanPosition needs interpolation. We'll
// inline-replace {i} and {n} ourselves since the i18n helper is identity-only.
function fmt(key: string, vars: Record<string, string | number>): string {
  let s = key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return s;
}

export default function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { t } = useI18n();
  const { id } = use(params);
  const [history, setHistory] = useState<ScanResult[] | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const load = () => setHistory(getScanHistory());
    load();
    window.addEventListener("plantio-history-updated", load);
    return () => window.removeEventListener("plantio-history-updated", load);
  }, []);

  const currentIndex = history?.findIndex((s) => s.id === id) ?? -1;
  const scan = currentIndex >= 0 && history ? history[currentIndex] : null;
  const prev = history && currentIndex > 0 ? history[currentIndex - 1] : null;
  const next = history && currentIndex >= 0 && currentIndex < history.length - 1 ? history[currentIndex + 1] : null;

  const handleShare = async () => {
    if (!scan) return;
    try {
      const blob = await buildShareCard(scan);
      const text = scan.is_healthy
        ? `Plantio scan: healthy ${scan.plant_name || "plant"} (${Math.round(scan.confidence * 100)}% confident)`
        : `Plantio scan: ${scan.disease_name || "disease"} on ${scan.plant_name || "plant"} (${Math.round(scan.confidence * 100)}% confident)`;
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "plantio-scan.png", { type: "image/png" })] })) {
        await navigator.share({ title: "Plantio scan", text, files: [new File([blob], "plantio-scan.png", { type: "image/png" })] });
      } else if (navigator.share) {
        await navigator.share({ title: "Plantio scan", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* cancelled */
    }
  };

  const handleViewCure = () => {
    if (!scan) return;
    setLastScan(scan);
    router.push("/scan/cure");
  };

  const handleDelete = () => {
    if (!scan) return;
    deleteScanFromHistory(scan.id);
    router.push("/scan/history");
  };

  if (history === null) {
    return (
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
        <SectionHeader title={t("detail.back")} bg="forest" icon={ScanLine} iconTint="bg-leaf" />
        <section className="px-5 py-6">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="skeleton-plantio h-72" />
            <div className="skeleton-plantio h-32" />
          </div>
        </section>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
        <SectionHeader title={t("detail.notFound")} bg="forest" icon={HelpCircle} iconTint="bg-gold" />
        <section className="px-5 py-6">
          <div className="mx-auto max-w-2xl">
            <StickerCard className="bg-cream text-center plantio-pop-in">
              <div className="relative h-12 mb-2">
                <Leaf className="absolute left-1/4 w-6 h-6 text-leaf plantio-float" strokeWidth={2.5} />
                <Leaf className="absolute left-1/2 -translate-x-1/2 w-8 h-8 text-midgreen plantio-float-2" strokeWidth={2.5} />
                <Leaf className="absolute right-1/4 w-6 h-6 text-forest plantio-float-3" strokeWidth={2.5} />
              </div>
              <div className="mx-auto w-16 h-16 rounded-2xl bg-warn border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0px_0px_#161611]">
                <HelpCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold uppercase">{t("detail.notFound")}</h2>
              <p className="mt-2 text-sm text-ink/70">{t("detail.notFoundDesc")}</p>
              <div className="mt-5">
                <StickerButton variant="forest" size="md" onClick={() => router.push("/scan/history")}>
                  <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> {t("detail.back")}
                </StickerButton>
              </div>
            </StickerCard>
          </div>
        </section>
      </main>
    );
  }

  const statusKey = scan.is_healthy ? "detail.healthy" : scan.disease_name ? "detail.disease" : "detail.uncertain";
  const StatusIcon = scan.is_healthy ? CheckCircle2 : scan.disease_name ? AlertTriangle : HelpCircle;
  const statusTint = scan.is_healthy ? "bg-leaf text-ink" : scan.disease_name ? "bg-warn text-white" : "bg-gold text-ink";

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <SectionHeader
        title={scan.is_healthy ? t("detail.healthy") : (scan.disease_name || t("detail.uncertain"))}
        subtitle={fmt(t("detail.scanPosition"), { i: currentIndex + 1, n: history.length })}
        bg="forest"
        icon={ScanLine}
        iconTint={scan.is_healthy ? "bg-leaf" : scan.disease_name ? "bg-warn" : "bg-gold"}
      />

      <section className="px-5 py-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Back link */}
          <button
            onClick={() => router.push("/scan/history")}
            className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase bg-cream border-[2.5px] border-ink rounded-full px-3 py-1.5 shadow-[3px_3px_0px_0px_#161611] active:translate-y-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("detail.back")}
          </button>

          {/* Big scan image card */}
          <StickerCard className="bg-white p-0 overflow-hidden plantio-pop-in">
            <div className="relative aspect-[4/3] bg-cream border-b-[3px] border-ink">
              {scan.imageDataUrl ? (
                <img src={scan.imageDataUrl} alt="Scan" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Leaf className="w-16 h-16 text-forest" strokeWidth={2} />
                </div>
              )}
              <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border-[2.5px] border-ink px-3 py-1 shadow-[3px_3px_0px_0px_#161611] ${statusTint}`}>
                <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span className="font-display text-xs font-bold uppercase">{t(statusKey)}</span>
              </div>
              <div className="absolute top-3 right-3">
                <StickerBadge variant={scan.is_healthy ? "leaf" : scan.disease_name ? "warn" : "gold"}>
                  {Math.round(scan.confidence * 100)}% {t("detail.confidence")}
                </StickerBadge>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {!scan.is_healthy && scan.disease_name && (
                <StickerButton variant="gold" size="md" className="w-full" onClick={handleViewCure}>
                  <Stethoscope className="w-4 h-4" strokeWidth={2.5} /> {t("detail.viewCure")}
                </StickerButton>
              )}
              <div className="grid grid-cols-3 gap-2">
                <StickerButton variant="cream" size="sm" onClick={handleShare}>
                  <Share2 className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("detail.share")}
                </StickerButton>
                <StickerButton variant="forest" size="sm" onClick={() => router.push("/scan")}>
                  <ScanLine className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("detail.newScan")}
                </StickerButton>
                <StickerButton variant="warn" size="sm" onClick={() => setConfirmingDelete(true)}>
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("detail.delete")}
                </StickerButton>
              </div>
            </div>
          </StickerCard>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoTile icon={Sprout} label={t("detail.plant")} value={scan.plant_name || "Unknown"} tint="bg-leaf text-ink" />
            <InfoTile icon={Activity} label={t("detail.status")} value={t(statusKey)} tint={scan.is_healthy ? "bg-leaf text-ink" : scan.disease_name ? "bg-warn text-white" : "bg-gold text-ink"} />
            <InfoTile icon={Calendar} label={t("detail.scannedOn")} value={formatDateTime(scan.timestamp)} tint="bg-white" small />
            <InfoTile icon={Activity} label={t("detail.confidence")} value={`${Math.round(scan.confidence * 100)}%`} tint="bg-gold text-ink" />
          </div>

          {/* Summary card */}
          {scan.symptoms_summary && (
            <StickerCard className="bg-cream plantio-pop-in">
              <div className="flex items-center gap-2 mb-2">
                <span className="shrink-0 w-9 h-9 rounded-xl bg-forest border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611]">
                  <FileText className="w-4 h-4 text-white" strokeWidth={2.5} />
                </span>
                <p className="font-display text-sm font-bold uppercase">{t("detail.summary")}</p>
              </div>
              <p className="text-sm leading-relaxed text-ink/85">
                {scan.symptoms_summary}
              </p>
            </StickerCard>
          )}

          {/* Prev / Next navigation */}
          <StickerCard className="bg-white">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => prev && router.push(`/scan/${prev.id}`)}
                disabled={!prev}
                className="flex-1 inline-flex items-center justify-center gap-1.5 font-display text-xs font-bold uppercase rounded-full border-[2.5px] border-ink px-3 py-2 shadow-[2px_2px_0px_0px_#161611] disabled:opacity-40 disabled:cursor-not-allowed bg-cream text-ink active:translate-y-0.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("detail.prevScan")}
              </button>
              <span className="font-display text-[10px] font-bold uppercase text-ink/55 px-2">
                {currentIndex + 1} / {history.length}
              </span>
              <button
                onClick={() => next && router.push(`/scan/${next.id}`)}
                disabled={!next}
                className="flex-1 inline-flex items-center justify-center gap-1.5 font-display text-xs font-bold uppercase rounded-full border-[2.5px] border-ink px-3 py-2 shadow-[2px_2px_0px_0px_#161611] disabled:opacity-40 disabled:cursor-not-allowed bg-cream text-ink active:translate-y-0.5"
              >
                {t("detail.nextScan")} <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </StickerCard>

          {/* Delete confirmation modal */}
          {confirmingDelete && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-5" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setConfirmingDelete(false)} />
              <StickerCard className="relative bg-white max-w-sm w-full plantio-pop-in">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-warn border-[3px] border-ink flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-bold uppercase">{t("detail.delete")}</h3>
                    <p className="mt-1 text-sm text-ink/70">{t("detail.confirmDelete")}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <StickerButton variant="cream" size="sm" onClick={() => setConfirmingDelete(false)}>
                    {t("common.cancel")}
                  </StickerButton>
                  <StickerButton variant="warn" size="sm" onClick={handleDelete}>
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("detail.delete")}
                  </StickerButton>
                </div>
              </StickerCard>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function InfoTile({ icon: Icon, label, value, tint, small }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: string; tint: string; small?: boolean }) {
  return (
    <div className={`rounded-2xl border-[2.5px] border-ink p-3 shadow-[3px_3px_0px_0px_#161611] ${tint}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 opacity-80" strokeWidth={2.5} />
        <p className="font-display text-[9px] font-bold uppercase opacity-75">{label}</p>
      </div>
      <p className={`mt-1 font-display font-bold leading-tight ${small ? "text-xs" : "text-base"} ${value.length > 14 ? "truncate" : ""}`} title={value}>{value}</p>
    </div>
  );
}
