"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  MessageSquareHeart,
  Bug,
  Lightbulb,
  HelpCircle,
  Heart,
  Type,
  Mail,
  Send,
  CheckCircle2,
  ChevronDown,
  ScanLine,
  BookOpen,
  MapPinned,
  CalendarDays,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";
import { addFeedback } from "@/lib/plantio/storage";
import { cn } from "@/lib/utils";

/* ===================================================================
   Feedback type definitions
   =================================================================== */
type FeedbackType = "bug" | "feature" | "question" | "appreciation";

interface TypeOption {
  id: FeedbackType;
  labelKey: string;
  icon: LucideIcon;
  tint: string; // active background tint (in addition to bg-forest)
}

const TYPE_OPTIONS: TypeOption[] = [
  { id: "bug", labelKey: "feedback.bugReport", icon: Bug, tint: "bg-warn" },
  { id: "feature", labelKey: "feedback.featureRequest", icon: Lightbulb, tint: "bg-gold" },
  { id: "question", labelKey: "feedback.question", icon: HelpCircle, tint: "bg-midgreen" },
  { id: "appreciation", labelKey: "feedback.appreciation", icon: Heart, tint: "bg-leaf" },
];

/* ===================================================================
   FAQ data — 6 common questions farmers might have
   =================================================================== */
interface FaqItem {
  qKey: string;
  aKey: string;
}
const FAQ_ITEMS: FaqItem[] = [
  { qKey: "feedback.faq1Q", aKey: "feedback.faq1A" },
  { qKey: "feedback.faq2Q", aKey: "feedback.faq2A" },
  { qKey: "feedback.faq3Q", aKey: "feedback.faq3A" },
  { qKey: "feedback.faq4Q", aKey: "feedback.faq4A" },
  { qKey: "feedback.faq5Q", aKey: "feedback.faq5A" },
  { qKey: "feedback.faq6Q", aKey: "feedback.faq6A" },
];

/* ===================================================================
   Quick help cards
   =================================================================== */
interface QuickHelp {
  href: string;
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  iconTint: string;
}
const QUICK_HELP: QuickHelp[] = [
  {
    href: "/scan",
    titleKey: "feedback.scanAPlant",
    descKey: "home.diseaseScannerDesc",
    icon: ScanLine,
    iconTint: "bg-leaf",
  },
  {
    href: "/library",
    titleKey: "feedback.diseaseLibrary",
    descKey: "library.subtitle",
    icon: BookOpen,
    iconTint: "bg-gold",
  },
  {
    href: "/measure",
    titleKey: "feedback.measureLand",
    descKey: "home.measureLandDesc",
    icon: MapPinned,
    iconTint: "bg-cream",
  },
  {
    href: "/calendar",
    titleKey: "feedback.cropCalendar",
    descKey: "calendar.subtitle",
    icon: CalendarDays,
    iconTint: "bg-midgreen/30",
  },
];

/* ===================================================================
   Feedback page
   =================================================================== */
