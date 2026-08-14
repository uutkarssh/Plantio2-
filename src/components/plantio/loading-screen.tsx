"use client";

/**
 * Plantio startup splash recreated from the supplied 4-second reference video.
 *
 * Sequence:
 * 1. Deep Plantio-green background.
 * 2. White Plantio mark draws/scales into view.
 * 3. Leaf grows inside the mark.
 * 4. Mark settles and "Plantio" fades/slides in underneath.
 *
 * It is intentionally CSS/SVG based rather than a video asset so the splash
 * stays crisp on phones, works offline as part of the PWA, and adds almost no
 * download weight.
 */
export function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#0B5A38]"
      aria-label="Loading Plantio"
      role="status"
    >
      <svg
        viewBox="0 0 360 640"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <filter id="plantio-soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodOpacity="0.18" />
          </filter>
        </defs>

        <rect width="360" height="640" fill="#0B5A38" />

        {/* Very subtle organic background texture. */}
        <g opacity="0.08" fill="#FFFFFF">
          <circle cx="32" cy="70" r="1.4" /><circle cx="88" cy="130" r="1" />
          <circle cx="300" cy="90" r="1.3" /><circle cx="330" cy="190" r="1" />
          <circle cx="48" cy="510" r="1" /><circle cx="285" cy="540" r="1.2" />
          <circle cx="120" cy="580" r="0.9" /><circle cx="230" cy="70" r="1" />
        </g>

        <g transform="translate(180 275)" filter="url(#plantio-soft-shadow)">
          {/* White Plantio/search-leaf outer mark */}
          <path
            d="M 73 5 A 73 73 0 1 0 -17 71 L 0 88 L 17 71 A 73 73 0 0 0 73 5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="19"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            className="plantio-mark-draw"
          />

          {/* Leaf stem */}
          <path
            d="M -39 60 C -38 28 -23 4 0 -8"
            fill="none"
            stroke="#63C83D"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength="1"
            className="plantio-stem-grow"
          />

          {/* Leaf */}
          <path
            d="M -35 40 C -34 7 -7 -19 42 -25 C 42 12 19 38 -14 46 C -23 48 -30 45 -35 40 Z"
            fill="#70D33F"
            className="plantio-leaf-grow"
          />
          <path
            d="M -25 35 C -10 18 6 3 30 -15 M -9 20 L -7 5 M 5 8 L 10 -5 M 19 -5 L 27 -14"
            fill="none"
            stroke="#176338"
            strokeWidth="3"
            strokeLinecap="round"
            className="plantio-leaf-veins"
          />

          {/* Tail of the mark, matching the reference */}
          <path
            d="M 48 52 L 72 76"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="19"
            strokeLinecap="round"
            className="plantio-tail-in"
          />
        </g>

        <text
          x="180"
          y="405"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="55"
          fontWeight="700"
          letterSpacing="-2"
          className="plantio-wordmark"
        >
          Plantio
        </text>

        <style>{`
          .plantio-mark-draw {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            animation: plantioMark 1.35s cubic-bezier(.22,.8,.25,1) .05s forwards;
            transform-origin: 0 0;
          }
          .plantio-stem-grow {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            animation: plantioStem .72s ease-out 1.02s forwards;
          }
          .plantio-leaf-grow {
            transform-box: fill-box;
            transform-origin: 50% 100%;
            transform: scale(0);
            opacity: 0;
            animation: plantioLeaf .8s cubic-bezier(.18,1.35,.35,1) 1.18s forwards;
          }
          .plantio-leaf-veins {
            opacity: 0;
            animation: plantioVeins .45s ease-out 1.62s forwards;
          }
          .plantio-tail-in {
            opacity: 0;
            transform-origin: 48px 52px;
            transform: scale(.5) rotate(-12deg);
            animation: plantioTail .55s cubic-bezier(.18,1.3,.35,1) 1.15s forwards;
          }
          .plantio-wordmark {
            opacity: 0;
            transform: translateY(14px);
            animation: plantioWord .72s cubic-bezier(.2,.8,.2,1) 2.25s forwards;
          }
          @keyframes plantioMark {
            0% { stroke-dashoffset: 1; transform: scale(.86); opacity: .2; }
            70% { opacity: 1; }
            100% { stroke-dashoffset: 0; transform: scale(1); opacity: 1; }
          }
          @keyframes plantioStem { to { stroke-dashoffset: 0; } }
          @keyframes plantioLeaf {
            0% { transform: scale(0) rotate(-18deg); opacity: 0; }
            70% { transform: scale(1.08) rotate(3deg); opacity: 1; }
            100% { transform: scale(1) rotate(0); opacity: 1; }
          }
          @keyframes plantioVeins { to { opacity: 1; } }
          @keyframes plantioTail {
            0% { opacity: 0; transform: scale(.5) rotate(-12deg); }
            100% { opacity: 1; transform: scale(1) rotate(0); }
          }
          @keyframes plantioWord {
            0% { opacity: 0; transform: translateY(14px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .plantio-mark-draw,
            .plantio-stem-grow,
            .plantio-leaf-grow,
            .plantio-leaf-veins,
            .plantio-tail-in,
            .plantio-wordmark {
              animation: none !important;
              opacity: 1 !important;
              stroke-dashoffset: 0 !important;
              transform: none !important;
            }
          }
        `}</style>
      </svg>
    </div>
  );
}
