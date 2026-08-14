"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Leaf, Mail, Lock, User, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2, Phone } from "lucide-react";
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/config";
import { OnboardingCarousel } from "@/components/plantio/onboarding-carousel";

type Mode = "login" | "signup";

function friendlyAuthError(code?: string) {
  switch (code) {
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "Email or password is incorrect.";
    case "auth/email-already-in-use": return "An account with this email already exists.";
    case "auth/weak-password": return "Please choose a stronger password.";
    case "auth/too-many-requests": return "Too many attempts. Please wait a few minutes before trying again.";
    case "auth/network-request-failed": return "Please check your internet connection and try again.";
    case "auth/popup-closed-by-user": return "Google sign-in was cancelled or the Google window closed before Firebase received the result.";
    case "auth/popup-blocked": return "Your browser blocked the Google sign-in window. Please allow pop-ups and try again.";
    case "auth/cancelled-popup-request": return "A Google sign-in is already in progress. Please finish it first.";
    case "auth/unauthorized-domain": return "This website domain is not authorized for Google sign-in in Firebase. Add the current site domain in Firebase Authentication → Settings → Authorized domains.";
    case "auth/operation-not-supported-in-this-environment": return "Google sign-in is not supported in this browser environment.";
    case "auth/internal-error": return "Google sign-in could not be completed. Check the browser console for the Firebase error details.";
    case "auth/app-not-authorized": return "This Firebase app is not authorized to use Google sign-in. Check the Firebase Google provider and OAuth configuration.";
    case "auth/operation-not-allowed": return "Google sign-in is not enabled in Firebase Authentication.";
    case "auth/account-exists-with-different-credential": return "This Google email already has a Plantio account using another sign-in method. Sign in with that method first, then link Google.";
    case "auth/invalid-api-key": return "The Firebase API key is invalid. Check the Firebase web app configuration.";
    case "auth/auth-domain-config-required": return "Firebase authDomain is missing or invalid in the web configuration.";
    default: return "Something went wrong. Please try again.";
  }
}

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    setPersistence(firebaseAuth, browserLocalPersistence).catch(() => undefined);
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        window.location.replace("/");
      } else {
        setShowOnboarding(window.localStorage.getItem("plantio_onboarding_seen") !== "1");
        setCheckingSession(false);
      }
    });
    return unsubscribe;
  }, []);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function finishOnboarding() {
    window.localStorage.setItem("plantio_onboarding_seen", "1");
    setShowOnboarding(false);
  }

  function phoneAuthDisabled() {
    clearMessages();
    setError("For security reasons, phone number login and registration have been turned off. Please use Email or Google to continue.");
  }

  async function login() {
    clearMessages();
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email address.");
    if (!password) return setError("Please enter your password.");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      setSuccess("Welcome back! Redirecting...");
    } catch (e: any) {
      setError(friendlyAuthError(e?.code));
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
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      setSuccess("Welcome to Plantio! Redirecting...");
    } catch (e: any) {
      setError(friendlyAuthError(e?.code));
    } finally {
      setLoading(false);
    }
  }

  async function googleSignIn() {
    clearMessages();
    setLoading(true);
    try {
      await setPersistence(firebaseAuth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(firebaseAuth, provider);
      if (!result?.user) throw new Error("Firebase returned no Google user.");
      setSuccess("Google account verified. Redirecting...");
    } catch (e: any) {
      const code = e?.code || "unknown";
      const message = e?.message || "No additional Firebase message was provided.";
      console.error("[Plantio Google Auth]", { code, message, origin: window.location.origin });
      setError(`${friendlyAuthError(code)} [${code}]`);
    } finally {
      setLoading(false);
    }
  }

  async function sendReset() {
    clearMessages();
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) return setError("Please enter a valid email address.");
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, forgotEmail.trim());
      setSuccess("If an account exists for that email, a reset link is on its way.");
      setForgot(false);
    } catch (e: any) {
      setError(friendlyAuthError(e?.code));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center bg-cream"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (showOnboarding) {
    return <OnboardingCarousel onGetStarted={finishOnboarding} />;
  }

  const inputClass = "w-full h-12 rounded-xl border-[2.5px] border-ink bg-white px-4 text-base text-ink outline-none shadow-[3px_3px_0px_0px_#161611] focus:shadow-[4px_4px_0px_0px_#161611] disabled:opacity-60";
  const buttonClass = "w-full h-12 rounded-xl border-[2.5px] border-ink bg-forest text-white font-bold uppercase tracking-wide shadow-[4px_4px_0px_0px_#161611] disabled:opacity-60";
  const secondaryButton = "w-full h-12 rounded-xl border-[2.5px] border-ink bg-white text-ink font-bold shadow-[3px_3px_0px_0px_#161611] disabled:opacity-60";

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-5">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="w-12 h-12 flex items-center justify-center rounded-2xl border-[3px] border-ink bg-leaf shadow-[4px_4px_0px_0px_#161611]"><Leaf className="w-6 h-6" strokeWidth={2.5} /></span>
          <span className="text-3xl font-bold uppercase tracking-wide">Plantio</span>
        </div>
        <div className="rounded-3xl border-[3px] border-ink bg-white p-6 sm:p-8 shadow-[7px_7px_0px_0px_#161611]">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold uppercase">{forgot ? "Reset password" : mode === "login" ? "Welcome back" : "Join Plantio"}</h1>
            <p className="mt-2 text-sm text-ink/65">{forgot ? "Enter your email and we'll send you a reset link." : mode === "login" ? "Sign in to access your Plantio tools and saved data." : "Create your free Plantio account."}</p>
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
              <div className="relative"><Mail className="absolute left-3 top-3.5 w-5 h-5 opacity-50" /><input className={`${inputClass} pl-11`} type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" disabled={loading} /></div>
              <button className={buttonClass} disabled={loading} onClick={sendReset}>{loading ? <Loader2 className="mx-auto animate-spin" /> : "Send reset link"}</button>
              <button className="w-full text-sm font-bold text-forest" onClick={() => { setForgot(false); clearMessages(); }}>Back to login</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border-[2px] border-ink p-1 mb-5 bg-cream">
                <button type="button" disabled={loading} onClick={() => { setMode("login"); clearMessages(); }} className={`h-10 rounded-xl font-bold ${mode === "login" ? "bg-forest text-white" : "text-ink"}`}>Login</button>
                <button type="button" disabled={loading} onClick={() => { setMode("signup"); clearMessages(); }} className={`h-10 rounded-xl font-bold ${mode === "signup" ? "bg-forest text-white" : "text-ink"}`}>Sign up</button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <button type="button" className={secondaryButton} disabled={loading} onClick={googleSignIn}>
                  <span className="inline-flex items-center justify-center gap-2"><span className="font-black text-lg">G</span> Google</span>
                </button>
                <button type="button" className={secondaryButton} disabled={loading} onClick={phoneAuthDisabled}>
                  <span className="inline-flex items-center justify-center gap-2"><Phone className="w-5 h-5" /> Phone</span>
                </button>
              </div>

              <div className="flex items-center gap-3 mb-5 text-xs font-bold uppercase text-ink/45">
                <div className="h-px flex-1 bg-ink/20" /><span>or email</span><div className="h-px flex-1 bg-ink/20" />
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
                <button type="button" className={buttonClass} disabled={loading} onClick={mode === "login" ? login : signup}>{loading ? <><Loader2 className="inline w-5 h-5 mr-2 animate-spin" /> {mode === "login" ? "Signing in..." : "Creating account..."}</> : mode === "login" ? "Continue" : "Create account"}</button>
              </div>
            </>
          )}

          <div className="mt-6 text-center text-xs text-ink/55 leading-5">
            <span>By continuing, you agree to Plantio&apos;s </span>
            <Link href="/terms" className="text-forest font-bold underline underline-offset-2">Terms &amp; Conditions</Link>
            <span> and </span>
            <Link href="/privacy" className="text-forest font-bold underline underline-offset-2">Privacy Policy</Link>
            <span>.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