export default function FeedbackPage() {
  const { t } = useI18n();

  /* --- form state --- */
  const [type, setType] = useState<FeedbackType>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{
    subject?: string;
    message?: string;
    email?: string;
  }>({});
  const [submitted, setSubmitted] = useState(false);

  /* --- FAQ state --- */
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  /* --- derived --- */
  const messageLen = message.length;
  const messageCount = useMemo(
    () => t("feedback.charactersCount").replace("{n}", String(messageLen)),
    [t, messageLen]
  );

  /* --- handlers --- */
  const validate = (): boolean => {
    const next: typeof errors = {};
    const subj = subject.trim();
    const msg = message.trim();
    if (!subj) next.subject = t("feedback.subjectRequired");
    if (!msg) next.message = t("feedback.messageRequired");
    else if (msg.length < 10) next.message = t("feedback.messageTooShort");
    // email is optional, but if provided must look valid
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = t("feedback.emailOptional");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    addFeedback({
      type,
      subject: subject.trim(),
      message: message.trim(),
      email: email.trim() || undefined,
    });
    setSubmitted(true);
  };

  const resetForm = () => {
    setType("bug");
    setSubject("");
    setMessage("");
    setEmail("");
    setErrors({});
    setSubmitted(false);
  };

  /* --- helpers --- */
  const clearFieldError = (field: "subject" | "message" | "email") => {
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <SectionHeader
        bg="midgreen"
        text="white"
        title={t("feedback.title")}
        subtitle={t("feedback.subtitle")}
        icon={MessageSquareHeart}
        iconTint="bg-gold"
      />

      <section className="plantio-grain px-5 py-7 plantio-section-gap">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* ============ Feedback Form / Success Card ============ */}
          {submitted ? (
            <StickerCard className="bg-leaf plantio-pop-in">
              <div className="flex flex-col items-center text-center gap-3 py-3">
                <span
                  aria-hidden
                  className="shrink-0 w-16 h-16 rounded-full bg-white border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0px_0px_#161611]"
                >
                  <CheckCircle2 className="w-9 h-9 text-forest" strokeWidth={2.5} />
                </span>
                <h2 className="font-display text-2xl font-bold uppercase text-ink">
                  {t("feedback.successTitle")}
                </h2>
                <p className="text-sm text-ink/85 leading-relaxed max-w-sm">
                  {t("feedback.successDesc")}
                </p>
                <StickerButton
                  variant="forest"
                  size="md"
                  onClick={resetForm}
                  className="mt-2"
                >
                  <Send className="w-4 h-4" strokeWidth={2.5} />
                  {t("feedback.sendAnother")}
                </StickerButton>
              </div>
            </StickerCard>
          ) : (
            <StickerCard className="bg-white plantio-pop-in">
              <div className="flex items-center gap-2 mb-4">
                <span
                  aria-hidden
                  className="shrink-0 w-10 h-10 rounded-full bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"
                >
                  <MessageSquareHeart className="w-5 h-5 text-leaf" strokeWidth={2.5} />
                </span>
                <h2 className="font-display text-2xl font-bold uppercase">
                  {t("feedback.title")}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Feedback type pill toggles */}
                <div>
                  <div
                    role="radiogroup"
                    aria-label={t("feedback.title")}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                  >
                    {TYPE_OPTIONS.map((opt) => {
                      const active = type === opt.id;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setType(opt.id)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-2xl border-[2.5px] border-ink shadow-[3px_3px_0px_0px_#161611] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all min-h-[64px]",
                            active ? "bg-forest text-white" : "bg-cream text-ink"
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "shrink-0 w-8 h-8 rounded-xl border-[2px] border-ink flex items-center justify-center",
                              active ? "bg-white text-ink" : `${opt.tint} text-ink`
                            )}
                          >
                            <Icon className="w-4 h-4" strokeWidth={2.5} />
                          </span>
                          <span className="font-display text-[10px] sm:text-xs font-bold uppercase tracking-wide leading-tight text-center">
                            {t(opt.labelKey)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label
                    htmlFor="feedback-subject"
                    className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-ink/80 mb-1.5"
                  >
                    <Type className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
                    {t("feedback.subject")}
                  </label>
                  <input
                    id="feedback-subject"
                    type="text"
                    value={subject}
                    maxLength={80}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      clearFieldError("subject");
                    }}
                    placeholder={t("feedback.subjectPlaceholder")}
                    aria-invalid={!!errors.subject}
                    aria-describedby={errors.subject ? "feedback-subject-err" : undefined}
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border-[3px] bg-cream text-ink placeholder:text-ink/50 font-sans text-sm focus:outline-none focus:ring-[3px] focus:ring-forest/30 focus:bg-white transition-colors",
                      errors.subject ? "border-warn" : "border-ink"
                    )}
                  />
                  {errors.subject && (
                    <p
                      id="feedback-subject-err"
                      className="mt-1.5 text-xs font-semibold text-warn flex items-center gap-1"
                    >
                      <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-warn" />
                      {errors.subject}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="feedback-message"
                    className="flex items-center justify-between gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-ink/80 mb-1.5"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
                      {t("feedback.message")}
                    </span>
                    <span className="text-ink/60 normal-case tracking-normal font-sans text-[11px] tabular-nums">
                      {messageCount}
                    </span>
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    minLength={10}
                    maxLength={500}
                    rows={5}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      clearFieldError("message");
                    }}
                    placeholder={t("feedback.messagePlaceholder")}
                    aria-invalid={!!errors.message}
                    aria-describedby={errors.message ? "feedback-message-err" : undefined}
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border-[3px] bg-cream text-ink placeholder:text-ink/50 font-sans text-sm focus:outline-none focus:ring-[3px] focus:ring-forest/30 focus:bg-white transition-colors resize-y min-h-[120px] scroll-plantio",
                      errors.message ? "border-warn" : "border-ink"
                    )}
                  />
                  {errors.message && (
                    <p
                      id="feedback-message-err"
                      className="mt-1.5 text-xs font-semibold text-warn flex items-center gap-1"
                    >
                      <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-warn" />
                      {errors.message}
                    </p>
                  )}
                </div>

                {/* Email (optional) */}
                <div>
                  <label
                    htmlFor="feedback-email"
                    className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-ink/80 mb-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
                    {t("feedback.email")}{" "}
                    <span className="text-ink/50 normal-case tracking-normal font-sans text-[11px]">
                      {t("feedback.emailOptional")}
                    </span>
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    placeholder={t("feedback.emailPlaceholder")}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "feedback-email-err" : undefined}
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border-[3px] bg-cream text-ink placeholder:text-ink/50 font-sans text-sm focus:outline-none focus:ring-[3px] focus:ring-forest/30 focus:bg-white transition-colors",
                      errors.email ? "border-warn" : "border-ink"
                    )}
                  />
                  {errors.email && (
                    <p
                      id="feedback-email-err"
                      className="mt-1.5 text-xs font-semibold text-warn flex items-center gap-1"
                    >
                      <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-warn" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <StickerButton
                  type="submit"
                  variant="gold"
                  size="lg"
                  className="w-full"
                >
                  <Send className="w-5 h-5" strokeWidth={2.5} />
                  {t("feedback.sendFeedback")}
                </StickerButton>
              </form>
            </StickerCard>
          )}

          {/* ============ FAQ Section ============ */}
          <StickerCard className="bg-cream plantio-pop-in p-0 overflow-hidden" style={{ animationDelay: "60ms" }}>
            <div className="p-5 pb-3">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="shrink-0 w-10 h-10 rounded-full bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"
                >
                  <HelpCircle className="w-5 h-5 text-ink" strokeWidth={2.5} />
                </span>
                <h2 className="font-display text-2xl font-bold uppercase">
                  {t("feedback.faqTitle")}
                </h2>
              </div>
            </div>
            <ul className="divide-y-[2.5px] divide-ink/15">
              {FAQ_ITEMS.map((faq, i) => {
                const isOpen = openFaq === i;
                const panelId = `faq-panel-${i}`;
                const headerId = `faq-header-${i}`;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      id={headerId}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-label={t(faq.qKey)}
                      className="w-full text-left px-5 py-4 flex items-start gap-3 cursor-pointer"
                    >
                      <span
                        aria-hidden
                        className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-white border-[2.5px] border-ink flex items-center justify-center font-display text-xs font-bold text-forest"
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-display text-sm sm:text-base font-bold uppercase leading-tight text-ink">
                          {t(faq.qKey)}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "shrink-0 w-5 h-5 text-ink transition-transform duration-200 mt-1",
                          isOpen && "rotate-180"
                        )}
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    </button>
                    {isOpen && (
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={headerId}
                        className="px-5 pb-4 pl-16"
                      >
                        <p className="text-sm text-ink/85 leading-relaxed">
                          {t(faq.aKey)}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </StickerCard>

          {/* ============ Quick Help Links ============ */}
          <div className="plantio-pop-in" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <span
                aria-hidden
                className="shrink-0 w-9 h-9 rounded-xl bg-leaf border-[2.5px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"
              >
                <ArrowRight className="w-4 h-4 text-ink rotate-45" strokeWidth={2.5} />
              </span>
              <h2 className="font-display text-xl font-bold uppercase">
                {t("feedback.quickHelp")}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_HELP.map((q) => {
                const Icon = q.icon;
                return (
                  <Link
                    key={q.href}
                    href={q.href}
                    className="sticker-card sticker-interactive bg-white p-4 flex items-center gap-3 group"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "shrink-0 w-12 h-12 rounded-2xl border-[2.5px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]",
                        q.iconTint
                      )}
                    >
                      <Icon className="w-6 h-6 text-ink" strokeWidth={2.5} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-bold uppercase leading-tight text-ink">
                        {t(q.titleKey)}
                      </h3>
                      <p className="mt-0.5 text-xs text-ink/65 leading-snug line-clamp-2">
                        {t(q.descKey)}
                      </p>
                    </div>
                    <ArrowRight
                      className="shrink-0 w-5 h-5 text-forest group-hover:translate-x-0.5 transition-transform"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ============ Contact Card ============ */}
          <StickerCard className="bg-forest text-white plantio-pop-in" style={{ animationDelay: "180ms" }}>
            <div className="flex items-start gap-4">
              <div
                aria-hidden
                className="shrink-0 w-14 h-14 rounded-full bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]"
              >
                <Mail className="w-7 h-7 text-ink" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-2xl font-bold uppercase text-white">
                  {t("feedback.reachUs")}
                </h2>
                <p className="mt-1.5 text-sm text-white/85 leading-relaxed">
                  {t("feedback.reachUsDesc")}
                </p>
                <a
                  href="mailto:hello@plantio.app"
                  className="mt-3 inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-white px-4 py-2 font-display text-sm font-bold uppercase text-ink shadow-[3px_3px_0px_0px_#161611] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
                >
                  <Mail className="w-4 h-4 text-forest" strokeWidth={2.5} />
                  hello@plantio.app
                </a>
                <div className="mt-3 flex items-center gap-2">
                  <StickerBadge variant="leaf">
                    <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                    {t("feedback.responseTime")}
                  </StickerBadge>
                </div>
              </div>
            </div>
          </StickerCard>

          {/* Footer note */}
          <p className="text-center text-xs text-ink/60 font-display uppercase tracking-wide pt-2">
            {t("common.madeForGrowers")}
          </p>
        </div>
      </section>
    </main>
  );
}
