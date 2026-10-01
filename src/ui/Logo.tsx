/** NAG's own mark: a rounded square with an "N" path. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-accent-600" />
        <path
          d="M9 23V9l14 14V9"
          stroke="white"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-lg font-bold tracking-tight text-slate-900">NAG</span>
    </span>
  );
}
