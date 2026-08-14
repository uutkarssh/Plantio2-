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

  // Preload the onboarding artwork so the first transition does not expose
  // an empty/collapsed image box while the next image is being decoded.
  useEffect(() => {
    SLIDES.forEach((slide) => {
      const png = new Image();
      png.src = slideSrc(slide, "png");
      png.onload = () => {
        setExtension((value) => ({ ...value, [slide]: "png" }));
      };
      png.onerror = () => {
        const jpg = new Image();
        jpg.src = slideSrc(slide, "jpg");
        jpg.onload = () => {
          setExtension((value) => ({ ...value, [slide]: "jpg" }));
        };
      };
    });
  }, []);

  const currentSlide = SLIDES[active];
  const currentExtension = extension[currentSlide] ?? "png";

  return (
    <main
      className="min-h-screen w-full overflow-x-hidden bg-cream px-3 py-2 sm:px-5 sm:py-4 lg:px-8"
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
      <div className="mx-auto flex min-h-[calc(100svh-1rem)] max-w-7xl flex-col items-center justify-center">
        {/* Keep the artwork/card proportional to the supplied 9:16 images. */}
        <div className="relative w-[92%] sm:w-[90%] lg:w-[min(70vw,620px)]">
          <div className="relative aspect-[9/16] w-full overflow-visible rounded-[28px] border-[3px] border-ink bg-white shadow-[7px_7px_0px_0px_#161611]">
            <img
              key={`${currentSlide}-${currentExtension}`}
              src={slideSrc(currentSlide, currentExtension)}
              alt={`Plantio feature ${currentSlide} of ${SLIDES.length}`}
              className="slide-image block h-full w-full rounded-[24px] object-cover"
              onError={() => {
                if (currentExtension === "png") {
                  setExtension((value) => ({ ...value, [currentSlide]: "jpg" }));
                }
              }}
              draggable={false}
            />

            {/* Arrows sit just outside the artwork instead of covering its UI/content. */}
            <button
              type="button"
              aria-label="Previous slide"
              onClick={previous}
              disabled={active === 0}
              className="absolute left-[-30px] top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-ink bg-white text-ink shadow-[4px_4px_0px_0px_#161611] transition disabled:pointer-events-none disabled:opacity-25 sm:left-[-34px] sm:h-14 sm:w-14"
            >
              <ArrowLeft className="h-6 w-6" strokeWidth={3} />
            </button>

            <button
              type="button"
              aria-label={active === SLIDES.length - 1 ? "Get started" : "Next slide"}
              onClick={next}
              className="absolute right-[-30px] top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-ink bg-white text-ink shadow-[4px_4px_0px_0px_#161611] transition hover:-translate-y-[calc(50%+1px)] sm:right-[-34px] sm:h-14 sm:w-14"
            >
              <ArrowRight className="h-6 w-6" strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex w-full items-center justify-center gap-2 sm:mt-4">
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

        <div className="mt-2 flex w-full justify-center sm:mt-3">
          {active === SLIDES.length - 1 ? (
            <button
              type="button"
              onClick={onGetStarted}
              className="min-h-11 rounded-2xl border-[3px] border-ink bg-leaf px-7 py-2.5 text-base font-black uppercase tracking-wide text-ink shadow-[5px_5px_0px_0px_#161611] sm:px-12"
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

      <style jsx>{`
        .slide-image {
          animation: plantio-slide-in 320ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }

        @keyframes plantio-slide-in {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .slide-image {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
