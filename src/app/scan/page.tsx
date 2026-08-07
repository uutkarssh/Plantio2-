"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  ImageIcon,
  Leaf,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Sparkles,
  Wand2,
  Share2,
  History,
  WifiOff,
  CloudUpload,
  ScanLine,
  Info,
  Bug,
  BookOpen,
} from "lucide-react";
import { StickerCard, StickerButton, StickerBadge, SectionHeader, ErrorRetryCard } from "@/components/plantio/sticker";
import {
  compressImage,
  makeThumbnail,
  setLastScan,
  addScanToHistory,
  buildShareCard,
  addToOfflineQueue,
  type ScanResult,
} from "@/lib/plantio/storage";

type Status = "upload" | "preview" | "analyzing" | "result" | "error" | "queued";

interface ScanData {
  plant_name: string | null;
  is_healthy: boolean;
  disease_name: string | null;
  confidence: number;
  symptoms_summary: string;
}

const STATUS_MESSAGES = [
  "Reading leaf patterns...",
  "Checking for disease markers...",
  "Comparing against plant diseases...",
  "Almost there...",
];

const SCAN_TIPS = [
  "Best results come from close-up photos in natural daylight",
  "Include both the healthy and affected part of the leaf",
  "Avoid blurry photos — tap to focus before capturing",
];

const SCAN_STEPS = [
  "Uploading",
  "Reading Leaf",
  "Detecting Disease",
  "Building Result",
] as const;

