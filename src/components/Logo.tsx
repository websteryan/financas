import { useId } from "react";

/** Marca do app: F de movimento (pontas no mesmo corte de 60°). */
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
      <path fill="#fff" d="M176 128H372L338 186H234V236H318L286 292H234V384H176Z" />
    </svg>
  );
}
