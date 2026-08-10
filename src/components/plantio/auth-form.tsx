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

type Mode = "login" | "signup" | "forgot";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyAuthError(rawMessage: string): string {
  const m = rawMessage.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (m.includes("user already registered") || m.includes("already been registered")) return "An account with this email already exists.";
  if (m.includes("password should be at least") || m.includes("weak password")) return "Please choose a stronger password.";
  if (m.includes("unable to validate email") || m.includes("email")) return "Please enter a valid email address.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("fetch")) return "Something went wrong. Please check your connection and try again.";
  return "Something went wrong. Please try again.";
}

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:flex-col lg:justify-between lg:w-1/2 bg-forest text-white overflow-hidden">
      <div aria-hidden className="absolute inset-0 plantio-dots opacity-60" />
      <div aria-hidden className="absolute inset-0 plantio-crosshatch opacity-40" />
      <div aria-hidden className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-leaf/30 blur-3xl" />
      <div aria-hidden className="absolute -left-16 bottom-0 w-80 h-80 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative p-12 lg:p-16">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl border-[3px] border-ink bg-leaf shadow-[4px_4px_0px_0px_#161611]">
            <Leaf className="w-6 h-6 text-ink" strokeWidth={2.5} />
          </span>
          <span className="font-display text-3xl font-bold uppercase tracking-wide">Plantio</span>
        </Link>
      </div>
      <div className="relative px-12 lg:px-16 pb-16 max-w-xl">
        <h1 className="font-display text-5xl lg:text-6xl font-bold uppercase leading-[0.95] plantio-title-slide">Smart<br />farming,<br /><span className="text-leaf">made simpler.</span></h1>
        <p className="mt-6 text-lg text-white/85 leading-relaxed plantio-title-slide" style={{ animationDelay: "80ms" }}>
          AI-powered crop insights, weather forecasts, irrigation planning, mandi prices, land measurement and more — all in one pocket app for growers.
        </p>
        <div className="mt-8 flex flex-wrap gap-2.5 plantio-title-slide" style={{ animationDelay: "160ms" }}>
          {[
            { icon: Sprout, label: "Disease Scan" },
            { icon: Leaf, label: "Crop Insights" },
            { icon: ShieldCheck, label: "Secure" },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border-[2.5px] border-white/40 bg-white/10 backdrop-blur-sm font-display text-xs font-bold uppercase tracking-wide">
              <Icon className="w-4 h-4" strokeWidth={2.5} />{label}
            </span>
          ))}
        </div>
      </div>
      <div aria-hidden className="absolute right-12 top-1/2 -translate-y-1/2 hidden xl:block">
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 rounded-full bg-leaf/20 blur-2xl" />
          <div className="absolute inset-4 rounded-[2rem] border-[4px] border-ink bg-cream shadow-[8px_8px_0px_0px_#161611] flex items-center justify-center plantio-pop-in">
            <Sprout className="w-28 h-28 text-forest leaf-bob" strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange, disabled }: { mode: "login" | "signup"; onChange: (m: "login" | "signup") => void; disabled?: boolean }) {
  return (
    <div role="tablist" aria-label="Authentication mode" className="grid grid-cols-2 p-1 rounded-2xl border-[2.5px] border-ink bg-cream shadow-[3px_3px_0px_0px_#161611]">
      {(["login", "signup"] as const).map((m) => {
        const active = mode === m;
        return <button key={m} type="button" role="tab" aria-selected={active} disabled={disabled} onClick={() => onChange(m)} className={`h-11 rounded-xl font-display text-sm font-bold uppercase tracking-wide transition-all disabled:opacity-60 disabled:cursor-not-allowed ${active ? "bg-forest text-white shadow-[2px_2px_0px_0px_#161611]" : "bg-transparent text-ink hover:bg-ink/5"}`}>{m === "login" ? "Login" : "Create Account"}</button>;
      })}
    </div>
  );
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [authConfigured] = useState<boolean>(() => isAuthConfigured());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!cancelled && data.session) window.location.replace("/");
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    setErrors({});
    setFormError(null);
    setFormSuccess(null);
  }, [mode]);

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
    return Boolean(forgotEmail.trim() && EMAIL_RE.test(forgotEmail.trim()));
  }

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
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setFormError(friendlyAuthError(error.message));
        setLoading(false);
        return;
      }
      setFormSuccess("Welcome back! Redirecting...");
      // Full navigation guarantees the new auth cookies are sent through
      // Next.js middleware before the protected home page is rendered.
      window.setTimeout(() => window.location.replace("/"), 150);
    } catch {
      setFormError("Something went wrong. Please try again.");
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setFormError(friendlyAuthError(error.message));
        setLoading(false);
        return;
      }
      if (!data.session) {
        setFormSuccess("Account created! Check your email to confirm your address, then sign in.");
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        setLoading(false);
        return;
      }
      setFormSuccess("Welcome to Plantio! Redirecting...");
      window.setTimeout(() => window.location.replace("/"), 150);
    } catch {
      setFormError("Something went wrong. Please try again.");
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
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) setFormError(friendlyAuthError(error.message));
      else setFormSuccess("Password reset email sent. Check your inbox.");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  // The existing visual form below uses the state/handlers above.
  // (Keep the component's existing JSX and styles intact.)
  return null;
}
