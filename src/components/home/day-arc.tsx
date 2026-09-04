"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import {
  dateAtDayFraction,
  ethiopianTimeAt,
  formatEthiopianClock,
} from "@/lib/ethiopian-clock";
import { skyAt } from "@/lib/sky";
import { cn } from "@/lib/utils";

/*
 * The Ethiopian day, drawn as the thing it is.
 *
 * A digital readout can say 3:05 ከጠዋቱ, but it cannot show why: that the count
 * starts when the sun comes up, and that the same numeral means two different
 * times of day depending on which half of the circle it falls in. Here the hour
 * is a position — sunrise on the left, noon at the top, sunset on the right,
 * midnight at the bottom — so the six-hour offset stops being a rule to
 * memorise and becomes something you can see.
 *
 * Dragging around the dial asks what any other hour would be, in both reckonings
 * at once.
 */

const SIZE = 340;
const CENTER = SIZE / 2;
const TRACK_RADIUS = 122;
const HORIZON_HALF_WIDTH = 158;

/** Dawn sits at the left of the horizon and the day runs over the top. */
const pointAt = (fraction: number, radius: number) => {
  const angle = ((180 - fraction * 360) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER - radius * Math.sin(angle),
  };
};

/** The twelve hour marks, which run 12, 1, 2 … twice around the circle. */
const HOUR_MARKS = Array.from({ length: 24 }, (_, index) => ({
  fraction: index / 24,
  label: index % 12 === 0 ? 12 : index % 12,
  major: index % 3 === 0,
}));

const STARS = [
  [0.16, 0.2], [0.3, 0.12], [0.45, 0.26], [0.62, 0.15], [0.78, 0.3],
  [0.24, 0.36], [0.55, 0.4], [0.86, 0.19], [0.4, 0.07], [0.7, 0.35],
] as const;

type DayArcProps = {
  /** The current moment, ticked by the hero so the card and dial stay in step. */
  now: Date | null;
  /** Scrub position, or null to show the time now. Owned by the hero. */
  preview: number | null;
  onPreviewChange: (fraction: number | null) => void;
  className?: string;
};

