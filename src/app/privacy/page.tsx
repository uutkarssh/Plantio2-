import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Plantio",
  description: "Privacy Policy for Plantio.",
  robots: { index: true, follow: true },
};

const sections = [
  ["1. Information you provide", "When you create or use a Plantio account, we may receive account information such as your name, email address and authentication information through the sign-in provider you choose. When you use features, you may also provide plant images, questions, feedback, journal entries, land information or other content."],
  ["2. Scan and AI data", "Plant images submitted for scanning are processed to generate plant identification, disease information, symptoms and care suggestions. Plantio may store scan history associated with your account so you can view your recent scans. AI-generated results are returned to the app and may be stored as part of that history."],
  ["3. How we use information", "Information is used to authenticate your account, provide Plantio features, save your preferences and history, respond to requests, improve reliability, prevent abuse and maintain the service. We do not use your information for purposes unrelated to operating and improving Plantio except where required by law or with your permission."],
  ["4. Service providers", "Plantio relies on third-party services for functions such as authentication, hosting, databases and AI processing. These providers may process information on Plantio's behalf to deliver the requested feature and are governed by their own applicable terms and privacy practices."],
  ["5. Cookies and local storage", "Plantio may use browser storage and similar technologies to keep you signed in, remember application state, support offline features and store recent local data. You can clear browser storage through your browser settings, although some features may stop working correctly afterward."],
  ["6. Data security", "We use reasonable technical measures and access controls to protect information handled by the application. No online service can guarantee absolute security, so please avoid submitting sensitive information that is not necessary for a feature."],
  ["7. Data retention and deletion", "Account and feature data may be retained while needed to provide the service. Some locally stored information can be removed from your device through the application's data controls or your browser settings. If you want account-related data reviewed or deleted, contact us using the addresses below."],
  ["8. Children's privacy", "Plantio is not designed to knowingly collect personal information from children without appropriate authorization. If you believe a child has provided personal information improperly, please contact us so the situation can be reviewed."],
  ["9. Links and third-party services", "Plantio may contain links or integrations to external services. Once you leave Plantio, the external service's own privacy policy and terms apply."],
  ["10. Changes to this policy", "We may update this Privacy Policy when our features, data practices or legal obligations change. The latest version will be published on this page with its updated date."],
  ["11. Contact us", "For privacy questions, data requests or concerns, contact us at utkarshmaurya917027@gmail.com or utkarshmaurya88409@gmail.com."],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/auth" className="inline-flex mb-5 rounded-xl border-[2.5px] border-ink bg-white px-4 py-2 font-bold uppercase shadow-[3px_3px_0px_0px_#161611]">
          ← Back to sign in
        </Link>

        <section className="rounded-3xl border-[3px] border-ink bg-leaf p-6 text-ink shadow-[7px_7px_0px_0px_#161611] sm:p-9">
          <p className="mb-2 font-bold uppercase tracking-wider text-forest">Plantio</p>
          <h1 className="text-4xl font-bold uppercase sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-ink/65">Last updated: August 14, 2026</p>
        </section>

        <section className="mt-6 rounded-3xl border-[3px] border-ink bg-white p-6 shadow-[7px_7px_0px_0px_#161611] sm:p-9">
          <p className="text-base leading-7 text-ink/75">This policy describes what information Plantio handles, why it is used, and the choices available to you.</p>
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
          <Link href="/terms" className="text-forest underline underline-offset-2">Terms &amp; Conditions</Link>
          <span className="mx-3">•</span>
          <Link href="/auth" className="text-forest underline underline-offset-2">Sign in / Sign up</Link>
        </footer>
      </div>
    </main>
  );
}
