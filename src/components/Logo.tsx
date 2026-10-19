import { useId } from "react";

/** Marca do app: "F." em roxo. */
export function Logo({ size = 36, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" className={className} role="img" aria-label="Finanças">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9566ff" />
          <stop offset="1" stopColor="#5a2fe0" />
        </linearGradient>
        <radialGradient id={`${id}h`} cx="0.3" cy="0.05" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${id}b)`} />
      <rect width="512" height="512" rx="128" fill={`url(#${id}h)`} />
      <g stroke="#fff" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round">
        <path d="M190 150V364" />
        <path d="M190 150H334" />
        <path d="M190 252H292" />
      </g>
      <circle cx="352" cy="364" r="23" fill="#fff" fillOpacity="0.55" />
    </svg>
  );
}
