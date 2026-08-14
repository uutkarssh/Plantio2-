import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions — Plantio",
  description: "Terms and Conditions for using Plantio.",
  robots: { index: true, follow: true },
};

const sections = [
  ["1. Acceptance of terms", "By creating an account or using Plantio, you agree to these Terms & Conditions. If you do not agree, please do not use the service."],
  ["2. What Plantio provides", "Plantio provides agricultural tools such as plant-image analysis, plant-care suggestions, crop information, weather-related information, calculators, land measurement and other grower utilities. Features may change, be added, or be removed over time."],
  ["3. AI-generated information", "Plantio uses AI to analyze images and generate suggestions. AI results can be incomplete or incorrect and are intended for informational assistance, not as a guaranteed diagnosis or professional agricultural, medical, legal or financial recommendation. Always use your own judgment and consult a qualified local expert for high-impact decisions."],
  ["4. Accounts and security", "You are responsible for keeping your account credentials secure and for activity performed through your account. You must provide information that is reasonably accurate and must not attempt to access another user's account or interfere with the service."],
  ["5. Scan images and user content", "You may submit plant images, questions, feedback and other content to use Plantio's features. You should only submit content that you have the right to use. Do not upload private or sensitive information that is unnecessary for the requested feature."],
  ["6. Acceptable use", "Do not misuse Plantio, attempt to bypass security controls, reverse engineer protected parts of the service, upload malicious content, abuse APIs, or use the service to violate applicable law or another person's rights."],
  ["7. Availability", "Plantio is provided on an as-available basis. AI providers, authentication services, databases, networks and other dependencies can experience outages, rate limits or errors. We do not guarantee uninterrupted availability or that every feature will always work."],
  ["8. Intellectual property", "Plantio's software, branding, visual design and original content are protected by applicable intellectual-property laws. You retain rights to content you submit, subject to the permissions necessary for Plantio to operate the requested features."],
  ["9. Limitation of responsibility", "To the extent permitted by applicable law, Plantio is not responsible for losses resulting from reliance on an AI-generated diagnosis, recommendation, forecast, calculation or other information supplied by the service. Use important agricultural decisions with appropriate professional verification."],
  ["10. Changes", "We may update these terms when the service or its legal requirements change. The latest version published on this page will apply to future use of Plantio."],
  ["11. Contact", "For questions, feedback or concerns about these terms, contact us at utkarshmaurya917027@gmail.com or utkarshmaurya88409@gmail.com."],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/auth" className="inline-flex mb-5 rounded-xl border-[2.5px] border-ink bg-white px-4 py-2 font-bold uppercase shadow-[3px_3px_0px_0px_#161611]">
          ← Back to sign in
        </Link>

        <section className="rounded-3xl border-[3px] border-ink bg-forest p-6 text-white shadow-[7px_7px_0px_0px_#161611] sm:p-9">
          <p className="mb-2 font-bold uppercase tracking-wider text-leaf">Plantio</p>
          <h1 className="text-4xl font-bold uppercase sm:text-5xl">Terms &amp; Conditions</h1>
          <p className="mt-4 text-white/75">Last updated: August 14, 2026</p>
        </section>

        <section className="mt-6 rounded-3xl border-[3px] border-ink bg-white p-6 shadow-[7px_7px_0px_0px_#161611] sm:p-9">
          <p className="text-base leading-7 text-ink/75">These terms explain the basic rules for using Plantio. Please read them before creating or using an account.</p>
          <div className="mt-7 space-y-7">
            {sections.map(([title, text]) => (
              <article key={title}>
                <h2 className="text-xl font-bold uppercase">{title}</h2>
                <p className="mt-2 leading-7 text-ink/70">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="py-8 text-center text-sm font-bold text-ink/55">
          <Link href="/privacy" className="text-forest underline underline-offset-2">Privacy Policy</Link>
          <span className="mx-3">•</span>
          <Link href="/auth" className="text-forest underline underline-offset-2">Sign in / Sign up</Link>
        </footer>
      </div>
    </main>
  );
}
