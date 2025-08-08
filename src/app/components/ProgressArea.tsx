"use client";
import React, { useMemo } from "react";

type Props = {
  direction: "idle" | "left" | "right";
  isTransferring: boolean;
  currentPlaylistName?: string | null;
  progressPercent: number; // 0..100
  events: {
    index: number;
    name: string;
    status: "matched" | "low-confidence" | "unmatched";
  }[];
  fetchError?: string | null;
};

export default React.memo(function ProgressArea(props: Props) {
  const CHEVRON_WIDTH = 420;
  const progressWidthPx = useMemo(
    () => Math.round((CHEVRON_WIDTH * props.progressPercent) / 100),
    [props.progressPercent]
  );
  const chevronRotation = useMemo(
    () => (props.direction === "right" ? 0 : 180),
    [props.direction]
  );

  return (
    <div className="relative hidden md:block md:h-full w-[420px] px-2">
      {props.direction !== "idle" && (
        <>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
            <div className="mb-2 h-5 text-center text-sm text-muted-foreground">
              {props.isTransferring
                ? `Transferring ${props.currentPlaylistName ?? "..."}`
                : ""}
            </div>
            <div className="relative h-10 flex items-center justify-center select-none pointer-events-none">
              <svg
                width={CHEVRON_WIDTH}
                height="28"
                viewBox={`0 0 ${CHEVRON_WIDTH} 28`}
                className="block chevron-rotate"
                style={{ transform: `rotate(${chevronRotation}deg)` }}
              >
                <defs>
                  <clipPath id="chevClip">
                    <rect x={0} y="0" width={progressWidthPx} height="28" />
                  </clipPath>
                </defs>
                <g
                  stroke="rgba(163,163,163,0.7)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  {Array.from({ length: 20 }).map((_, i) => {
                    const x = i * 21 + 6;
                    return (
                      <polyline key={i} points={`${x},6 ${x + 8},14 ${x},22`} />
                    );
                  })}
                </g>
                <g
                  clipPath="url(#chevClip)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  {Array.from({ length: 20 }).map((_, i) => {
                    const x = i * 21 + 6;
                    const idx = i;
                    const t = idx / 19;
                    const start =
                      props.direction === "left" ? "#e11d48" : "#059669";
                    const end =
                      props.direction === "left" ? "#059669" : "#e11d48";
                    const hexToRgb = (hex: string) => {
                      const n = hex.replace("#", "");
                      const b = parseInt(n, 16);
                      return {
                        r: (b >> 16) & 255,
                        g: (b >> 8) & 255,
                        b: b & 255,
                      };
                    };
                    const rgbToHex = (r: number, g: number, b: number) =>
                      `#${[r, g, b]
                        .map((v) =>
                          Math.max(0, Math.min(255, Math.round(v)))
                            .toString(16)
                            .padStart(2, "0")
                        )
                        .join("")}`;
                    const a = hexToRgb(start);
                    const b = hexToRgb(end);
                    const color = rgbToHex(
                      a.r + (b.r - a.r) * t,
                      a.g + (b.g - a.g) * t,
                      a.b + (b.b - a.b) * t
                    );
                    return (
                      <polyline
                        key={`p${i}`}
                        points={`${x},6 ${x + 8},14 ${x},22`}
                        stroke={color}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>

          <div className="absolute inset-x-0 top-[calc(50%+44px)] h-64 overflow-y-auto">
            <ul className="space-y-1">
              {props.events.map((t) => (
                <li
                  key={t.index}
                  className="flex items-center justify-between text-sm animate-[flyin_.4s_ease-out]"
                >
                  <span className="truncate pr-2 text-muted-foreground">
                    {t.name}
                  </span>
                  <span
                    className={
                      t.status === "matched"
                        ? "text-emerald-500"
                        : t.status === "low-confidence"
                        ? "text-yellow-500"
                        : "text-rose-500"
                    }
                  >
                    {t.status}
                  </span>
                </li>
              ))}
              {!props.events.length && (
                <li className="text-sm text-muted-foreground">&nbsp;</li>
              )}
              {props.fetchError && (
                <li className="text-sm text-muted-foreground">
                  {props.fetchError}
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
});
