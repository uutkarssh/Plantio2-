"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, Mail, Lock, User, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabaseBrowser, isAuthConfigured } from "@/lib/auth/supabase-browser";

type Mode = "login" | "signup";

function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (m.includes("user already registered") || m.includes("already been registered")) return "An account with this email already exists.";
  if (m.includes("password") && (m.includes("weak") || m.includes("at least"))) return "Please choose a stronger password.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("fetch")) return "Please check your internet connection and try again.";
  return "Something went wrong. Please try again.";
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [configured] = useState(() => isAuthConfigured());

  useEffect(() => {
    let cancelled = false;
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) window.location.replace("/");
    });
    return () => { cancelled = true; };
  }, []);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function login() {
    clearMessages();
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email address.");
    if (!password) return setError("Please enter your password.");
    if (!configured) return setError("Authentication is not configured. Please check the Supabase environment variables.");

    setLoading(true);
    try {
      const { data, error: authError } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(friendlyAuthError(authError.message));
        return;
      }
      if (!data.session) {
        setError("Login completed but no session was returned. Please try again.");
        return;
      }
      setSuccess("Welcome back! Redirecting...");
      // Give the storage adapter a moment to write both auth cookies, then do
      // a full navigation so Next.js middleware receives the new cookies.
      window.setTimeout(() => window.location.replace("/"), 200);
    } catch (e) {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signup() {
    clearMessages();
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (!configured) return setError("Authentication is not configured. Please check the Supabase environment variables.");

    setLoading(true);
    try {
      const { data, error: authError } = await supabaseBrowser.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) {
        setError(friendlyAuthError(authError.message));
        return;
      }
      if (!data.session) {
        setSuccess("Account created! Check your email to confirm your address, then sign in.");
        setPassword("");
        setConfirm("");
        setMode("login");
        return;
      }
      setSuccess("Welcome to Plantio! Redirecting...");
      window.setTimeout(() => window.location.replace("/"), 200);
    } catch {
      setError("Unable to create the account right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendReset() {
    clearMessages();
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) return setError("Please enter a valid email address.");
    if (!configured) return setError("Authentication is not configured.");
    setLoading(true);
    try {
      await supabaseBrowser.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth`,
      });
      setSuccess("If an account exists for that email, a reset link is on its way.");
      setForgot(false);
    } catch {
      setError("Unable to send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full h-12 rounded-xl border-[2.5px] border-ink bg-white px-4 text-base text-ink outline-none shadow-[3px_3px_0px_0px_#161611] focus:shadow-[4px_4px_0px_0px_#161611] disabled:opacity-60";
  const buttonClass = "w-full h-12 rounded-xl border-[2.5px] border-ink bg-forest text-white font-bold uppercase tracking-wide shadow-[4px_4px_0px_0px_#161611] disabled:opacity-60";

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-5">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="w-12 h-12 flex items-center justify-center rounded-2xl border-[3px] border-ink bg-leaf shadow-[4px_4px_0px_0px_#161611]">
            <Leaf className="w-6 h-6" strokeWidth={2.5} />
          </span>
          <span className="text-3xl font-bold uppercase tracking-wide">Plantio</span>
        </div>

        <div className="rounded-3xl border-[3px] border-ink bg-white p-6 sm:p-8 shadow-[7px_7px_0px_0px_#161611]">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold uppercase">{forgot ? "Reset password" : mode === "login" ? "Welcome back" : "Join Plantio"}</h1>
            <p className="mt-2 text-sm text-ink/65">
              {forgot ? "Enter your email and we'll send you a reset link." : mode === "login" ? "Sign in to access your Plantio tools and saved data." : "Create your free Plantio account."}
            </p>
          </div>

          {(error || success) && (
            <div className={`mb-5 flex items-start gap-2 rounded-xl border-[2px] border-ink p-3 text-sm ${error ? "bg-warn/10" : "bg-leaf/25"}`}>
              {error ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
              <span>{error || success}</span>
            </div>
          )}

          {forgot ? (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 opacity-50" />
                <input className={`${inputClass} pl-11`} type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" disabled={loading} />
              </div>
              <button className={buttonClass} disabled={loading} onClick={sendReset}>{loading ? <Loader2 className="mx-auto animate-spin" /> : "Send reset link"}</button>
              <button className="w-full text-sm font-bold text-forest" onClick={() => { setForgot(false); clearMessages(); }}>Back to login</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border-[2px] border-ink p-1 mb-6 bg-cream">
                <button type="button" disabled={loading} onClick={() => { setMode("login"); clearMessages(); }} className={`h-10 rounded-xl font-bold ${mode === "login" ? "bg-forest text-white" : "text-ink"}`}>Login</button>
                <button type="button" disabled={loading} onClick={() => { setMode("signup"); clearMessages(); }} className={`h-10 rounded-xl font-bold ${mode === "signup" ? "bg-forest text-white" : "text-ink"}`}>Sign up</button>
              </div>

              <div className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase">Name</label>
                    <div className="relative"><User className="absolute left-3 top-3.5 w-5 h-5 opacity-50" /><input className={`${inputClass} pl-11`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" disabled={loading} /></div>
                  </div>
                )}

                <div>
                  <label className="block mb-1.5 text-xs font-bold uppercase">Email</label>
                  <div className="relative"><Mail className="absolute left-3 top-3.5 w-5 h-5 opacity-50" /><input className={`${inputClass} pl-11`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" disabled={loading} /></div>
                </div>

                <div>
                  <label className="block mb-1.5 text-xs font-bold uppercase">Password</label>
                  <div className="relative"><Lock className="absolute left-3 top-3.5 w-5 h-5 opacity-50" /><input className={`${inputClass} pl-11 pr-12`} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} disabled={loading} /><button type="button" className="absolute right-2 top-2 w-8 h-8" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff className="mx-auto" /> : <Eye className="mx-auto" />}</button></div>
                </div>

                {mode === "signup" && (
                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase">Confirm password</label>
                    <div className="relative"><Lock className="absolute left-3 top-3.5 w-5 h-5 opacity-50" /><input className={`${inputClass} pl-11 pr-12`} type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" disabled={loading} /><button type="button" className="absolute right-2 top-2 w-8 h-8" onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? <EyeOff className="mx-auto" /> : <Eye className="mx-auto" />}</button></div>
                  </div>
                )}

                {mode === "login" && <button type="button" className="block ml-auto text-xs font-bold uppercase text-forest" onClick={() => { setForgot(true); clearMessages(); }}>Forgot password?</button>}

                <button type="button" className={buttonClass} disabled={loading} onClick={mode === "login" ? login : signup}>
                  {loading ? <><Loader2 className="inline w-5 h-5 mr-2 animate-spin" /> {mode === "login" ? "Signing in..." : "Creating account..."}</> : mode === "login" ? "Continue" : "Create account"}
                </button>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-xs text-ink/50">By continuing, you agree to Plantio&apos;s <Link href="/about" className="text-forest font-bold">terms & privacy policy</Link>.</p>
        </div>
      </div>
    </div>
  );
}
