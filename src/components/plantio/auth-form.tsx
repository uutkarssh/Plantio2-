"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Leaf,
  Sprout,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { supabaseBrowser, isAuthConfigured } from "@/lib/auth/supabase-browser";

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

type Mode = "login" | "signup" | "forgot";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Map raw Supabase error messages to friendly, non-revealing user copy. */
function friendlyAuthError(rawMessage: string): string {
  const m = rawMessage.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "An account with this email already exists.";
  }
  if (m.includes("password should be at least") || m.includes("weak password")) {
    return "Please choose a stronger password.";
  }
  if (m.includes("unable to validate email") || m.includes("email")) {
    return "Please enter a valid email address.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Something went wrong. Please check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

/* ------------------------------------------------------------------ */
/*  Decorative brand panel (desktop only)                              */
/* ------------------------------------------------------------------ */

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:flex-col lg:justify-between lg:w-1/2 bg-forest text-white overflow-hidden">
      {/* Texture overlays (reuse Plantio's existing pattern classes) */}
      <div aria-hidden className="absolute inset-0 plantio-dots opacity-60" />
      <div aria-hidden className="absolute inset-0 plantio-crosshatch opacity-40" />
      <div
        aria-hidden
        className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-leaf/30 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -left-16 bottom-0 w-80 h-80 rounded-full bg-gold/20 blur-3xl"
      />

      {/* Logo + tagline */}
      <div className="relative p-12 lg:p-16">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl border-[3px] border-ink bg-leaf shadow-[4px_4px_0px_0px_#161611]">
            <Leaf className="w-6 h-6 text-ink" strokeWidth={2.5} />
          </span>
          <span className="font-display text-3xl font-bold uppercase tracking-wide">
            Plantio
          </span>
        </Link>
      </div>

      {/* Hero copy */}
      <div className="relative px-12 lg:px-16 pb-16 max-w-xl">
        <h1 className="font-display text-5xl lg:text-6xl font-bold uppercase leading-[0.95] plantio-title-slide">
          Smart
          <br />
          farming,
          <br />
          <span className="text-leaf">made simpler.</span>
        </h1>
        <p className="mt-6 text-lg text-white/85 leading-relaxed plantio-title-slide" style={{ animationDelay: "80ms" }}>
          AI-powered crop insights, weather forecasts, irrigation planning,
          mandi prices, land measurement and more — all in one pocket app for
          growers.
        </p>

        {/* Feature pills */}
        <div className="mt-8 flex flex-wrap gap-2.5 plantio-title-slide" style={{ animationDelay: "160ms" }}>
          {[
            { icon: Sprout, label: "Disease Scan" },
            { icon: Leaf, label: "Crop Insights" },
            { icon: ShieldCheck, label: "Secure" },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border-[2.5px] border-white/40 bg-white/10 backdrop-blur-sm font-display text-xs font-bold uppercase tracking-wide"
            >
              <Icon className="w-4 h-4" strokeWidth={2.5} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Floating sticker illustration */}
      <div
        aria-hidden
        className="absolute right-12 top-1/2 -translate-y-1/2 hidden xl:block"
      >
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 rounded-full bg-leaf/20 blur-2xl" />
          <div className="absolute inset-4 rounded-[2rem] border-[4px] border-ink bg-cream shadow-[8px_8px_0px_0px_#161611] flex items-center justify-center plantio-pop-in">
            <Sprout className="w-28 h-28 text-forest leaf-bob" strokeWidth={2} />
          </div>
          {/* Floating sticker badges */}
          <span className="absolute -top-3 -left-3 inline-flex items-center justify-center w-14 h-14 rounded-2xl border-[3px] border-ink bg-gold shadow-[3px_3px_0px_0px_#161611] plantio-pop-in" style={{ animationDelay: "120ms" }}>
            <Leaf className="w-7 h-7 text-ink" strokeWidth={2.5} />
          </span>
          <span className="absolute -bottom-3 -right-3 inline-flex items-center justify-center w-14 h-14 rounded-2xl border-[3px] border-ink bg-warn shadow-[3px_3px_0px_0px_#161611] plantio-pop-in" style={{ animationDelay: "220ms" }}>
            <Sprout className="w-7 h-7 text-white" strokeWidth={2.5} />
          </span>
        </div>
      </div>

      {/* Bottom signature */}
      <div className="relative px-12 lg:px-16 pb-10">
        <p className="font-display text-[11px] font-bold uppercase tracking-widest text-white/50">
          Made for growers, by growers.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable input                                                     */
/* ------------------------------------------------------------------ */

interface AuthInputProps {
  id: string;
  label: string;
  type: "text" | "email" | "password";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  trailing?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
}

function AuthInput({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  icon: Icon,
  trailing,
  required,
  disabled,
}: AuthInputProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block font-display text-xs font-bold uppercase tracking-wide text-ink/80"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50 pointer-events-none">
            <Icon className="w-5 h-5" strokeWidth={2.5} />
          </span>
        )}
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full h-12 ${
            Icon ? "pl-11" : "pl-4"
          } pr-11 rounded-xl border-[2.5px] border-ink bg-white text-base text-ink placeholder:text-ink/40 shadow-[3px_3px_0px_0px_#161611] outline-none transition-all focus:shadow-[4px_4px_0px_0px_#161611] focus:translate-x-[-1px] focus:translate-y-[-1px] disabled:opacity-60 disabled:cursor-not-allowed`}
        />
        {trailing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-sm text-warn font-medium"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle between Login / Create Account                              */
/* ------------------------------------------------------------------ */

function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: "login" | "signup";
  onChange: (m: "login" | "signup") => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Authentication mode"
      className="grid grid-cols-2 p-1 rounded-2xl border-[2.5px] border-ink bg-cream shadow-[3px_3px_0px_0px_#161611]"
    >
      {(["login", "signup"] as const).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(m)}
            className={`h-11 rounded-xl font-display text-sm font-bold uppercase tracking-wide transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              active
                ? "bg-forest text-white shadow-[2px_2px_0px_0px_#161611]"
                : "bg-transparent text-ink hover:bg-ink/5"
            }`}
          >
            {m === "login" ? "Login" : "Create Account"}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main AuthForm                                                      */
/* ------------------------------------------------------------------ */

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [forgotOpen, setForgotOpen] = useState(false);

  // Field state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [authConfigured] = useState<boolean>(() => isAuthConfigured());

  // Pre-check session client-side as a third line of defence (after middleware
  // and server component). If a session is somehow still active, redirect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!cancelled && data.session) {
        router.replace("/");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Reset field-level errors when switching modes
  useEffect(() => {
    setErrors({});
    setFormError(null);
    setFormSuccess(null);
  }, [mode]);

  /* ---- Validation -------------------------------------------------- */

  function validateLogin(): boolean {
    const e: FieldErrors = {};
    if (!email.trim()) e.email = "Please enter your email.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Please enter a valid email address.";
    if (!password) e.password = "Please enter your password.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateSignup(): boolean {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = "Please enter your name.";
    else if (name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    if (!email.trim()) e.email = "Please enter your email.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Please enter a valid email address.";
    if (!password) e.password = "Please choose a password.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateForgot(): boolean {
    if (!forgotEmail.trim()) return false;
    return EMAIL_RE.test(forgotEmail.trim());
  }

  /* ---- Submit handlers --------------------------------------------- */

  async function handleLogin(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!validateLogin()) return;
    if (!authConfigured) {
      setFormError("Authentication is not configured. Please contact support.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setFormError(friendlyAuthError(error.message));
        return;
      }
      // Success — the cookie is set by the supabase client. Redirect home.
      setFormSuccess("Welcome back! Redirecting...");
      // Use a tiny delay so the success state is visible before navigation.
      setTimeout(() => router.replace("/"), 250);
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!validateSignup()) return;
    if (!authConfigured) {
      setFormError("Authentication is not configured. Please contact support.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
          // Redirect back to the app after email confirmation (if enabled).
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setFormError(friendlyAuthError(error.message));
        return;
      }

      // If email confirmation is required, no session will be returned.
      if (!data.session) {
        setFormSuccess(
          "Account created! Check your email to confirm your address, then sign in."
        );
        // Clear sensitive fields
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        return;
      }

      // Session created immediately — redirect home.
      setFormSuccess("Welcome to Plantio! Redirecting...");
      setTimeout(() => router.replace("/"), 250);
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateForgot()) return;
    if (!authConfigured) {
      setFormError("Authentication is not configured. Please contact support.");
      return;
    }

    setForgotLoading(true);
    setFormError(null);
    try {
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(
        forgotEmail.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth`,
        }
      );
      if (error) {
        // Do NOT reveal whether the email exists — show generic success.
        // (Supabase may leak this through timing, but the user-facing message
        // is intentionally identical for unknown vs. known emails.)
        setForgotOpen(false);
        setFormSuccess(
          "If an account exists for that email, a reset link is on its way."
        );
        setForgotEmail("");
        return;
      }
      setForgotOpen(false);
      setFormSuccess(
        "If an account exists for that email, a reset link is on its way."
      );
      setForgotEmail("");
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  /* ---- Render ------------------------------------------------------ */

  // Forgot password overlay
  if (forgotOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-cream">
        <div className="w-full max-w-md plantio-pop-in">
          <button
            type="button"
            onClick={() => {
              setForgotOpen(false);
              setFormError(null);
            }}
            className="inline-flex items-center gap-2 mb-5 font-display text-sm font-bold uppercase tracking-wide text-forest hover:underline"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            Back to sign in
          </button>

          <div className="sticker-card p-7 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl font-bold uppercase text-ink">
                Forgot password?
              </h2>
              <p className="text-sm text-ink/70 leading-relaxed">
                Enter your email and we&apos;ll send you a secure link to reset
                your password.
              </p>
            </div>

            <form onSubmit={handleForgot} className="space-y-5" noValidate>
              <AuthInput
                id="forgot-email"
                label="Email"
                type="email"
                value={forgotEmail}
                onChange={setForgotEmail}
                placeholder="you@example.com"
                autoComplete="email"
                icon={Mail}
                required
                disabled={forgotLoading}
              />

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-xl border-[2.5px] border-ink bg-warn/10 text-ink"
                >
                  <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" strokeWidth={2.5} />
                  <p className="text-sm font-medium">{formError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading || !forgotEmail.trim()}
                className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl border-[2.5px] border-ink bg-forest text-white font-display text-base font-bold uppercase tracking-wide shadow-[4px_4px_0px_0px_#161611] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_#161611] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#161611] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[3px_3px_0px_0px_#161611]"
              >
                {forgotLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
                    Sending link...
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main login / signup view
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-cream">
      {/* Left: brand panel (desktop only) */}
      <BrandPanel />

      {/* Right: auth card */}
      <div className="flex-1 lg:w-1/2 flex flex-col">
        {/* Mobile logo bar */}
        <div className="lg:hidden p-5 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl border-[2.5px] border-ink bg-leaf shadow-[3px_3px_0px_0px_#161611]">
              <Leaf className="w-5 h-5 text-ink" strokeWidth={2.5} />
            </span>
            <span className="font-display text-xl font-bold uppercase tracking-wide text-ink">
              Plantio
            </span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md plantio-pop-in">
            {/* Header */}
            <div className="mb-6 space-y-1.5 text-center lg:text-left">
              <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase text-ink leading-tight">
                {mode === "login" ? "Welcome back" : "Join Plantio"}
              </h2>
              <p className="text-sm sm:text-base text-ink/70 leading-relaxed">
                {mode === "login"
                  ? "Sign in to access your Plantio tools and saved data."
                  : "Create your free account in seconds — no credit card needed."}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="mb-6">
              <ModeToggle mode={mode} onChange={setMode} disabled={loading} />
            </div>

            {/* Form-level error */}
            {formError && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl border-[2.5px] border-ink bg-warn/10 text-ink plantio-slide-up"
              >
                <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-sm font-medium">{formError}</p>
              </div>
            )}

            {/* Form-level success */}
            {formSuccess && (
              <div
                role="status"
                className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl border-[2.5px] border-ink bg-leaf/30 text-ink plantio-slide-up"
              >
                <CheckCircle2 className="w-5 h-5 text-forest shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-sm font-medium">{formSuccess}</p>
              </div>
            )}

            {/* Not-configured warning */}
            {!authConfigured && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl border-[2.5px] border-ink bg-gold/30 text-ink"
              >
                <AlertTriangle className="w-5 h-5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-sm font-medium">
                  Authentication isn&apos;t configured on this server. Set
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-ink/10 font-mono text-xs">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>
                  and
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-ink/10 font-mono text-xs">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </code>
                  to enable sign-in.
                </p>
              </div>
            )}

            {/* The form */}
            <form
              onSubmit={mode === "login" ? handleLogin : handleSignup}
              className="space-y-4"
              noValidate
            >
              {mode === "signup" && (
                <AuthInput
                  id="name"
                  label="Name"
                  type="text"
                  value={name}
                  onChange={setName}
                  placeholder="Your full name"
                  autoComplete="name"
                  icon={UserIcon}
                  error={errors.name}
                  required
                  disabled={loading}
                />
              )}

              <AuthInput
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                autoComplete="email"
                icon={Mail}
                error={errors.email}
                required
                disabled={loading}
              />

              <AuthInput
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                icon={Lock}
                error={errors.password}
                required
                disabled={loading}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" strokeWidth={2.5} />
                    ) : (
                      <Eye className="w-5 h-5" strokeWidth={2.5} />
                    )}
                  </button>
                }
              />

              {mode === "signup" && (
                <AuthInput
                  id="confirmPassword"
                  label="Confirm password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  icon={Lock}
                  error={errors.confirmPassword}
                  required
                  disabled={loading}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <EyeOff className="w-5 h-5" strokeWidth={2.5} />
                      ) : (
                        <Eye className="w-5 h-5" strokeWidth={2.5} />
                      )}
                    </button>
                  }
                />
              )}

              {/* Forgot password (login mode only) */}
              {mode === "login" && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotOpen(true);
                      setForgotEmail(email);
                      setFormError(null);
                      setFormSuccess(null);
                    }}
                    className="font-display text-xs font-bold uppercase tracking-wide text-forest hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-2 inline-flex items-center justify-center gap-2 rounded-xl border-[2.5px] border-ink bg-forest text-white font-display text-base font-bold uppercase tracking-wide shadow-[4px_4px_0px_0px_#161611] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_#161611] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#161611] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[3px_3px_0px_0px_#161611]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
                    {mode === "login" ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  <>{mode === "login" ? "Continue" : "Create account"}</>
                )}
              </button>
            </form>

            {/* Switch link (mobile-friendly, below the form) */}
            <p className="mt-6 text-center text-sm text-ink/70">
              {mode === "login" ? (
                <>
                  New to Plantio?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    disabled={loading}
                    className="font-display font-bold uppercase tracking-wide text-forest hover:underline disabled:opacity-50"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    disabled={loading}
                    className="font-display font-bold uppercase tracking-wide text-forest hover:underline disabled:opacity-50"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-ink/55 leading-relaxed max-w-xs mx-auto">
              By continuing, you agree to Plantio&apos;s{" "}
              <Link href="/about" className="font-semibold text-forest hover:underline">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/about" className="font-semibold text-forest hover:underline">
                privacy policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
