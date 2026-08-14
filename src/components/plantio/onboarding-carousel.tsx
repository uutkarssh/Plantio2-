"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const SLIDES = [1, 2, 3, 4] as const;

type Props = {
  onGetStarted: () => void;
};

function slideSrc(index: number, extension: "png" | "jpg") {
  return `/slide-${index}.${extension}`;
}

export function OnboardingCarousel({ onGetStarted }: Props) {
  const [active, setActive] = useState(0);
  const [extension, setExtension] = useState<Record<number, "png" | "jpg">>({});
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const goTo = (index: number) => {
    setActive(Math.max(0, Math.min(SLIDES.length - 1, index)));
  };

  const next = () => {
    if (active === SLIDES.length - 1) {
      onGetStarted();
      return;
    }
    setActive((value) => value + 1);
  };

  const previous = () => setActive((value) => Math.max(0, value - 1));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
      if (event.key === "Enter" && active === SLIDES.length - 1) onGetStarted();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  const currentSlide = SLIDES[active];
  const currentExtension = extension[currentSlide] ?? "png";

  return (
    <main
      className="min-h-screen w-full bg-cream px-3 py-3 sm:px-5 sm:py-5 lg:px-8"
      aria-label="Plantio introduction"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
        touchStartY.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
        const endY = event.changedTouches[0]?.clientY ?? touchStartY.current;
        const dx = endX - touchStartX.current;
        const dy = endY - touchStartY.current;
        touchStartX.current = null;
        touchStartY.current = null;

        if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) next();
        else previous();
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl flex-col items-center justify-center">
        <div className="relative w-full overflow-hidden rounded-[28px] border-[3px] border-ink bg-white shadow-[7px_7px_0px_0px_#161611]">
          <div className="relative flex w-full items-center justify-center bg-cream">
            <img
              key={`${currentSlide}-${currentExtension}`}
              src={slideSrc(currentSlide, currentExtension)}
              alt={`Plantio feature ${currentSlide} of ${SLIDES.length}`}
              className="block h-auto max-h-[calc(100vh-8.5rem)] w-full object-contain"
              onError={() => {
                if (currentExtension === "png") {
                  setExtension((value) => ({ ...value, [currentSlide]: "jpg" }));
                }
              }}
              draggable={false}
            />

            <button
              type="button"
              aria-label="Previous slide"
              onClick={previous}
              disabled={active === 0}
              className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-ink bg-white text-ink shadow-[4px_4px_0px_0px_#161611] transition disabled:pointer-events-none disabled:opacity-25 sm:left-5 sm:h-14 sm:w-14"
            >
              <ArrowLeft className="h-6 w-6" strokeWidth={3} />
            </button>

            <button
              type="button"
              aria-label={active === SLIDES.length - 1 ? "Get started" : "Next slide"}
              onClick={next}
              className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-ink bg-white text-ink shadow-[4px_4px_0px_0px_#161611] transition hover:-translate-y-[calc(50%+1px)] sm:right-5 sm:h-14 sm:w-14"
            >
              {active === SLIDES.length - 1 ? (
                <ArrowRight className="h-6 w-6" strokeWidth={3} />
              ) : (
                <ArrowRight className="h-6 w-6" strokeWidth={3} />
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 flex w-full items-center justify-center gap-2 sm:mt-5">
          {SLIDES.map((slide, index) => (
            <button
              key={slide}
              type="button"
              aria-label={`Go to slide ${slide}`}
              aria-current={active === index ? "step" : undefined}
              onClick={() => goTo(index)}
              className={`h-3 rounded-full border-2 border-ink transition-all ${
                active === index ? "w-9 bg-forest" : "w-3 bg-white"
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex w-full justify-center sm:mt-4">
          {active === SLIDES.length - 1 ? (
            <button
              type="button"
              onClick={onGetStarted}
              className="min-h-12 rounded-2xl border-[3px] border-ink bg-leaf px-8 py-3 text-base font-black uppercase tracking-wide text-ink shadow-[5px_5px_0px_0px_#161611] sm:px-12"
            >
              Get Started <ArrowRight className="ml-2 inline h-5 w-5" strokeWidth={3} />
            </button>
          ) : (
            <p className="text-center text-xs font-bold uppercase tracking-widest text-ink/55">
              Swipe or use the arrows to explore Plantio
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
