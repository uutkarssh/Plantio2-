"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IndianRupee,
  Sprout,
  FlaskConical,
  Bug,
  HardHat,
  Wrench,
  Droplets,
  Truck,
  MoreHorizontal,
  Plus,
  Trash2,
  Target,
  AlertTriangle,
  CalendarDays,
  Wallet,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";
import {
  getExpenseEntries,
  addExpenseEntry,
  deleteExpenseEntry,
  getMonthlyBudget,
  setMonthlyBudget,
  getExpenseStats,
  type ExpenseEntry,
} from "@/lib/plantio/storage";

/* ---- Category config ---- */
const CATEGORIES = [
  "Seeds",
  "Fertilizer",
  "Pesticide",
  "Labor",
  "Equipment",
  "Irrigation",
  "Transport",
  "Other",
] as const;

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Seeds: Sprout,
  Fertilizer: FlaskConical,
  Pesticide: Bug,
  Labor: HardHat,
  Equipment: Wrench,
  Irrigation: Droplets,
  Transport: Truck,
  Other: MoreHorizontal,
};

const CATEGORY_KEYS: Record<string, string> = {
  Seeds: "expenses.seeds",
  Fertilizer: "expenses.fertilizer",
  Pesticide: "expenses.pesticide",
  Labor: "expenses.labor",
  Equipment: "expenses.equipment",
  Irrigation: "expenses.irrigation",
  Transport: "expenses.transport",
  Other: "expenses.other",
};

const CATEGORY_COLORS: Record<string, string> = {
  Seeds: "bg-leaf",
  Fertilizer: "bg-gold",
  Pesticide: "bg-warn",
  Labor: "bg-midgreen",
  Equipment: "bg-forest",
  Irrigation: "bg-leaf",
  Transport: "bg-gold",
  Other: "bg-cream",
};

/* ---- Helpers ---- */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN");
}