const SIMILAR_DISEASES = [
  { name: "Leaf Spot", match: "78%" },
  { name: "Early Blight", match: "65%" },
  { name: "Bacterial Wilt", match: "42%" },
];

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("upload");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [statusMsgIdx, setStatusMsgIdx] = useState(0);
  const [online, setOnline] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  /* tip rotation for upload area */
  const [tipIdx, setTipIdx] = useState(0);
  const [tipKey, setTipKey] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setTipIdx((i) => (i + 1) % SCAN_TIPS.length);
      setTipKey((k) => k + 1);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  /* track online/offline so we can queue scans when the network drops */
  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const onFileSelected = useCallback(async (file: File) => {
    try {
      const compressed = await compressImage(file, 1024, 0.8);
      setImageDataUrl(compressed);
      setStatus("preview");
      setResult(null);
    } catch {
      setErrorMsg("Could not read that photo. Try a different one.");
      setStatus("error");
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    // reset so picking the same file again re-triggers change
    e.target.value = "";
  };

  const analyze = useCallback(async () => {
    if (!imageDataUrl) return;

    /* If we're offline, queue the scan and show the "saved offline" card */
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToOfflineQueue({
        id: crypto.randomUUID(),
        imageDataUrl,
        queuedAt: Date.now(),
      });
      setStatus("queued");
      return;
    }

    setStatus("analyzing");
    setStatusMsgIdx(0);
    setErrorMsg("");

    // rotate status messages
    const msgTimer = setInterval(() => {
      setStatusMsgIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 2200);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      clearInterval(msgTimer);
      const data = await res.json();
      if (!res.ok && !data?.result) {
        throw new Error(data?.error || "Scan failed");
      }
      const r: ScanData = data.result;
      setResult(r);

      // persist last scan (with small thumbnail)
      const thumb = await makeThumbnail(imageDataUrl, 200);
      const scan: ScanResult = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        imageDataUrl: thumb,
        plant_name: r.plant_name,
        is_healthy: r.is_healthy,
        disease_name: r.disease_name,
        confidence: r.confidence,
        symptoms_summary: r.symptoms_summary,
      };
      setLastScan(scan);
      addScanToHistory(scan);
      setStatus("result");
    } catch (e: any) {
      clearTimeout(timeout);
      clearInterval(msgTimer);
      if (e?.name === "AbortError") {
        setErrorMsg("Couldn't reach the plant doctor — the request took too long. Check your connection and try again.");
      } else {
        setErrorMsg(e?.message || "Couldn't reach the plant doctor — check your connection and try again.");
      }
      setStatus("error");
    }
  }, [imageDataUrl]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setImageDataUrl(null);
    setResult(null);
    setErrorMsg("");
    setStatus("upload");
  }, []);

  const goToCure = useCallback(() => {
    if (!result) return;
    // pass via localStorage (already saved as last scan; cure page reads it)
    router.push("/scan/cure");
  }, [result, router]);

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <SectionHeader
        title="Scan a Plant"
        subtitle="Upload a clear, close-up photo of the affected leaf for an instant AI disease check."
        bg="forest"
        icon={ScanLine}
        iconTint="bg-leaf"
      />

      {/* Decorative floating leaf near header */}
      <div aria-hidden className="relative mx-auto max-w-2xl px-5 -mt-1 h-0">
        <div className="plantio-leaf-1" />
      </div>

      {/* Offline indicator strip */}
      {!online && (
        <div className="px-5 pt-4">
          <div className="mx-auto max-w-2xl sticker-card bg-gold p-3 flex items-center gap-3">
            <span className="shrink-0 w-9 h-9 rounded-xl bg-ink border-[2.5px] border-ink flex items-center justify-center">
              <WifiOff className="w-4 h-4 text-gold" strokeWidth={2.5} />
            </span>
            <p className="text-xs font-medium text-ink leading-snug">
              <span className="font-display font-bold uppercase">You&apos;re offline.</span> Scans will be
              saved and processed automatically when you&apos;re back online.
            </p>
          </div>
        </div>
      )}

      <section className="px-5 py-6 plantio-grain plantio-section-gap">
        <div className="mx-auto max-w-2xl">
          {/* hidden file input — NOTE: no `capture` attribute so the phone shows the
              normal Camera/Gallery chooser instead of forcing the camera open */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          {status === "upload" && (
            <>
              <UploadCard onPick={() => fileInputRef.current?.click()} />
              {/* Rotating scan tips */}
              <div className="mt-4 flex items-center gap-2 justify-center">
                <Info className="w-4 h-4 text-forest shrink-0" strokeWidth={2.5} />
                <p
                  key={tipKey}
                  className="text-xs text-ink/70 plantio-tip-fade text-center"
                >
                  {SCAN_TIPS[tipIdx]}
                </p>
              </div>
              <div className="mt-5">
                <a
                  href="/scan/history"
                  className="sticker-card bg-cream p-4 flex items-center gap-3 active:translate-y-0.5 transition-transform"
                >
                  <span className="shrink-0 w-11 h-11 rounded-2xl bg-forest border-[2.5px] border-ink flex items-center justify-center">
                    <History className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </span>
                  <div className="flex-1">
                    <p className="font-display text-base font-bold uppercase leading-tight">Scan History</p>
                    <p className="text-xs text-ink/70">View your past plant scans & results</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-forest" strokeWidth={2.5} />
                </a>
              </div>
              <div className="mt-3">
                <a
                  href="/library"
                  className="sticker-card bg-gold p-4 flex items-center gap-3 active:translate-y-0.5 transition-transform"
                >
                  <span className="shrink-0 w-11 h-11 rounded-2xl bg-forest border-[2.5px] border-ink flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </span>
                  <div className="flex-1">
                    <p className="font-display text-base font-bold uppercase leading-tight">Disease Library</p>
                    <p className="text-xs text-ink/70">Browse 12 common crop diseases & their cures</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-forest" strokeWidth={2.5} />
                </a>
              </div>
            </>
          )}

          {status === "preview" && imageDataUrl && (
            <PreviewCard
              src={imageDataUrl}
              onChooseAnother={() => fileInputRef.current?.click()}
              onAnalyze={analyze}
              online={online}
            />
          )}

          {status === "analyzing" && imageDataUrl && (
            <AnalyzingCard src={imageDataUrl} message={STATUS_MESSAGES[statusMsgIdx]} stepIdx={statusMsgIdx} />
          )}

          {status === "queued" && imageDataUrl && (
            <QueuedCard src={imageDataUrl} onScanAnother={reset} />
          )}

          {status === "error" && (
            <ErrorRetryCard
              message={errorMsg}
              onRetry={analyze}
              onSecondary={reset}
              secondaryLabel="Upload a Different Photo"
            />
          )}

          {status === "result" && result && imageDataUrl && (
            <ResultCard
              data={result}
              src={imageDataUrl}
              onScanAnother={reset}
              onGetCure={goToCure}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function UploadCard({ onPick }: { onPick: () => void }) {
  return (
    <div className="plantio-grain">
      <button
        onClick={onPick}
        className="sticker-dashed plantio-stitched sticker-interactive w-full p-8 sm:p-12 flex flex-col items-center text-center active:translate-y-0.5 transition-transform relative overflow-hidden"
      >
        {/* Decorative dot pattern background */}
        <div aria-hidden className="absolute inset-0 plantio-dots-ink pointer-events-none" />
        <span className="relative w-20 h-20 rounded-3xl bg-leaf border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0px_0px_#161611]">
          <UploadCloud className="w-9 h-9 text-ink" strokeWidth={2.5} />
          <Leaf className="absolute -bottom-3 -right-3 w-7 h-7 text-forest bg-cream rounded-full p-0.5 border-[2.5px] border-ink leaf-bob" strokeWidth={2.5} />
        </span>
        <h2 className="relative mt-5 font-display text-2xl sm:text-3xl font-bold uppercase flex items-center gap-2">
          Tap to upload a plant photo
          <Leaf className="w-6 h-6 text-forest leaf-bob" strokeWidth={2.5} />
        </h2>
        <p className="relative mt-2 text-sm text-ink/70 max-w-xs">
          Pick from your gallery or snap a fresh photo — whichever your phone offers.
        </p>
      </button>
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-ink/60">
        <Camera className="w-4 h-4" strokeWidth={2.5} />
        Clear, close-up photo of the affected leaf works best.
      </p>
    </div>
  );
}

function PreviewCard({
  src,
  onChooseAnother,
  onAnalyze,
  online,
}: {
  src: string;
  onChooseAnother: () => void;
  onAnalyze: () => void;
  online: boolean;
}) {
  return (
    <StickerCard className="bg-white p-0 overflow-hidden">
      <div className="relative aspect-square w-full bg-cream border-b-[3px] border-ink">
        <img src={src} alt="Selected plant" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="p-5 flex flex-col gap-3">
        <p className="font-display text-lg font-bold uppercase">Looks good? Analyze it</p>
        <p className="text-sm text-ink/70">
          {online
            ? "Make sure the affected area is in focus and fills most of the frame."
            : "You're offline — we'll save this scan and process it automatically when you're back online."}
        </p>
        <div className="mt-2 flex flex-col gap-3">
          <StickerButton variant="leaf" size="lg" className="w-full" onClick={onAnalyze}>
            {online ? (
              <>
                <Wand2 className="w-5 h-5" strokeWidth={2.5} /> Analyze Plant <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
              </>
            ) : (
              <>
                <CloudUpload className="w-5 h-5" strokeWidth={2.5} /> Save Scan for Later
              </>
            )}
          </StickerButton>
          <StickerButton variant="outline" size="md" className="w-full" onClick={onChooseAnother}>
            <ImageIcon className="w-4 h-4" strokeWidth={2.5} /> Choose Different Photo
          </StickerButton>
        </div>
      </div>
    </StickerCard>
  );
}

function QueuedCard({ src, onScanAnother }: { src: string; onScanAnother: () => void }) {
  return (
    <StickerCard className="bg-gold p-0 overflow-hidden">
      <div className="relative aspect-square w-full bg-cream border-b-[3px] border-ink">
        <img src={src} alt="Queued scan" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-forest/30 flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0px_0px_#161611]">
            <CloudUpload className="w-9 h-9 text-forest" strokeWidth={2.5} />
          </div>
          <p className="mt-4 font-display text-xl font-bold uppercase text-white drop-shadow text-center px-6">
            Saved Offline
          </p>
        </div>
      </div>
      <div className="p-5">
        <p className="font-display text-lg font-bold uppercase">Scan queued</p>
        <p className="mt-1 text-sm text-ink/80 leading-relaxed">
          Your photo is safely stored on this device. Open Plantio when you&apos;re back online and the
          home screen will process it automatically — your result will appear in Scan History.
        </p>
        <div className="mt-4">
          <StickerButton variant="forest" size="md" className="w-full" onClick={onScanAnother}>
            <RefreshCw className="w-4 h-4" strokeWidth={2.5} /> Scan Another Plant
          </StickerButton>
        </div>
      </div>
    </StickerCard>
  );
}

/* ---------- Step Tracker for Analyzing State ---------- */
function ScanStepper({ currentStep }: { currentStep: number }) {
  // currentStep maps to 0..3 from the statusMsgIdx cycling
  const stepIdx = Math.min(currentStep, SCAN_STEPS.length - 1);
  return (
    <div className="flex items-center justify-center gap-0 mt-5 px-2">
      {SCAN_STEPS.map((label, i) => {
        const filled = i <= stepIdx;
        const active = i === stepIdx;
        return (
          <div key={label} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <span
                className={`w-9 h-9 rounded-full border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611] transition-colors duration-300 ${
                  filled ? "bg-forest text-white" : "bg-cream text-ink/50"
                } ${active ? "plantio-step-pulse" : ""}`}
              >
                {filled ? (
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                ) : (
                  <span className="font-display text-xs font-bold">{i + 1}</span>
                )}
              </span>
              <span
                className={`mt-1.5 text-[10px] font-display font-bold uppercase leading-tight text-center transition-colors duration-300 ${
                  filled ? "text-white" : "text-white/50"
                }`}
              >
                {label}
              </span>
            </div>
            {/* Connector line */}
            {i < SCAN_STEPS.length - 1 && (
              <div className="relative w-6 sm:w-10 h-[3px] mx-1 bg-white/30 rounded-full overflow-hidden">
                {i < stepIdx && (
                  <div className="absolute inset-y-0 left-0 bg-leaf plantio-line-fill" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnalyzingCard({ src, message, stepIdx }: { src: string; message: string; stepIdx: number }) {
  return (
    <StickerCard className="bg-leaf p-0 overflow-hidden plantio-sheen">
      <div className="relative aspect-square w-full bg-cream border-b-[3px] border-ink">
        <img src={src} alt="Analyzing" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-forest/30 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-[4px] border-ink/20" />
            <div className="absolute inset-0 rounded-full border-[4px] border-ink border-t-leaf leaf-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Leaf className="w-10 h-10 text-forest leaf-bob" strokeWidth={2.5} />
            </div>
          </div>
          <p className="mt-5 font-display text-xl font-bold uppercase text-white drop-shadow plantio-embossed">{message}</p>
          {/* Step tracker */}
          <ScanStepper currentStep={stepIdx} />
        </div>
      </div>
      <div className="p-5 text-center">
        <p className="font-display text-lg font-bold uppercase">Analyzing your plant</p>
        <p className="mt-1 text-sm text-ink/80">This usually takes a few seconds. Hold tight.</p>
      </div>
    </StickerCard>
  );
}

/* ---------- Severity Indicator ---------- */
function SeverityIndicator({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let level: "low" | "medium" | "high";
  let color: string;
  let bgBar: string;
  if (confidence < 0.5) {
    level = "low";
    color = "bg-leaf text-ink";
    bgBar = "bg-leaf";
  } else if (confidence <= 0.8) {
    level = "medium";
    color = "bg-gold text-ink";
    bgBar = "bg-gold";
  } else {
    level = "high";
    color = "bg-warn text-white";
    bgBar = "bg-warn";
  }
  return (
    <div className="mt-3 rounded-2xl border-[2.5px] border-ink bg-cream p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-xs font-bold uppercase">Severity</span>
        <span className={`inline-flex items-center gap-1 border-[2px] border-ink rounded-full px-2.5 py-0.5 text-[11px] font-display font-bold uppercase shadow-[2px_2px_0px_0px_#161611] ${color}`}>
          {level}
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-ink/10 border-[2px] border-ink overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${bgBar} plantio-severity-fill`}
          style={{ "--severity-width": `${pct}%` } as React.CSSProperties}
        />
      </div>
      <p className="mt-1 text-[11px] text-ink/60 text-right">{pct}% confidence</p>
    </div>
  );
}

/* ---------- Decorative Gradient Bar ---------- */
function GradientBar({ type }: { type: "healthy" | "disease" }) {
  const gradient =
    type === "healthy"
      ? "bg-gradient-to-r from-forest via-midgreen to-leaf"
      : "bg-gradient-to-r from-warn via-gold to-leaf";
  return (
    <div className={`h-2 rounded-t-2xl ${gradient} plantio-bar-shimmer`} aria-hidden />
  );
}

/* ---------- Similar Diseases Section ---------- */
function SimilarDiseases() {
  return (
    <div className="mt-4">
      <p className="font-display text-xs font-bold uppercase text-ink/60 mb-2">Similar Diseases</p>
      <div className="space-y-2">
        {SIMILAR_DISEASES.map((d) => (
          <div
            key={d.name}
            className="flex items-center gap-3 rounded-xl border-[2.5px] border-ink bg-cream p-2.5 shadow-[2px_2px_0px_0px_#161611]"
          >
            <span className="shrink-0 w-8 h-8 rounded-lg bg-white border-[2px] border-ink flex items-center justify-center">
              <Bug className="w-4 h-4 text-warn" strokeWidth={2.5} />
            </span>
            <span className="flex-1 font-display text-sm font-bold uppercase">{d.name}</span>
            <StickerBadge variant="cream">{d.match} match</StickerBadge>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink/50 italic">These are possible alternatives — confirm with a local expert.</p>
    </div>
  );
}

function ResultCard({
  data,
  src,
  onScanAnother,
  onGetCure,
}: {
  data: ScanData;
  src: string;
  onScanAnother: () => void;
  onGetCure: () => void;
}) {
  const confident = data.confidence >= 0.7;

  const handleShare = async () => {
    try {
      const scan: ScanResult = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        imageDataUrl: src,
        plant_name: data.plant_name,
        is_healthy: data.is_healthy,
        disease_name: data.disease_name,
        confidence: data.confidence,
        symptoms_summary: data.symptoms_summary,
      };
      const blob = await buildShareCard(scan);
      const text = data.is_healthy
        ? `My plant looks healthy according to Plantio${data.plant_name ? ` (${data.plant_name})` : ""} — ${Math.round(data.confidence * 100)}% confident.`
        : `Plantio detected ${data.disease_name || "a disease"} on my ${data.plant_name || "plant"} — ${Math.round(data.confidence * 100)}% confident. Getting a cure plan next.`;
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "plantio-scan.png", { type: "image/png" })] })) {
        await navigator.share({
          title: "My Plantio scan result",
          text,
          files: [new File([blob], "plantio-scan.png", { type: "image/png" })],
        });
      } else if (navigator.share) {
        await navigator.share({ title: "My Plantio scan result", text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Result copied to clipboard — paste it anywhere to share.");
      }
    } catch {
      /* user cancelled or share unavailable */
    }
  };

  // UNCERTAIN — confidence below 70%
  if (!data.is_healthy && !data.disease_name) {
    return (
      <div className="sticker-card bg-cream overflow-hidden">
        <GradientBar type="disease" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-14 h-14 rounded-2xl bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
              <AlertTriangle className="w-7 h-7 text-ink" strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold uppercase">Not sure yet</h2>
              <p className="text-sm text-ink/70">This photo isn't clear enough for a confident result.</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border-[3px] border-ink overflow-hidden">
            <img src={src} alt="Scan" className="w-full max-h-64 object-cover" />
          </div>
          <p className="mt-4 text-sm text-ink/80">
            Try again in better light, closer to the leaf, against a plain background.
          </p>
          <div className="mt-5">
            <StickerButton variant="forest" size="md" className="w-full" onClick={onScanAnother}>
              <RefreshCw className="w-4 h-4" strokeWidth={2.5} /> Upload a Different Photo
            </StickerButton>
          </div>
        </div>
      </div>
    );
  }

  // HEALTHY
  if (data.is_healthy) {
    return (
      <div className="sticker-card bg-leaf overflow-hidden">
        <GradientBar type="healthy" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-14 h-14 rounded-2xl bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
              <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold uppercase">Your plant looks healthy!</h2>
              <p className="text-sm text-ink/80">No signs of disease detected in this photo.</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border-[3px] border-ink overflow-hidden">
            <img src={src} alt="Scan" className="w-full max-h-64 object-cover" />
          </div>
          {data.plant_name && (
            <p className="mt-4 text-sm">
              <span className="font-display font-bold uppercase">Plant: </span>
              <span>{data.plant_name}</span>
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <StickerBadge variant="forest">{Math.round(data.confidence * 100)}% confident</StickerBadge>
            <StickerBadge variant="cream">Healthy</StickerBadge>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <StickerButton variant="forest" size="md" className="w-full" onClick={onScanAnother}>
              <RefreshCw className="w-4 h-4" strokeWidth={2.5} /> Scan Another
            </StickerButton>
            <StickerButton variant="outline" size="md" className="w-full" onClick={handleShare}>
              <Share2 className="w-4 h-4" strokeWidth={2.5} /> Share Result
            </StickerButton>
          </div>
        </div>
      </div>
    );
  }

  // DISEASE DETECTED
  return (
    <div className="sticker-card plantio-depth-3 plantio-corner-fold bg-warn text-white overflow-hidden">
      <GradientBar type="disease" />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-14 h-14 rounded-2xl bg-white border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
            <AlertTriangle className="w-7 h-7 text-warn" strokeWidth={2.5} />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold uppercase text-white">Disease detected</h2>
            <p className="text-sm text-white/90">{data.plant_name || "Unknown plant"}</p>
          </div>
          <StickerBadge variant="gold" className="plantio-badge-shine">{Math.round(data.confidence * 100)}% confident</StickerBadge>
        </div>
        <div className="mt-4 rounded-2xl border-[3px] border-ink overflow-hidden">
          <img src={src} alt="Scan" className="w-full max-h-64 object-cover" />
        </div>
        <div className="mt-4 rounded-2xl border-[3px] border-ink bg-white text-ink p-4">
          <p className="font-display text-xl font-bold uppercase">{data.disease_name}</p>
          <p className="mt-1 text-sm text-ink/80">{data.symptoms_summary}</p>
        </div>
        {/* Severity indicator */}
        <SeverityIndicator confidence={data.confidence} />
        {/* Similar diseases */}
        <div className="mt-4 rounded-2xl border-[2.5px] border-ink bg-white text-ink p-4">
          <SimilarDiseases />
        </div>
        {!confident && (
          <p className="mt-3 text-xs text-white/85 bg-ink/30 rounded-xl p-2">
            Confidence is moderate. If the diagnosis doesn't match what you see, try a clearer photo or confirm with a local agricultural officer.
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3">
          <StickerButton variant="gold" size="lg" className="w-full" onClick={onGetCure}>
            <Sparkles className="w-5 h-5" strokeWidth={2.5} /> Get Cure & Fertilizer Plan <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </StickerButton>
          <div className="grid grid-cols-2 gap-3">
            <StickerButton variant="outline" size="md" onClick={handleShare}>
              <Share2 className="w-4 h-4" strokeWidth={2.5} /> Share
            </StickerButton>
            <StickerButton variant="outline" size="md" onClick={onScanAnother}>
              <RefreshCw className="w-4 h-4" strokeWidth={2.5} /> New Scan
            </StickerButton>
          </div>
        </div>
      </div>
    </div>
  );
}
