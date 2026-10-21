/** Marca Lastro: quadrado de contorno com a peça assentada na base. O acabamento vem do tema (ver --logo-* no CSS). */
export function Logo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" className={className} role="img" aria-label="Lastro">
      <rect width="512" height="512" rx="116" fill="var(--logo-tile)" />
      <rect width="512" height="512" rx="116" fill="var(--logo-sheen)" />
      <rect x="140" y="140" width="232" height="232" rx="68" stroke="var(--logo-ink)" strokeWidth="28" />
      <rect x="194" y="288" width="124" height="46" rx="23" fill="var(--logo-dot)" />
    </svg>
  );
}
