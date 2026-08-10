import type { Metadata } from "next";
import { AuthForm } from "@/components/plantio/auth-form";

export const metadata: Metadata = {
  title: "Sign in — Plantio",
  description: "Sign in or create your Plantio account to access AI-powered crop insights, weather, irrigation planning and more.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-cream">
      <AuthForm />
    </main>
  );
}
