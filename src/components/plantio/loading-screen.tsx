"use client";
import Image from "next/image";

/* Full-screen loading splash using the uploaded Plantio splash image
 * (background is part of the design — intentionally NOT removed) */
export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-forest overflow-hidden">
      {/* splash image as background */}
      <Image
        src="/icons/loading-screen.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* animated loader dot row at bottom */}
      <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-3.5 h-3.5 rounded-full bg-leaf animate-bounce" style={{ animationDelay: "160ms" }} />
        <span className="w-2.5 h-2.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "320ms" }} />
      </div>
    </div>
  );
}
