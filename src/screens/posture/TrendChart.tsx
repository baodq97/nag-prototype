import { useEffect, useRef, useState } from 'react';
import type { DailyPosture } from '../../domain/types';

// The chart is drawn at the width of its card and a fixed height, so labels keep their size
// on wide screens instead of scaling up with the drawing.
const H = 220;
const FONT = 12;
const PAD = { top: 12, right: 16, bottom: 28, left: 44 };

/** Width of the element in CSS pixels, updated when it resizes. */
function useWidth<T extends Element>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(320, Math.round(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** A hand-drawn line chart of the daily share of passing tests. */
export function TrendChart({ points }: { points: DailyPosture[] }) {
  const [box, W] = useWidth<HTMLDivElement>(640);
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;

  const values = points.map((p) => p.passingPct);
  const lo = Math.max(0, Math.floor((Math.min(...values) - 5) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...values) + 2) / 5) * 5);
  const span = hi - lo || 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? 0 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - (v - lo) / span) * innerH;

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.passingPct).toFixed(1)}`).join(' ');
  const area = `${PAD.left},${PAD.top + innerH} ${line} ${x(points.length - 1).toFixed(1)},${PAD.top + innerH}`;
  const ticks = [lo, lo + span / 2, hi];

  return (
    <div ref={box}>
      <svg
        role="img"
        aria-label={`Share of tests passing per day, ${shortDate(first.date)} to ${shortDate(last.date)}: from ${first.passingPct}% to ${last.passingPct}%, lowest ${Math.min(...values)}%, highest ${Math.max(...values)}%`}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-slate-200"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(t) + 4}
              textAnchor="end"
              fontSize={FONT}
              className="fill-slate-600"
            >
              {Math.round(t)}%
            </text>
          </g>
        ))}
        <polygon points={area} className="fill-accent-50" />
        <polyline
          points={line}
          fill="none"
          className="stroke-accent-600"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={x(points.length - 1)}
          cy={y(last.passingPct)}
          r={3.5}
          className="fill-accent-700"
        />
        <text x={PAD.left} y={H - 8} fontSize={FONT} className="fill-slate-600">
          {shortDate(first.date)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 8}
          textAnchor="end"
          fontSize={FONT}
          className="fill-slate-600"
        >
          {shortDate(last.date)}
        </text>
      </svg>
    </div>
  );
}
