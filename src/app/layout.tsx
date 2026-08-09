import type { Metadata, Viewport } from "next";
import { Bakbak_One, Poppins, Hind } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/plantio/app-shell";

/* Fonts — fix #1
 * Bakbak One = display/headings/buttons (latin only — this font has no devanagari)
 * Poppins     = body text (latin only)
 * Hind        = devanagari + latin fallback so Hindi text renders correctly instead
 *               of a broken system fallback. Included in every font stack AFTER the
 *               primary font, so Latin glyphs use Bakbak/Poppins and Hindi glyphs
 *               automatically fall through to Hind.
 */
const bakbak = Bakbak_One({
  variable: "--font-bakbak",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const hind = Hind({
  variable: "--font-hind",
  weight: ["400", "500", "600", "700"],
  subsets: ["devanagari", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plantio — Know your plants. Heal them fast.",
  description:
    "Plantio puts AI-powered plant disease scanning, cure & fertilizer plans, land measurement, cattle feed advice, mandi prices and crop calendars in every grower's pocket.",
  manifest: "/manifest.json",
  applicationName: "Plantio",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Plantio",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

/* fix #4 — force light mode everywhere */
export const viewport: Viewport = {
  themeColor: "#1F4D36",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* fix #4: force light mode at the document level */}
        <meta name="color-scheme" content="light" />
      </head>
      <body
        className={`${bakbak.variable} ${poppins.variable} ${hind.variable} antialiased`}
        style={{ backgroundColor: "#F6F3EA", color: "#161611" }}
      >
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