function renderCategoryIcon(cat: string, className = "w-5 h-5", strokeWidth = 2.5) {
  const Icon = CATEGORY_ICONS[cat] || MoreHorizontal;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

/* ============================================================ */
export default function ExpensesPage() {
  const { t } = useI18n();

  /* ---- State ---- */
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [budget, setBudget] = useState(0);
  const [stats, setStats] = useState<{ totalThisMonth: number; budget: number; byCategory: Record<string, number> }>({
    totalThisMonth: 0,
    budget: 0,
    byCategory: {},
  });

  // form state
  const [category, setCategory] = useState("Seeds");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState("");

  // budget modal
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  /* ---- Load data from storage ---- */
  const refresh = useCallback(() => {
    setEntries(getExpenseEntries());
    setBudget(getMonthlyBudget());
    setStats(getExpenseStats());
  }, []);

  useEffect(() => {
    queueMicrotask(() => refresh());
    const handler = () => refresh();
    window.addEventListener("plantio-expenses-updated", handler);
    return () => window.removeEventListener("plantio-expenses-updated", handler);
  }, [refresh]);

  /* ---- Computed ---- */
  const overBudget = budget > 0 && stats.totalThisMonth > budget;
  const budgetPercent = budget > 0 ? Math.min((stats.totalThisMonth / budget) * 100, 100) : 0;

  const sortedCategories = useMemo(() => {
    return Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  }, [stats.byCategory]);

  const maxCategoryAmount = useMemo(() => {
    return Math.max(...Object.values(stats.byCategory), 1);
  }, [stats.byCategory]);

  /* ---- Handlers ---- */
  const handleAdd = useCallback(() => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !category || !date) return;
    addExpenseEntry({
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      date,
      category,
      amount: amt,
      description: description.trim(),
    });
    setAmount("");
    setDescription("");
    setDate(todayStr());
    setCategory("Seeds");
    refresh();
  }, [amount, category, date, description, refresh]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteExpenseEntry(id);
      refresh();
    },
    [refresh]
  );

  const handleSetBudget = useCallback(() => {
    const val = parseFloat(budgetInput);
    if (val > 0) {
      setMonthlyBudget(val);
    }
    setBudgetOpen(false);
    setBudgetInput("");
    refresh();
  }, [budgetInput, refresh]);

  return (
    <div className="min-h-screen bg-cream">
      {/* ---- Section Header ---- */}
      <SectionHeader
        bg="gold"
        text="ink"
        icon={IndianRupee}
        iconTint="bg-leaf"
        title={t("expenses.title")}
        subtitle={t("expenses.subtitle")}
      />

      <section className="plantio-grain px-4 pb-28 pt-5 mx-auto max-w-2xl space-y-5 plantio-section-gap">
        {/* ============ Summary Dashboard ============ */}
        <StickerCard className="bg-white">
          {/* Total this month */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-ink/70 font-bold uppercase tracking-wide">{t("expenses.thisMonth")}</p>
              <p className="font-display text-4xl sm:text-5xl font-bold text-ink mt-1">
                <span className="inline-flex items-center gap-1">
                  <IndianRupee className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.5} />
                  {formatINR(stats.totalThisMonth)}
                </span>
              </p>
            </div>
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-gold border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
              <Wallet className="w-7 h-7 text-ink" strokeWidth={2.5} />
            </div>
          </div>

          {/* Budget bar */}
          {budget > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-ink/70">
                  {t("expenses.budget")}: <span className="text-ink">&#8377;{formatINR(budget)}</span>
                </span>
                {overBudget && (
                  <StickerBadge variant="warn">
                    <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                    {t("expenses.overBudget")}
                  </StickerBadge>
                )}
              </div>
              <div className="w-full h-5 rounded-full border-[3px] border-ink bg-cream overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${overBudget ? "bg-warn" : "bg-midgreen"}`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Set Budget button */}
          <div className="mt-4">
            <StickerButton
              variant={budget > 0 ? "outline" : "forest"}
              size="sm"
              onClick={() => {
                setBudgetInput(budget > 0 ? String(budget) : "");
                setBudgetOpen(true);
              }}
            >
              <Target className="w-4 h-4" strokeWidth={2.5} />
              {t("expenses.setBudget")}
            </StickerButton>
          </div>

          {/* Category breakdown */}
          {sortedCategories.length > 0 && (
            <div className="mt-5">
              <p className="font-display text-sm font-bold uppercase tracking-wide text-ink/70 mb-3">
                {t("expenses.byCategory")}
              </p>
              <div className="space-y-2.5">
                {sortedCategories.map(([cat, total]) => {
                  const pct = (total / maxCategoryAmount) * 100;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-xl bg-cream border-[2px] border-ink flex items-center justify-center">
                        {renderCategoryIcon(cat, "w-4 h-4")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display text-xs font-bold uppercase tracking-wide text-ink truncate">
                            {t(CATEGORY_KEYS[cat] || cat)}
                          </span>
                          <span className="font-display text-xs font-bold text-ink ml-2 shrink-0">
                            &#8377;{formatINR(total)}
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full border-[2px] border-ink bg-cream overflow-hidden">
                          <div
                            className={`h-full rounded-full ${CATEGORY_COLORS[cat] || "bg-leaf"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </StickerCard>

        {/* ============ Add Expense Form ============ */}
        <StickerCard className="bg-white">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink flex items-center gap-2">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            {t("expenses.addExpense")}
          </h2>

          {/* Category pills */}
          <div className="mt-3">
            <p className="text-xs text-ink/60 font-bold uppercase tracking-wide mb-2">{t("expenses.category")}</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`inline-flex items-center gap-1.5 border-[2.5px] border-ink rounded-full px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wide transition-all ${
                      active
                        ? "bg-leaf text-ink shadow-[3px_3px_0px_0px_#161611]"
                        : "bg-cream text-ink/70 shadow-[2px_2px_0px_0px_#161611] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611]"
                    }`}
                  >
                    {renderCategoryIcon(cat, "w-3.5 h-3.5", 2.5)}
                    {t(CATEGORY_KEYS[cat])}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div className="mt-3">
            <label className="text-xs text-ink/60 font-bold uppercase tracking-wide flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" strokeWidth={2.5} />
              {t("expenses.amount")}
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("expenses.amountPlaceholder")}
              className="mt-1 w-full rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-display text-lg font-bold text-ink shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-leaf placeholder:text-ink/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Date */}
          <div className="mt-3">
            <label className="text-xs text-ink/60 font-bold uppercase tracking-wide flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" strokeWidth={2.5} />
              {t("expenses.date")}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-display text-base font-bold text-ink shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-leaf"
            />
          </div>

          {/* Description */}
          <div className="mt-3">
            <label className="text-xs text-ink/60 font-bold uppercase tracking-wide">{t("expenses.description")}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("expenses.descriptionPlaceholder")}
              maxLength={100}
              className="mt-1 w-full rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 text-base text-ink shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-leaf placeholder:text-ink/40"
            />
          </div>

          {/* Submit */}
          <div className="mt-4">
            <StickerButton
              variant="forest"
              size="lg"
              className="w-full"
              onClick={handleAdd}
              disabled={!parseFloat(amount) || parseFloat(amount) <= 0 || !date}
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              {t("expenses.saveExpense")}
            </StickerButton>
          </div>
        </StickerCard>

        {/* ============ Expense List ============ */}
        {entries.length === 0 ? (
          /* Empty state */
          <StickerCard className="bg-cream text-center">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-2xl bg-gold border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0px_0px_#161611]">
                <IndianRupee className="w-8 h-8 text-ink" strokeWidth={2.5} />
              </div>
              <p className="font-display text-xl font-bold uppercase text-ink">{t("expenses.noExpenses")}</p>
              <p className="text-sm text-ink/70 max-w-xs">{t("expenses.noExpensesDesc")}</p>
            </div>
          </StickerCard>
        ) : (
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-ink flex items-center gap-2">
              <Wallet className="w-5 h-5" strokeWidth={2.5} />
              {t("expenses.thisMonth")}
              <StickerBadge variant="leaf">{entries.length}</StickerBadge>
            </h2>
            <div className="max-h-96 overflow-y-auto scroll-plantio space-y-3 pr-1">
              {entries.map((entry) => (
                <StickerCard key={entry.id} className="bg-white">
                  <div className="flex items-start gap-3">
                    {/* Category icon */}
                    <div className={`shrink-0 w-10 h-10 rounded-xl border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0px_0px_#161611] ${CATEGORY_COLORS[entry.category] || "bg-cream"}`}>
                      {renderCategoryIcon(entry.category, "w-5 h-5")}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-bold uppercase tracking-wide text-ink truncate">
                          {t(CATEGORY_KEYS[entry.category] || entry.category)}
                        </span>
                        <span className="font-display text-base font-bold text-ink shrink-0">
                          &#8377;{formatINR(entry.amount)}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-ink/70 mt-0.5 truncate">{entry.description}</p>
                      )}
                      <p className="text-xs text-ink/50 mt-1 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" strokeWidth={2.5} />
                        {entry.date}
                      </p>
                    </div>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      aria-label={t("expenses.deleteExpense")}
                      className="shrink-0 w-9 h-9 rounded-xl border-[2.5px] border-ink bg-warn/10 flex items-center justify-center hover:bg-warn/20 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-warn" strokeWidth={2.5} />
                    </button>
                  </div>
                </StickerCard>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ============ Budget Modal ============ */}
      {budgetOpen && (
        <div className="fixed inset-0 z-[80]">
          <button
            aria-label="Close budget dialog"
            onClick={() => {
              setBudgetOpen(false);
              setBudgetInput("");
            }}
            className="absolute inset-0 bg-ink/50"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-cream border-t-[3px] border-ink p-5 max-w-lg mx-auto rounded-t-3xl shadow-[0_-5px_0px_0px_#161611]">
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-ink flex items-center gap-2">
              <Target className="w-6 h-6" strokeWidth={2.5} />
              {t("expenses.setBudget")}
            </h3>
            <div className="mt-3">
              <label className="text-xs text-ink/60 font-bold uppercase tracking-wide flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5" strokeWidth={2.5} />
                {t("expenses.enterBudget")}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder={t("expenses.amountPlaceholder")}
                autoFocus
                className="mt-1 w-full rounded-2xl border-[3px] border-ink bg-white px-4 py-3 font-display text-lg font-bold text-ink shadow-[3px_3px_0px_0px_#161611] focus:outline-none focus:ring-2 focus:ring-leaf placeholder:text-ink/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <StickerButton
                variant="forest"
                size="md"
                className="flex-1"
                onClick={handleSetBudget}
                disabled={!parseFloat(budgetInput) || parseFloat(budgetInput) <= 0}
              >
                {t("expenses.save")}
              </StickerButton>
              <StickerButton
                variant="outline"
                size="md"
                className="flex-1"
                onClick={() => {
                  setBudgetOpen(false);
                  setBudgetInput("");
                }}
              >
                {t("expenses.cancel")}
              </StickerButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
