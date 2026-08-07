"use client";

/* Measure Land page — wraps the dynamically-imported Leaflet map component.
 *
 * Leaflet depends on `window`, so we MUST use next/dynamic with ssr:false here.
 * The page itself is a client component that simply renders <MeasureMap />.
 */

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { StickerCard } from "@/components/plantio/sticker";

const MeasureMap = dynamic(
  () =>
    import("@/components/plantio/measure-map").then((m) => m.MeasureMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full flex items-center justify-center px-5"
        style={{
          height: "calc(100dvh - 76px - env(safe-area-inset-bottom))",
        }}
      >
        <StickerCard className="bg-cream p-6 flex items-center gap-3">
          <MapPin
            className="w-6 h-6 text-forest leaf-spin"
            strokeWidth={2.5}
          />
          <span className="font-display text-lg uppercase tracking-wide">
            Loading map…
          </span>
        </StickerCard>
      </div>
    ),
  }
);

export default function MeasurePage() {
  return (
    <main className="relative w-full" aria-label="Measure Land">
      <MeasureMap />
    </main>
  );
}
