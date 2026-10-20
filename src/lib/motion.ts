"use client";

import { useEffect, useRef, useState } from "react";

/** Preferência do sistema por menos movimento. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Anima um número até o valor alvo (contagem). Parte do valor anterior,
 * então ao adicionar um lançamento o saldo "rola" da quantia antiga para a nova.
 */
export function useCountUp(target: number, duration = 750): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const first = useRef(true);

  useEffect(() => {
    if (prefersReducedMotion()) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = first.current ? 0 : from.current;
    first.current = false;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      const v = Math.round(start + (target - start) * eased);
      from.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