export function DayArc({ now, preview, onPreviewChange, className }: DayArcProps) {
  const { language } = useLanguage();
  const gradientId = useId();
  const isAmharic = language === "am";

  const [reducedMotion, setReducedMotion] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(motion.matches);
    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => motion.removeEventListener("change", syncMotion);
  }, []);

  const liveFraction = now ? ethiopianTimeAt(now).dayFraction : 0;
  const shownFraction = preview ?? liveFraction;

  const shown = useMemo(() => {
    if (!now) return null;
    const moment = preview === null ? now : dateAtDayFraction(preview, now);
    return { moment, time: ethiopianTimeAt(moment) };
  }, [now, preview]);

  const sky = useMemo(() => skyAt(shownFraction), [shownFraction]);
  const sunPoint = pointAt(shownFraction, TRACK_RADIUS);
  const isDay = shown?.time.isDaylight ?? true;

  const fractionFromPointer = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * SIZE - CENTER;
    const y = ((clientY - rect.top) / rect.height) * SIZE - CENTER;
    const angle = (Math.atan2(-y, x) * 180) / Math.PI;
    return (((180 - angle) / 360) % 1 + 1) % 1;
  }, []);

  const scrubTo = useCallback(
    (clientX: number, clientY: number) => {
      const fraction = fractionFromPointer(clientX, clientY);
      if (fraction !== null) onPreviewChange(fraction);
    },
    [fractionFromPointer, onPreviewChange]
  );

  const nudge = (deltaMinutes: number) => {
    const step = deltaMinutes / (24 * 60);
    onPreviewChange(((((preview ?? liveFraction) + step) % 1) + 1) % 1);
  };

  if (!shown) {
    return (
      <div
        className={cn(
          "aspect-square w-full animate-pulse rounded-full bg-white/10",
          className
        )}
        aria-hidden="true"
      />
    );
  }

  const { time, moment } = shown;
  const periodLabel = isAmharic ? time.period.amharic : time.period.english;
  const localLabel = moment.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const spoken = `${formatEthiopianClock(time)} ${periodLabel}`;

  return (
    <div className={cn("relative select-none", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        role="slider"
        tabIndex={0}
        aria-label={
          isAmharic ? "የኢትዮጵያ ቀን ክብ" : "Ethiopian day dial"
        }
        aria-valuemin={0}
        aria-valuemax={1439}
        aria-valuenow={Math.round(shownFraction * 1439)}
        aria-valuetext={`${spoken} — ${localLabel}`}
        onPointerDown={(event) => {
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          scrubTo(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          scrubTo(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          draggingRef.current = false;
          try {
            event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            // Pointer may already be released.
          }
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            nudge(event.shiftKey ? 60 : 15);
          } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            nudge(event.shiftKey ? -60 : -15);
          } else if (event.key === "Home" || event.key === "Escape") {
            event.preventDefault();
            onPreviewChange(null);
          }
        }}
      >
        <defs>
          <radialGradient id={`${gradientId}-sky`} cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor={sky.bottom} />
            <stop offset="100%" stopColor={sky.top} />
          </radialGradient>
          <radialGradient id={`${gradientId}-glow`}>
            <stop offset="0%" stopColor={isDay ? "#FDE68A" : "#E2E8F0"} stopOpacity="0.9" />
            <stop offset="100%" stopColor={isDay ? "#FDE68A" : "#E2E8F0"} stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${gradientId}-clip`}>
            <circle cx={CENTER} cy={CENTER} r={TRACK_RADIUS + 34} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${gradientId}-clip)`}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={TRACK_RADIUS + 34}
            fill={`url(#${gradientId}-sky)`}
          />

          {!isDay &&
            STARS.map(([sx, sy], index) => (
              <circle
                key={index}
                cx={sx * SIZE}
                cy={sy * SIZE}
                r={index % 3 === 0 ? 1.6 : 1.1}
                fill="white"
                opacity={0.85}
                className={reducedMotion ? undefined : "day-arc-star"}
                style={{ animationDelay: `${index * 340}ms` }}
              />
            ))}

          {/* Below the horizon the sun has set; the band reads as ground. */}
          <rect
            x={0}
            y={CENTER}
            width={SIZE}
            height={SIZE - CENTER}
            fill="rgba(15, 23, 42, 0.42)"
          />
        </g>

        <line
          x1={CENTER - HORIZON_HALF_WIDTH}
          y1={CENTER}
          x2={CENTER + HORIZON_HALF_WIDTH}
          y2={CENTER}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1.25}
          strokeDasharray="3 5"
        />

        <circle
          cx={CENTER}
          cy={CENTER}
          r={TRACK_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={1.5}
        />

        {HOUR_MARKS.map((mark) => {
          const outer = pointAt(mark.fraction, TRACK_RADIUS + (mark.major ? 11 : 6));
          const inner = pointAt(mark.fraction, TRACK_RADIUS);
          const label = pointAt(mark.fraction, TRACK_RADIUS + 24);

          return (
            <g key={mark.fraction}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={mark.major ? 1.6 : 1}
              />
              {mark.major && (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white/80 text-[11px] font-bold"
                >
                  {mark.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Sunrise and sunset, the two points the whole reckoning hangs on. */}
        {[0, 0.5].map((fraction) => {
          const point = pointAt(fraction, TRACK_RADIUS);
          return (
            <circle
              key={fraction}
              cx={point.x}
              cy={point.y}
              r={4}
              fill="white"
              opacity={0.9}
            />
          );
        })}

        <circle cx={sunPoint.x} cy={sunPoint.y} r={34} fill={`url(#${gradientId}-glow)`} />

        {isDay ? (
          <g className={reducedMotion ? undefined : "day-arc-sun"} style={{ transformOrigin: `${sunPoint.x}px ${sunPoint.y}px` }}>
            {Array.from({ length: 8 }, (_, index) => {
              const angle = (index * Math.PI) / 4;
              return (
                <line
                  key={index}
                  x1={sunPoint.x + Math.cos(angle) * 15}
                  y1={sunPoint.y + Math.sin(angle) * 15}
                  x2={sunPoint.x + Math.cos(angle) * 20}
                  y2={sunPoint.y + Math.sin(angle) * 20}
                  stroke="#FDE68A"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}
            <circle cx={sunPoint.x} cy={sunPoint.y} r={11} fill="#FCD34D" />
          </g>
        ) : (
          <g>
            <circle cx={sunPoint.x} cy={sunPoint.y} r={10} fill="#F8FAFC" />
            <circle cx={sunPoint.x - 3} cy={sunPoint.y - 2.5} r={2} fill="#CBD5E1" opacity={0.8} />
            <circle cx={sunPoint.x + 3} cy={sunPoint.y + 2} r={1.4} fill="#CBD5E1" opacity={0.7} />
            <circle cx={sunPoint.x + 1} cy={sunPoint.y - 4} r={1} fill="#CBD5E1" opacity={0.6} />
          </g>
        )}
      </svg>

      {/* Scrim. White type sits over the dome, which at midday is near-white
          (rgb(186,230,253)) and gives about 1.7:1. `sky.ink` is the same hue
          pulled to near-black, so this keeps contrast above 7:1 at every hour
          without freezing the colour. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span
          className="block h-44 w-44 rounded-full sm:h-48 sm:w-48"
          style={{
            background: `radial-gradient(circle, ${sky.ink} 0%, ${sky.ink} 42%, transparent 72%)`,
            opacity: 0.82,
          }}
        />
      </div>

      {/* The reading itself, centred in the dial. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">
          {periodLabel}
        </p>
        <p className="font-mono text-4xl font-black tabular-nums leading-none text-white drop-shadow-sm sm:text-5xl">
          {formatEthiopianClock(time)}
        </p>
        <p className="mt-1.5 text-xs font-semibold text-white/90">{localLabel}</p>
        {preview !== null && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreviewChange(null);
            }}
            className="pointer-events-auto mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-all cursor-pointer backdrop-blur-sm"
            title={isAmharic ? "ወደ አሁኑ ሰዓት ተመለስ" : "Reset to current live time"}
          >
            <span>{isAmharic ? "ቅድመ እይታ" : "Preview"}</span>
            <span className="text-[11px] leading-none opacity-80">✕</span>
          </button>
        )}
      </div>
    </div>
  );
}
